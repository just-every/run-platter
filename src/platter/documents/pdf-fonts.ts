import { documentOf } from './blocks'
import type { Bindings } from '../../auth.server'
import { need } from '../model'

// Font bytes come only from this installation's shipped static assets.
const paths = ['/fonts/pdf/noto-sans.ttf', '/fonts/pdf/unifont.ttf', '/fonts/pdf/unifont-upper.ttf']
export async function pdfFonts(env: Bindings,view?:any) {
 need(env.ASSETS, 'The installation PDF fonts are unavailable', 503)
 const brand=view?documentOf(view).brand:undefined,fonts=brand?[brand.font==='serif'?'/fonts/pdf/source-serif-4.ttf':'/fonts/pdf/inter.ttf',...paths]:paths
 return Promise.all(fonts.map(async path => {
  const response = await env.ASSETS!.fetch(new Request(new URL(path, env.AUTH_ORIGIN)))
  need(response.ok, 'The installation PDF fonts are unavailable', 503)
  return new Uint8Array(await response.arrayBuffer())
 }))
}
