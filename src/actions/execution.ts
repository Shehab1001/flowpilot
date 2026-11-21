/** Authenticated workflow run actions. ActionTools bypass normal collection RBAC. */
import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { executeSteps, summarizeExecution, type ExecutableStep } from './execution-engine'
import { recoverWorkerdFetch } from './dev-fetch-fallback'

type Workflow = Record<string, unknown> & { ownerId: string; name: string; status: string }
type StepData = Record<string, unknown> & { ownerId: string; workflowId: string; label: string; type: 'http_get' | 'json_transform'; position: number; config: string }
type RunData = Record<string, unknown> & {
  ownerId: string; workflowId: string; status: string; startedAt: string;
  durationMs: number; error: string; stepsJson: unknown; outputJson: string
}
const bad = (error: string) => ({ success: false as const, error })
const isId = (x: unknown): x is string => typeof x === 'string' && x.length > 0 && x.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(x)

async function getOwnedWorkflow(tools: ActionTools, userId: string, id: unknown) {
  if (!isId(id)) return bad('Workflow not found')
  const result = await tools.get<Workflow>('workflows', id)
  if (!result.success || result.data.record.data.ownerId !== userId) return bad('Workflow not found')
  return { success: true as const, id, record: result.data.record }
}

const runWorkflow: ActionHandler<Env> = async ({ params, tools, userId }) => {
  const owned = await getOwnedWorkflow(tools, userId, params.workflowId)
  if (!owned.success) return owned
  if (owned.record.data.status === 'paused') return bad('Unpause this workflow before running it')
  const queried = await tools.query<StepData>('workflow_steps', {
    where: { workflowId: owned.id, ownerId: userId }, orderBy: 'position', orderDir: 'asc', limit: 21,
  })
  if (!queried.success) return queried
  if (queried.data.records.length > 20) return bad('Maximum 20 steps allowed')
  if (queried.data.records.some(step => step.data.workflowId !== owned.id || step.data.ownerId !== userId))
    return bad('Unexpected workflow step ownership')
  const startedAt = new Date().toISOString()
  const execution = await executeSteps(queried.data.records as ExecutableStep[], fetch, recoverWorkerdFetch)
  const summary = summarizeExecution(execution)
  const record: RunData = {
    ownerId: userId, workflowId: owned.id, status: execution.status,
    startedAt, durationMs: execution.durationMs, error: execution.error,
    stepsJson: JSON.parse(summary.stepsJson) as unknown, outputJson: summary.outputJson,
  }
  const stored = await tools.create('workflow_runs', record)
  if (!stored.success) return stored
  return {
    success: true as const,
    data: { ...record, recordId: stored.data.recordId },
  }
}

const listRuns: ActionHandler<Env> = async ({ params, tools, userId }) => {
  const owned = await getOwnedWorkflow(tools, userId, params.workflowId)
  if (!owned.success) return owned
  return tools.query<RunData>('workflow_runs', {
    where: { workflowId: owned.id, ownerId: userId },
    orderBy: 'startedAt', orderDir: 'desc', limit: 50,
  })
}

export const executionActions: Record<string, ActionHandler<Env>> = { runWorkflow, listRuns }
