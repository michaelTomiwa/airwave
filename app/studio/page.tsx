'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Room } from 'livekit-client'
import { toast } from 'sonner'
import { Mic, MicOff, Plus, Radio, Trash2, Wallet } from 'lucide-react'
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
  inputClassName,
  secondaryButtonClassName,
} from '@/components/AppUi'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/Tabs'
import { fetcher, poster } from '@/lib/fetcher'
import { formatKobo, formatDuration } from '@/lib/format'
import { categories } from '@/lib/constants'

type Station = {
  id: string
  slug: string
  name: string
  category: string
  description: string
  country: string
  language: string
  approvalStatus: string
  isLive: boolean
  followerCount: number
  walletBalanceKobo: number
  pendingPayoutKobo: number
  totalWithdrawnKobo: number
  nowPlayingTitle: string | null
  subscription: { plan: { code: string; name: string; listenerCap: number | null; recordingEnabled: boolean } }
  liveSessions: Array<{ id: string; currentListeners: number }>
  _count: { follows: number; recordings: number }
}

export default function StudioPage() {
  const { data: station, mutate } = useSWR<Station>('/api/stations/mine', fetcher)

  if (!station) {
    return (
      <PageFrame>
        <PageContainer>
          <p className="text-sm text-slate-400">Loading your studio…</p>
        </PageContainer>
      </PageFrame>
    )
  }

  if (station.approvalStatus === 'PENDING') {
    return (
      <PageFrame>
        <PageContainer>
          <EmptyNotice
            title="Your station is awaiting approval"
            description={`${station.name} has been submitted and is being reviewed by an admin. You'll get a notification the moment it's approved and you can go live.`}
          />
        </PageContainer>
      </PageFrame>
    )
  }

  if (station.approvalStatus === 'REJECTED') {
    return (
      <PageFrame>
        <PageContainer>
          <EmptyNotice title="Station not approved" description="Update your station details below and reach out to support to request another review." />
          <div className="mt-6">
            <StationSettingsForm station={station} onSaved={() => mutate()} />
          </div>
        </PageContainer>
      </PageFrame>
    )
  }

  return (
    <PageFrame>
      <PageContainer>
        <PageHeader
          eyebrow="Broadcaster studio"
          title={station.name}
          description="Go live, manage your playlist, review recordings, and grow your station."
          aside={
            <Card>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Wallet</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{formatKobo(station.walletBalanceKobo)}</p>
                </div>
                <div>
                  <p className="text-xs uppercase tracking-[0.24em] text-slate-400">Plan</p>
                  <p className="mt-1 text-2xl font-semibold text-white">{station.subscription.plan.name}</p>
                </div>
              </div>
              <div className="mt-4">
                <TonePill tone={station.isLive ? 'rose' : 'slate'}>{station.isLive ? 'Live now' : 'Offline'}</TonePill>
              </div>
            </Card>
          }
        />

        <section className="mt-8 grid gap-5 sm:grid-cols-3">
          <StatCard label="Followers" value={station.followerCount.toLocaleString('en-NG')} note="People following your station." tone="violet" />
          <StatCard label="Live listeners" value={(station.liveSessions[0]?.currentListeners ?? 0).toLocaleString('en-NG')} note="Currently tuned in." tone="rose" />
          <StatCard label="Pending payout" value={formatKobo(station.pendingPayoutKobo)} note="Available to withdraw." tone="emerald" />
        </section>

        <section className="mt-8">
          <Tabs defaultValue="live">
            <TabsList>
              <TabsTrigger value="live">Go live</TabsTrigger>
              <TabsTrigger value="tracks">Playlist</TabsTrigger>
              <TabsTrigger value="schedule">Schedule</TabsTrigger>
              <TabsTrigger value="recordings">Recordings</TabsTrigger>
              <TabsTrigger value="billing">Plan & payouts</TabsTrigger>
              <TabsTrigger value="settings">Settings</TabsTrigger>
            </TabsList>

            <TabsContent value="live">
              <GoLivePanel station={station} onChange={() => mutate()} />
            </TabsContent>
            <TabsContent value="tracks">
              <TracksManager stationSlug={station.slug} />
            </TabsContent>
            <TabsContent value="schedule">
              <ScheduleManager stationSlug={station.slug} />
            </TabsContent>
            <TabsContent value="recordings">
              <RecordingsPanel stationSlug={station.slug} />
            </TabsContent>
            <TabsContent value="billing">
              <BillingPanel station={station} onChange={() => mutate()} />
            </TabsContent>
            <TabsContent value="settings">
              <StationSettingsForm station={station} onSaved={() => mutate()} />
            </TabsContent>
          </Tabs>
        </section>
      </PageContainer>
    </PageFrame>
  )
}

function GoLivePanel({ station, onChange }: { station: Station; onChange: () => void }) {
  const [devices, setDevices] = useState<MediaDeviceInfo[]>([])
  const [deviceId, setDeviceId] = useState<string>('')
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const roomRef = useRef<Room | null>(null)

  useEffect(() => {
    navigator.mediaDevices?.enumerateDevices().then((list) => {
      setDevices(list.filter((d) => d.kind === 'audioinput'))
    })
    return () => {
      roomRef.current?.disconnect()
    }
  }, [])

  async function goLive() {
    setConnecting(true)
    try {
      await poster('/api/broadcast/start')
      const tokenData = await poster<{ token: string; wsUrl: string }>('/api/livekit/token', { stationSlug: station.slug, mode: 'publish' })
      const room = new Room()
      await room.connect(tokenData.wsUrl, tokenData.token)
      await room.localParticipant.setMicrophoneEnabled(true, deviceId ? { deviceId } : undefined)
      roomRef.current = room
      toast.success("You're live!")
      onChange()
      // Room only exists on LiveKit's side after a participant has joined it,
      // so recording can only start now — not from /api/broadcast/start.
      poster<{ recordingId: string | null; reason?: string }>('/api/broadcast/start-recording')
        .then((result) => {
          if (!result.recordingId && result.reason) toast.info(result.reason)
        })
        .catch(() => {})
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not go live. Check your microphone permissions.')
    } finally {
      setConnecting(false)
    }
  }

  async function endBroadcast() {
    setConnecting(true)
    try {
      roomRef.current?.disconnect()
      roomRef.current = null
      await poster('/api/broadcast/stop')
      toast.success('Broadcast ended.')
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not end broadcast.')
    } finally {
      setConnecting(false)
    }
  }

  async function toggleMute() {
    if (!roomRef.current) return
    const next = !muted
    await roomRef.current.localParticipant.setMicrophoneEnabled(!next)
    setMuted(next)
  }

  return (
    <Card>
      <div className="flex flex-col items-start justify-between gap-6 sm:flex-row sm:items-center">
        <div>
          <SectionTitle
            title={station.isLive ? 'You are live' : 'Ready to broadcast'}
            description={
              station.isLive
                ? 'Listeners can hear you now. End the broadcast when you are done.'
                : 'Choose your microphone and go live. Listeners following your station will be notified.'
            }
          />
        </div>
        <Radio className={`h-10 w-10 ${station.isLive ? 'animate-pulse text-rose-400' : 'text-slate-600'}`} />
      </div>

      {!station.isLive ? (
        <div className="mt-6 max-w-sm">
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Microphone</label>
          <select value={deviceId} onChange={(e) => setDeviceId(e.target.value)} className={inputClassName}>
            <option value="">System default</option>
            {devices.map((d) => (
              <option key={d.deviceId} value={d.deviceId}>
                {d.label || 'Microphone'}
              </option>
            ))}
          </select>
        </div>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-3">
        {station.isLive ? (
          <>
            <button onClick={endBroadcast} disabled={connecting} className={buttonClassName}>
              End broadcast
            </button>
            <button onClick={toggleMute} className={secondaryButtonClassName}>
              {muted ? <MicOff className="mr-2 h-4 w-4" /> : <Mic className="mr-2 h-4 w-4" />}
              {muted ? 'Unmute' : 'Mute'}
            </button>
          </>
        ) : (
          <button onClick={goLive} disabled={connecting} className={buttonClassName}>
            {connecting ? 'Connecting…' : 'Go live'}
          </button>
        )}
      </div>

      {!station.subscription.plan.recordingEnabled ? (
        <p className="mt-5 text-xs text-amber-300">Your current plan does not include recording. Upgrade in Plan & payouts to save this broadcast automatically.</p>
      ) : null}
    </Card>
  )
}

function StationSettingsForm({ station, onSaved }: { station: Station; onSaved: () => void }) {
  const [form, setForm] = useState({
    name: station.name,
    category: station.category,
    description: station.description,
    country: station.country,
    language: station.language,
    nowPlayingTitle: station.nowPlayingTitle ?? '',
  })
  const [saving, setSaving] = useState(false)

  async function save() {
    setSaving(true)
    try {
      await fetch(`/api/stations/${station.slug}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      toast.success('Station updated.')
      onSaved()
    } catch {
      toast.error('Could not save changes.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <Card>
      <SectionTitle title="Station settings" description="Keep your profile up to date so listeners know what to expect." />
      <div className="mt-5 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Name</label>
          <input value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Category</label>
          <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className={inputClassName}>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Description</label>
          <textarea rows={3} value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Country</label>
          <input value={form.country} onChange={(e) => setForm({ ...form, country: e.target.value })} className={inputClassName} />
        </div>
        <div>
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Language</label>
          <input value={form.language} onChange={(e) => setForm({ ...form, language: e.target.value })} className={inputClassName} />
        </div>
        <div className="sm:col-span-2">
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Now playing</label>
          <input value={form.nowPlayingTitle} onChange={(e) => setForm({ ...form, nowPlayingTitle: e.target.value })} className={inputClassName} />
        </div>
      </div>
      <button onClick={save} disabled={saving} className={`${buttonClassName} mt-6`}>
        {saving ? 'Saving…' : 'Save changes'}
      </button>
    </Card>
  )
}

function TracksManager({ stationSlug }: { stationSlug: string }) {
  const { data: tracks, mutate } = useSWR<Array<{ id: string; title: string; artist: string; durationSeconds: number }>>(
    `/api/stations/${stationSlug}/tracks`,
    fetcher,
  )
  const [title, setTitle] = useState('')
  const [artist, setArtist] = useState('')
  const [duration, setDuration] = useState('3:30')

  async function addTrack() {
    if (!title.trim() || !artist.trim()) return
    const [min, sec] = duration.split(':').map(Number)
    await poster(`/api/stations/${stationSlug}/tracks`, { title, artist, durationSeconds: (min || 0) * 60 + (sec || 0) })
    setTitle('')
    setArtist('')
    mutate()
  }

  async function removeTrack(id: string) {
    await fetch(`/api/tracks/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <Card>
      <SectionTitle title="Playlist" description="Log what you're playing so listeners can look it up." />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.5fr_1.5fr_0.8fr_auto]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Track title" className={inputClassName} />
        <input value={artist} onChange={(e) => setArtist(e.target.value)} placeholder="Artist" className={inputClassName} />
        <input value={duration} onChange={(e) => setDuration(e.target.value)} placeholder="3:30" className={inputClassName} />
        <button onClick={addTrack} className={buttonClassName}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-5 space-y-2">
        {!tracks || tracks.length === 0 ? (
          <p className="text-sm text-slate-500">No tracks logged yet.</p>
        ) : (
          tracks.map((t) => (
            <div key={t.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div>
                <p className="text-sm text-white">{t.title}</p>
                <p className="text-xs text-slate-500">{t.artist}</p>
              </div>
              <div className="flex items-center gap-3">
                <span className="text-xs text-slate-500">{formatDuration(t.durationSeconds)}</span>
                <button onClick={() => removeTrack(t.id)} className="text-slate-500 hover:text-rose-300">
                  <Trash2 className="h-4 w-4" />
                </button>
              </div>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function ScheduleManager({ stationSlug }: { stationSlug: string }) {
  const { data: shows, mutate } = useSWR<Array<{ id: string; title: string; startsAt: string; recurrence: string }>>(
    `/api/stations/${stationSlug}/schedule`,
    fetcher,
  )
  const [title, setTitle] = useState('')
  const [startsAt, setStartsAt] = useState('')

  async function addShow() {
    if (!title.trim() || !startsAt) return
    await poster(`/api/stations/${stationSlug}/schedule`, { title, startsAt: new Date(startsAt).toISOString(), recurrence: 'NONE' })
    setTitle('')
    setStartsAt('')
    mutate()
  }

  return (
    <Card>
      <SectionTitle title="Upcoming shows" description="Let followers know when to tune in." />
      <div className="mt-5 grid gap-3 sm:grid-cols-[1.5fr_1fr_auto]">
        <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Show title" className={inputClassName} />
        <input type="datetime-local" value={startsAt} onChange={(e) => setStartsAt(e.target.value)} className={inputClassName} />
        <button onClick={addShow} className={buttonClassName}>
          <Plus className="h-4 w-4" />
        </button>
      </div>
      <div className="mt-5 space-y-2">
        {!shows || shows.length === 0 ? (
          <p className="text-sm text-slate-500">No shows scheduled.</p>
        ) : (
          shows.map((s) => (
            <div key={s.id} className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <p className="text-sm text-white">{s.title}</p>
              <span className="text-xs text-slate-400">{new Date(s.startsAt).toLocaleString('en-NG', { dateStyle: 'medium', timeStyle: 'short' })}</span>
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function RecordingsPanel({ stationSlug }: { stationSlug: string }) {
  const { data: recordings } = useSWR<Array<{ id: string; title: string; durationSeconds: number; fileUrl: string | null; status: string }>>(
    `/api/stations/${stationSlug}/recordings`,
    fetcher,
  )

  return (
    <Card>
      <SectionTitle title="Recordings" description="Your past broadcasts, ready for listeners to catch up on." />
      <div className="mt-5 space-y-2">
        {!recordings || recordings.length === 0 ? (
          <p className="text-sm text-slate-500">No recordings yet. Go live to create your first one.</p>
        ) : (
          recordings.map((r) => (
            <div key={r.id} className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
              <div className="flex items-center justify-between">
                <p className="text-sm text-white">{r.title}</p>
                <span className="text-xs text-slate-500">{formatDuration(r.durationSeconds)}</span>
              </div>
              {r.fileUrl ? <audio controls className="mt-2 w-full" src={r.fileUrl} /> : null}
            </div>
          ))
        )}
      </div>
    </Card>
  )
}

function BillingPanel({ station, onChange }: { station: Station; onChange: () => void }) {
  const { data: plans } = useSWR<Array<{ code: string; name: string; priceKobo: number; listenerCap: number | null }>>('/api/plans', fetcher)
  const { data: payouts, mutate: mutatePayouts } = useSWR<Array<{ id: string; amountKobo: number; status: string; bankName: string }>>(
    '/api/payouts/mine',
    fetcher,
  )
  const [payoutForm, setPayoutForm] = useState({ amountKobo: 0, bankName: '', accountNumber: '', accountName: '' })

  async function subscribe(code: string) {
    try {
      const result = await poster<{ authorizationUrl?: string; free?: boolean }>('/api/payments/subscribe', { planCode: code })
      if (result.free) {
        toast.success('Plan updated.')
        onChange()
      } else if (result.authorizationUrl) {
        window.location.href = result.authorizationUrl
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start upgrade.')
    }
  }

  async function requestPayout() {
    try {
      await poster('/api/payouts', payoutForm)
      toast.success('Payout requested.')
      setPayoutForm({ amountKobo: 0, bankName: '', accountNumber: '', accountName: '' })
      mutatePayouts()
      onChange()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not request payout.')
    }
  }

  return (
    <div className="space-y-6">
      <Card>
        <SectionTitle title="Your plan" description={`Currently on ${station.subscription.plan.name}. Upgrade anytime.`} />
        <div className="mt-5 grid gap-3 sm:grid-cols-5">
          {plans?.map((plan) => (
            <button
              key={plan.code}
              onClick={() => subscribe(plan.code)}
              className={`rounded-2xl border p-4 text-left transition ${
                plan.code === station.subscription.plan.code ? 'border-fuchsia-400/40 bg-fuchsia-500/15' : 'border-white/10 bg-white/5 hover:bg-white/10'
              }`}
            >
              <p className="text-sm font-semibold text-white">{plan.name}</p>
              <p className="mt-1 text-xs text-slate-400">{plan.priceKobo === 0 ? 'Free' : formatKobo(plan.priceKobo)}</p>
            </button>
          ))}
        </div>
      </Card>

      <Card>
        <SectionTitle title="Request a payout" description={`Pending balance: ${formatKobo(station.pendingPayoutKobo)}`} />
        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <input
            type="number"
            placeholder="Amount (NGN)"
            onChange={(e) => setPayoutForm({ ...payoutForm, amountKobo: Number(e.target.value) * 100 })}
            className={inputClassName}
          />
          <input placeholder="Bank name" value={payoutForm.bankName} onChange={(e) => setPayoutForm({ ...payoutForm, bankName: e.target.value })} className={inputClassName} />
          <input
            placeholder="Account number"
            value={payoutForm.accountNumber}
            onChange={(e) => setPayoutForm({ ...payoutForm, accountNumber: e.target.value })}
            className={inputClassName}
          />
          <input
            placeholder="Account name"
            value={payoutForm.accountName}
            onChange={(e) => setPayoutForm({ ...payoutForm, accountName: e.target.value })}
            className={inputClassName}
          />
        </div>
        <button onClick={requestPayout} className={`${buttonClassName} mt-4`}>
          <Wallet className="mr-2 h-4 w-4" /> Request payout
        </button>

        <div className="mt-6 space-y-2">
          {payouts?.map((p) => (
            <DataRow key={p.id} label={`${p.bankName} — ${formatKobo(p.amountKobo)}`} value={p.status} tone={p.status === 'PAID' ? 'emerald' : p.status === 'REJECTED' ? 'rose' : 'amber'} />
          ))}
        </div>
      </Card>
    </div>
  )
}
