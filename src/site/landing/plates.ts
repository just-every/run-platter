// The page's painted art: each plate ships as AVIF and WebP at the widths listed (public/landing/plates/<name>-<w>.*).
import { escape } from '../../platter/ui/shared'

type Plate = { w: number; h: number; widths: number[] }
// Full-width scenes ship up to 3072 px for 1920 and 2560 screens; the hero's vignettes at 1x, 2x and 3x of their canvas
// frame (the hero canvas grows to 2200 px; the bakery and office corners are wider than the canvas edge they cross);
// the hero's card drawings at 1x and 2x.
export const plates: Record<string, Plate> = {
  interlude: { w: 1536, h: 923, widths: [768, 1152, 1536, 2304, 3072] },
  closing: { w: 1536, h: 628, widths: [768, 1152, 1536, 2304, 3072] },
  'v-north': { w: 231, h: 228, widths: [231, 462, 693] },
  'v-dental': { w: 275, h: 267, widths: [275, 550, 825] },
  'v-bakery': { w: 693, h: 462, widths: [693, 1386, 2079] },
  'v-bakery-s': { w: 286, h: 168, widths: [286, 572, 858] },
  'v-cafe': { w: 303, h: 297, widths: [303, 606, 909] },
  'v-park': { w: 275, h: 275, widths: [275, 550, 825] },
  'v-office': { w: 698, h: 465, widths: [698, 1396, 2094] },
  'f-left': { w: 198, h: 184, widths: [198, 396, 594] },
  'f-right': { w: 192, h: 184, widths: [192, 384, 576] },
  't-catering': { w: 174, h: 66, widths: [174, 348] },
  't-video': { w: 124, h: 58, widths: [124, 248] },
  't-photo': { w: 134, h: 40, widths: [134, 268] },
  't-server': { w: 56, h: 67, widths: [56, 112] },
}

export function plate(name: string, alt: string, sizes: string, cls = '', eager = false): string {
  const p = plates[name]
  const set = (ext: string) => p.widths.map(w => `/landing/plates/${name}-${w}.${ext} ${w}w`).join(', ')
  const mid = p.widths.find(w => w >= p.w * 2) ?? p.widths[p.widths.length - 1]
  return `<picture class="plate${cls ? ' ' + cls : ''}"><source type="image/avif" srcset="${set('avif')}" sizes="${sizes}"><img src="/landing/plates/${name}-${mid}.webp" srcset="${set('webp')}" sizes="${sizes}" width="${p.w}" height="${p.h}" alt="${escape(alt)}"${eager ? ' fetchpriority="high"' : ' loading="lazy"'} decoding="async"></picture>`
}
