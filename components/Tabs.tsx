'use client'

import * as TabsPrimitive from '@radix-ui/react-tabs'
import type { ReactNode } from 'react'

export function Tabs({ defaultValue, children }: { defaultValue: string; children: ReactNode }) {
  return <TabsPrimitive.Root defaultValue={defaultValue}>{children}</TabsPrimitive.Root>
}

export function TabsList({ children }: { children: ReactNode }) {
  return <TabsPrimitive.List className="flex flex-wrap gap-2 border-b border-white/10 pb-3">{children}</TabsPrimitive.List>
}

export function TabsTrigger({ value, children }: { value: string; children: ReactNode }) {
  return (
    <TabsPrimitive.Trigger
      value={value}
      className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-slate-300 transition data-[state=active]:border-fuchsia-400/30 data-[state=active]:bg-fuchsia-500/15 data-[state=active]:text-white hover:text-white"
    >
      {children}
    </TabsPrimitive.Trigger>
  )
}

export function TabsContent({ value, children }: { value: string; children: ReactNode }) {
  return <TabsPrimitive.Content value={value} className="mt-6">{children}</TabsPrimitive.Content>
}
