export const productIdentity = {
  name: 'AIRWAVE',
  tagline: 'Broadcast Beyond Limits',
}

export const demoAccounts = [
  { role: 'LISTENER' as const, name: 'Ada Rivers', email: 'listener@airwave.fm', password: 'demo123' },
  { role: 'BROADCASTER' as const, name: 'DJ Nova', email: 'broadcaster@airwave.fm', password: 'demo123' },
  { role: 'ADMIN' as const, name: 'Zina Okafor', email: 'admin@airwave.fm', password: 'demo123' },
]

export const categories = [
  'Electronic',
  'Talk',
  'Gospel',
  'Afrobeats',
  'Hip-Hop',
  'Amapiano',
  'News',
  'Sports',
  'Comedy',
  'Jazz & Soul',
  'Campus',
  'Other',
]

export const supporterTierCatalog = [
  {
    tier: 'FAN' as const,
    name: 'Fan',
    priceKobo: 50000,
    perks: ['Supporter badge in chat', 'Listed on the station supporters page'],
  },
  {
    tier: 'SUPERFAN' as const,
    name: 'Superfan',
    priceKobo: 150000,
    perks: ['Everything in Fan', 'Animated badge + priority chat highlight', 'Shoutout queue access'],
  },
  {
    tier: 'VIP' as const,
    name: 'VIP',
    priceKobo: 300000,
    perks: ['Everything in Superfan', 'Leaderboard eligibility', 'Early access to show reminders'],
  },
]

export const MIN_TIP_KOBO = 10000
