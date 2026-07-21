'use client'

import useSWR from 'swr'
import { toast } from 'sonner'
import { Check, Flag, Star, X } from 'lucide-react'
import {
  Card,
  DataRow,
  EmptyNotice,
  PageContainer,
  PageFrame,
  PageHeader,
  SectionTitle,
  StatCard,
  TonePill,
  buttonClassName,
  secondaryButtonClassName,
} from '@/components/AppUi'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs'
import { fetcher, patcher } from '@/lib/fetcher'
import { formatKobo, formatRelativeTime } from '@/lib/format'

type Overview = {
  liveStations: number
  totalStations: number
  pendingStations: number
  pendingPayouts: number
  openReports: number
  totalListeners: number
  users: number
  activities: Array<{ id: string; title: string; detail: string; tone: string; createdAt: string }>
}

type AdminStation = {
  id: string
  slug: string
  name: string
  approvalStatus: string
  featured: boolean
  owner: { name: string; email: string }
  subscription: { plan: { name: string } } | null
}

type AdminReport = {
  id: string
  reason: string
  status: string
  createdAt: string
  station: { name: string; slug: string } | null
  reporter: { name: string }
}

type AdminPayout = {
  id: string
  amountKobo: number
  status: string
  bankName: string
  accountNumber: string
  requestedAt: string
  station: { name: string; slug: string }
}

type AdminUser = {
  id: string
  name: string
  email: string
  role: string
  createdAt: string
  station: { name: string; approvalStatus: string } | null
}

export default function AdminPage() {
  const { data: overview } = useSWR<Overview>('/api/admin/overview', fetcher)

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader eyebrow="Admin control room" title="Platform operations" description="Approve stations, resolve reports, and process payouts." />

        <section className="mt-8 grid gap-5 sm:grid-cols-3 xl:grid-cols-6">
          <StatCard label="Live now" value={String(overview?.liveStations ?? 0)} note="Stations broadcasting." tone="rose" />
          <StatCard label="Stations" value={String(overview?.totalStations ?? 0)} note="Total on platform." tone="violet" />
          <StatCard label="Pending" value={String(overview?.pendingStations ?? 0)} note="Awaiting approval." tone="amber" />
          <StatCard label="Payouts" value={String(overview?.pendingPayouts ?? 0)} note="Awaiting review." tone="amber" />
          <StatCard label="Reports" value={String(overview?.openReports ?? 0)} note="Open reports." tone="rose" />
          <StatCard label="Users" value={String(overview?.users ?? 0)} note="Registered accounts." tone="cyan" />
        </section>

        <section className="mt-8">
          <Tabs defaultValue="stations">
            <TabsList>
              <TabsTrigger value="stations">Stations</TabsTrigger>
              <TabsTrigger value="reports">Reports</TabsTrigger>
              <TabsTrigger value="payouts">Payouts</TabsTrigger>
              <TabsTrigger value="users">Users</TabsTrigger>
              <TabsTrigger value="activity">Activity</TabsTrigger>
            </TabsList>

            <TabsContent value="stations">
              <StationsPanel />
            </TabsContent>
            <TabsContent value="reports">
              <ReportsPanel />
            </TabsContent>
            <TabsContent value="payouts">
              <PayoutsPanel />
            </TabsContent>
            <TabsContent value="users">
              <UsersPanel />
            </TabsContent>
            <TabsContent value="activity">
              <Card>
                <SectionTitle title="Recent activity" />
                <div className="mt-5 space-y-2">
                  {overview?.activities.map((a) => (
                    <DataRow key={a.id} label={`${a.title} — ${formatRelativeTime(a.createdAt)}`} value={a.detail.slice(0, 40)} tone={a.tone === 'GOOD' ? 'emerald' : a.tone === 'WARNING' ? 'amber' : 'slate'} />
                  ))}
                </div>
              </Card>
            </TabsContent>
          </Tabs>
        </section>
      </PageContainer>
    </PageFrame>
  )
}

function StationsPanel() {
  const { data: stations, mutate } = useSWR<AdminStation[]>('/api/admin/stations', fetcher)

  async function act(id: string, action: 'approve' | 'reject' | 'feature') {
    await patcher(`/api/admin/stations/${id}/${action}`)
    toast.success('Updated.')
    mutate()
  }

  const pending = stations?.filter((s) => s.approvalStatus === 'PENDING') ?? []
  const others = stations?.filter((s) => s.approvalStatus !== 'PENDING') ?? []

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Pending approvals" description="New stations waiting for review." />
        <div className="mt-5 space-y-3">
          {pending.length === 0 ? (
            <EmptyNotice title="Nothing pending" description="All submitted stations have been reviewed." />
          ) : (
            pending.map((s) => (
              <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
                <div>
                  <p className="font-semibold text-white">{s.name}</p>
                  <p className="text-xs text-slate-400">{s.owner.name} — {s.owner.email}</p>
                </div>
                <div className="flex gap-2">
                  <button onClick={() => act(s.id, 'approve')} className={buttonClassName}>
                    <Check className="mr-1.5 h-4 w-4" /> Approve
                  </button>
                  <button onClick={() => act(s.id, 'reject')} className={secondaryButtonClassName}>
                    <X className="mr-1.5 h-4 w-4" /> Reject
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card>
        <SectionTitle title="All stations" />
        <div className="mt-5 space-y-2">
          {others.map((s) => (
            <div key={s.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">{s.name}</p>
                <p className="text-xs text-slate-500">{s.subscription?.plan.name ?? 'Starter'}</p>
              </div>
              <div className="flex items-center gap-2">
                <TonePill tone={s.approvalStatus === 'APPROVED' ? 'emerald' : 'rose'}>{s.approvalStatus.toLowerCase()}</TonePill>
                <button onClick={() => act(s.id, 'feature')} className={secondaryButtonClassName}>
                  <Star className={`h-4 w-4 ${s.featured ? 'fill-amber-300 text-amber-300' : ''}`} />
                </button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  )
}

function ReportsPanel() {
  const { data: reports, mutate } = useSWR<AdminReport[]>('/api/admin/reports?status=open', fetcher)

  async function resolve(id: string) {
    await patcher(`/api/admin/reports/${id}/resolve`)
    toast.success('Report resolved.')
    mutate()
  }

  return (
    <Card>
      <SectionTitle title="Open reports" description="Flagged messages and station complaints." />
      <div className="mt-5 space-y-3">
        {!reports || reports.length === 0 ? (
          <EmptyNotice title="No open reports" description="Great — nothing needs your attention right now." />
        ) : (
          reports.map((r) => (
            <div key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="flex items-center gap-2 text-sm text-white">
                  <Flag className="h-4 w-4 text-amber-300" /> {r.reason}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {r.station?.name ?? 'Unknown station'} — reported by {r.reporter.name} — {formatRelativeTime(r.createdAt)}
                </p>
              </div>
              <button onClick={() => resolve(r.id)} className={secondaryButtonClassName}>
                Mark resolved
              </button>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function PayoutsPanel() {
  const { data: payouts, mutate } = useSWR<AdminPayout[]>('/api/admin/payouts?status=pending', fetcher)

  async function decide(id: string, decision: 'approve' | 'reject') {
    await patcher(`/api/admin/payouts/${id}/${decision}`)
    toast.success(decision === 'approve' ? 'Payout approved.' : 'Payout rejected.')
    mutate()
  }

  return (
    <Card>
      <SectionTitle title="Pending payouts" description="Withdrawal requests from broadcasters." />
      <div className="mt-5 space-y-3">
        {!payouts || payouts.length === 0 ? (
          <EmptyNotice title="No pending payouts" description="All withdrawal requests have been processed." />
        ) : (
          payouts.map((p) => (
            <div key={p.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">{p.station.name}</p>
                <p className="text-xs text-slate-500">
                  {formatKobo(p.amountKobo)} to {p.bankName} •••• {p.accountNumber.slice(-4)}
                </p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => decide(p.id, 'approve')} className={buttonClassName}>
                  Approve
                </button>
                <button onClick={() => decide(p.id, 'reject')} className={secondaryButtonClassName}>
                  Reject
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function UsersPanel() {
  const { data: users } = useSWR<AdminUser[]>('/api/admin/users', fetcher)

  return (
    <Card>
      <SectionTitle title="All users" description={`${users?.length ?? 0} registered accounts.`} />
      <div className="mt-5 max-h-[560px] space-y-2 overflow-y-auto">
        {users?.map((u) => (
          <div key={u.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
            <div>
              <p className="text-sm text-white">{u.name}</p>
              <p className="text-xs text-slate-500">{u.email}</p>
            </div>
            <div className="flex items-center gap-2">
              {u.station ? <TonePill tone="slate">{u.station.name}</TonePill> : null}
              <TonePill tone={u.role === 'ADMIN' ? 'amber' : u.role === 'BROADCASTER' ? 'cyan' : 'violet'}>{u.role.toLowerCase()}</TonePill>
            </div>
          </div>
        ))}
      </div>
    </Card>
  )
}
