import { recordingStorageConfigured } from './livekit'
import { getSignedRecordingUrl } from './storage'

type RecordingLike = { fileUrl: string | null }

// fileUrl on a READY recording is a raw object key in the private bucket
// (see webhook/poll handlers), not a directly playable URL. Resolve it to a
// short-lived signed URL right before handing recordings to a client.
export async function withPlayableUrl<T extends RecordingLike>(recording: T): Promise<T> {
  if (!recording.fileUrl || !recordingStorageConfigured()) return recording
  try {
    const signedUrl = await getSignedRecordingUrl(recording.fileUrl)
    return { ...recording, fileUrl: signedUrl }
  } catch (err) {
    console.error('Failed to sign recording URL', err)
    return { ...recording, fileUrl: null }
  }
}

export async function withPlayableUrls<T extends RecordingLike>(recordings: T[]): Promise<T[]> {
  return Promise.all(recordings.map(withPlayableUrl))
}
