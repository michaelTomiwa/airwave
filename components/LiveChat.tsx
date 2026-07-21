'use client'

import { useState, type FormEvent } from 'react'
import useSWR from 'swr'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { Flag, Send, Trash2 } from 'lucide-react'
import { toast } from 'sonner'
import { inputClassName } from './AppUi'
import { fetcher, poster, patcher } from '@/lib/fetcher'
import { formatRelativeTime } from '@/lib/format'

type ChatMessage = {
  id: string
  userId: string
  userName: string
  text: string
  flagged: boolean
  createdAt: string
}

export function LiveChat({
  stationSlug,
  liveSessionId,
  canModerate,
}: {
  stationSlug: string
  liveSessionId: string | null
  canModerate: boolean
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [text, setText] = useState('')
  const [sending, setSending] = useState(false)

  const query = liveSessionId ? `?liveSessionId=${liveSessionId}` : ''
  const { data: messages, mutate } = useSWR<ChatMessage[]>(`/api/stations/${stationSlug}/messages${query}`, fetcher, {
    refreshInterval: 3000,
  })

  async function send(event: FormEvent) {
    event.preventDefault()
    if (!session?.user) {
      toast.info('Log in to join the chat.')
      router.push('/auth/login')
      return
    }
    if (!text.trim()) return
    setSending(true)
    try {
      await poster(`/api/stations/${stationSlug}/messages`, { text: text.trim(), liveSessionId })
      setText('')
      mutate()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not send message.')
    } finally {
      setSending(false)
    }
  }

  async function flag(id: string) {
    await patcher(`/api/messages/${id}/flag`)
    toast.success('Reported to moderators.')
    mutate()
  }

  async function remove(id: string) {
    await fetch(`/api/messages/${id}`, { method: 'DELETE' })
    mutate()
  }

  return (
    <div className="flex h-full flex-col rounded-[24px] border border-white/10 bg-[#10141d]/88 backdrop-blur-xl">
      <div className="border-b border-white/10 px-5 py-4">
        <h3 className="text-sm font-semibold uppercase tracking-[0.2em] text-slate-300">Live chat</h3>
      </div>
      <div className="flex-1 space-y-3 overflow-y-auto px-5 py-4" style={{ maxHeight: 420 }}>
        {!messages || messages.length === 0 ? (
          <p className="text-sm text-slate-500">No messages yet. Say hello!</p>
        ) : (
          messages.map((m) => (
            <div key={m.id} className="group text-sm">
              <div className="flex items-baseline justify-between gap-2">
                <p>
                  <span className="font-semibold text-fuchsia-200">{m.userName}</span>{' '}
                  <span className="text-slate-200">{m.text}</span>
                </p>
                <span className="shrink-0 text-[10px] text-slate-500">{formatRelativeTime(m.createdAt)}</span>
              </div>
              <div className="mt-0.5 hidden gap-3 group-hover:flex">
                <button onClick={() => flag(m.id)} className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-amber-300">
                  <Flag className="h-3 w-3" /> Report
                </button>
                {canModerate ? (
                  <button onClick={() => remove(m.id)} className="inline-flex items-center gap-1 text-[10px] text-slate-500 hover:text-rose-300">
                    <Trash2 className="h-3 w-3" /> Remove
                  </button>
                ) : null}
              </div>
            </div>
          ))
        )}
      </div>
      <form onSubmit={send} className="flex items-center gap-2 border-t border-white/10 p-4">
        <input
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder={session?.user ? 'Join the conversation…' : 'Log in to chat…'}
          className={inputClassName}
          maxLength={500}
        />
        <button type="submit" disabled={sending} className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl bg-fuchsia-500 text-white transition hover:bg-fuchsia-400 disabled:opacity-60">
          <Send className="h-4 w-4" />
        </button>
      </form>
    </div>
  )
}
