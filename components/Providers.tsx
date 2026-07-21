'use client'

import { SessionProvider } from 'next-auth/react'
import { Toaster } from 'sonner'
import type { ReactNode } from 'react'

export function Providers({ children }: { children: ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        theme="dark"
        position="top-right"
        toastOptions={{
          style: {
            background: '#12141f',
            border: '1px solid rgba(255,255,255,0.1)',
            color: '#f8fafc',
          },
        }}
      />
    </SessionProvider>
  )
}
