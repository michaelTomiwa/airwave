import type { DefaultSession } from 'next-auth'

type AppRole = 'LISTENER' | 'BROADCASTER' | 'ADMIN'

declare module 'next-auth' {
  interface Session {
    user: {
      id: string
      role: AppRole
      stationId: string | null
    } & DefaultSession['user']
  }

  interface User {
    role: AppRole
    stationId?: string | null
  }
}

declare module 'next-auth/jwt' {
  interface JWT {
    id: string
    role: AppRole
    stationId: string | null
  }
}
