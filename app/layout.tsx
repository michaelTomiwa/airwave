import type { Metadata } from 'next'
import './globals.css'
import { NavBar } from '../components/NavBar'
import { Providers } from '../components/Providers'

export const metadata: Metadata = {
  title: {
    default: 'AIRWAVE — Broadcast Beyond Limits',
    template: '%s | AIRWAVE',
  },
  description: 'AIRWAVE is a live internet radio platform: broadcast to the world, discover live stations, chat in real time, and support the creators you love.',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-[#050811] text-slate-100 antialiased">
        <Providers>
          <NavBar />
          {children}
        </Providers>
      </body>
    </html>
  )
}
