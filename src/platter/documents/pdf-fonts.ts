import type { Bindings } from '../../auth.server'
import { need } from '../model'

// Font bytes come only from this installation's shipped static assets.
const paths = ['/fonts/pdf/noto-sans.ttf', '/fonts/pdf/unifont.ttf', '/fonts/pdf/unifont-upper.ttf']
export async function pdfFonts(env: Bindings) {
 need(env.ASSETS, 'The installation PDF fonts are unavailable', 503)
 return Promise.all(paths.map(async path => {
  const response = await env.ASSETS!.fetch(new Request(new URL(path, env.AUTH_ORIGIN)))
  need(response.ok, 'The installation PDF fonts are unavailable', 503)
  return new Uint8Array(await response.arrayBuffer())
 }))
}
