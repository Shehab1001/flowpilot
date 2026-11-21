import { describe, expect, it, vi } from 'vitest'
import type { ActionTools } from 'deepspace/worker'
import { workflowActions } from './workflows'
import type { Env } from '../../worker'

const workflow = {
  recordId: 'wf_1',
  data: { ownerId: 'user_a', name: 'My Flow', description: '', status: 'draft' },
}
const makeContext = (params: Record<string, unknown>, overrides: Record<string, unknown> = {}) => {
  const tools = {
    get: vi.fn(async () => ({ success: true, data: { record: workflow } })),
    query: vi.fn(async () => ({ success: true, data: { records: [], count: 0 } })),
    create: vi.fn(async () => ({ success: true, data: { recordId: 'created_1' } })),
    update: vi.fn(async () => ({ success: true, data: { recordId: 'wf_1' } })),
    remove: vi.fn(async () => ({ success: true, data: { recordId: 'wf_1' } })),
    ...overrides,
  }
  return {
    ctx: { userId: 'user_b', params, tools: tools as unknown as ActionTools, env: {} as Env, callerJwt: 'test-token' },
    tools,
  }
}
describe('FlowPilot owner authorization', () => {
  it('does not update a different user workflow', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1', name: 'Pwned' })
    const result = await workflowActions.updateWorkflow(ctx)
    expect(result.success).toBe(false)
    expect(tools.update).not.toHaveBeenCalled()
  })
  it('does not list steps of a different user workflow', async () => {
    const { ctx, tools } = makeContext({ workflowId: 'wf_1' })
    const result = await workflowActions.listSteps(ctx)
    expect(result.success).toBe(false)
    expect(tools.query).not.toHaveBeenCalled()
  })
  it('uses authenticated subject as the workflow owner', async () => {
    const { ctx, tools } = makeContext({ name: 'Demo', ownerId: 'attacker' })
    const result = await workflowActions.createWorkflow(ctx)
    expect(result.success).toBe(true)
    expect(tools.create).toHaveBeenCalledWith('workflows', expect.objectContaining({ ownerId: 'user_b', status: 'draft' }))
  })
  it('rejects node layouts containing steps outside the authenticated workflow', async () => {
    const ownWorkflow = { ...workflow, data: { ...workflow.data, ownerId: 'user_b' } }
    const { ctx, tools } = makeContext(
      { workflowId: 'wf_1', nodeLayout: { someone_elses_step: { x: 200, y: 300 } } },
      { get: vi.fn(async () => ({ success: true, data: { record: ownWorkflow } })) },
    )
    const result = await workflowActions.updateWorkflow(ctx)
    expect(result.success).toBe(false)
    expect(tools.update).not.toHaveBeenCalled()
  })

  it('saves only valid owned node coordinates without modifying execution positions', async () => {
    const ownWorkflow = { ...workflow, data: { ...workflow.data, ownerId: 'user_b' } }
    const { ctx, tools } = makeContext(
      { workflowId: 'wf_1', nodeLayout: { step_1: { x: 240, y: 300 } } },
      {
        get: vi.fn(async () => ({ success: true, data: { record: ownWorkflow } })),
        query: vi.fn(async () => ({ success: true, data: { records: [{ recordId: 'step_1', data: { ownerId: 'user_b', workflowId: 'wf_1' } }], count: 1 } })),
      },
    )
    const result = await workflowActions.updateWorkflow(ctx)
    expect(result.success).toBe(true)
    expect(tools.update).toHaveBeenCalledWith('workflows', 'wf_1', { nodeLayout: { step_1: { x: 240, y: 300 } } })
  })

  it('rejects invalid or non-allowlisted URL config', async () => {
    const { ctx, tools } = makeContext(
      { workflowId: 'wf_1', label: 'Fetch', type: 'http_get', position: 0, config: { url: 'http://localhost:3000' } },
      { get: vi.fn(async () => ({ success: true, data: { record: { ...workflow, data: { ...workflow.data, ownerId: 'user_b' } } } })) },
    )
    const result = await workflowActions.createStep(ctx)
    expect(result.success).toBe(false)
    expect(tools.create).not.toHaveBeenCalled()
  })
})
