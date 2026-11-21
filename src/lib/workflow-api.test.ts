import { beforeEach, describe, expect, it, vi } from 'vitest'

vi.mock('deepspace', () => ({ getAuthToken: vi.fn(async () => 'jwt-test') }))

import { getAuthToken } from 'deepspace'
import { callWorkflowAction, decodeStepConfig } from './workflow-api'

describe('workflow API client', () => {
  beforeEach(() => {
    vi.resetAllMocks()
    vi.mocked(getAuthToken).mockResolvedValue('jwt-test')
  })

  it('attaches the authenticated JWT to server action requests', async () => {
    const fetchMock = vi.fn(async () => ({
      ok: true, json: async () => ({ success: true, data: { records: [], count: 0 } }),
    }))
    vi.stubGlobal('fetch', fetchMock)
    const result = await callWorkflowAction<{ records: unknown[] }>('listWorkflows')
    expect(result.records).toEqual([])
    expect(fetchMock).toHaveBeenCalledWith('/api/actions/listWorkflows', expect.objectContaining({
      method: 'POST',
      headers: expect.objectContaining({ Authorization: 'Bearer jwt-test' }),
    }))
    vi.unstubAllGlobals()
  })

  it('does not make unauthenticated calls', async () => {
    vi.mocked(getAuthToken).mockResolvedValue(null)
    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)
    await expect(callWorkflowAction('listWorkflows')).rejects.toThrow('Sign in')
    expect(fetchMock).not.toHaveBeenCalled()
    vi.unstubAllGlobals()
  })

  it('turns failed action results into visible errors', async () => {
    vi.stubGlobal('fetch', vi.fn(async () => ({
      ok: true, json: async () => ({ success: false, error: 'Workflow not found' }),
    })))
    await expect(callWorkflowAction('updateWorkflow')).rejects.toThrow('Workflow not found')
    vi.unstubAllGlobals()
  })

  it('decodes step configuration for display', () => {
    expect(decodeStepConfig({
      ownerId: 'a', workflowId: 'b', label: 'Get', type: 'http_get',
      position: 0, config: '{"url":"https://api.github.com/users/octocat"}',
    })).toBe('https://api.github.com/users/octocat')
  })
})
