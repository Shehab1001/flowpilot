import { ArrowDown, Check, Code2, Globe2, Pencil, Plus, Trash2 } from 'lucide-react'
import { decodeStepConfig, type StoredRecord, type WorkflowStep } from '../lib/workflow-api'

type Props = {
  steps: StoredRecord<WorkflowStep>[]
  disabled?: boolean
  onAdd: () => void
  onEdit: (step: StoredRecord<WorkflowStep>) => void
  onDelete: (step: StoredRecord<WorkflowStep>) => void
}

/**
 * Ordered workflow canvas. Connections reflect persisted step.position values.
 * This is not a free-form graph or an execution/status visualization.
 */
export default function WorkflowCanvas({ steps, disabled = false, onAdd, onEdit, onDelete }: Props) {
  const ordered = [...steps].sort((a, b) => a.data.position - b.data.position)

  return (
    <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-[#292929]">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 bg-[#303030] px-4 py-3 sm:px-5">
        <div className="flex items-center gap-2 text-xs font-semibold text-neutral-300">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
          Design canvas
          <span className="rounded-lg bg-white/5 px-2 py-1 font-normal text-neutral-400">{ordered.length} / 20 steps</span>
        </div>
        <span className="text-[11px] text-neutral-500">Sequential · top to bottom</span>
      </div>
      <div className="workflow-canvas-grid min-h-64 px-3 py-7 sm:px-6">
        <div className="mx-auto flex w-full max-w-[480px] flex-col items-center">
          <div className="flex items-center gap-2 rounded-full border border-emerald-400/25 bg-[#27362e] px-4 py-2 text-xs font-semibold text-emerald-300">
            <span className="size-2 rounded-full bg-emerald-400" aria-hidden /> Start
          </div>
          {ordered.map((step, index) => {
            const http = step.data.type === 'http_get'
            return (
              <div className="flex w-full flex-col items-center" key={step.recordId}>
                <Connector />
                <article className="relative w-full rounded-2xl border border-white/15 bg-[#373737] p-4 shadow-[0_12px_24px_rgba(0,0,0,.15)] transition-colors hover:border-indigo-400/45">
                  <div className="absolute -left-2.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#292929] bg-indigo-400" aria-hidden />
                  <div className="absolute -right-2.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#292929] bg-indigo-400" aria-hidden />
                  <div className="flex items-start gap-3">
                    <span className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${http ? 'bg-sky-400/10 text-sky-300' : 'bg-violet-400/10 text-violet-300'}`}>
                      {http ? <Globe2 size={21} /> : <Code2 size={21} />}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex flex-wrap items-center gap-2">
                        <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Step {index + 1}</span>
                        <span className="rounded-full border border-white/10 px-2 py-0.5 text-[10px] text-neutral-400">
                          {http ? 'HTTP GET' : 'JSON transform'}
                        </span>
                      </div>
                      <h4 className="break-words text-sm font-semibold text-neutral-100">{step.data.label}</h4>
                      <p className="mt-2 truncate font-mono text-xs text-neutral-400" title={decodeStepConfig(step.data)}>
                        {decodeStepConfig(step.data)}
                      </p>
                    </div>
                  </div>
                  <div className="mt-4 flex items-center justify-end gap-2 border-t border-white/10 pt-3">
                    <button type="button" disabled={disabled} onClick={() => onEdit(step)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 px-3 py-1.5 text-xs font-medium text-neutral-200 hover:border-indigo-400/40 hover:bg-indigo-400/10 disabled:opacity-50"
                      aria-label={`Edit ${step.data.label}`}><Pencil size={13} /> Edit</button>
                    <button type="button" disabled={disabled} onClick={() => onDelete(step)}
                      className="inline-flex items-center gap-1.5 rounded-lg border border-rose-500/15 px-3 py-1.5 text-xs font-medium text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"
                      aria-label={`Delete ${step.data.label}`}><Trash2 size={13} /> Delete</button>
                  </div>
                </article>
              </div>
            )
          })}
          <Connector />
          {ordered.length < 20 && (
            <button type="button" disabled={disabled} onClick={onAdd}
              className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-indigo-400/40 bg-indigo-500/[0.07] px-5 py-4 text-sm font-semibold text-indigo-200 transition-colors hover:border-indigo-400 hover:bg-indigo-500/[0.13] disabled:opacity-50">
              <Plus size={17} /> Add next step
            </button>
          )}
          <Connector />
          <div className="flex items-center gap-2 rounded-full border border-white/15 bg-[#343434] px-4 py-2 text-xs font-semibold text-neutral-300">
            <Check size={14} className="text-emerald-400" /> End
          </div>
          {ordered.length === 0 && <p className="mt-4 text-center text-xs text-neutral-500">Start by adding your first step. Connections are displayed automatically.</p>}
        </div>
      </div>
    </div>
  )
}

function Connector() {
  return <div className="flex h-11 flex-col items-center justify-center" aria-hidden="true">
    <span className="h-5 w-px bg-indigo-400/55" />
    <ArrowDown size={14} className="-mt-0.5 text-indigo-400/70" />
  </div>
}
