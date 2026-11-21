import { parseStoredJson } from './stored-json'
import type { WorkflowRun } from './workflow-api'

export type StepRunPreview = {
  stepId: string
  label: string
  type?: string
  status: 'success' | 'failed'
  durationMs: number
  inputPreview?: string
  outputPreview?: string
  error?: string
}

/** Run results may be auto-decoded JSON or legacy encoded strings. */
export function decodeRunSteps(run: WorkflowRun | null | undefined): StepRunPreview[] {
  if (!run) return []
  const raw = parseStoredJson(run.stepsJson)
  if (!Array.isArray(raw)) return []
  const steps: StepRunPreview[] = []
  for (const item of raw.slice(0, 20)) {
    if (!item || typeof item !== 'object' || Array.isArray(item)) continue
    const entry = item as Record<string, unknown>
    if (typeof entry.stepId !== 'string' || !/^[a-zA-Z0-9_-]{1,128}$/.test(entry.stepId)) continue
    if (entry.status !== 'success' && entry.status !== 'failed') continue
    steps.push({
      stepId: entry.stepId,
      label: typeof entry.label === 'string' ? entry.label : 'Workflow step',
      type: typeof entry.type === 'string' ? entry.type : undefined,
      status: entry.status,
      durationMs: typeof entry.durationMs === 'number' && Number.isFinite(entry.durationMs) ? entry.durationMs : 0,
      inputPreview: typeof entry.inputPreview === 'string' ? entry.inputPreview : undefined,
      outputPreview: typeof entry.outputPreview === 'string' ? entry.outputPreview : undefined,
      error: typeof entry.error === 'string' ? entry.error : undefined,
    })
  }
  return steps
}
