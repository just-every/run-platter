import { zipSync } from 'fflate'
import { fail } from './errors'
import { qwilrBlocks, qwilrId, qwilrObject, qwilrPage } from './qwilr-api-source'

const maximumResponse = 1024 * 1024, maximumCapture = 4 * 1024 * 1024, maximumPages = 100
/** Read-only capture. Provider links are retained as evidence and are never fetched. */
export async function captureQwilr(token: unknown, authorize: () => Promise<void>): Promise<{ filename: string; bytes: Uint8Array }> {
 if (typeof token !== 'string' || !token.trim() || token.length > 8192 || /[\s\x00-\x1f\x7f]/.test(token)) fail('invalid_qwilr_token', 400, 'Provide a single-line Qwilr API access token')
 const files: Record<string, Uint8Array> = {}, pages = new Set<string>()
 const captureSignal = AbortSignal.timeout(120000)
 let total = 0
 async function get(path: string, filename: string): Promise<unknown> {
  await authorize()
  const controller = new AbortController(), stop = () => controller.abort(), timer = setTimeout(stop, 10000)
  captureSignal.addEventListener('abort', stop, { once: true })
  if (captureSignal.aborted) controller.abort()
  let bytes: Uint8Array, value: unknown
  try {
   const response = await fetch('https://api.qwilr.com/v1' + path, { method: 'GET', redirect: 'manual',
    headers: { authorization: 'Bearer ' + token, accept: 'application/json' }, signal: controller.signal })
   if (!response.ok) {
    await response.body?.cancel().catch(() => undefined)
    fail('qwilr_api_refused', response.status === 429 ? 429 : 400, 'Qwilr refused the read-only capture. Check API access and try again later.')
   }
   if (Number(response.headers.get('content-length')) > maximumResponse || !response.body) {
    await response.body?.cancel().catch(() => undefined)
    fail('qwilr_api_size', 413, 'Qwilr returned a response larger than this capture supports')
   }
   const reader = response.body.getReader(), chunks: Uint8Array[] = []
   let size = 0
   try {
    while (true) {
     const chunk = await reader.read()
     if (chunk.done) break
     size += chunk.value.byteLength
     if (size > maximumResponse || total + size > maximumCapture) fail('qwilr_api_size', 413, 'Use a smaller Qwilr source export; this capture exceeds its byte limit')
     chunks.push(chunk.value)
    }
   } finally { await reader.cancel().catch(() => undefined) }
   bytes = new Uint8Array(size)
   let offset = 0
   for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.byteLength }
   const text = new TextDecoder('utf-8', { fatal: true }).decode(bytes)
   // Refuse a provider response that reflects the transient credential into an artifact.
   if (text.includes(token as string)) fail('qwilr_api_credential_reflection', 400, 'Qwilr returned a response that cannot be retained safely')
   value = JSON.parse(text)
   if ((JSON.stringify(value) ?? '').includes(token as string)) fail('qwilr_api_credential_reflection', 400, 'Qwilr returned a response that cannot be retained safely')
  } catch (error) {
   if (error && typeof error === 'object' && 'code' in error && String(error.code).startsWith('qwilr_api_')) throw error
   fail('qwilr_api_unavailable', 400, 'Qwilr capture failed or timed out. No provider changes were made.')
  } finally { clearTimeout(timer); captureSignal.removeEventListener('abort', stop) }
  await authorize()
  if (total + bytes.byteLength > maximumCapture) fail('qwilr_api_size', 413, 'Use a smaller Qwilr source export; this capture exceeds its byte limit')
  total += bytes.byteLength
  files['qwilr-api/' + filename] = bytes
  return value
 }
 for (const archived of [false, true]) {
  const cursors = new Set<string>()
  let cursor: string | null = null, position = 0
  do {
   if (++position > 8) fail('qwilr_api_limit', 413, 'Qwilr pagination exceeds this capture limit; use a smaller source export')
   const query = new URLSearchParams({ limit: String(maximumPages), expand: 'metadata', ...(archived ? { tags: 'archived' } : {}), ...(cursor ? { cursor } : {}) })
   const value = await get('/pages?' + query, (archived ? 'archived-pages-' : 'pages-') + position + '.json')
   if (!qwilrObject(value) || !Array.isArray(value.data) || value.data.length > maximumPages || !value.data.every(page => qwilrPage(page, false))
    || !(value.nextCursor === null || (typeof value.nextCursor === 'string' && value.nextCursor.length > 0 && value.nextCursor.length <= 4096))) {
    fail('qwilr_api_schema', 400, 'Qwilr returned an unsupported page-list response')
   }
   for (const page of value.data) {
    if (!qwilrObject(page) || !qwilrId(page.id)) fail('qwilr_api_schema', 400, 'Qwilr returned an invalid page identifier')
    pages.add(page.id)
   }
   if (pages.size > maximumPages) fail('qwilr_api_limit', 413, 'This capture supports at most 100 Qwilr pages; use a smaller source export')
   cursor = value.nextCursor as string | null
   if (cursor && (cursors.has(cursor) || value.data.length === 0)) fail('qwilr_api_pagination', 400, 'Qwilr returned repeated or empty pagination; capture stopped')
   if (cursor) cursors.add(cursor)
  } while (cursor)
 }
 // Bound concurrency and await every request, including when one page fails.
 const ids = [...pages]
 for (let start = 0; start < ids.length; start += 3) {
  const results = await Promise.allSettled(ids.slice(start, start + 3).map(async id => {
   const page = await get('/pages/' + encodeURIComponent(id) + '?expand=metadata,acceptance,previewAcceptance', 'page-' + encodeURIComponent(id) + '.json')
   if (!qwilrPage(page) || page.id !== id) fail('qwilr_api_schema', 400, 'Qwilr returned an unsupported or mismatched page response')
  }))
  for (const result of results) if (result.status === 'rejected') throw result.reason
 }
 const blocks = await get('/blocks/saved', 'saved-blocks.json')
 if (!qwilrBlocks(blocks)) fail('qwilr_api_schema', 400, 'Qwilr returned an unsupported saved-block response or more than 100 blocks')
 const bytes = zipSync(files, { level: 0 })
 if (bytes.byteLength > 5 * 1024 * 1024) fail('qwilr_api_size', 413, 'Qwilr capture exceeds the supported upload size')
 return { filename: 'qwilr-api.zip', bytes }
}
