import type { StoredRecord, WorkflowStep } from './workflow-api'

export type NodePosition = { x: number; y: number }
export type NodeLayout = Record<string, NodePosition>

const MAX_COORD = 10_000
const MAX_NODES = 20
const ID_RE = /^[A-Za-z0-9_-]{1,128}$/

export function defaultNodePosition(index: number): NodePosition {
  return { x: 280 + index * 360, y: 210 }
}

/** Decode only valid server-stored node coordinates; old workflows are fine. */
export function parseNodeLayout(raw: unknown): NodeLayout {
  let value: unknown = raw
  if (typeof value === 'string') {
    try { value = JSON.parse(value) } catch { return {} }
  }
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  const layout: NodeLayout = {}
  for (const [id, position] of Object.entries(value)) {
    if (Object.keys(layout).length >= MAX_NODES) break
    if (!ID_RE.test(id) || !validPosition(position)) continue
    layout[id] = { x: position.x, y: position.y }
  }
  return layout
}

export function validPosition(value: unknown): value is NodePosition {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return false
  const p = value as Record<string, unknown>
  return typeof p.x === 'number' && Number.isFinite(p.x) && Number.isInteger(p.x)
    && Math.abs(p.x) <= MAX_COORD
    && typeof p.y === 'number' && Number.isFinite(p.y) && Number.isInteger(p.y)
    && Math.abs(p.y) <= MAX_COORD
}

/** Removes stale IDs when steps are deleted; defaults old nodes in order. */
export function resolveNodePositions(steps: StoredRecord<WorkflowStep>[], raw: unknown): NodeLayout {
  const saved = parseNodeLayout(raw)
  const layout: NodeLayout = {}
  const ordered = [...steps].sort((a, b) => a.data.position - b.data.position)
  ordered.forEach((step, index) => {
    layout[step.recordId] = saved[step.recordId] ?? defaultNodePosition(index)
  })
  return layout
}

/** Server-side validation must reject—not silently truncate—invalid payloads. */
export function validateLayoutPayload(value: unknown): string | null {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return null
  const entries = Object.entries(value)
  if (entries.length > MAX_NODES) return null
  const out: NodeLayout = {}
  for (const [id, position] of entries) {
    if (!ID_RE.test(id) || !validPosition(position)) return null
    out[id] = { x: position.x, y: position.y }
  }
  const serialized = JSON.stringify(out)
  return serialized.length <= 4000 ? serialized : null
}
