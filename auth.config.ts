import type { NextAuthConfig } from 'next-auth'
import { NextResponse } from 'next/server'

type AppRole = 'LISTENER' | 'BROADCASTER' | 'ADMIN'

// Edge-safe config: no Prisma/bcrypt imports here so middleware.ts can run
// this on the Edge runtime. The Credentials provider (which does need
// Prisma) is added on top of this in auth.ts for the Node runtime.
//
// jwt/session callbacks live here (not just in auth.ts) because
// middleware.ts spins up its OWN NextAuth(authConfig) instance to decode
// the session for route protection. If these callbacks only existed in
// auth.ts, that middleware instance would never project role/stationId
// from the token onto auth.user, and every role-based redirect would silently
// see `role: undefined`.
export const authConfig = {
  trustHost: true,
  pages: {
    signIn: '/auth/login',
  },
  session: { strategy: 'jwt' },
  providers: [],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        const u = user as unknown as { id: string; role: AppRole; stationId: string | null }
        token.id = u.id
        token.role = u.role
        token.stationId = u.stationId
      }
      return token
    },
    async session({ session, token }) {
      const t = token as unknown as { id: string; role: AppRole; stationId: string | null }
      if (session.user) {
        session.user.id = t.id
        session.user.role = t.role
        session.user.stationId = t.stationId
      }
      return session
    },
    authorized({ auth, request }) {
      const { nextUrl } = request
      const pathname = nextUrl.pathname
      const isLoggedIn = !!auth?.user
      const role = auth?.user?.role

      if (pathname.startsWith('/api/')) return true

      const wantsAdmin = pathname.startsWith('/admin')
      const wantsBroadcaster = pathname.startsWith('/studio')
      const wantsAnyAuth = pathname.startsWith('/dashboard')

      if (!wantsAdmin && !wantsBroadcaster && !wantsAnyAuth) return true

      if (!isLoggedIn) {
        const loginUrl = new URL('/auth/login', nextUrl)
        loginUrl.searchParams.set('callbackUrl', pathname)
        return NextResponse.redirect(loginUrl)
      }

      if (wantsAdmin && role !== 'ADMIN') {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }
      if (wantsBroadcaster && role !== 'BROADCASTER') {
        return NextResponse.redirect(new URL('/dashboard', nextUrl))
      }

      return true
    },
  },
} satisfies NextAuthConfig
