'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { toast } from 'sonner'
import { Heart, Bookmark } from 'lucide-react'
import { buttonClassName, secondaryButtonClassName } from './AppUi'
import { poster } from '@/lib/fetcher'

export function FollowSaveButtons({
  stationSlug,
  initialFollowing,
  initialSaved,
}: {
  stationSlug: string
  initialFollowing: boolean
  initialSaved: boolean
}) {
  const { data: session } = useSession()
  const router = useRouter()
  const [following, setFollowing] = useState(initialFollowing)
  const [saved, setSaved] = useState(initialSaved)

  function requireAuth() {
    if (!session?.user) {
      toast.info('Log in to continue.')
      router.push('/auth/login')
      return false
    }
    return true
  }

  async function toggleFollow() {
    if (!requireAuth()) return
    const result = await poster<{ following: boolean }>(`/api/stations/${stationSlug}/follow`)
    setFollowing(result.following)
  }

  async function toggleSave() {
    if (!requireAuth()) return
    const result = await poster<{ saved: boolean }>(`/api/stations/${stationSlug}/save`)
    setSaved(result.saved)
  }

  return (
    <div className="flex gap-2">
      <button onClick={toggleFollow} className={following ? buttonClassName : secondaryButtonClassName}>
        <Heart className={`mr-2 h-4 w-4 ${following ? 'fill-white' : ''}`} />
        {following ? 'Following' : 'Follow'}
      </button>
      <button onClick={toggleSave} className={secondaryButtonClassName}>
        <Bookmark className={`mr-2 h-4 w-4 ${saved ? 'fill-white' : ''}`} />
        {saved ? 'Saved' : 'Save'}
      </button>
    </div>
  )
}
