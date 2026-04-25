/*
  Translation prewarm smoke test

  Required env vars:
  - API_BASE_URL (optional, default: http://127.0.0.1:3001/api)
  - TEST_ROOM_ID
  - TEST_TOKEN_MODERATOR
  - TEST_TOKEN_MEMBER
*/

const apiBaseUrl = process.env.API_BASE_URL || 'http://127.0.0.1:3001/api'
const roomId = process.env.TEST_ROOM_ID || ''
const moderatorToken = process.env.TEST_TOKEN_MODERATOR || ''
const memberToken = process.env.TEST_TOKEN_MEMBER || ''

const assertRequired = () => {
  const missing: string[] = []
  if (!roomId) missing.push('TEST_ROOM_ID')
  if (!moderatorToken) missing.push('TEST_TOKEN_MODERATOR')
  if (!memberToken) missing.push('TEST_TOKEN_MEMBER')

  if (missing.length > 0) {
    throw new Error(`Missing required env vars: ${missing.join(', ')}`)
  }
}

const callPrewarm = async (token: string) => {
  const response = await fetch(`${apiBaseUrl}/messages/${encodeURIComponent(roomId)}/translations/prewarm`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
    },
    body: JSON.stringify({
      targetLanguage: 'en',
      limit: 10,
    }),
  })

  const payload = await response.json().catch(() => ({}))
  return { status: response.status, payload }
}

const run = async () => {
  assertRequired()

  console.log('[prewarm-smoke] Running 403 check with non-moderator token...')
  const forbiddenResult = await callPrewarm(memberToken)
  if (forbiddenResult.status !== 403) {
    throw new Error(
      `Expected 403 for non-moderator, got ${forbiddenResult.status}. Payload: ${JSON.stringify(forbiddenResult.payload)}`
    )
  }

  console.log('[prewarm-smoke] Running 200 check with moderator token...')
  const successResult = await callPrewarm(moderatorToken)
  if (successResult.status !== 200) {
    throw new Error(
      `Expected 200 for moderator, got ${successResult.status}. Payload: ${JSON.stringify(successResult.payload)}`
    )
  }

  if (!successResult.payload?.success) {
    throw new Error(`Expected success payload, got: ${JSON.stringify(successResult.payload)}`)
  }

  console.log('[prewarm-smoke] Passed ✅')
  console.log('[prewarm-smoke] Summary:', {
    scanned: successResult.payload.scanned,
    translated: successResult.payload.translated,
    cached: successResult.payload.cached,
    skipped: successResult.payload.skipped,
  })
}

run().catch((error) => {
  console.error('[prewarm-smoke] Failed ❌', error)
  process.exit(1)
})
