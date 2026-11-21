import { describe, expect, it, vi } from 'vitest'
import { executeSteps, summarizeExecution, type ExecutableStep } from './execution-engine'

const step = (
  id: string,
  position: number,
  type: 'http_get' | 'json_transform',
  config: Record<string, string>,
): ExecutableStep => ({ recordId: id, data: { label: id, position, type, config: JSON.stringify(config) } })

const jsonResponse = (data: unknown) => new Response(JSON.stringify(data), {
  status: 200, headers: { 'Content-Type': 'application/json' },
})

describe('executeSteps', () => {
  it('executes sorted steps and passes HTTP JSON output to the next transform', async () => {
    const mock = vi.fn(async () => jsonResponse({ title: 'FlowPilot', id: 1 }))
    const execution = await executeSteps([
      step('transform', 2, 'json_transform', { field: 'title' }),
      step('fetch', 0, 'http_get', { url: 'https://jsonplaceholder.typicode.com/todos/1' }),
    ], mock as unknown as typeof fetch)
    expect(execution.status).toBe('success')
    expect(execution.output).toBe('FlowPilot')
    expect(execution.steps.map(s => s.stepId)).toEqual(['fetch', 'transform'])
    expect(mock).toHaveBeenCalledWith('https://jsonplaceholder.typicode.com/todos/1', expect.objectContaining({ redirect: 'manual' }))
    expect(summarizeExecution(execution).stepsJson).toContain('transform')
  })

  it('executes a node with DeepSpace native JSON object config', async () => {
    const mock = vi.fn(async () => jsonResponse({ title: 'Native JSON' }))
    const execution = await executeSteps([
      { recordId: 'fetch', data: { label: 'Fetch', position: 0, type: 'http_get', config: { url: 'https://jsonplaceholder.typicode.com/todos/1' } } },
      { recordId: 'extract', data: { label: 'Extract', position: 1, type: 'json_transform', config: { field: 'title' } } },
    ], mock as unknown as typeof fetch)
    expect(execution.status).toBe('success')
    expect(execution.output).toBe('Native JSON')
  })

  it('blocks non-allowlisted endpoints without calling fetch', async () => {
    const mock = vi.fn()
    const result = await executeSteps([step('unsafe', 0, 'http_get', { url: 'http://127.0.0.1/admin' })], mock)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('allowlisted')
    expect(mock).not.toHaveBeenCalled()
  })

  it('rejects redirects without following them', async () => {
    const mock = vi.fn(async () => new Response(null, { status: 302, headers: { Location: 'http://localhost/private' } }))
    const result = await executeSteps([step('fetch', 0, 'http_get', { url: 'https://api.github.com/repos' })], mock as unknown as typeof fetch)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('redirect')
  })

  it('reports failed transforms and prevents subsequent execution', async () => {
    const mock = vi.fn(async () => jsonResponse({ id: 1 }))
    const execution = await executeSteps([
      step('fetch', 0, 'http_get', { url: 'https://api.github.com/users/octocat' }),
      step('missing', 1, 'json_transform', { field: 'title' }),
      step('third', 2, 'http_get', { url: 'https://api.github.com/users/octocat' }),
    ], mock as unknown as typeof fetch)
    expect(execution.status).toBe('failed')
    expect(execution.steps).toHaveLength(2)
    expect(mock).toHaveBeenCalledTimes(1)
  })

  it('limits response size even when Content-Length is missing', async () => {
    const mock = vi.fn(async () => new Response('x'.repeat(140_000), { status: 200, headers: { 'Content-Type': 'application/json' } }))
    const execution = await executeSteps([step('fetch', 0, 'http_get', { url: 'https://api.github.com/users/octocat' })], mock as unknown as typeof fetch)
    expect(execution.error).toContain('128 KB')
  })

  it('recovers an opaque workerd connection failure and continues the workflow', async () => {
    const network = vi.fn(async () => { throw new Error('internal error; reference = abc123def') })
    const recovery = vi.fn(async () => jsonResponse({ title: 'Recovered' }))
    const result = await executeSteps([
      step('fetch', 0, 'http_get', { url: 'https://api.github.com/users/octocat' }),
      step('transform', 1, 'json_transform', { field: 'title' }),
    ], network as unknown as typeof fetch, recovery)
    expect(result.status).toBe('success')
    expect(result.output).toBe('Recovered')
    expect(recovery).toHaveBeenCalledTimes(1)
  })

  it('recovers a response-body streaming failure, not just a fetch failure', async () => {
    const badBody = new ReadableStream<Uint8Array>({
      start(controller) { controller.error(new Error('internal error; reference = streamabc123')) },
    })
    const network = vi.fn(async () => new Response(badBody, {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    const recovery = vi.fn(async () => jsonResponse({ title: 'Recovered body' }))
    const result = await executeSteps([
      step('fetch', 0, 'http_get', { url: 'https://jsonplaceholder.typicode.com/todos/1' }),
      step('transform', 1, 'json_transform', { field: 'title' }),
    ], network as unknown as typeof fetch, recovery)
    expect(result.status).toBe('success')
    expect(result.output).toBe('Recovered body')
    expect(recovery).toHaveBeenCalledTimes(1)
  })

  it('does not conceal ordinary response errors when recovery is present', async () => {
    const network = vi.fn(async () => new Response(null, { status: 404 }))
    const recovery = vi.fn()
    const result = await executeSteps([
      step('fetch', 0, 'http_get', { url: 'https://api.github.com/users/missing' }),
    ], network as unknown as typeof fetch, recovery)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('404')
    expect(recovery).not.toHaveBeenCalled()
  })

  it('sends GitHub REST headers directly, without relying on the local proxy', async () => {
    const network = vi.fn(async () => jsonResponse({ login: 'octocat' }))
    const result = await executeSteps([
      step('github', 0, 'http_get', { url: 'https://api.github.com/users/octocat' }),
      step('login', 1, 'json_transform', { field: 'login' }),
    ], network as unknown as typeof fetch)
    expect(result.status).toBe('success')
    expect(result.output).toBe('octocat')
    expect(network).toHaveBeenCalledWith(
      'https://api.github.com/users/octocat',
      expect.objectContaining({
        headers: expect.objectContaining({
          'User-Agent': 'FlowPilot-Workflow-Runner',
          'X-GitHub-Api-Version': '2022-11-28',
          Accept: 'application/vnd.github+json',
        }),
      }),
    )
  })

  it('explains GitHub 403 when rate limit is exhausted', async () => {
    const network = vi.fn(async () => new Response(null, {
      status: 403,
      headers: { 'x-ratelimit-remaining': '0', 'x-ratelimit-reset': '1790000000' },
    }))
    const result = await executeSteps([
      step('github', 0, 'http_get', { url: 'https://api.github.com/users/octocat' }),
    ], network as unknown as typeof fetch)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('rate limit exceeded')
    expect(result.error).toContain('HTTP 403')
  })

  it('distinguishes upstream HTTP 403 from identified GitHub rate limiting', async () => {
    const network = vi.fn(async () => new Response(null, { status: 403 }))
    const result = await executeSteps([
      step('github', 0, 'http_get', { url: 'https://api.github.com/users/octocat' }),
    ], network as unknown as typeof fetch)
    expect(result.status).toBe('failed')
    expect(result.error).toContain('upstream proxy')
    expect(result.error).toContain('403')
  })

  it('rejects empty workflows', async () => {
    const execution = await executeSteps([])
    expect(execution.status).toBe('failed')
    expect(execution.error).toContain('no steps')
  })
})
