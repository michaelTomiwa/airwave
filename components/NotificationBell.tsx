'use client'

import { useState } from 'react'
import useSWR from 'swr'
import { Bell } from 'lucide-react'
import { fetcher, patcher } from '@/lib/fetcher'
import { formatRelativeTime } from '@/lib/format'

type Notification = {
  id: string
  type: string
  title: string
  body: string
  linkUrl: string | null
  read: boolean
  createdAt: string
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data, mutate } = useSWR<{ notifications: Notification[]; unreadCount: number }>('/api/notifications', fetcher, {
    refreshInterval: 15000,
  })

  async function markAllRead() {
    await patcher('/api/notifications/read-all')
    mutate()
  }

  async function markRead(id: string) {
    await patcher(`/api/notifications/${id}/read`)
    mutate()
  }

  const unread = data?.unreadCount ?? 0

  return (
    <div className="relative">
      <button
        onClick={() => setOpen((o) => !o)}
        className="relative inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-2 text-xs uppercase tracking-[0.18em] text-slate-200 transition hover:bg-white/10"
      >
        <Bell className="h-3.5 w-3.5" />
        {unread > 0 ? (
          <span className="absolute -right-1 -top-1 grid h-5 w-5 place-items-center rounded-full bg-fuchsia-500 text-[10px] font-bold text-white">
            {unread > 9 ? '9+' : unread}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className="absolute right-0 top-12 z-50 w-80 rounded-2xl border border-white/10 bg-[#10141d] p-3 shadow-[0_24px_80px_rgba(6,10,20,0.6)]">
          <div className="flex items-center justify-between px-2 py-1">
            <p className="text-xs uppercase tracking-[0.2em] text-slate-400">Notifications</p>
            {unread > 0 ? (
              <button onClick={markAllRead} className="text-xs text-fuchsia-300 hover:text-fuchsia-200">
                Mark all read
              </button>
            ) : null}
          </div>
          <div className="mt-2 max-h-96 space-y-1 overflow-y-auto">
            {!data || data.notifications.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-slate-500">No notifications yet.</p>
            ) : (
              data.notifications.map((n) => (
                <a
                  key={n.id}
                  href={n.linkUrl ?? '#'}
                  onClick={() => !n.read && markRead(n.id)}
                  className={`block rounded-xl px-3 py-3 text-sm transition hover:bg-white/5 ${n.read ? 'opacity-60' : ''}`}
                >
                  <p className="font-medium text-white">{n.title}</p>
                  <p className="mt-1 text-xs text-slate-400">{n.body}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.18em] text-slate-500">{formatRelativeTime(n.createdAt)}</p>
                </a>
              ))
            )}
          </div>
        </div>
      ) : null}
    </div>
  )
}
