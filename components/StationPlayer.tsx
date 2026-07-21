'use client'

import { useEffect, useRef, useState } from 'react'
import useSWR from 'swr'
import { Room, RoomEvent, Track } from 'livekit-client'
import { Play, Pause, Volume2, VolumeX, Users } from 'lucide-react'
import { fetcher, poster } from '@/lib/fetcher'
import { formatCompactNumber } from '@/lib/format'

type LiveStatus = { isLive: boolean; liveSessionId: string | null; roomName: string | null; currentListeners: number }

export function StationPlayer({ stationSlug, stationName }: { stationSlug: string; stationName: string }) {
  const { data: status } = useSWR<LiveStatus>(`/api/stations/${stationSlug}/live-status`, fetcher, { refreshInterval: 5000 })
  const [connected, setConnected] = useState(false)
  const [connecting, setConnecting] = useState(false)
  const [muted, setMuted] = useState(false)
  const [volume, setVolume] = useState(0.8)
  const roomRef = useRef<Room | null>(null)
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const liveSessionIdRef = useRef<string | null>(null)

  function leaveHeartbeat() {
    if (!liveSessionIdRef.current) return
    const body = JSON.stringify({ liveSessionId: liveSessionIdRef.current })
    navigator.sendBeacon?.(`/api/stations/${stationSlug}/live-status/leave`, new Blob([body], { type: 'application/json' }))
    liveSessionIdRef.current = null
  }

  useEffect(() => {
    return () => {
      roomRef.current?.disconnect()
      leaveHeartbeat()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    if (status && !status.isLive && connected) {
      roomRef.current?.disconnect()
      roomRef.current = null
      setConnected(false)
    }
  }, [status, connected])

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = muted ? 0 : volume
  }, [volume, muted])

  async function connect() {
    setConnecting(true)
    try {
      const data = await poster<{ token: string; room: string; wsUrl: string }>('/api/livekit/token', { stationSlug, mode: 'subscribe' })
      const room = new Room()
      room.on(RoomEvent.TrackSubscribed, (track) => {
        if (track.kind === Track.Kind.Audio && audioRef.current) {
          track.attach(audioRef.current)
          audioRef.current.volume = muted ? 0 : volume
          audioRef.current.play().catch(() => {})
        }
      })
      room.on(RoomEvent.Disconnected, () => {
        setConnected(false)
        roomRef.current = null
        leaveHeartbeat()
      })
      await room.connect(data.wsUrl, data.token)
      roomRef.current = room
      setConnected(true)
      const heartbeat = await poster<{ liveSessionId?: string }>(`/api/stations/${stationSlug}/live-status/join`)
      liveSessionIdRef.current = heartbeat.liveSessionId ?? null
    } catch (err) {
      console.error('Failed to connect to live stream', err)
    } finally {
      setConnecting(false)
    }
  }

  function disconnect() {
    roomRef.current?.disconnect()
    roomRef.current = null
    setConnected(false)
    leaveHeartbeat()
  }

  const isLive = status?.isLive ?? false

  return (
    <div className="rounded-[24px] border border-white/10 bg-[#10141d]/88 p-5 backdrop-blur-xl">
      <audio ref={audioRef} />
      <div className="flex items-center justify-between gap-4">
        <div>
          <p className="text-xs uppercase tracking-[0.24em] text-slate-400">{isLive ? 'Live now' : 'Offline'}</p>
          <h3 className="mt-1 text-xl font-semibold text-white">{stationName}</h3>
        </div>
        {isLive ? (
          <span className="inline-flex items-center gap-1.5 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-slate-300">
            <Users className="h-3.5 w-3.5" /> {formatCompactNumber(status?.currentListeners ?? 0)} listening
          </span>
        ) : null}
      </div>

      <div className="mt-5 flex items-center gap-4">
        {isLive ? (
          <button
            onClick={connected ? disconnect : connect}
            disabled={connecting}
            className="grid h-16 w-16 shrink-0 place-items-center rounded-full bg-fuchsia-500 text-white transition hover:bg-fuchsia-400 disabled:opacity-60"
          >
            {connecting ? (
              <span className="h-5 w-5 animate-spin rounded-full border-2 border-white/40 border-t-white" />
            ) : connected ? (
              <Pause className="h-6 w-6" />
            ) : (
              <Play className="h-6 w-6 translate-x-0.5" />
            )}
          </button>
        ) : (
          <div className="grid h-16 w-16 shrink-0 place-items-center rounded-full border border-white/10 bg-white/5 text-slate-500">
            <Play className="h-6 w-6" />
          </div>
        )}

        <div className="flex-1">
          <p className="text-sm text-slate-300">
            {isLive ? (connected ? 'Playing live audio' : 'Tap play to listen') : 'This station is not broadcasting right now.'}
          </p>
          {connected ? (
            <div className="mt-2 flex items-center gap-2">
              <button onClick={() => setMuted((m) => !m)} className="text-slate-400 hover:text-white">
                {muted ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
              </button>
              <input
                type="range"
                min={0}
                max={1}
                step={0.05}
                value={muted ? 0 : volume}
                onChange={(e) => {
                  setVolume(Number(e.target.value))
                  setMuted(false)
                }}
                className="h-1.5 w-32 accent-fuchsia-500"
              />
            </div>
          ) : null}
        </div>
      </div>
    </div>
  )
}
