import { NextRequest } from 'next/server'
import { prisma } from '@/lib/db'
import { jsonError, jsonOk } from '@/lib/api-guard'
import { verifyTransaction } from '@/lib/paystack'
import { applySuccessfulPayment } from '@/lib/payments/apply'

export async function GET(request: NextRequest) {
  const reference = new URL(request.url).searchParams.get('reference')
  if (!reference) return jsonError('Missing reference.')

  const payment = await prisma.payment.findUnique({ where: { paystackReference: reference } })
  if (!payment) return jsonError('Payment not found.', 404)

  if (payment.status === 'SUCCESS') {
    return jsonOk({ status: 'SUCCESS', purpose: payment.purpose })
  }

  try {
    const verified = await verifyTransaction(reference)
    if (verified.data.status === 'success') {
      await applySuccessfulPayment(payment.id)
      return jsonOk({ status: 'SUCCESS', purpose: payment.purpose })
    }
    return jsonOk({ status: verified.data.status.toUpperCase(), purpose: payment.purpose })
  } catch (err) {
    return jsonError(err instanceof Error ? err.message : 'Could not verify payment.', 502)
  }
}
