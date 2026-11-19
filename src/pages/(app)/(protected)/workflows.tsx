import { useCallback, useEffect, useState, type FormEvent } from 'react'
import { Button, Card } from '@heroui/react'
import {
  Activity, ArrowRight, CheckCircle2, ChevronRight, CirclePause, Code2, Database, Clock3, Sparkles,
  GitBranch, Globe2, Loader2, Plus, RefreshCw, Search, Trash2, Workflow as WorkflowIcon, X,
} from 'lucide-react'
import {
  callWorkflowAction, decodeStepConfig, fetchSteps, fetchWorkflows,
  type StoredRecord, type StepType, type Workflow, type WorkflowStatus, type WorkflowStep,
} from '../../../lib/workflow-api'

type RecordWithId<T> = StoredRecord<T>

const statusStyles: Record<WorkflowStatus, string> = {
  draft: 'border-slate-500/20 bg-slate-500/10 text-slate-400',
  active: 'border-emerald-500/25 bg-emerald-500/10 text-emerald-400',
  paused: 'border-amber-500/25 bg-amber-500/10 text-amber-400',
}
const panel = 'rounded-[22px] border border-white/[0.075] bg-[#151b2b]/90 shadow-[0_14px_42px_-24px_rgba(0,0,0,0.65)] backdrop-blur-xl'
const field = 'w-full rounded-xl border border-white/[0.09] bg-[#0e1422]/90 px-4 py-3 text-sm text-slate-100 outline-none ring-0 transition-all placeholder:text-slate-600 focus:border-indigo-400/70 focus:ring-2 focus:ring-indigo-500/10'
const primary = 'inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-500 px-4 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-indigo-400 disabled:cursor-not-allowed disabled:opacity-50'
const secondary = 'inline-flex items-center justify-center gap-2 rounded-xl border border-white/10 px-4 py-2.5 text-sm font-medium text-slate-300 transition-colors hover:border-indigo-400/50 hover:text-white disabled:opacity-50'
const message = (error: unknown) => error instanceof Error ? error.message : 'Something went wrong.'

export default function WorkflowsPage() {
  const [workflows, setWorkflows] = useState<RecordWithId<Workflow>[]>([])
  const [steps, setSteps] = useState<RecordWithId<WorkflowStep>[]>([])
  const [selected, setSelected] = useState<string | null>(null)
  const [search, setSearch] = useState('')
  const [loading, setLoading] = useState(true)
  const [stepsLoading, setStepsLoading] = useState(false)
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  const [notice, setNotice] = useState('')
  const [createOpen, setCreateOpen] = useState(false)
  const [stepOpen, setStepOpen] = useState(false)
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [stepLabel, setStepLabel] = useState('')
  const [stepType, setStepType] = useState<StepType>('http_get')
  const [stepConfig, setStepConfig] = useState('https://jsonplaceholder.typicode.com/todos/1')

  const refresh = useCallback(async () => {
    setLoading(true)
    try {
      const result = await fetchWorkflows()
      setWorkflows(result.records)
      setSelected(current => current && result.records.some(row => row.recordId === current) ? current : result.records[0]?.recordId ?? null)
      setError('')
    } catch (err) { setError(message(err)) }
    finally { setLoading(false) }
  }, [])

  const refreshSteps = useCallback(async (workflowId: string) => {
    setStepsLoading(true)
    setSteps([])
    try {
      const result = await fetchSteps(workflowId)
      setSteps(result.records.sort((a, b) => a.data.position - b.data.position))
      setError('')
    } catch (err) { setError(message(err)) }
    finally { setStepsLoading(false) }
  }, [])

  useEffect(() => { void refresh() }, [refresh])
  useEffect(() => {
    if (selected) void refreshSteps(selected)
    else setSteps([])
  }, [selected, refreshSteps])

  async function mutate(operation: () => Promise<unknown>, success: string, reloadSteps = false) {
    setBusy(true)
    setError('')
    setNotice('')
    try {
      await operation()
      setNotice(success)
      await refresh()
      if (reloadSteps && selected) await refreshSteps(selected)
      return true
    } catch (err) {
      setError(message(err))
      return false
    } finally { setBusy(false) }
  }
  async function createWorkflow(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    const ok = await mutate(() => callWorkflowAction('createWorkflow', { name, description }), 'Workflow created successfully.')
    if (ok) { setCreateOpen(false); setName(''); setDescription('') }
  }
  async function createStep(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!selected) return
    const usedPositions = new Set(steps.map(item => item.data.position))
    let position = 0
    while (usedPositions.has(position)) position++
    const config = stepType === 'http_get' ? { url: stepConfig.trim() } : { field: stepConfig.trim() }
    const ok = await mutate(
      () => callWorkflowAction('createStep', { workflowId: selected, label: stepLabel, type: stepType, position, config }),
      'Step added successfully.', true,
    )
    if (ok) { setStepOpen(false); setStepLabel('') }
  }
  const current = workflows.find(w => w.recordId === selected)
  const filtered = workflows.filter(w => (w.data.name + ' ' + w.data.description).toLowerCase().includes(search.toLowerCase()))
  const active = workflows.filter(w => w.data.status === 'active').length

  return (
    <div className="min-h-full bg-[radial-gradient(ellipse_at_92%_0%,rgba(99,102,241,0.10),transparent_38%),#0b1020] text-slate-100">
      <div className="mx-auto max-w-[1450px] px-5 py-8 sm:px-8 lg:px-10 lg:py-11">
        <header className="mb-8 flex flex-col justify-between gap-5 border-b border-white/[0.06] pb-7 sm:flex-row sm:items-center">
          <div>
            <div className="mb-3 flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.22em] text-indigo-400">
              <span className="flex size-7 items-center justify-center rounded-lg bg-indigo-500/15"><Sparkles size={14}/></span> WORKSPACE / AUTOMATIONS
            </div>
            <h1 className="text-3xl font-bold tracking-[-0.035em] sm:text-[38px]">Workflow studio<span className="text-indigo-400">.</span></h1>
            <p className="mt-2 text-sm text-slate-400">Build powerful automations with a clear, focused workspace.</p>
          </div>
          <Button variant="primary" className="rounded-xl bg-gradient-to-r from-indigo-500 to-violet-500 px-5 font-semibold text-white shadow-lg shadow-indigo-500/20 hover:from-indigo-400 hover:to-violet-400" onPress={() => setCreateOpen(true)}><Plus size={17}/> New workflow</Button>
        </header>

        {error && <div role="alert" className="mb-5 flex items-start justify-between gap-3 rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-300"><span>{error}</span><button aria-label="Dismiss error" onClick={() => setError('')}><X size={16}/></button></div>}
        {notice && <div role="status" className="mb-5 flex items-center gap-2 rounded-xl border border-emerald-500/20 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300"><CheckCircle2 size={16}/>{notice}</div>}

        <section className="mb-7 grid gap-4 sm:grid-cols-3" aria-label="Workspace statistics">
          <Metric icon={<WorkflowIcon size={21}/>} label="Total workflows" value={workflows.length} />
          <Metric icon={<Activity size={21}/>} label="Active" value={active} />
          <Metric icon={<CirclePause size={21}/>} label="Draft & paused" value={workflows.length - active} />
        </section>

        <div className="grid gap-5 xl:grid-cols-[minmax(0,0.85fr)_minmax(0,1.15fr)]">
          <Card className={panel + ' overflow-hidden'}>
            <div className="border-b border-white/[0.07] p-5 sm:p-6">
              <div className="flex items-center justify-between"><div><h2 className="text-base font-semibold">Your workflows</h2><p className="mt-1 text-xs text-slate-500">Select a workflow to manage</p></div><button className={secondary + ' !px-2 !py-2'} aria-label="Refresh workflows" disabled={loading} onClick={() => void refresh()}><RefreshCw size={16} className={loading ? 'animate-spin' : ''}/></button></div>
              <div className="relative mt-4"><Search size={17} className="absolute left-3 top-3 text-slate-500"/><input aria-label="Search workflows" className={field + ' !py-2.5 !pl-10'} placeholder="Search workflows..." value={search} onChange={e => setSearch(e.target.value)}/></div>
            </div>
            <div className="max-h-[620px] space-y-2 overflow-y-auto p-3 sm:p-4">
              {loading ? <Loading label="Loading workflows..." /> : filtered.length === 0
                ? <Empty icon={<Database size={26}/>} title={search ? 'No matching workflows' : 'No workflows yet'} description={search ? 'Try another search term.' : 'Create your first workflow to start building.'}/>
                : filtered.map(w => (
                  <button key={w.recordId} onClick={() => setSelected(w.recordId)} className={`w-full rounded-xl border p-4 text-left transition-colors ${selected === w.recordId ? 'border-indigo-400/40 bg-gradient-to-r from-indigo-500/15 to-violet-500/[0.04] shadow-[inset_3px_0_0_#818cf8]' : 'border-white/[0.04] bg-white/[0.018] hover:border-white/15 hover:bg-white/[0.045]'}`}>
                    <div className="flex items-center justify-between gap-3"><span className="truncate font-semibold">{w.data.name}</span><ChevronRight size={17} className="shrink-0 text-slate-500"/></div>
                    <p className="mt-2 line-clamp-2 text-xs text-slate-400">{w.data.description || 'No description provided.'}</p>
                    <span className={`mt-3 inline-flex rounded-full border px-2.5 py-1 text-[11px] font-medium capitalize ${statusStyles[w.data.status] ?? statusStyles.draft}`}>{w.data.status}</span>
                  </button>
                ))}
            </div>
          </Card>

          <Card className={panel + ' min-h-[410px] p-5 sm:p-6'}>
            {!current ? <Empty icon={<GitBranch size={30}/>} title="Select a workflow" description="Choose a workflow to view and edit its steps."/> : (
              <>
                <div className="flex flex-wrap items-start justify-between gap-4 border-b border-white/[0.06] pb-6">
                  <div className="min-w-0"><p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-widest text-indigo-400"><GitBranch size={14}/> Workflow details</p><h2 className="mt-2 break-words text-2xl font-bold">{current.data.name}</h2><p className="mt-2 text-sm text-slate-400">{current.data.description || 'Add automation steps to this workflow.'}</p></div>
                  <button aria-label="Delete workflow" title="Delete workflow" className={secondary + ' !px-3 text-rose-400 hover:text-rose-300'} disabled={busy} onClick={() => { if (window.confirm('Delete this workflow and all its steps? This cannot be undone.')) void mutate(() => callWorkflowAction('deleteWorkflow', { workflowId: current.recordId }), 'Workflow deleted.') }}><Trash2 size={17}/></button>
                </div>
                <div className="mt-5 flex flex-wrap items-center gap-3 rounded-xl border border-white/[0.06] bg-white/[0.025] px-4 py-3">
                  <label htmlFor="workflow-status" className="text-sm text-slate-400">Status</label>
                  <select id="workflow-status" className={field + ' !w-auto !py-2'} disabled={busy} value={current.data.status} onChange={e => void mutate(() => callWorkflowAction('updateWorkflow', { workflowId: current.recordId, status: e.target.value }), 'Status updated.')}>
                    <option value="draft">Draft</option><option value="active">Active (definition only)</option><option value="paused">Paused</option>
                  </select>
                  <span className="ml-auto text-xs text-slate-500">Execution engine coming next</span>
                </div>
                <div className="mt-7 flex items-center justify-between gap-3"><div><h3 className="font-semibold">Workflow steps</h3><p className="mt-1 text-xs text-slate-500">Build your pipeline, one step at a time</p></div><button className={secondary} onClick={() => { setStepOpen(true); setStepConfig('https://jsonplaceholder.typicode.com/todos/1') }}><Plus size={16}/> Add step</button></div>
                {stepsLoading ? <Loading label="Loading steps..." /> : steps.length === 0 ? <Empty icon={<Code2 size={24}/>} title="No steps added" description="Start with an HTTP GET or JSON field selector."/> : (
                  <div className="relative mt-6 space-y-3 before:absolute before:bottom-4 before:left-8 before:top-4 before:w-px before:bg-indigo-500/20">{steps.map((step, index) => (
                    <div key={step.recordId} className="relative flex items-start gap-3 rounded-2xl border border-white/[0.08] bg-[#1b2233] p-4 shadow-[0_7px_20px_-14px_rgba(0,0,0,0.65)] transition-colors hover:border-indigo-400/25">
                      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-indigo-500/15 text-xs font-bold text-indigo-300">{index + 1}</span>
                      <div className="min-w-0 flex-1"><div className="flex items-center gap-2">{step.data.type === 'http_get' ? <Globe2 size={15} className="text-sky-400"/> : <Code2 size={15} className="text-violet-400"/>}<p className="truncate text-sm font-semibold">{step.data.label}</p></div><p className="mt-1 text-xs text-slate-500">{step.data.type === 'http_get' ? 'HTTP GET' : 'JSON transform'}</p><p className="mt-2 truncate font-mono text-xs text-slate-400">{decodeStepConfig(step.data)}</p></div>
                      <button aria-label={`Delete ${step.data.label}`} className="text-slate-500 transition-colors hover:text-rose-400" disabled={busy} onClick={() => { if (window.confirm('Delete this step?')) void mutate(() => callWorkflowAction('deleteStep', { stepId: step.recordId }), 'Step deleted.', true) }}><Trash2 size={16}/></button>
                    </div>
                  ))}</div>
                )}
              </>
            )}
          </Card>
        </div>

        <p className="mt-8 flex flex-wrap items-center gap-2 text-xs text-slate-500"><CheckCircle2 size={14}/> Connected to DeepSpace authenticated server actions <ArrowRight size={14}/> Workflow execution is not enabled yet.</p>
      </div>

      {createOpen && <Modal title="Create workflow" onClose={() => setCreateOpen(false)}>
        <form className="space-y-4" onSubmit={e => void createWorkflow(e)}>
          <label className="block space-y-2 text-sm">Workflow name<input className={field} required maxLength={100} autoFocus value={name} onChange={e => setName(e.target.value)} placeholder="e.g. Weekly report automation"/></label>
          <label className="block space-y-2 text-sm">Description<textarea className={field} maxLength={500} value={description} onChange={e => setDescription(e.target.value)} placeholder="What should this workflow do?" rows={3}/></label>
          <button type="submit" disabled={busy} className={primary + ' w-full'}>{busy ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Create workflow</button>
        </form>
      </Modal>}
      {stepOpen && <Modal title="Add workflow step" onClose={() => setStepOpen(false)}>
        <form className="space-y-4" onSubmit={e => void createStep(e)}>
          <label className="block space-y-2 text-sm">Step name<input autoFocus className={field} required maxLength={100} value={stepLabel} onChange={e => setStepLabel(e.target.value)} placeholder="e.g. Fetch sample data"/></label>
          <label className="block space-y-2 text-sm">Step type<select className={field} value={stepType} onChange={e => { const next = e.target.value as StepType; setStepType(next); setStepConfig(next === 'http_get' ? 'https://jsonplaceholder.typicode.com/todos/1' : 'title') }}><option value="http_get">HTTP GET</option><option value="json_transform">JSON field selector</option></select></label>
          <label className="block space-y-2 text-sm">{stepType === 'http_get' ? 'HTTPS URL' : 'JSON field name'}<input required className={field} value={stepConfig} onChange={e => setStepConfig(e.target.value)} placeholder={stepType === 'http_get' ? 'https://api.github.com/users/octocat' : 'title'}/></label>
          <p className="text-xs leading-relaxed text-slate-500">{stepType === 'http_get' ? 'Allowed hosts: api.github.com or jsonplaceholder.typicode.com.' : 'Select a single JSON property. Running steps will be added in the next phase.'}</p>
          <button className={primary + ' w-full'} type="submit" disabled={busy}>{busy ? <Loader2 size={16} className="animate-spin"/> : <Plus size={16}/>} Add step</button>
        </form>
      </Modal>}
    </div>
  )
}

function Metric({ icon, label, value }: { icon: React.ReactNode; label: string; value: number }) {
  return <Card className={panel + ' group flex items-center gap-4 p-5 transition-all duration-200 hover:-translate-y-0.5 hover:border-indigo-400/20 sm:p-6'}><div className="rounded-2xl bg-gradient-to-br from-indigo-500/20 to-violet-500/10 p-3.5 text-indigo-300 ring-1 ring-inset ring-indigo-400/10">{icon}</div><div><p className="text-xs text-slate-400">{label}</p><p className="mt-1 text-[30px] font-bold tracking-tight tabular-nums">{value}</p></div></Card>
}
function Loading({ label }: { label: string }) {
  return <div role="status" className="flex items-center justify-center gap-3 p-14 text-sm text-slate-400"><Loader2 size={19} className="animate-spin"/>{label}</div>
}
function Empty({ icon, title, description }: { icon: React.ReactNode; title: string; description: string }) {
  return <div className="flex min-h-44 flex-col items-center justify-center px-6 py-12 text-center"><div className="mb-4 rounded-2xl bg-white/5 p-4 text-indigo-300">{icon}</div><h3 className="text-sm font-semibold">{title}</h3><p className="mt-2 max-w-xs text-xs leading-relaxed text-slate-500">{description}</p></div>
}
function Modal({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return <div role="presentation" className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 p-4" onMouseDown={e => { if (e.target === e.currentTarget) onClose() }}><div role="dialog" aria-modal="true" aria-label={title} className="w-full max-w-md rounded-[26px] border border-white/10 bg-[#151b2b] p-7 text-slate-100 shadow-[0_30px_100px_rgba(0,0,0,0.6)]"><div className="mb-6 flex items-center justify-between"><h2 className="text-xl font-semibold">{title}</h2><button aria-label="Close" onClick={onClose}><X size={19}/></button></div>{children}</div></div>
}
