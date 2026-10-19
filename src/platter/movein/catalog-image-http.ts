import { connect } from 'cloudflare:sockets'
import { publicAddress } from './catalog-image-address.ts'

export const maxImageBytes = 5 * 1024 * 1024
const refused = () => new Error('Catalog image response could not be verified')
function bounded<T>(promise:Promise<T>,signal:AbortSignal):Promise<T>{
 if(signal.aborted)return Promise.reject(refused())
 return new Promise((resolve,reject)=>{
  const abort=()=>reject(refused())
  signal.addEventListener('abort',abort,{once:true})
  promise.then(value=>{signal.removeEventListener('abort',abort);resolve(value)},error=>{signal.removeEventListener('abort',abort);reject(error)})
 })
}

class Bytes {
  private pending: Uint8Array = new Uint8Array(0)
  private position = 0
  private wire = 0
  constructor(private reader: ReadableStreamDefaultReader<Uint8Array>, private signal: AbortSignal) {}
  async chunk(): Promise<Uint8Array | undefined> {
    if (this.signal.aborted) throw refused()
    if (this.position < this.pending.length) {
      const rest = this.pending.subarray(this.position)
      this.position = this.pending.length
      return rest
    }
    const next = await bounded(this.reader.read(),this.signal)
    if (next.done) return
    if (!(next.value instanceof Uint8Array)) throw refused()
    this.wire += next.value.length
    if (this.wire > maxImageBytes + 1024 * 1024) throw refused()
    return next.value
  }
  async exact(length: number): Promise<Uint8Array> {
    const result = new Uint8Array(length)
    let offset = 0
    while (offset < length) {
      const chunk = await this.chunk()
      if (!chunk) throw refused()
      const count = Math.min(chunk.length, length - offset)
      result.set(chunk.subarray(0, count), offset)
      offset += count
      this.pending = chunk
      this.position = count
    }
    return result
  }
  async line(limit: number): Promise<string> {
    const bytes: number[] = []
    while (bytes.length < limit) {
      const next = (await this.exact(1))[0]
      bytes.push(next)
      if (next === 10) {
        if (bytes.length < 2 || bytes[bytes.length - 2] !== 13) throw refused()
        return String.fromCharCode(...bytes.slice(0, -2))
      }
      if (next !== 13 && (next < 32 || next > 126) && next !== 9) throw refused()
    }
    throw refused()
  }
}
function header(line: string): [string, string] {
  const match = /^([!#$%&'*+.^_`|~\da-z-]+):[ \t]*([^\r\n]*)$/i.exec(line)
  if (!match) throw refused()
  return [match[1].toLowerCase(), match[2].trim()]
}
async function response(reader: ReadableStreamDefaultReader<Uint8Array>, signal: AbortSignal, limit: number) {
  const input = new Bytes(reader, signal), status = await input.line(1024)
  if (!/^HTTP\/1\.[01] 200(?: .*)?$/.test(status)) throw refused()
  const headers = new Map<string, string[]>()
  let headerBytes = status.length + 2
  while (true) {
    const line = await input.line(8192)
    headerBytes += line.length + 2
    if (headerBytes > 32768) throw refused()
    if (!line) break
    const [name, value] = header(line)
    headers.set(name, [...(headers.get(name) || []), value])
  }
  const one = (name: string) => {
    const values = headers.get(name) || []
    if (values.length > 1) throw refused()
    return values[0]
  }
  const encoding = one('content-encoding'), transfer = one('transfer-encoding'), length = one('content-length')
  if ((encoding && encoding.toLowerCase() !== 'identity') || (transfer && transfer.toLowerCase() !== 'chunked') || (transfer && length !== undefined)) throw refused()
  const chunks: Uint8Array[] = []
  let total = 0
  const append = (bytes: Uint8Array) => {
    total += bytes.length
    if (total > limit) throw refused()
    chunks.push(bytes)
  }
  if (transfer) {
    while (true) {
      const line = await input.line(1024), match = /^([\da-f]+)(?:;[^\r\n]*)?$/i.exec(line)
      if (!match) throw refused()
      const size = parseInt(match[1], 16)
      if (!Number.isSafeInteger(size) || size > limit - total) throw refused()
      if (!size) break
      append(await input.exact(size))
      const end = await input.exact(2)
      if (end[0] !== 13 || end[1] !== 10) throw refused()
    }
    let trailerBytes = 0
    while (true) {
      const line = await input.line(8192)
      trailerBytes += line.length + 2
      if (trailerBytes > 32768) throw refused()
      if (!line) break
      const [name] = header(line)
      if (['content-length', 'transfer-encoding', 'content-encoding', 'content-type'].includes(name)) throw refused()
    }
  } else if (length !== undefined) {
    if (!/^\d+$/.test(length) || !Number.isSafeInteger(Number(length)) || Number(length) > limit) throw refused()
    append(await input.exact(Number(length)))
  } else {
    while (true) {
      const next = await input.chunk()
      if (!next) break
      append(next)
    }
  }
  if (!total) throw refused()
  const body = new Uint8Array(total)
  let offset = 0
  for (const chunk of chunks) { body.set(chunk, offset); offset += chunk.length }
  return { body, contentType: one('content-type')?.split(';')[0].trim().toLowerCase() }
}

/** Resolve separately, pin the TCP destination, then authenticate TLS for the original host. */
export async function imageHttp(url: URL, address: string, signal: AbortSignal, remainingBytes: number) {
  const raw = connect({ hostname: address, port: 443 }, { secureTransport: 'starttls', allowHalfOpen: false })
  let tls: Socket | undefined, reader: ReadableStreamDefaultReader<Uint8Array> | undefined
  let writer: WritableStreamDefaultWriter<Uint8Array> | undefined
  const close = () => { void raw.close().catch(() => {}); if (tls) void tls.close().catch(() => {}) }
  raw.closed.catch(() => {})
  signal.addEventListener('abort', close, { once: true })
  try {
    if (signal.aborted) throw refused()
    const opened = await bounded(raw.opened,signal)
    if (!publicAddress(address) || ![address,`${address}:443`,`[${address}]:443`].includes(opened.remoteAddress??'')) throw refused()
    tls = raw.startTls({ expectedServerHostname: url.hostname.replace(/^\[|\]$/g, '') })
    tls.closed.catch(() => {})
    await bounded(tls.opened,signal)
    if (signal.aborted) throw refused()
    writer = tls.writable.getWriter()
    await bounded(writer.write(new TextEncoder().encode(`GET ${url.pathname}${url.search} HTTP/1.1\r\nHost: ${url.host}\r\nAccept: image/png, image/jpeg, image/gif, image/webp\r\nAccept-Encoding: identity\r\nConnection: close\r\n\r\n`)),signal)
    writer.releaseLock(); writer = undefined
    reader = tls.readable.getReader()
    return await response(reader, signal, Math.min(maxImageBytes, remainingBytes))
  } finally {
    signal.removeEventListener('abort', close)
    close()
    if (reader) { void reader.cancel().catch(() => {}); reader.releaseLock() }
    if (writer) { void writer.abort().catch(() => {}); writer.releaseLock() }
  }
}
