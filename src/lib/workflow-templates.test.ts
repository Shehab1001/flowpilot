import { describe, expect, it } from 'vitest'
import { WORKFLOW_TEMPLATES, findWorkflowTemplate } from './workflow-templates'
import { decodeRunSteps } from './workflow-run-preview'
import type { WorkflowRun } from './workflow-api'

const mockRun = (stepsJson: unknown): WorkflowRun => ({
  ownerId: 'user', workflowId: 'wf', status: 'success', startedAt: '2026-11-21T18:00:00Z',
  durationMs: 220, error: '', stepsJson, outputJson: '"octocat"',
})

describe('template library', () => {
  it('ships runnable fixed templates with explicit allowed HTTPS origins', () => {
    expect(WORKFLOW_TEMPLATES).toHaveLength(3)
    for (const template of WORKFLOW_TEMPLATES) {
      expect(findWorkflowTemplate(template.id)).toEqual(template)
      expect(template.steps[0].type).toBe('http_get')
      expect(['api.github.com','jsonplaceholder.typicode.com'])
        .toContain(new URL((template.steps[0].config as { url: string }).url).hostname)
      expect(template.steps[1].type).toBe('json_transform')
    }
  })
  it('does not treat arbitrary user-submitted objects as templates', () => {
    expect(findWorkflowTemplate({ id: 'github-profile' })).toBeUndefined()
    expect(findWorkflowTemplate('__proto__')).toBeUndefined()
  })
})

describe('saved run previews', () => {
  it('decodes both native and legacy JSON and preserves debug fields', () => {
    const entries = [{ stepId: 'step_1', label: 'Fetch', status: 'success', durationMs: 123,
      inputPreview: 'null', outputPreview: '{"login":"octocat"}' }]
    expect(decodeRunSteps(mockRun(entries))).toEqual([expect.objectContaining(entries[0])])
    expect(decodeRunSteps(mockRun(JSON.stringify(entries)))).toEqual([expect.objectContaining(entries[0])])
  })
  it('handles missing, malformed, and unrelated entries safely', () => {
    expect(decodeRunSteps(null)).toEqual([])
    expect(decodeRunSteps(mockRun('{bad'))).toEqual([])
    expect(decodeRunSteps(mockRun([{ stepId: '../bad', status: 'success' }]))).toEqual([])
  })
})
