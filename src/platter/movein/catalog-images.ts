import { Buffer } from 'node:buffer'
import { sha256 } from '../../modules/import-kit/src/d1/index.ts'
import type { BusinessImageInput } from './business-model.ts'
import { imageAddress } from './catalog-image-address.ts'
import { imageHttp } from './catalog-image-http.ts'

const maxImportBytes = 20 * 1024 * 1024
const failure = 'Image acquisition failed: use a public HTTPS PNG, JPEG, GIF or WebP without credentials or redirects (5 MiB each, 20 MiB per import)'
function imageType(bytes: Uint8Array): { mediaType: string; extension: string } | undefined {
  const begins = (...prefix: number[]) => prefix.every((value, index) => bytes[index] === value)
  if (bytes.length >= 24 && begins(137, 80, 78, 71, 13, 10, 26, 10) &&
    String.fromCharCode(...bytes.subarray(12, 16)) === 'IHDR') return { mediaType: 'image/png', extension: 'png' }
  if (bytes.length >= 4 && begins(255, 216, 255) && bytes[bytes.length - 2] === 255 && bytes[bytes.length - 1] === 217) return { mediaType: 'image/jpeg', extension: 'jpg' }
  if (bytes.length >= 14 && ['GIF87a', 'GIF89a'].includes(String.fromCharCode(...bytes.subarray(0, 6))) && bytes[bytes.length - 1] === 59) return { mediaType: 'image/gif', extension: 'gif' }
  if (bytes.length >= 20 && String.fromCharCode(...bytes.subarray(0, 4)) === 'RIFF' &&
    String.fromCharCode(...bytes.subarray(8, 12)) === 'WEBP' &&
    ['VP8 ', 'VP8L', 'VP8X'].includes(String.fromCharCode(...bytes.subarray(12, 16))) &&
    new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength).getUint32(4, true) === bytes.length - 8) return { mediaType: 'image/webp', extension: 'webp' }
}
function imageUrl(value: string): URL {
  if (value.length > 8192 || /[\u0000-\u0020\u007f]/.test(value)) throw new Error('Invalid image URL')
  const url = new URL(value)
  if (url.protocol !== 'https:' || url.username || url.password || url.port || url.hash || !url.hostname) throw new Error('Invalid image URL')
  return url
}

/** Only acquired, verified bytes establish custody. Failures remain explicit apply-blocking diagnostics. */
export async function acquireCatalogImages(urls: string[]): Promise<BusinessImageInput> {
  const images: NonNullable<BusinessImageInput['images']> = [], failures: NonNullable<BusinessImageInput['failures']> = []
  let total = 0
  for (const value of [...new Set(urls)].sort()) {
    const controller = new AbortController()
    const timer = setTimeout(() => controller.abort(), 15000)
    try {
      if (total >= maxImportBytes) throw new Error('Image import limit exceeded')
      const url = imageUrl(value), address = await imageAddress(url.hostname, controller.signal)
      const acquired = await imageHttp(url, address, controller.signal, maxImportBytes - total), type = imageType(acquired.body)
      if (!type || (acquired.contentType && acquired.contentType !== type.mediaType) || total + acquired.body.length > maxImportBytes) throw new Error('Invalid image bytes')
      total += acquired.body.length
      images.push({ url: value, mediaType: type.mediaType, artifact: {
        name: `catalog-image-${sha256(value)}.${type.extension}`, sha256: sha256(acquired.body), size: acquired.body.length,
        original: { status: 'available', base64: Buffer.from(acquired.body).toString('base64') },
      } })
    } catch { failures.push({ url: value, message: failure }) }
    finally { clearTimeout(timer); controller.abort() }
  }
  return { images, failures }
}
