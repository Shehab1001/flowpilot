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

  it('rejects empty workflows', async () => {
    const execution = await executeSteps([])
    expect(execution.status).toBe('failed')
    expect(execution.error).toContain('no steps')
  })
})
