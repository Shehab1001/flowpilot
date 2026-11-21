import { describe, expect, it, vi } from 'vitest'
import { devProxyUrl, isOpaqueWorkerdError, recoverWorkerdFetch } from './dev-fetch-fallback'

describe('local-only outbound fetch fallback guardrails', () => {
  it('maps only explicitly allowed HTTPS hosts to fixed local paths', () => {
    expect(devProxyUrl('https://jsonplaceholder.typicode.com/todos/1?done=1'))
      .toBe('http://127.0.0.1:5173/__flowpilot_dev_jsonplaceholder/todos/1?done=1')
    expect(devProxyUrl('https://api.github.com/users/octocat'))
      .toBe('http://127.0.0.1:5173/__flowpilot_dev_github/users/octocat')
  })
  it('refuses local networks, arbitrary hosts, HTTP, ports and credentials', () => {
    for (const url of [
      'https://127.0.0.1/admin',
      'https://jsonplaceholder.typicode.com.evil.org/',
      'http://api.github.com/users/octocat',
      'https://api.github.com:8443/',
      'https://user:pass@api.github.com/',
      'https://169.254.169.254/latest/meta-data',
    ]) expect(devProxyUrl(url)).toBeNull()
  })
  it('recovers only opaque workerd errors using the fixed dev proxy', async () => {
    const mockFetch = vi.fn(async () => new Response('{"login":"octocat"}', {
      status: 200, headers: { 'Content-Type': 'application/json' },
    }))
    const signal = AbortSignal.timeout(3000)
    const response = await recoverWorkerdFetch(
      'https://api.github.com/users/octocat',
      { method: 'GET', redirect: 'manual', signal },
      new Error('internal error; reference = abc123'),
      mockFetch as unknown as typeof fetch,
    )
    expect(response.status).toBe(200)
    expect(mockFetch).toHaveBeenCalledWith(
      'http://127.0.0.1:5173/__flowpilot_dev_github/users/octocat',
      expect.objectContaining({ method: 'GET', redirect: 'manual', signal }),
    )
    await expect(recoverWorkerdFetch(
      'https://api.github.com/users/octocat', {},
      new Error('HTTP GET returned status 404'),
      mockFetch as unknown as typeof fetch,
    )).rejects.toThrow('HTTP GET returned status 404')
    expect(mockFetch).toHaveBeenCalledTimes(1)
  })

  it('recognizes only the opaque workerd error for retry', () => {
    expect(isOpaqueWorkerdError(new Error('internal error; reference = svuge6k4opj5dn6ntakvgo6h'))).toBe(true)
    expect(isOpaqueWorkerdError(new Error('HTTP GET returned status 500'))).toBe(false)
    expect(isOpaqueWorkerdError(new Error('Invalid step configuration'))).toBe(false)
  })
})
