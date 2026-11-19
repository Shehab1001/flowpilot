import { stepConfigObject } from '../lib/stored-json'
/**
 * FlowPilot authenticated actions.
 *
 * All ActionTools methods bypass collection RBAC. Never trust params.ownerId,
 * and always verify the requested workflow belongs to the JWT subject.
 */
import type { ActionHandler, ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'

type Workflow = Record<string, unknown> & { ownerId: string; name: string; description: string; status: string }
type WorkflowStep = Record<string, unknown> & {
  ownerId: string
  workflowId: string
  label: string
  type: 'http_get' | 'json_transform'
  position: number
  config: unknown
}

const bad = (error: string) => ({ success: false as const, error })
const validId = (value: unknown): value is string =>
  typeof value === 'string' && value.length > 0 && value.length <= 128 && /^[a-zA-Z0-9_-]+$/.test(value)
const text = (value: unknown, max = 100): string | null =>
  typeof value === 'string' && value.trim().length > 0 && value.trim().length <= max
    ? value.trim() : null

async function ownedWorkflow(tools: ActionTools, userId: string, workflowId: unknown) {
  if (!validId(workflowId)) return bad('Invalid workflow ID')
  const result = await tools.get<Workflow>('workflows', workflowId)
  // Deliberately return the same error for missing and other-user records.
  if (!result.success || result.data.record.data.ownerId !== userId) {
    return bad('Workflow not found')
  }
  return { success: true as const, workflowId, record: result.data.record }
}

async function ownedStep(tools: ActionTools, userId: string, stepId: unknown) {
  if (!validId(stepId)) return bad('Invalid step ID')
  const result = await tools.get<WorkflowStep>('workflow_steps', stepId)
  if (!result.success || result.data.record.data.ownerId !== userId) {
    return bad('Step not found')
  }
  const workflow = await ownedWorkflow(tools, userId, result.data.record.data.workflowId)
  if (!workflow.success) return bad('Step not found')
  return { success: true as const, stepId, record: result.data.record }
}

function validateConfig(type: WorkflowStep['type'], value: unknown): Record<string, string> | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const config = value as Record<string, unknown>
  if (type === 'http_get') {
    // Only allowlisted HTTPS endpoints are eligible; execution additionally needs
    // DNS/IP validation and redirect blocking (not implemented yet).
    if (typeof config.url !== 'string' || config.url.length > 2048) return null
    let url: URL
    try { url = new URL(config.url) } catch { return null }
    if (url.protocol !== 'https:' || url.username || url.password || url.port) return null
    if (!['jsonplaceholder.typicode.com', 'api.github.com'].includes(url.hostname)) return null
    if (/(^|\.)(localhost|local|internal|test|example|invalid)$/.test(url.hostname)) return null
    if (/^(\d+\.){3}\d+$/.test(url.hostname) || url.hostname.includes(':')) return null
    if (url.hostname.endsWith('.localhost') || url.hostname.endsWith('.onion')) return null
    return { url: url.toString() }
  }
  if (type === 'json_transform') {
    // Phase 1: a safe property picker, not arbitrary executable JavaScript.
    const field = text(config.field, 120)
    if (!field || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(field)) return null
    return { field }
  }
  return null
}

const createWorkflow: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const name = text(params.name, 100)
  if (!name) return bad('Workflow name must be 1–100 characters')
  const description = params.description === undefined ? '' : params.description
  if (typeof description !== 'string' || description.length > 500) return bad('Invalid description')
  return tools.create('workflows', {
    ownerId: userId,
    name,
    description,
    status: 'draft',
  })
}

const listWorkflows: ActionHandler<Env> = async ({ userId, tools }) =>
  tools.query<Workflow>('workflows', { where: { ownerId: userId }, limit: 100 })

const updateWorkflow: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const workflow = await ownedWorkflow(tools, userId, params.workflowId)
  if (!workflow.success) return workflow
  const patch: Record<string, unknown> = {}
  if (params.name !== undefined) {
    const name = text(params.name, 100)
    if (!name) return bad('Workflow name must be 1–100 characters')
    patch.name = name
  }
  if (params.description !== undefined) {
    if (typeof params.description !== 'string' || params.description.length > 500) return bad('Invalid description')
    patch.description = params.description
  }
  if (params.status !== undefined) {
    if (!['draft', 'active', 'paused'].includes(String(params.status))) return bad('Invalid status')
    patch.status = params.status
  }
  if (!Object.keys(patch).length) return bad('No editable fields provided')
  return tools.update('workflows', workflow.workflowId, patch)
}

const deleteWorkflow: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const workflow = await ownedWorkflow(tools, userId, params.workflowId)
  if (!workflow.success) return workflow
  // Delete dependent steps first. Scoped by both owner and workflow.
  for (;;) {
    const page = await tools.query<WorkflowStep>('workflow_steps', {
      where: { workflowId: workflow.workflowId, ownerId: userId },
      limit: 100,
    })
    if (!page.success) return page
    if (page.data.records.length === 0) break
    for (const step of page.data.records) {
      const removed = await tools.remove('workflow_steps', step.recordId)
      if (!removed.success) return removed
    }
  }
  // Remove the workflow's historical runs too; privileged actions must
  // explicitly scope deletions to the authenticated owner.
  for (;;) {
    const page = await tools.query('workflow_runs', {
      where: { workflowId: workflow.workflowId, ownerId: userId },
      limit: 100,
    })
    if (!page.success) return page
    if (page.data.records.length === 0) break
    for (const run of page.data.records) {
      const removed = await tools.remove('workflow_runs', run.recordId)
      if (!removed.success) return removed
    }
  }
  return tools.remove('workflows', workflow.workflowId)
}

const listSteps: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const workflow = await ownedWorkflow(tools, userId, params.workflowId)
  if (!workflow.success) return workflow
  return tools.query<WorkflowStep>('workflow_steps', {
    where: { workflowId: workflow.workflowId, ownerId: userId },
    orderBy: 'position',
    orderDir: 'asc',
    limit: 100,
  })
}

const createStep: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const workflow = await ownedWorkflow(tools, userId, params.workflowId)
  if (!workflow.success) return workflow
  const label = text(params.label, 100)
  const type = params.type
  const position = params.position
  if (!label) return bad('Step label must be 1–100 characters')
  if (type !== 'http_get' && type !== 'json_transform') return bad('Unsupported step type')
  if (typeof position !== 'number' || !Number.isInteger(position) || position < 0 || position > 99) {
    return bad('Position must be an integer from 0 to 99')
  }
  const config = validateConfig(type, params.config)
  if (!config) return bad('Invalid step config')
  const existing = await tools.query<WorkflowStep>('workflow_steps', {
    where: { workflowId: workflow.workflowId, ownerId: userId }, limit: 100,
  })
  if (!existing.success) return existing
  if (existing.data.records.length >= 20) return bad('Maximum 20 steps per workflow')
  if (existing.data.records.some(step => step.data.position === position)) return bad('Position already in use')
  return tools.create('workflow_steps', {
    workflowId: workflow.workflowId, ownerId: userId, label, type, position, config,
  })
}

const updateStep: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const step = await ownedStep(tools, userId, params.stepId)
  if (!step.success) return step
  const patch: Record<string, unknown> = {}
  if (params.label !== undefined) {
    const label = text(params.label, 100)
    if (!label) return bad('Step label must be 1–100 characters')
    patch.label = label
  }
  if (params.position !== undefined) {
    const position = params.position
    if (typeof position !== 'number' || !Number.isInteger(position) || position < 0 || position > 99) return bad('Invalid position')
    const siblings = await tools.query<WorkflowStep>('workflow_steps', {
      where: { workflowId: step.record.data.workflowId, ownerId: userId }, limit: 100,
    })
    if (!siblings.success) return siblings
    if (siblings.data.records.some(other => other.recordId !== step.stepId && other.data.position === position)) {
      return bad('Position already in use')
    }
    patch.position = position
  }
  if (params.type !== undefined || params.config !== undefined) {
    const type = params.type ?? step.record.data.type
    if (type !== 'http_get' && type !== 'json_transform') return bad('Unsupported step type')
    const currentConfig = stepConfigObject(step.record.data.config)
    const config = validateConfig(type, params.config ?? currentConfig)
    if (!config) return bad('Invalid step config')
    patch.type = type
    patch.config = config
  }
  if (!Object.keys(patch).length) return bad('No editable fields provided')
  return tools.update('workflow_steps', step.stepId, patch)
}

const deleteStep: ActionHandler<Env> = async ({ userId, params, tools }) => {
  const step = await ownedStep(tools, userId, params.stepId)
  if (!step.success) return step
  return tools.remove('workflow_steps', step.stepId)
}

export const workflowActions: Record<string, ActionHandler<Env>> = {
  createWorkflow, listWorkflows, updateWorkflow, deleteWorkflow,
  listSteps, createStep, updateStep, deleteStep,
}
