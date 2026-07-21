import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/db'
import { verifyWebhookSignature } from '@/lib/paystack'
import { applySuccessfulPayment } from '@/lib/payments/apply'

export async function POST(request: NextRequest) {
  const rawBody = await request.text()
  const signature = request.headers.get('x-paystack-signature')

  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ ok: false }, { status: 401 })
  }

  const event = JSON.parse(rawBody)

  if (event.event === 'charge.success') {
    const reference = event.data.reference as string
    const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } })
    if (payment) {
      await applySuccessfulPayment(payment.id)
    }
  }

  return NextResponse.json({ ok: true })
}
