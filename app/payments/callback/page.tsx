'use client'

import { Suspense, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { CheckCircle2, Loader2, XCircle } from 'lucide-react'
import { Card, PageContainer, PageFrame, buttonClassName } from '@/components/AppUi'
import { fetcher } from '@/lib/fetcher'

export default function PaymentCallbackPage() {
  return (
    <Suspense fallback={null}>
      <PaymentCallbackInner />
    </Suspense>
  )
}

function PaymentCallbackInner() {
  const searchParams = useSearchParams()
  const reference = searchParams.get('reference') ?? searchParams.get('trxref')
  const [state, setState] = useState<'checking' | 'success' | 'failed'>('checking')

  useEffect(() => {
    if (!reference) {
      setState('failed')
      return
    }
    fetcher<{ status: string }>(`/api/payments/verify?reference=${encodeURIComponent(reference)}`)
      .then((data) => setState(data.status === 'SUCCESS' ? 'success' : 'failed'))
      .catch(() => setState('failed'))
  }, [reference])

  return (
    <PageFrame>
      <PageContainer>
        <section className="mx-auto max-w-lg py-20 text-center">
          <Card>
            {state === 'checking' ? (
              <>
                <Loader2 className="mx-auto h-10 w-10 animate-spin text-fuchsia-300" />
                <h1 className="mt-5 text-xl font-semibold text-white">Confirming your payment…</h1>
                <p className="mt-2 text-sm text-slate-400">This only takes a moment.</p>
              </>
            ) : state === 'success' ? (
              <>
                <CheckCircle2 className="mx-auto h-10 w-10 text-emerald-400" />
                <h1 className="mt-5 text-xl font-semibold text-white">Payment successful</h1>
                <p className="mt-2 text-sm text-slate-400">Thank you — your payment has been confirmed.</p>
              </>
            ) : (
              <>
                <XCircle className="mx-auto h-10 w-10 text-rose-400" />
                <h1 className="mt-5 text-xl font-semibold text-white">We couldn't confirm this payment</h1>
                <p className="mt-2 text-sm text-slate-400">If you were charged, it will be reconciled automatically shortly.</p>
              </>
            )}
            <Link href="/discover" className={`${buttonClassName} mt-6`}>
              Back to AIRWAVE
            </Link>
          </Card>
        </section>
      </PageContainer>
    </PageFrame>
  )
}
