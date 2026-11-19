/**
 * Top nav — minimal placeholder bar wired to the app's mechanisms:
 * nav.ts-driven links (with role/dev filtering), sign-in via <AuthOverlay>,
 * and sign-out. Restyle or rebuild it freely; keep the data-testid hooks
 * (`app-navigation`, `nav-sign-in-button`, `nav-user-name`, `nav-user-email`)
 * — the shipped tests rely on them. `nav-user-email` is the one that carries
 * an identity the test can check exactly: a display name is optional, the
 * email is the credential the session was opened with.
 */

import { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { AuthOverlay, useAuthProfileReady, signOut } from 'deepspace'
import { ChevronDown, LayoutDashboard, LogOut, Menu, Settings2, Workflow, X, Zap } from 'lucide-react'
import { APP_NAME } from '../constants'
import type { Role } from '../constants'
import { cn } from '../lib/utils'
import { nav } from '../nav'
import {
  Avatar,
  AvatarFallback,
  AvatarImage,
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from './ui'

export default function Navigation() {
  const { isLoaded, isSignedIn, user, userLoading } = useAuthProfileReady({ requireUser: true })
  const location = useLocation()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [showAuthModal, setShowAuthModal] = useState(false)

  const profileReady = !isSignedIn || (!userLoading && !!user)
  const userRole = (user?.role ?? 'anonymous') as Role | 'anonymous'

  // Close the mobile menu when navigating
  useEffect(() => {
    setMobileMenuOpen(false)
  }, [location.pathname])

  const visibleNav = nav.filter((item) => {
    if (item.devOnly && !import.meta.env.DEV) return false
    if (!item.roles) return true
    if (!profileReady) return false
    if (userRole === 'admin') return true
    return item.roles.includes(userRole as Role)
  })

  const navLink = (item: (typeof nav)[number]) => {
    const Icon = item.path === '/workflows' ? Workflow : item.path === '/settings' ? Settings2 : LayoutDashboard
    const active = location.pathname.startsWith(item.path)
    return (
      <Link
        key={item.path}
        to={item.path}
        aria-current={active ? 'page' : undefined}
        className={cn(
          'group flex items-center gap-3 rounded-xl px-3.5 py-3 text-sm font-medium transition-all duration-200',
          active ? 'bg-indigo-500/12 text-indigo-200 ring-1 ring-inset ring-indigo-400/20 shadow-[inset_3px_0_0_#818cf8]' : 'text-slate-400 hover:bg-white/[0.06] hover:text-white',
        )}
      >
        <Icon size={18} className={active ? 'text-indigo-400' : 'text-slate-500 group-hover:text-slate-200'} aria-hidden />
        {item.label}
      </Link>
    )
  }

  return (
    <>
      <nav data-testid="app-navigation" className="z-30 flex w-full shrink-0 flex-col border-b border-white/[0.08] bg-[#0d1220] text-slate-100 md:h-full md:w-[246px] md:border-b-0 md:border-r">
        <div className="flex h-18 items-center justify-between border-b border-white/[0.08] px-5 py-4">
          <Link to="/home" className="flex items-center gap-3">
            <span className="flex size-10 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-400 via-violet-500 to-purple-700 shadow-lg shadow-indigo-500/20"><Zap className="size-5 text-white" fill="currentColor" aria-hidden /></span>
            <span className="flex flex-col"><span className="text-base font-bold tracking-tight">${APP_NAME}</span><span className="text-[10px] font-semibold uppercase tracking-[0.2em] text-slate-500">Automation hub</span></span>
          </Link>
          <button className="rounded-lg p-2 text-slate-400 hover:bg-white/5 md:hidden" onClick={() => setMobileMenuOpen(prev => !prev)} aria-label="Toggle menu" aria-expanded={mobileMenuOpen}>{mobileMenuOpen ? <X size={20}/> : <Menu size={20}/>}</button>
        </div>
        <div className={`${mobileMenuOpen ? 'flex' : 'hidden'} min-h-0 flex-1 flex-col px-3 pb-5 pt-6 md:flex`}>
          <div className="px-3.5 pb-3 text-[10px] font-bold uppercase tracking-[0.2em] text-slate-500">Workspace</div>
          <div className="space-y-1">{visibleNav.map(navLink)}</div>
          <div className="mt-auto hidden px-2 pt-8 md:block">
            <div className="rounded-2xl border border-indigo-400/15 bg-gradient-to-br from-indigo-500/[0.13] to-purple-500/[0.04] p-4">
              <div className="mb-3 flex size-9 items-center justify-center rounded-xl bg-indigo-500/15 text-indigo-300"><Zap size={18}/></div>
              <p className="text-xs font-semibold text-slate-200">Build with FlowPilot</p>
              <p className="mt-1 text-xs leading-5 text-slate-500">Create workflows, connect steps, and stay organized.</p>
            </div>
          </div>
        </div>
        <div className={`${mobileMenuOpen ? 'block' : 'hidden'} border-t border-white/[0.08] p-3 md:block`}>
          {!isLoaded ? null : isSignedIn && !profileReady ? (
            /* Signed in, profile still loading — skeleton pill, never the
               Sign in button (that would offer sign-in to a signed-in user). */
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5">
              <div className="h-6 w-6 animate-pulse rounded-full bg-muted" />
              <div className="hidden h-4 w-20 animate-pulse rounded-md bg-muted sm:block" />
            </div>
          ) : isSignedIn && user ? (
            <DropdownMenu>
              <DropdownMenuTrigger
                render={
                  <button
                    aria-label="Account menu"
                    className="group flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.04] py-1 pl-1 pr-2.5 text-sm transition-colors hover:bg-white/[0.08]"
                  >
                    <Avatar className="h-6 w-6 ring-1 ring-inset ring-border">
                      <AvatarImage src={user.imageUrl ?? undefined} referrerPolicy="no-referrer" />
                      <AvatarFallback className="text-[11px]">
                        {(user.name?.[0] ?? user.email?.[0] ?? '?').toUpperCase()}
                      </AvatarFallback>
                    </Avatar>
                    <span
                      data-testid="nav-user-name"
                      className="hidden max-w-[140px] truncate text-slate-100 sm:inline"
                    >
                      {user.name || user.email}
                    </span>
                    <ChevronDown
                      className="h-3.5 w-3.5 text-muted-foreground transition-transform duration-150 group-data-[popup-open]:rotate-180"
                      aria-hidden
                    />
                  </button>
                }
              />
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="truncate font-medium text-slate-100">
                    {user.name || 'Signed in'}
                  </div>
                  <div
                    data-testid="nav-user-email"
                    className="truncate text-xs font-normal text-muted-foreground"
                  >
                    {user.email}
                  </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => signOut()}>
                  <LogOut aria-hidden />
                  Sign out
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <button
              data-testid="nav-sign-in-button"
              onClick={() => setShowAuthModal(true)}
              className="rounded-md bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground hover:opacity-90"
            >
              Sign in
            </button>
          )}

        </div>
      </nav>

      {showAuthModal && <AuthOverlay onClose={() => setShowAuthModal(false)} />}
    </>
  )
}
