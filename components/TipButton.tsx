'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { HandCoins } from 'lucide-react'
import { Modal } from './Modal'
import { buttonClassName, inputClassName } from './AppUi'
import { MIN_TIP_KOBO } from '@/lib/constants'
import { poster } from '@/lib/fetcher'

const presetsNaira = [500, 1000, 2500, 5000, 10000]

export function TipButton({ stationSlug, stationName }: { stationSlug: string; stationName: string }) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [amountNaira, setAmountNaira] = useState(1000)
  const [loading, setLoading] = useState(false)

  function handleOpen() {
    if (!session?.user) {
      toast.info('Log in to send a tip.')
      router.push('/auth/login')
      return
    }
    setOpen(true)
  }

  async function submit() {
    setLoading(true)
    try {
      const amountKobo = amountNaira * 100
      if (amountKobo < MIN_TIP_KOBO) {
        toast.error(`Minimum tip is NGN ${MIN_TIP_KOBO / 100}.`)
        return
      }
      const data = await poster<{ authorizationUrl: string }>('/api/payments/tip', { stationSlug, amountKobo })
      window.location.href = data.authorizationUrl
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not start payment.')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button onClick={handleOpen} className={`${buttonClassName} gap-2`}>
        <HandCoins className="h-4 w-4" />
        Tip {stationName}
      </button>

      <Modal open={open} onOpenChange={setOpen} title={`Send a tip to ${stationName}`} description="Paid securely via Paystack in Nigerian Naira.">
        <div className="grid grid-cols-3 gap-2">
          {presetsNaira.map((preset) => (
            <button
              key={preset}
              onClick={() => setAmountNaira(preset)}
              className={`rounded-xl border px-3 py-2 text-sm transition ${
                amountNaira === preset ? 'border-fuchsia-400/40 bg-fuchsia-500/15 text-white' : 'border-white/10 bg-white/5 text-slate-300 hover:bg-white/10'
              }`}
            >
              ₦{preset.toLocaleString('en-NG')}
            </button>
          ))}
        </div>
        <div className="mt-4">
          <label className="mb-2 block text-xs uppercase tracking-[0.22em] text-slate-400">Custom amount (NGN)</label>
          <input
            type="number"
            min={100}
            value={amountNaira}
            onChange={(e) => setAmountNaira(Number(e.target.value))}
            className={inputClassName}
          />
        </div>
        <button onClick={submit} disabled={loading} className={`${buttonClassName} mt-5 w-full`}>
          {loading ? 'Redirecting to Paystack…' : `Send ₦${amountNaira.toLocaleString('en-NG')}`}
        </button>
      </Modal>
    </>
  )
}
