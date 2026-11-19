/**
 * DeepSpace JSON columns round-trip structured values automatically.
 * Old FlowPilot records may contain an extra JSON.stringify layer.
 * Accept objects/arrays or up to three layers of historical JSON encoding.
 */
export function parseStoredJson(input: unknown): unknown {
  let value = input
  for (let i = 0; i < 3 && typeof value === 'string'; i++) {
    try { value = JSON.parse(value) } catch { return null }
  }
  return value
}

export function stepConfigObject(input: unknown): Record<string, unknown> | null {
  const value = parseStoredJson(input)
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  return value as Record<string, unknown>
}
