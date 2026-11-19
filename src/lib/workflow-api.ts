import { getAuthToken } from 'deepspace'

export type WorkflowStatus = 'draft' | 'active' | 'paused'
export type StepType = 'http_get' | 'json_transform'
export type StoredRecord<T> = {
  recordId: string
  data: T
  createdAt?: string | number
  updatedAt?: string | number
}

export interface Workflow {
  ownerId: string
  name: string
  description: string
  status: WorkflowStatus
}
export interface WorkflowStep {
  ownerId: string
  workflowId: string
  label: string
  type: StepType
  position: number
  config: string
}
type ActionResult<T> = { success: true; data: T } | { success: false; error: string }
type ListResult<T> = { records: StoredRecord<T>[]; count: number }

export async function callWorkflowAction<T>(
  actionName: string,
  params: Record<string, unknown> = {},
): Promise<T> {
  const jwt = await getAuthToken()
  if (!jwt) throw new Error('Sign in to continue.')
  const response = await fetch(`/api/actions/${encodeURIComponent(actionName)}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${jwt}` },
    body: JSON.stringify(params),
  })
  if (!response.ok) {
    throw new Error(response.status === 401 ? 'Your session expired. Sign in again.' : `Request failed (HTTP ${response.status}).`)
  }
  const result = await response.json() as ActionResult<T>
  if (!result.success) throw new Error(result.error || 'Request failed.')
  return result.data
}

export function fetchWorkflows() {
  return callWorkflowAction<ListResult<Workflow>>('listWorkflows')
}
export function fetchSteps(workflowId: string) {
  return callWorkflowAction<ListResult<WorkflowStep>>('listSteps', { workflowId })
}
export function decodeStepConfig(step: WorkflowStep): string {
  try {
    const config = JSON.parse(step.config) as Record<string, unknown>
    const value = step.type === 'http_get' ? config.url : config.field
    return typeof value === 'string' ? value : ''
  } catch {
    return ''
  }
}
