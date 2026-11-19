import { Link } from 'react-router-dom'
import { ArrowRight, GitBranch, Layers3, LockKeyhole } from 'lucide-react'
import { useAuthProfileReady } from 'deepspace'

export default function HomePage() {
  const { isSignedIn, user } = useAuthProfileReady({ requireUser: true })
  return (
    <main className="flex min-h-full items-center justify-center bg-[#0b1020] px-6 py-16 text-slate-100">
      <div className="w-full max-w-3xl text-center">
        <span className="inline-flex items-center gap-2 rounded-full border border-indigo-500/30 bg-indigo-500/10 px-4 py-2 text-xs font-semibold tracking-widest text-indigo-300">
          <GitBranch size={14}/> FLOWPILOT / WORKFLOW STUDIO
        </span>
        <h1 className="mt-8 text-4xl font-bold leading-tight tracking-tight sm:text-6xl">
          Automations, <span className="text-indigo-400">organized.</span>
        </h1>
        <p className="mx-auto mt-6 max-w-xl text-base leading-relaxed text-slate-400">
          Your workspace for building and managing repeatable workflows. Create pipelines,
          configure steps and keep everything in one place.
        </p>
        {isSignedIn && user && <p className="mt-4 text-sm text-slate-500">Welcome back, {user.name || user.email}.</p>}
        <Link to="/workflows" className="mt-9 inline-flex items-center gap-2 rounded-xl bg-indigo-500 px-6 py-3 font-semibold text-white transition-colors hover:bg-indigo-400">
          Open workflow studio <ArrowRight size={17}/>
        </Link>
        <div className="mt-14 grid gap-4 text-left sm:grid-cols-2">
          <div className="rounded-2xl border border-white/10 bg-[#151b2b] p-6"><Layers3 size={24} className="text-indigo-400"/><h2 className="mt-4 font-semibold">Build workflow definitions</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Add HTTP GET and JSON field selection steps to each workflow.</p></div>
          <div className="rounded-2xl border border-white/10 bg-[#151b2b] p-6"><LockKeyhole size={24} className="text-indigo-400"/><h2 className="mt-4 font-semibold">Your data, your workspace</h2><p className="mt-2 text-sm leading-relaxed text-slate-400">Authenticated DeepSpace actions validate ownership before editing records.</p></div>
        </div>
        <p className="mt-8 text-xs text-slate-500">Workflow execution and run history are planned for the next phase.</p>
      </div>
    </main>
  )
}
