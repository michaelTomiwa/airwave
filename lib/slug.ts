import { prisma } from './db'

export function slugify(input: string) {
  return input
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)+/g, '')
    .slice(0, 60) || 'station'
}

export async function uniqueStationSlug(name: string) {
  const base = slugify(name)
  let candidate = base
  let suffix = 1
  // eslint-disable-next-line no-constant-condition
  while (true) {
    const existing = await prisma.station.findUnique({ where: { slug: candidate }, select: { id: true } })
    if (!existing) return candidate
    suffix += 1
    candidate = `${base}-${suffix}`
  }
}
