import { describe, expect, it, vi } from 'vitest'
import type { ActionTools } from 'deepspace/worker'
import type { Env } from '../../worker'
import { executionActions } from './execution'

const workflow = { recordId: 'wf_1', data: { ownerId: 'user_a', name: 'Mine', status: 'active' } }
const makeContext = (params: Record<string, unknown>, owner = 'user_b') => {
  const tools = {
    get: vi.fn(async () => ({ success: true, data: { record: { ...workflow, data: { ...workflow.data, ownerId: owner } } } })),
    query: vi.fn(async () => ({ success: true, data: { records: [], count: 0 } })),
    create: vi.fn(async () => ({ success: true, data: { recordId: 'run_1' } })),
  }
  return { ctx: { userId: 'user_a', params, tools: tools as unknown as ActionTools, env: {} as Env, callerJwt: 'test-token' }, tools }
}
describe('execution actions ownership', () => {
  it('does not run another user workflow', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1' })
    const result = await executionActions.runWorkflow(ctx)
    expect(result.success).toBe(false)
    expect(tools.query).not.toHaveBeenCalled()
    expect(tools.create).not.toHaveBeenCalled()
  })
  it('does not expose run history of another user', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1' })
    const result = await executionActions.listRuns(ctx)
    expect(result.success).toBe(false)
    expect(tools.query).not.toHaveBeenCalled()
  })
  it('persists a failed run on empty workflows, owned by the JWT subject', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1' }, 'user_a')
    const result = await executionActions.runWorkflow(ctx)
    expect(result.success).toBe(true)
    expect(tools.create).toHaveBeenCalledWith('workflow_runs', expect.objectContaining({
      ownerId: 'user_a', workflowId: 'wf_1', status: 'failed',
    }))
  })
  it('rejects paused workflow execution', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1' }, 'user_a')
    tools.get.mockResolvedValueOnce({ success: true, data: { record: { ...workflow, data: { ownerId: 'user_a', name: 'Mine', status: 'paused' } } } })
    const result = await executionActions.runWorkflow(ctx)
    expect(result.success).toBe(false)
    expect(tools.query).not.toHaveBeenCalled()
  })
})
