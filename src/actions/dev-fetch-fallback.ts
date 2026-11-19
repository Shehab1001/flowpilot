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

export const fetchWithLocalDevFallback: typeof fetch = async (input, init) => {
  try {
    return await fetch(input, init)
  } catch (error) {
    if (!import.meta.env.DEV || !isOpaqueWorkerdError(error)) throw error
    const url = typeof input === 'string' ? input
      : input instanceof URL ? input.toString() : input.url
    const local = devProxyUrl(url)
    if (!local) throw error
    const hostname = new URL(url).hostname
    console.warn(`[FlowPilot] workerd HTTPS fetch failed for ${hostname}; retrying via fixed-target local Vite proxy.`)
    try {
      // Preserve the timeout signal, request method and blocked-redirect policy.
      return await fetch(local, { ...init, redirect: 'manual' })
    } catch {
      // Give a useful clue without disclosing untrusted URLs or internal tokens.
      throw new Error(`Local workerd outbound HTTPS failed for ${hostname}. Dev proxy also unavailable; check Vite on port 5173 or test this request after deployment.`)
    }
  }
}
