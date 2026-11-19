import { parseStoredJson } from '../lib/stored-json'
import { AlertCircle, CheckCircle2, Clock3, History, Loader2, Play } from 'lucide-react'
import type { StoredRecord, WorkflowRun } from '../lib/workflow-api'

type Props = {
  runs: StoredRecord<WorkflowRun>[]
  loading: boolean
  running: boolean
  disabled: boolean
  onRun: () => void
  onRefresh: () => void
}

function stepsOf(run: WorkflowRun): Array<{ label: string; status: string; durationMs: number; error?: string; outputPreview?: string }> {
  const value = parseStoredJson(run.stepsJson)
  if (Array.isArray(value)) return value.filter(item => item && typeof item === 'object') as ReturnType<typeof stepsOf>
  return []
}

export default function WorkflowRunsPanel({ runs, loading, running, disabled, onRun, onRefresh }: Props) {
  return (
    <section aria-label="Workflow execution" className="mt-7 overflow-hidden rounded-[20px] border border-white/10 bg-[#2c2c2c]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 p-5">
        <div>
          <h3 className="flex items-center gap-2 text-base font-semibold text-neutral-100"><History size={17} className="text-indigo-300"/> Execution history</h3>
          <p className="mt-1 text-xs text-neutral-400">Saved runs and step-by-step results</p>
        </div>
        <div className="flex items-center gap-2">
          <button type="button" onClick={onRefresh} disabled={loading || running} className="rounded-lg border border-white/10 px-3 py-2 text-xs text-neutral-300 hover:bg-white/5 disabled:opacity-50">Refresh</button>
          <button type="button" onClick={onRun} disabled={disabled || running} className="inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white hover:bg-indigo-400 disabled:opacity-50">
            {running ? <Loader2 size={16} className="animate-spin"/> : <Play size={16} fill="currentColor"/>}
            {running ? 'Running...' : 'Run workflow'}
          </button>
        </div>
      </div>
      {loading ? <div role="status" className="flex items-center gap-2 p-6 text-sm text-neutral-400"><Loader2 size={16} className="animate-spin"/> Loading runs...</div>
        : runs.length === 0 ? <div className="p-8 text-center text-sm text-neutral-400">No executions yet. Run this workflow to see its first result.</div>
        : <div className="max-h-[520px] space-y-3 overflow-y-auto p-4 sm:p-5">
          {runs.map(run => <details key={run.recordId} className="group rounded-xl border border-white/10 bg-[#363636] p-4" open={runs[0]?.recordId === run.recordId ? true : undefined}>
            <summary className="flex cursor-pointer list-none flex-wrap items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm font-semibold text-neutral-100">
                {run.data.status === 'success' ? <CheckCircle2 size={17} className="text-emerald-400"/> : <AlertCircle size={17} className="text-rose-400"/>}
                {run.data.status === 'success' ? 'Succeeded' : 'Failed'}
                <span className="font-normal text-neutral-500">{new Date(run.data.startedAt).toLocaleString()}</span>
              </span>
              <span className="flex items-center gap-1 text-xs text-neutral-400"><Clock3 size={13}/> {run.data.durationMs} ms</span>
            </summary>
            <div className="mt-4 space-y-3 border-t border-white/10 pt-4">
              {run.data.error && <p className="text-sm text-rose-300" role="alert">{run.data.error}</p>}
              <div className="space-y-2">{stepsOf(run.data).map((step, index) => <div key={index} className="flex flex-wrap justify-between gap-2 rounded-lg bg-black/15 p-3 text-xs"><span className="text-neutral-200">{index + 1}. {step.label} <span className={step.status === 'success' ? 'text-emerald-400' : 'text-rose-400'}>({step.status})</span></span><span className="text-neutral-400">{step.durationMs} ms</span>{step.error && <span className="w-full text-rose-300">{step.error}</span>}{step.outputPreview && <pre className="max-h-32 w-full overflow-auto whitespace-pre-wrap break-all text-neutral-400">{step.outputPreview}</pre>}</div>)}</div>
              <p className="text-xs font-medium text-neutral-400">Final output</p>
              <pre className="max-h-64 overflow-auto whitespace-pre-wrap break-all rounded-lg bg-[#242424] p-3 font-mono text-xs text-neutral-200">{run.data.outputJson || 'No output'}</pre>
            </div>
          </details>)}
        </div>}
    </section>
  )
}
