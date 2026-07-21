import crypto from 'crypto'

const PAYSTACK_BASE = 'https://api.paystack.co'

function secretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY
  if (!key) throw new Error('PAYSTACK_SECRET_KEY is not configured')
  return key
}

async function paystackFetch<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${secretKey()}`,
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    cache: 'no-store',
  })
  const json = await res.json()
  if (!res.ok || json.status === false) {
    throw new Error(json.message ?? `Paystack request failed (${res.status})`)
  }
  return json
}

export type PaystackInitResponse = {
  status: boolean
  message: string
  data: { authorization_url: string; access_code: string; reference: string }
}

export async function initializeTransaction(params: {
  email: string
  amountKobo: number
  reference: string
  callbackUrl: string
  metadata?: Record<string, unknown>
}) {
  return paystackFetch<PaystackInitResponse>('/transaction/initialize', {
    method: 'POST',
    body: JSON.stringify({
      email: params.email,
      amount: params.amountKobo,
      reference: params.reference,
      callback_url: params.callbackUrl,
      metadata: params.metadata,
    }),
  })
}

export type PaystackVerifyResponse = {
  status: boolean
  message: string
  data: { status: string; reference: string; amount: number; customer: { email: string } }
}

export async function verifyTransaction(reference: string) {
  return paystackFetch<PaystackVerifyResponse>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: 'GET',
  })
}

export function verifyWebhookSignature(rawBody: string, signature: string | null) {
  if (!signature) return false
  const hash = crypto.createHmac('sha512', secretKey()).update(rawBody).digest('hex')
  return hash === signature
}
