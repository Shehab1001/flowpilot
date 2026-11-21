/**
 * Local-only escape hatch for known opaque workerd HTTPS/TLS errors.
 * Production still uses direct Worker fetch. Vite's fixed-target dev proxy
 * uses Node's TLS stack for the two allowlisted demo API hosts.
 *
 * IMPORTANT: never build a proxy URL before verifying the original request's
 * HTTPS origin. This is not a general-purpose outbound HTTP proxy.
 */
const LOCAL_VITE_ORIGIN = 'http://127.0.0.1:5173'
const DEV_ROUTES: Record<string, string> = {
  'jsonplaceholder.typicode.com': '/__flowpilot_dev_jsonplaceholder',
  'api.github.com': '/__flowpilot_dev_github',
}

export function devProxyUrl(input: string): string | null {
  let target: URL
  try { target = new URL(input) } catch { return null }
  if (target.protocol !== 'https:' || target.port || target.username || target.password) return null
  const prefix = DEV_ROUTES[target.hostname]
  if (!prefix) return null
  const destination = new URL(prefix + target.pathname + target.search, LOCAL_VITE_ORIGIN)
  return destination.toString()
}

export function isOpaqueWorkerdError(error: unknown): boolean {
  return error instanceof Error && /internal error; reference\s*=\s*[a-z0-9]+/i.test(error.message)
}

/**
 * Called after the *whole* direct HTTP operation fails (including streaming
 * the body), not merely after fetch() resolves. Never retry an HTTP status,
 * JSON parse error, size limit, timeout, or redirect response.
 */
export async function recoverWorkerdFetch(
  url: string,
  init: RequestInit,
  cause: unknown,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  if (!import.meta.env.DEV || !isOpaqueWorkerdError(cause)) throw cause
  const local = devProxyUrl(url)
  if (!local) throw cause

  const hostname = new URL(url).hostname
  console.warn(`[FlowPilot] local Worker outbound HTTPS failed for ${hostname}; retrying via fixed-target Vite proxy`)
  try {
    return await fetchImpl(local, { ...init, redirect: 'manual' })
  } catch (fallbackError) {
    const reason = fallbackError instanceof Error ? fallbackError.message : 'Unknown network error'
    console.error('[FlowPilot] local Vite proxy request failed:', reason)
    throw new Error(`Local HTTPS failed for ${hostname}; the Vite proxy is unavailable. Verify the dev server is running and the fixed-target route is reachable.`)
  }
}
