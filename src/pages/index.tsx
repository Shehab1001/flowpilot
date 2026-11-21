/**
 * Public FlowPilot landing — deliberately static and SSR-safe.
 * No auth provider, browser-only reads, animation libraries, or data fetches.
 */
import { Link } from 'react-router-dom'
import {
  Activity, ArrowRight, ArrowUpRight, BookOpen, Check, CheckCircle2,
  ChevronDown, Code2, GitBranch, Globe2, Layers3, LockKeyhole,
  MousePointer2, Play, ShieldCheck, Sparkles, Workflow, Zap,
} from 'lucide-react'
import { Seo } from '../components/Seo'
import { APP_NAME } from '../constants'
import { seo } from '../seo'

const features = [
  {
    icon: Workflow,
    color: 'text-indigo-300',
    surface: 'border-indigo-400/20 bg-indigo-400/10',
    heading: 'Visual workflow builder',
    description: 'Design your automation on a flexible canvas. Move nodes, zoom, pan, and keep your layout saved.',
    number: '01',
  },
  {
    icon: Activity,
    color: 'text-emerald-300',
    surface: 'border-emerald-400/20 bg-emerald-400/10',
    heading: 'Step-by-step debugging',
    description: 'Run a workflow and inspect each step’s status, output, errors, and execution time.',
    number: '02',
  },
  {
    icon: BookOpen,
    color: 'text-violet-300',
    surface: 'border-violet-400/20 bg-violet-400/10',
    heading: 'Ready-to-run templates',
    description: 'Start with built-in API and JSON examples. Explore a real pipeline before building your own.',
    number: '03',
  },
]

function Brand({ compact = false }: { compact?: boolean }) {
  return (
    <span className="inline-flex items-center gap-3">
      <span className="flex size-10 shrink-0 items-center justify-center rounded-[14px] bg-gradient-to-br from-[#a78bfa] via-[#7c5cff] to-[#6146e7] shadow-[0_7px_25px_rgba(115,83,248,.28)]">
        <Zap size={21} fill="white" className="text-white" aria-hidden="true" />
      </span>
      <span className="flex flex-col items-start leading-none">
        <span className="text-[18px] font-extrabold tracking-[-.045em] text-white">{APP_NAME}</span>
        {!compact && <span className="mt-1.5 text-[9px] font-semibold uppercase tracking-[.22em] text-[#77778a]">AUTOMATION STUDIO</span>}
      </span>
    </span>
  )
}

function NodeCard({
  icon: Icon, step, title, detail, tone,
}: {
  icon: typeof Globe2
  step: string
  title: string
  detail: string
  tone: 'blue' | 'purple'
}) {
  return (
    <div className="relative z-10 w-full max-w-[320px] rounded-2xl border border-white/[.12] bg-[#34343c] px-4 py-3.5 shadow-[0_16px_35px_rgba(0,0,0,.22)]">
      <div className="flex items-start gap-3">
        <div className={`flex size-10 shrink-0 items-center justify-center rounded-xl ${tone === 'blue' ? 'bg-sky-400/10 text-sky-300' : 'bg-violet-400/10 text-violet-300'}`}>
          <Icon size={20} aria-hidden="true" />
        </div>
        <div className="min-w-0 flex-1">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-semibold uppercase tracking-[.14em] text-neutral-500">{step}</span>
            <span className="rounded-md border border-white/[.08] px-1.5 py-0.5 text-[9px] text-neutral-400">{tone === 'blue' ? 'HTTP GET' : 'JSON TRANSFORM'}</span>
          </div>
          <h3 className="mt-1 text-[13px] font-bold text-white">{title}</h3>
          <p className="mt-1 truncate font-mono text-[10px] text-neutral-400" title={detail}>{detail}</p>
        </div>
        <CheckCircle2 size={15} className="mt-0.5 shrink-0 text-emerald-400" aria-label="Succeeded" />
      </div>
      <span className="absolute -left-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#34343c] bg-indigo-400" aria-hidden="true" />
      <span className="absolute -right-1.5 top-1/2 size-3 -translate-y-1/2 rounded-full border-[3px] border-[#34343c] bg-indigo-400" aria-hidden="true" />
    </div>
  )
}

/** Product preview is illustrative; it does not execute a workflow. */
function StudioPreview() {
  return (
    <div className="relative mx-auto w-full max-w-[610px]">
      <div className="pointer-events-none absolute -inset-7 rounded-[48px] bg-indigo-500/10 blur-[70px]" aria-hidden="true" />
      <div className="relative overflow-hidden rounded-[26px] border border-white/[.13] bg-[#26262c] shadow-[0_28px_90px_rgba(0,0,0,.45)]">
        <div className="flex items-center justify-between border-b border-white/[.08] bg-[#2b2b32] px-4 py-3.5 sm:px-5">
          <div className="flex items-center gap-2.5">
            <div className="flex items-center gap-1.5" aria-hidden="true">
              <span className="size-2.5 rounded-full bg-[#fa6e70]/80" />
              <span className="size-2.5 rounded-full bg-[#f8bf58]/80" />
              <span className="size-2.5 rounded-full bg-[#4fcf9c]/80" />
            </div>
            <span className="ml-2 h-4 w-px bg-white/10" aria-hidden="true"/>
            <span className="text-[11px] font-semibold text-neutral-300">Workflow editor</span>
          </div>
          <span className="rounded-md border border-white/[.1] bg-white/[.04] px-2 py-1 text-[9px] font-semibold uppercase tracking-widest text-neutral-500">Product preview</span>
        </div>

        <div className="border-b border-white/[.08] px-5 py-4 sm:px-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <div className="flex items-center gap-2">
                <GitBranch size={15} className="text-indigo-300" aria-hidden="true" />
                <span className="text-[13px] font-bold text-white">GitHub profile lookup</span>
              </div>
              <p className="mt-1 text-[10px] text-neutral-500">HTTP request → JSON field extraction</p>
            </div>
            <span className="inline-flex items-center gap-1.5 rounded-full border border-emerald-400/15 bg-emerald-400/10 px-2.5 py-1 text-[10px] font-semibold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Succeeded
            </span>
          </div>
        </div>

        <div className="relative overflow-hidden px-4 py-6 sm:px-8"
          style={{ backgroundImage: 'linear-gradient(rgba(255,255,255,.027) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,.027) 1px, transparent 1px)', backgroundSize: '22px 22px' }}>
          <div className="mx-auto flex max-w-[325px] flex-col items-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-emerald-400/25 bg-[#20372d] px-4 py-1.5 text-[11px] font-semibold text-emerald-300">
              <span className="size-1.5 rounded-full bg-emerald-400" /> Start
            </span>
            <span className="h-7 w-px bg-gradient-to-b from-emerald-400/60 to-indigo-400/70" aria-hidden="true" />
            <NodeCard icon={Globe2} step="Step 01" title="Fetch GitHub profile" detail="api.github.com/users/octocat" tone="blue" />
            <span className="h-8 w-px bg-indigo-400/70" aria-hidden="true" />
            <NodeCard icon={Code2} step="Step 02" title="Extract login" detail="field: login" tone="purple" />
            <span className="h-7 w-px bg-gradient-to-b from-indigo-400/70 to-emerald-400/50" aria-hidden="true" />
            <span className="inline-flex items-center gap-2 rounded-full border border-white/[.15] bg-[#34343a] px-4 py-1.5 text-[11px] font-semibold text-neutral-300">
              <Check size={13} className="text-emerald-400" aria-hidden="true" /> End
            </span>
          </div>
          <div className="pointer-events-none absolute bottom-4 left-4 hidden items-center gap-1.5 rounded-lg border border-white/[.07] bg-[#2d2d34]/90 px-3 py-2 text-[10px] text-neutral-400 sm:inline-flex">
            <MousePointer2 size={13} className="text-indigo-300" aria-hidden="true" /> Drag & drop canvas
          </div>
        </div>
        <div className="flex flex-wrap items-center justify-between gap-3 border-t border-white/[.08] bg-[#2b2b31] px-5 py-3.5 sm:px-6">
          <div className="flex min-w-0 items-center gap-2">
            <span className="flex size-7 shrink-0 items-center justify-center rounded-lg bg-emerald-400/10 text-emerald-300"><CheckCircle2 size={15} aria-hidden="true" /></span>
            <div className="min-w-0">
              <p className="text-[10px] font-semibold text-neutral-200">Execution output</p>
              <p className="truncate font-mono text-[11px] text-emerald-300">"octocat"</p>
            </div>
          </div>
          <span className="inline-flex items-center gap-1 text-[10px] text-neutral-500"><Activity size={13} aria-hidden="true" /> Step-level results</span>
        </div>
      </div>
    </div>
  )
}

export default function Landing() {
  return (
    <>
      <Seo {...seo} path="/" />
      <div data-testid="static-landing" className="relative isolate min-h-screen overflow-hidden bg-[#1c1c21] text-[#f5f5f7]">
        <div className="pointer-events-none absolute inset-x-0 top-0 -z-10 h-[750px]"
          style={{ backgroundImage: 'radial-gradient(ellipse 50% 52% at 68% 22%, rgba(118,81,250,.14), transparent 78%), radial-gradient(ellipse 45% 55% at 5% 5%, rgba(78,88,153,.11), transparent 80%)' }} aria-hidden="true"/>

        <header className="border-b border-white/[.07]">
          <div className="mx-auto flex h-[86px] max-w-[1240px] items-center justify-between gap-4 px-5 sm:px-8 lg:px-10">
            <Link to="/" aria-label="FlowPilot home" className="shrink-0"><Brand /></Link>
            <nav aria-label="Main navigation" className="hidden items-center gap-8 text-[13px] font-semibold text-neutral-400 md:flex">
              <a href="#features" className="transition-colors hover:text-white">Features</a>
              <a href="#how-it-works" className="transition-colors hover:text-white">How it works</a>
              <a href="https://github.com/Shehab1001/flowpilot" target="_blank" rel="noopener noreferrer" className="transition-colors hover:text-white">GitHub</a>
            </nav>
            <Link to="/workflows" className="inline-flex shrink-0 items-center gap-2 rounded-xl border border-white/[.11] bg-white/[.065] px-3 py-2.5 text-xs font-bold text-white transition-colors hover:border-indigo-400/40 hover:bg-white/[.10] sm:px-4">
              Open app <ArrowUpRight size={15} aria-hidden="true" />
            </Link>
          </div>
        </header>

        <main>
          <section className="mx-auto grid max-w-[1240px] items-center gap-12 px-5 pb-16 pt-16 sm:px-8 sm:pt-20 lg:grid-cols-[.92fr_1.08fr] lg:gap-16 lg:px-10 lg:pb-24 lg:pt-28" aria-labelledby="landing-heading">
            <div className="max-w-[600px]">
              <div className="mb-7 inline-flex max-w-full items-center gap-2 rounded-full border border-indigo-400/20 bg-indigo-400/[.08] px-3.5 py-2 text-[11px] font-bold uppercase tracking-[.12em] text-indigo-200">
                <Sparkles size={14} aria-hidden="true" /> Visual automation, made simple
              </div>
              <h1 id="landing-heading" className="text-[clamp(2.6rem,5vw,4.75rem)] font-extrabold leading-[1.12] tracking-[-.055em] text-white">
                Build workflows.<br />
                <span className="bg-gradient-to-r from-[#a5a5ff] via-[#9580ff] to-[#c39aff] bg-clip-text text-transparent">See every step.</span><br />
                Stay in control.
              </h1>
              <p className="mt-7 max-w-[490px] text-[15px] leading-[1.95] text-[#a5a5b3] sm:text-base">
                Meet {APP_NAME} — your visual workspace for building API automations, transforming JSON data, and understanding exactly what happens when a workflow runs.
              </p>
              <div className="mt-9 flex flex-wrap items-center gap-3">
                <Link to="/workflows" className="inline-flex items-center justify-center gap-2 rounded-[13px] bg-gradient-to-r from-[#6e62ff] to-[#9658f7] px-6 py-3.5 text-[13px] font-bold text-white shadow-[0_12px_32px_rgba(109,84,247,.25)] transition-transform hover:-translate-y-0.5 hover:shadow-[0_16px_35px_rgba(109,84,247,.34)]">
                  Open Workflow Studio <ArrowRight size={17} aria-hidden="true" />
                </Link>
                <a href="#features" className="inline-flex items-center justify-center gap-2 rounded-[13px] border border-white/[.13] bg-white/[.035] px-5 py-3.5 text-[13px] font-bold text-neutral-200 transition-colors hover:bg-white/[.08]">
                  Explore features <ChevronDown size={16} aria-hidden="true" />
                </a>
              </div>
              <div className="mt-10 flex flex-wrap gap-x-6 gap-y-3 text-[11px] font-semibold text-neutral-400">
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" /> Visual canvas</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" /> Execution history</span>
                <span className="inline-flex items-center gap-2"><CheckCircle2 size={15} className="text-emerald-400" aria-hidden="true" /> Ready-made templates</span>
              </div>
            </div>
            <StudioPreview />
          </section>

          <section id="features" className="relative border-t border-white/[.07] bg-[#202025]/80 py-20 sm:py-24" aria-labelledby="features-heading">
            <div className="mx-auto max-w-[1240px] px-5 sm:px-8 lg:px-10">
              <div className="max-w-2xl">
                <p className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-300">Everything in one workspace</p>
                <h2 id="features-heading" className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-white sm:text-[40px]">Build with clarity. Debug with confidence.</h2>
                <p className="mt-4 text-[14px] leading-7 text-neutral-400">A focused toolkit for designing, running, and reviewing your workflows without getting lost in the details.</p>
              </div>
              <div className="mt-10 grid gap-4 md:grid-cols-3">
                {features.map(({ icon: Icon, color, surface, heading, description, number }) => (
                  <article key={heading} className="group relative rounded-[22px] border border-white/[.09] bg-[#2b2b32] p-6 transition-colors hover:border-indigo-400/30 hover:bg-[#303038] sm:p-7">
                    <span className="absolute right-6 top-6 font-mono text-xs text-neutral-600">{number}</span>
                    <span className={`inline-flex size-12 items-center justify-center rounded-2xl border ${surface} ${color}`}><Icon size={22} aria-hidden="true"/></span>
                    <h3 className="mt-7 text-lg font-bold text-white">{heading}</h3>
                    <p className="mt-3 text-[13px] leading-7 text-[#a6a6b2]">{description}</p>
                  </article>
                ))}
              </div>
            </div>
          </section>

          <section id="how-it-works" className="mx-auto max-w-[1240px] px-5 py-20 sm:px-8 sm:py-24 lg:px-10" aria-labelledby="how-heading">
            <div className="grid items-center gap-12 lg:grid-cols-[.85fr_1.15fr] lg:gap-20">
              <div>
                <p className="text-[11px] font-bold uppercase tracking-[.2em] text-indigo-300">From idea to insight</p>
                <h2 id="how-heading" className="mt-3 text-3xl font-extrabold tracking-[-.04em] text-white sm:text-[40px]">Automation you can actually understand.</h2>
                <p className="mt-4 text-sm leading-8 text-neutral-400">Start from a template or build a flow yourself. Run it manually, then inspect every step of the journey.</p>
                <Link to="/workflows" className="mt-6 inline-flex items-center gap-2 text-[13px] font-bold text-indigo-300 transition-colors hover:text-indigo-200">Try it in the studio <ArrowRight size={16} aria-hidden="true"/></Link>
              </div>
              <div className="space-y-3">
                {[
                  { icon: Layers3, title: '01 / Create', text: 'Choose a template or add HTTP GET and JSON Transform nodes.' },
                  { icon: Play, title: '02 / Execute', text: 'Run each step in order through the secure, allowlisted engine.' },
                  { icon: ShieldCheck, title: '03 / Inspect', text: 'Review saved results, failures, and output previews per node.' },
                ].map(({ icon: Icon, title, text }) => (
                  <div key={title} className="flex items-center gap-4 rounded-2xl border border-white/[.08] bg-[#29292f] p-4 sm:p-5">
                    <span className="flex size-11 shrink-0 items-center justify-center rounded-xl bg-indigo-400/[.10] text-indigo-300"><Icon size={20} aria-hidden="true"/></span>
                    <div><h3 className="text-[13px] font-bold text-neutral-100">{title}</h3><p className="mt-1 text-xs leading-6 text-neutral-400">{text}</p></div>
                  </div>
                ))}
              </div>
            </div>
          </section>

          <section className="mx-auto max-w-[1240px] px-5 pb-20 sm:px-8 sm:pb-24 lg:px-10">
            <div className="relative overflow-hidden rounded-[26px] border border-indigo-400/20 bg-[#2b2940] px-6 py-12 text-center sm:px-10 sm:py-16"
              style={{ backgroundImage: 'radial-gradient(ellipse 60% 80% at 85% 0%, rgba(146,100,255,.17), transparent 75%)' }}>
              <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-indigo-300/15 bg-indigo-400/10 text-indigo-200"><Zap size={23} fill="currentColor" aria-hidden="true"/></div>
              <h2 className="mt-5 text-2xl font-extrabold tracking-[-.035em] text-white sm:text-4xl">Your next workflow starts here.</h2>
              <p className="mx-auto mt-3 max-w-lg text-[13px] leading-7 text-[#b6b3cc]">Open your workspace and turn an API request into a clear, repeatable automation.</p>
              <Link to="/workflows" className="mt-7 inline-flex items-center justify-center gap-2 rounded-xl bg-white px-6 py-3.5 text-[13px] font-bold text-[#292345] transition-colors hover:bg-[#eae6ff]">Launch FlowPilot <ArrowRight size={16} aria-hidden="true"/></Link>
            </div>
          </section>
        </main>

        <footer className="border-t border-white/[.07] bg-[#19191e]">
          <div className="mx-auto flex max-w-[1240px] flex-wrap items-center justify-between gap-5 px-5 py-7 sm:px-8 lg:px-10">
            <Brand compact />
            <span className="text-xs text-neutral-500">Visual workflow automation · Built with DeepSpace</span>
            <a href="https://github.com/Shehab1001/flowpilot" target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1.5 text-xs font-semibold text-neutral-400 transition-colors hover:text-white">View source <ArrowUpRight size={14} aria-hidden="true" /></a>
          </div>
        </footer>
      </div>
    </>
  )
}
