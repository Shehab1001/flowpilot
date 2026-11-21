import { describe, expect, it } from 'vitest'
import { defaultNodePosition, parseNodeLayout, resolveNodePositions, validateLayoutPayload } from './workflow-layout'
import type { StoredRecord, WorkflowStep } from './workflow-api'

const step = (recordId: string, position: number): StoredRecord<WorkflowStep> => ({
  recordId, data: { ownerId: 'user', workflowId: 'flow', label: recordId,
    type: 'http_get', config: { url: 'https://api.github.com/users/octocat' }, position },
})

describe('workflow node layout', () => {
  it('gives older workflows predictable ordered positions', () => {
    const nodes = resolveNodePositions([step('b', 10), step('a', 0)], undefined)
    expect(nodes.a).toEqual(defaultNodePosition(0))
    expect(nodes.b).toEqual(defaultNodePosition(1))
  })
  it('preserves persisted positions across refresh and filters deleted nodes', () => {
    const nodes = resolveNodePositions([step('a', 0), step('b', 1)], {
      a: { x: 800, y: -24 }, b: { x: 320, y: 600 }, deleted: { x: 50, y: 50 },
    })
    expect(nodes).toEqual({ a: { x: 800, y: -24 }, b: { x: 320, y: 600 } })
  })
  it('supports JSON-encoded coordinates returned from older records', () => {
    expect(parseNodeLayout(JSON.stringify({ a: { x: 100, y: 200 } })))
      .toEqual({ a: { x: 100, y: 200 } })
  })
  it('rejects non-finite coordinates and malformed IDs', () => {
    expect(validateLayoutPayload({ a: { x: Number.POSITIVE_INFINITY, y: 0 } })).toBeNull()
    expect(validateLayoutPayload({ '../path': { x: 100, y: 200 } })).toBeNull()
    expect(validateLayoutPayload({ a: { x: 100.2, y: 200 } })).toBeNull()
    expect(validateLayoutPayload({ a: { x: 10001, y: 0 } })).toBeNull()
    expect(validateLayoutPayload({ a: { x: 100, y: 200 } })).toBe('{"a":{"x":100,"y":200}}')
  })
})
