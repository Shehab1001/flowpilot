import { describe, expect, it, vi } from 'vitest'

vi.mock('deepspace', () => ({ getAuthToken: vi.fn() }))
import { renderToStaticMarkup } from 'react-dom/server'
import WorkflowCanvas from './WorkflowCanvas'
import type { StoredRecord, WorkflowStep } from '../lib/workflow-api'

const step = (id: string, label: string, position: number): StoredRecord<WorkflowStep> => ({
  recordId: id,
  data: {
    ownerId: 'owner', workflowId: 'flow', label, position,
    type: 'json_transform', config: '{"field":"title"}',
  },
})

describe('WorkflowCanvas', () => {
  it('renders nodes in persisted position order with visible connectors', () => {
    const html = renderToStaticMarkup(
      <WorkflowCanvas
        steps={[step('b', 'Second', 10), step('a', 'First', 0)]}
        onAdd={() => {}}
        onEdit={() => {}}
        onDelete={() => {}}
      />,
    )
    expect(html.indexOf('First')).toBeLessThan(html.indexOf('Second'))
    expect(html).toContain('Edit First')
    expect(html).toContain('Edit Second')
    expect(html).toContain('Design canvas')
    expect(html).toContain('Add next step')
    expect(html).toContain('Draggable workflow canvas')
    expect(html).toContain('Zoom in')
    expect(html).toContain('Reset view')
    expect(html).toContain('Drag cards to arrange')
  })

  it('highlights a succeeded node and exposes its inspector action', () => {
    const html = renderToStaticMarkup(
      <WorkflowCanvas steps={[step('first', 'Fetch', 0)]}
        runSteps={[{ stepId: 'first', label: 'Fetch', status: 'success', durationMs: 123, outputPreview: '"octocat"' }]}
        selectedStepId="first" onSelectStep={() => {}}
        onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    )
    expect(html).toContain('Inspect Fetch')
    expect(html).toContain('Succeeded')
    expect(html).toContain('123 ms')
    expect(html).toContain('border-indigo-300')
  })

  it('renders an empty canvas with a clear next action', () => {
    const html = renderToStaticMarkup(
      <WorkflowCanvas steps={[]} onAdd={() => {}} onEdit={() => {}} onDelete={() => {}} />,
    )
    expect(html).toContain('Add next step')
    expect(html).toContain('Start')
    expect(html).toContain('End')
  })
})
