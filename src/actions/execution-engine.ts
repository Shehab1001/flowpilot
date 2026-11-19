import { stepConfigObject } from '../lib/stored-json'
/**
 * Sequential workflow execution. No arbitrary user URLs, JS evaluation or redirects.
 * Only explicitly allowlisted HTTPS hosts can be called.
 */
export type ExecutableStep = {
  recordId: string
  data: { label: string; type: 'http_get' | 'json_transform'; position: number; config: unknown }
}

export type StepExecution = {
  stepId: string
  label: string
  type: string
  status: 'success' | 'failed'
  durationMs: number
  output?: unknown
  error?: string
}

export type Execution = {
  status: 'success' | 'failed'
  output: unknown
  steps: StepExecution[]
  error: string
  durationMs: number
}
const ALLOWED_HOSTS = new Set(['jsonplaceholder.typicode.com', 'api.github.com'])
const MAX_BYTES = 128 * 1024
const MAX_STEPS = 20
const MAX_MS = 25_000

function safeUrl(raw: unknown): URL {
  if (typeof raw !== 'string' || raw.length > 2048) throw new Error('Invalid HTTP GET URL')
  let url: URL
  try { url = new URL(raw) } catch { throw new Error('Invalid HTTP GET URL') }
  if (url.protocol !== 'https:' || !ALLOWED_HOSTS.has(url.hostname) || url.port || url.username || url.password)
    throw new Error('HTTP GET URL is not allowlisted')
  return url
}

function parseConfig(step: ExecutableStep): Record<string, unknown> {
  const value = stepConfigObject(step.data.config)
  if (!value) throw new Error('Invalid step configuration')
  return value
}

async function readLimitedJson(response: Response): Promise<unknown> {
  const length = response.headers.get('content-length')
  if (length && Number(length) > MAX_BYTES) throw new Error('API response exceeds 128 KB')
  if (!response.body) throw new Error('API response has no body')
  const reader = response.body.getReader()
  const chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const { value, done } = await reader.read()
      if (done) break
      size += value.byteLength
      if (size > MAX_BYTES) throw new Error('API response exceeds 128 KB')
      chunks.push(value)
    }
  } finally { await reader.cancel().catch(() => {}) }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
  try { return JSON.parse(new TextDecoder().decode(bytes)) as unknown }
  catch { throw new Error('HTTP GET did not return valid JSON') }
}

/** A run has an overall 25s deadline and each HTTP request is capped at 8s. */
export async function executeSteps(
  steps: ExecutableStep[],
  fetchImpl: typeof fetch = fetch,
): Promise<Execution> {
  const start = Date.now()
  const result: StepExecution[] = []
  let output: unknown = null
  if (!steps.length) return { status: 'failed', output: null, steps: [], error: 'Workflow has no steps', durationMs: 0 }
  if (steps.length > MAX_STEPS) return { status: 'failed', output: null, steps: [], error: 'Workflow exceeds 20 steps', durationMs: 0 }
  const sorted = [...steps].sort((a, b) => a.data.position - b.data.position)
  const positions = sorted.map(s => s.data.position)
  if (new Set(positions).size !== positions.length) return { status: 'failed', output: null, steps: [], error: 'Duplicate step positions', durationMs: 0 }

  for (const step of sorted) {
    const stepStart = Date.now()
    try {
      if (Date.now() - start >= MAX_MS) throw new Error('Workflow execution timed out')
      const config = parseConfig(step)
      if (step.data.type === 'http_get') {
        const url = safeUrl(config.url)
        const remaining = Math.min(8_000, Math.max(1, MAX_MS - (Date.now() - start)))
        // fetch's redirect mode manual is essential: the allowlist must not
        // be bypassed via Location pointing to private networks or other hosts.
        const response = await fetchImpl(url.toString(), {
          method: 'GET', redirect: 'manual',
          signal: AbortSignal.timeout(remaining),
          headers: { Accept: 'application/json' },
        })
        if (response.status >= 300 && response.status < 400) throw new Error('HTTP redirects are blocked')
        if (!response.ok) throw new Error(`HTTP GET returned status ${response.status}`)
        const mime = response.headers.get('content-type') || ''
        if (!mime.toLowerCase().includes('json')) throw new Error('API response must be JSON')
        output = await readLimitedJson(response)
      } else if (step.data.type === 'json_transform') {
        if (typeof config.field !== 'string' || !/^[a-zA-Z_$][a-zA-Z0-9_$]*$/.test(config.field) || config.field.length > 120)
          throw new Error('Invalid JSON field selector')
        if (!output || typeof output !== 'object' || Array.isArray(output))
          throw new Error('JSON transform expects an object from a previous step')
        if (!Object.prototype.hasOwnProperty.call(output, config.field))
          throw new Error(`JSON field "${config.field}" not found`)
        output = (output as Record<string, unknown>)[config.field]
      } else {
        throw new Error('Unsupported step type')
      }
      result.push({ stepId: step.recordId, label: step.data.label, type: step.data.type, status: 'success', durationMs: Date.now() - stepStart, output })
    } catch (error) {
      const detail = error instanceof Error ? error.message : 'Step failed'
      result.push({ stepId: step.recordId, label: step.data.label, type: step.data.type, status: 'failed', durationMs: Date.now() - stepStart, error: detail })
      return { status: 'failed', output: null, steps: result, error: detail, durationMs: Date.now() - start }
    }
  }
  return { status: 'success', output, steps: result, error: '', durationMs: Date.now() - start }
}

/** Limit run history storage; large intermediate data is not persisted. */
export function summarizeExecution(execution: Execution): {
  stepsJson: string; outputJson: string
} {
  const truncate = (value: unknown, max = 1600) => {
    const raw = JSON.stringify(value)
    return raw === undefined ? '' : raw.length > max ? raw.slice(0, max) + '… [truncated]' : raw
  }
  return {
    stepsJson: JSON.stringify(execution.steps.map(step => ({
      stepId: step.stepId, label: step.label, type: step.type,
      status: step.status, durationMs: step.durationMs,
      ...(step.error ? { error: step.error } : {}),
      ...(step.status === 'success' ? { outputPreview: truncate(step.output) } : {}),
    }))),
    outputJson: truncate(execution.output, 8192),
  }
}
