import { AlertCircle, CheckCircle2, Clock3, Info } from 'lucide-react'
import type { StepRunPreview } from '../lib/workflow-run-preview'
import type { StoredRecord, WorkflowStep } from '../lib/workflow-api'

type Props = {
  step: StoredRecord<WorkflowStep> | null
  result: StepRunPreview | null
  hasRun: boolean
}

function Preview({ title, text }: { title: string; text?: string }) {
  return (
    <div className="space-y-1.5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-neutral-500">{title}</p>
      <pre className="max-h-44 min-h-12 overflow-auto whitespace-pre-wrap break-all rounded-xl border border-white/[0.06] bg-[#242424] p-3 font-mono text-xs leading-5 text-neutral-200">
        {text && text.length ? text : 'No data recorded'}
      </pre>
    </div>
  )
}

export default function NodeExecutionInspector({ step, result, hasRun }: Props) {
  if (!step) return (
    <section aria-label="Node inspector" className="rounded-[20px] border border-white/10 bg-[#2b2b2b] p-5">
      <h3 className="flex items-center gap-2 text-base font-semibold"><Info size={16} className="text-indigo-300"/> Node inspector</h3>
      <p className="mt-3 text-sm text-neutral-400">Select Inspect on any node to review its configuration and execution result.</p>
    </section>
  )
  return (
    <section aria-label="Node inspector" className="rounded-[20px] border border-white/10 bg-[#2b2b2b] p-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <p className="text-xs font-semibold uppercase tracking-widest text-indigo-300">Node inspector</p>
          <h3 className="mt-2 break-words text-lg font-semibold">{step.data.label}</h3>
          <p className="mt-1 text-xs text-neutral-500">{step.data.type === 'http_get' ? 'HTTP GET' : 'JSON transform'} · Step {step.data.position + 1}</p>
        </div>
        {result && <span className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold ${result.status === 'success' ? 'bg-emerald-400/10 text-emerald-300' : 'bg-rose-400/10 text-rose-300'}`}>
          {result.status === 'success' ? <CheckCircle2 size={14}/> : <AlertCircle size={14}/>}
          {result.status === 'success' ? 'Success' : 'Failed'}
        </span>}
      </div>
      {!result && <p className="mt-4 rounded-lg border border-white/10 bg-white/[0.025] p-3 text-sm text-neutral-400">
        {hasRun ? 'No result for this node in the selected run. It may not have executed.' : 'Run this workflow to see step inputs, outputs and timing.'}
      </p>}
      {result && <>
        <div className="my-4 flex items-center gap-2 text-xs text-neutral-400"><Clock3 size={14}/> Duration: <span className="font-semibold text-neutral-100">{result.durationMs} ms</span></div>
        <div className="grid gap-3 lg:grid-cols-2">
          <Preview title="Input preview" text={result.inputPreview ?? (step.data.type === 'http_get' ? 'No previous step input' : undefined)}/>
          <Preview title="Output preview" text={result.outputPreview}/>
        </div>
        {result.error && <p role="alert" className="mt-4 rounded-lg border border-rose-400/20 bg-rose-400/10 p-3 text-sm text-rose-300">{result.error}</p>}
        <p className="mt-3 text-xs text-neutral-500">Previews are limited to protect execution history storage. Older runs may not contain input previews.</p>
      </>}
    </section>
  )
}
