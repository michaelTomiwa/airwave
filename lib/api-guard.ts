import { NextResponse } from 'next/server'
import { auth } from '@/auth'

type Role = 'LISTENER' | 'BROADCASTER' | 'ADMIN'

export async function requireSession() {
  const session = await auth()
  if (!session?.user) {
    return { session: null, error: NextResponse.json({ ok: false, message: 'Please sign in to continue.' }, { status: 401 }) }
  }
  return { session, error: null as null }
}

export async function requireRole(roles: Role[]) {
  const { session, error } = await requireSession()
  if (error || !session) return { session: null, error: error! }
  if (!roles.includes(session.user.role)) {
    return { session: null, error: NextResponse.json({ ok: false, message: 'You do not have access to do this.' }, { status: 403 }) }
  }
  return { session, error: null as null }
}

export function jsonError(message: string, status = 400) {
  return NextResponse.json({ ok: false, message }, { status })
}

export function jsonOk<T>(data: T, status = 200) {
  return NextResponse.json({ ok: true, data }, { status })
}
