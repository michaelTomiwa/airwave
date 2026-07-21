import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3'
import { getSignedUrl } from '@aws-sdk/s3-request-presigner'

// Recordings are stored in a private bucket (Backblaze B2's free tier
// requires no credit card only for private buckets) so playback goes
// through short-lived signed URLs generated on demand, rather than a
// permanent public fileUrl.
let client: S3Client | null = null

function getClient() {
  if (client) return client
  client = new S3Client({
    region: process.env.S3_REGION || 'auto',
    endpoint: process.env.S3_ENDPOINT,
    forcePathStyle: true,
    credentials: {
      accessKeyId: process.env.S3_ACCESS_KEY ?? '',
      secretAccessKey: process.env.S3_SECRET_KEY ?? '',
    },
  })
  return client
}

export async function getSignedRecordingUrl(objectKey: string) {
  const command = new GetObjectCommand({ Bucket: process.env.S3_BUCKET, Key: objectKey })
  return getSignedUrl(getClient(), command, { expiresIn: 21600 }) // 6 hours
}
