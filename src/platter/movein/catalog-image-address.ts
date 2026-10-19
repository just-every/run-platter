const refused = () => new Error('Catalog image address could not be verified')
const dnsName = (name: string) => name.toLowerCase().replace(/\.$/, '')

function ipv4(value: string): number[] | undefined {
  if (!/^(?:0|[1-9]\d{0,2})(?:\.(?:0|[1-9]\d{0,2})){3}$/.test(value)) return
  const parts = value.split('.').map(Number)
  return parts.every(part => part <= 255) ? parts : undefined
}
function ipv6(value: string): number[] | undefined {
  if (!value.includes(':') || !/^[\da-f:.]+$/i.test(value)) return
  let expanded = value.toLowerCase()
  if (expanded.includes('.')) {
    const start = expanded.lastIndexOf(':') + 1, tail = ipv4(expanded.slice(start))
    if (!tail) return
    expanded = expanded.slice(0, start) + ((tail[0] << 8) | tail[1]).toString(16) + ':' + ((tail[2] << 8) | tail[3]).toString(16)
  }
  const halves = expanded.split('::')
  if (halves.length > 2) return
  const left = halves[0] ? halves[0].split(':') : [], right = halves.length === 2 && halves[1] ? halves[1].split(':') : []
  if (![...left, ...right].every(part => /^[\da-f]{1,4}$/.test(part))) return
  const missing = 8 - left.length - right.length
  if (halves.length === 1 ? missing !== 0 : missing < 1) return
  return [...left, ...Array(missing).fill('0'), ...right].map(part => parseInt(part, 16))
}

/** Conservative global-unicast allowlist; special-use and transition ranges fail closed. */
export function publicAddress(value: string): string | undefined {
  const four = ipv4(value)
  if (four) {
    const [a, b, c] = four
    if (a === 0 || a === 10 || a === 127 || a >= 224 ||
      (a === 100 && b >= 64 && b <= 127) || (a === 169 && b === 254) ||
      (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) ||
      (a === 192 && b === 0 && (c === 0 || c === 2)) || (a === 192 && b === 88 && c === 99) ||
      (a === 198 && (b === 18 || b === 19)) || (a === 198 && b === 51 && c === 100) ||
      (a === 203 && b === 0 && c === 113)) return
    return four.join('.')
  }
  const six = ipv6(value)
  if (!six || (six[0] & 0xe000) !== 0x2000 ||
    (six[0] === 0x2001 && (six[1] < 0x200 || six[1] === 0xdb8)) ||
    six[0] === 0x2002 || (six[0] === 0x3fff && six[1] < 0x1000)) return
  return six.map(part => part.toString(16)).join(':')
}

function validName(value: string): boolean {
  return value.length <= 253 && value.split('.').every(label => /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/i.test(label))
}
type DnsRecord = { name: string; type: number; data: string }
async function dns(hostname: string, type: number, signal: AbortSignal): Promise<string[]> {
  const endpoint = new URL('https://cloudflare-dns.com/dns-query')
  endpoint.searchParams.set('name', hostname)
  endpoint.searchParams.set('type', String(type))
  const response = await fetch(endpoint, { headers: { Accept: 'application/dns-json' }, redirect: 'manual', credentials: 'omit', signal })
  if (response.status !== 200 || !response.body) { await response.body?.cancel(); throw refused() }
  const reader = response.body.getReader(), chunks: Uint8Array[] = []
  let size = 0
  try {
    while (true) {
      const next = await reader.read()
      if (next.done) break
      size += next.value.length
      if (size > 65536) throw refused()
      chunks.push(next.value)
    }
  } finally { await reader.cancel().catch(() => {}); reader.releaseLock() }
  const bytes = new Uint8Array(size)
  let offset = 0
  for (const chunk of chunks) { bytes.set(chunk, offset); offset += chunk.length }
  const body = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes))
  if (!body || body.Status !== 0 || body.TC === true || !Array.isArray(body.Question) || body.Question.length !== 1 ||
    typeof body.Question[0]?.name !== 'string' || dnsName(body.Question[0].name) !== hostname || body.Question[0].type !== type ||
    (body.Answer !== undefined && !Array.isArray(body.Answer))) throw refused()
  const answers: DnsRecord[] = body.Answer || []
  if (answers.length > 64 || answers.some(record => !record || typeof record.name !== 'string' || typeof record.data !== 'string' || ![1, 5, 28].includes(record.type))) throw refused()
  const names = new Set([hostname])
  let current = hostname
  for (let depth = 0; depth < 9; depth++) {
    const aliases = answers.filter(record => dnsName(record.name) === current && record.type === 5)
    if (!aliases.length) break
    if (aliases.length !== 1 || depth === 8) throw refused()
    current = dnsName(aliases[0].data)
    if (!validName(current) || names.has(current)) throw refused()
    names.add(current)
  }
  const addresses: string[] = []
  for (const record of answers) {
    if (!names.has(dnsName(record.name))) throw refused()
    if (record.type === 5) continue
    if (dnsName(record.name) !== current || (record.type === 1 ? !ipv4(record.data) : !ipv6(record.data))) throw refused()
    const address = publicAddress(record.data)
    if (!address) throw refused()
    addresses.push(address)
  }
  return addresses
}

export async function imageAddress(hostname: string, signal: AbortSignal): Promise<string> {
  const literal = hostname.replace(/^\[|\]$/g, '')
  if (ipv4(literal) || ipv6(literal)) {
    const address = publicAddress(literal)
    if (!address) throw refused()
    return address
  }
  const name = dnsName(hostname)
  if (!validName(name) || !name.includes('.') || name.endsWith('.localhost') || name.endsWith('.local') || name.endsWith('.internal')) throw refused()
  const responses = await Promise.all([dns(name, 1, signal), dns(name, 28, signal)])
  const addresses = [...new Set(responses.flat())].sort()
  if (!addresses.length) throw refused()
  return addresses[0]
}
