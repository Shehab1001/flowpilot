import { useEffect, useRef, useState, type PointerEvent, type WheelEvent } from 'react'
import { Check, Code2, Focus, Globe2, Grip, Minus, Pencil, Plus, Trash2 } from 'lucide-react'
import { decodeStepConfig, type StoredRecord, type WorkflowStep } from '../lib/workflow-api'
import { resolveNodePositions, type NodeLayout, type NodePosition } from '../lib/workflow-layout'

type Props = {
  workflowId?: string
  steps: StoredRecord<WorkflowStep>[]
  nodeLayout?: unknown
  disabled?: boolean
  onAdd: () => void
  onEdit: (step: StoredRecord<WorkflowStep>) => void
  onDelete: (step: StoredRecord<WorkflowStep>) => void
  onSaveLayout?: (layout: NodeLayout) => Promise<void>
}

const NODE_WIDTH = 290
const NODE_HEIGHT = 154
const START = { x: 48, y: 250 }
const MIN_ZOOM = 0.4
const MAX_ZOOM = 1.6
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n))
const snap = (n: number) => Math.round(n / 12) * 12
const rounded = (point: NodePosition): NodePosition => ({
  x: clamp(snap(point.x), -10000, 10000),
  y: clamp(snap(point.y), -10000, 10000),
})

type Drag = {
  kind: 'node' | 'pan'
  nodeId?: string
  x: number
  y: number
  origin: NodePosition
  moved: boolean
}

/** Editable spatial layout. Edges reflect execution order, not arbitrary routing. */
export default function WorkflowCanvas({
  workflowId, steps, nodeLayout, disabled = false, onAdd, onEdit, onDelete, onSaveLayout,
}: Props) {
  const ordered = [...steps].sort((a, b) => a.data.position - b.data.position)
  const [positions, setPositions] = useState<NodeLayout>(() => resolveNodePositions(ordered, nodeLayout))
  const [pan, setPan] = useState<NodePosition>({ x: 25, y: 100 })
  const [zoom, setZoom] = useState(0.9)
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState('')
  const drag = useRef<Drag | null>(null)
  const viewportRef = useRef<HTMLDivElement>(null)
  const positionsRef = useRef(positions)
  positionsRef.current = positions

  const stepIds = ordered.map(item => item.recordId).join('|')
  useEffect(() => {
    const next = resolveNodePositions(steps, nodeLayout)
    positionsRef.current = next
    setPositions(next)
    setPan({ x: 25, y: 100 })
    setZoom(0.9)
    setSaveError('')
  // Refresh when workflow changes or new/deleted steps arrive. Do not
  // reset dragged positions on unrelated parent updates.
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workflowId, stepIds])

  function pointerDown(event: PointerEvent<HTMLElement>, kind: Drag['kind'], nodeId?: string) {
    if (event.button !== 0 || disabled || saving) return
    const origin = kind === 'node' && nodeId
      ? positionsRef.current[nodeId] ?? { x: 0, y: 0 }
      : pan
    drag.current = { kind, nodeId, x: event.clientX, y: event.clientY, origin, moved: false }
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerMove(event: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d) return
    const dx = event.clientX - d.x
    const dy = event.clientY - d.y
    if (Math.abs(dx) + Math.abs(dy) > 3) d.moved = true
    if (d.kind === 'pan') {
      setPan({ x: d.origin.x + dx, y: d.origin.y + dy })
    } else if (d.nodeId) {
      const point = rounded({ x: d.origin.x + dx / zoom, y: d.origin.y + dy / zoom })
      setPositions(previous => ({ ...previous, [d.nodeId!]: point }))
    }
  }

  async function pointerUp(event: PointerEvent<HTMLElement>) {
    const d = drag.current
    if (!d) return
    drag.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (d.kind !== 'node' || !d.nodeId || !d.moved || !onSaveLayout || disabled) return
    // Calculate the final position from pointer-up coordinates: React may not
    // have committed the last pointer-move state before this handler runs.
    const finalPosition = rounded({
      x: d.origin.x + (event.clientX - d.x) / zoom,
      y: d.origin.y + (event.clientY - d.y) / zoom,
    })
    const latest = { ...positionsRef.current, [d.nodeId]: finalPosition }
    positionsRef.current = latest
    setPositions(latest)
    setSaving(true)
    setSaveError('')
    try {
      await onSaveLayout(latest)
    } catch (error) {
      setSaveError(error instanceof Error ? error.message : 'Could not save node positions')
    } finally {
      setSaving(false)
    }
  }

  function zoomTo(value: number) { setZoom(clamp(value, MIN_ZOOM, MAX_ZOOM)) }
  function onWheel(event: WheelEvent<HTMLDivElement>) {
    // Keep wheel zoom explicit with Ctrl so ordinary page scrolling still works.
    if (!event.ctrlKey) return
    event.preventDefault()
    zoomTo(zoom * (event.deltaY < 0 ? 1.12 : 0.89))
  }

  const positionOf = (id: string, index: number) => positions[id] ?? { x: 280 + index * 360, y: 210 }
  const first = ordered.length ? positionOf(ordered[0].recordId, 0) : { x: 300, y: 210 }
  const last = ordered.length ? positionOf(ordered[ordered.length - 1].recordId, ordered.length - 1) : first
  const end = { x: last.x + NODE_WIDTH + 155, y: last.y + NODE_HEIGHT / 2 - 22 }
  const connectors = [
    { from: { x: START.x + 112, y: START.y + 22 }, to: { x: first.x, y: first.y + NODE_HEIGHT / 2 }, key: 'start' },
    ...ordered.slice(0, -1).map((step, index) => {
      const a = positionOf(step.recordId, index)
      const b = positionOf(ordered[index + 1].recordId, index + 1)
      return {
        from: { x: a.x + NODE_WIDTH, y: a.y + NODE_HEIGHT / 2 },
        to: { x: b.x, y: b.y + NODE_HEIGHT / 2 },
        key: step.recordId,
      }
    }),
    { from: { x: last.x + NODE_WIDTH, y: last.y + NODE_HEIGHT / 2 }, to: { x: end.x, y: end.y + 22 }, key: 'end' },
  ]

  return (
    <div className="mt-5 overflow-hidden rounded-[20px] border border-white/10 bg-[#292929]">
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-white/10 bg-[#303030] px-4 py-3 sm:px-5">
        <div className="flex flex-wrap items-center gap-2 text-xs font-semibold text-neutral-300">
          <span className="size-2 rounded-full bg-emerald-400" aria-hidden />
          Design canvas
          <span className="rounded-lg bg-white/5 px-2 py-1 font-normal text-neutral-400">{ordered.length} / 20 steps</span>
          <span className="text-[11px] font-normal text-neutral-500">{saving ? 'Saving layout...' : 'Drag nodes to arrange · drag background to pan'}</span>
        </div>
        <div className="flex items-center gap-1 rounded-xl border border-white/10 bg-[#292929] p-1">
          <button type="button" onClick={() => zoomTo(zoom - 0.15)} aria-label="Zoom out" title="Zoom out"
            className="rounded-lg p-1.5 text-neutral-300 hover:bg-white/10"><Minus size={15}/></button>
          <span className="min-w-12 text-center text-xs tabular-nums text-neutral-300">{Math.round(zoom * 100)}%</span>
          <button type="button" onClick={() => zoomTo(zoom + 0.15)} aria-label="Zoom in" title="Zoom in"
            className="rounded-lg p-1.5 text-neutral-300 hover:bg-white/10"><Plus size={15}/></button>
          <button type="button" onClick={() => { setPan({ x: 25, y: 100 }); setZoom(0.9) }}
            aria-label="Reset view" title="Reset view" className="rounded-lg p-1.5 text-neutral-300 hover:bg-white/10"><Focus size={15}/></button>
        </div>
      </div>
      {saveError && <p role="alert" className="border-b border-rose-500/20 bg-rose-500/10 px-4 py-2 text-xs text-rose-300">{saveError}</p>}
      <div ref={viewportRef} aria-label="Draggable workflow canvas" onWheel={onWheel}
        className="workflow-canvas-grid relative h-[640px] overflow-hidden select-none touch-none"
        onPointerDown={event => { if (event.target === event.currentTarget) pointerDown(event, 'pan') }}
        onPointerMove={pointerMove} onPointerUp={event => { void pointerUp(event) }}
        onPointerCancel={() => { drag.current = null }}>
        <div className="absolute left-0 top-0 origin-top-left"
          style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})` }}>
          <svg className="pointer-events-none absolute left-0 top-0 overflow-visible" width="1" height="1" aria-hidden>
            {connectors.map(({ from, to, key }) => {
              const bend = Math.max(80, Math.abs(to.x - from.x) * 0.45)
              return <path key={key}
                d={`M ${from.x} ${from.y} C ${from.x + bend} ${from.y}, ${to.x - bend} ${to.y}, ${to.x} ${to.y}`}
                fill="none" stroke="#818cf8" strokeOpacity=".72" strokeWidth="2.5"/>
            })}
          </svg>
          <div className="absolute flex h-11 w-28 items-center justify-center gap-2 rounded-full border border-emerald-400/30 bg-[#243a31] text-xs font-semibold text-emerald-300"
            style={{ left: START.x, top: START.y }}><span className="size-2 rounded-full bg-emerald-400"/>Start</div>
          {ordered.map((step, index) => {
            const p = positionOf(step.recordId, index)
            const http = step.data.type === 'http_get'
            return (
              <article key={step.recordId} aria-label={`Node ${step.data.label}`}
                onPointerDown={event => { event.stopPropagation(); pointerDown(event, 'node', step.recordId) }}
                onPointerMove={pointerMove} onPointerUp={event => { void pointerUp(event) }}
                onPointerCancel={() => { drag.current = null }}
                style={{ left: p.x, top: p.y, width: NODE_WIDTH, height: NODE_HEIGHT, touchAction: 'none' }}
                className="absolute cursor-grab rounded-2xl border border-white/15 bg-[#373737] p-4 shadow-[0_12px_24px_rgba(0,0,0,.24)] hover:border-indigo-400/60 active:cursor-grabbing">
                <span className="absolute -left-2 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#292929] bg-indigo-400" aria-hidden/>
                <span className="absolute -right-2 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#292929] bg-indigo-400" aria-hidden/>
                <div className="flex items-start gap-3">
                  <span className={`flex size-9 shrink-0 items-center justify-center rounded-xl ${http ? 'bg-sky-400/10 text-sky-300' : 'bg-violet-400/10 text-violet-300'}`}>
                    {http ? <Globe2 size={19}/> : <Code2 size={19}/>}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <span className="text-[10px] font-semibold uppercase tracking-widest text-neutral-500">Step {index + 1}</span>
                      <span className="rounded-full border border-white/10 px-1.5 py-0.5 text-[10px] text-neutral-400">{http ? 'HTTP GET' : 'JSON transform'}</span>
                    </div>
                    <h4 className="truncate text-sm font-semibold text-neutral-100">{step.data.label}</h4>
                    <p className="mt-2 truncate font-mono text-[11px] text-neutral-400" title={decodeStepConfig(step.data)}>{decodeStepConfig(step.data)}</p>
                  </div>
                  <Grip size={14} className="shrink-0 text-neutral-500" aria-hidden/>
                </div>
                <div className="absolute inset-x-4 bottom-3 flex items-center justify-end gap-2 border-t border-white/10 pt-2">
                  <button type="button" disabled={disabled || saving} onPointerDown={event => event.stopPropagation()}
                    onClick={() => onEdit(step)} aria-label={`Edit ${step.data.label}`}
                    className="flex items-center gap-1.5 rounded-lg border border-white/10 px-2.5 py-1.5 text-xs text-neutral-200 hover:bg-indigo-400/10 disabled:opacity-50"><Pencil size={13}/>Edit</button>
                  <button type="button" disabled={disabled || saving} onPointerDown={event => event.stopPropagation()}
                    onClick={() => onDelete(step)} aria-label={`Delete ${step.data.label}`}
                    className="flex items-center gap-1.5 rounded-lg border border-rose-500/15 px-2.5 py-1.5 text-xs text-rose-300 hover:bg-rose-500/10 disabled:opacity-50"><Trash2 size={13}/>Delete</button>
                </div>
              </article>
            )
          })}
          <div className="absolute flex h-11 w-28 items-center justify-center gap-2 rounded-full border border-white/20 bg-[#343434] text-xs font-semibold text-neutral-300"
            style={{ left: end.x, top: end.y }}><Check size={14} className="text-emerald-400"/>End</div>
        </div>
        <div className="absolute bottom-4 left-4 flex flex-wrap gap-2">
          {ordered.length < 20 && <button type="button" disabled={disabled || saving} onPointerDown={event => event.stopPropagation()}
            onClick={onAdd} className="flex items-center gap-2 rounded-xl border border-indigo-400/40 bg-[#38354b] px-4 py-2.5 text-xs font-semibold text-indigo-200 shadow-lg hover:bg-indigo-500/20 disabled:opacity-50">
            <Plus size={16}/> Add next step
          </button>}
          {ordered.length === 0 && <span className="self-center text-xs text-neutral-400">Add your first node to start building.</span>}
        </div>
      </div>
      <div className="border-t border-white/10 bg-[#303030] px-4 py-2 text-[11px] text-neutral-500">
        Drag cards to arrange · Drag empty canvas to pan · Ctrl + scroll to zoom · Connections follow execution order
      </div>
    </div>
  )
}
