import { escape } from './shared'

// The catalog shelf over the composer: the firm's imported catalog items with their retained prices.
// Prices here are imported metadata for reference; proposals carry their own option prices.
const glyphs: [RegExp, string][] = [
  [/logo|mark|identity/i, '<path d="M8 24 27 8l4 28-21 8zM27 8l5-3 5 21-6 3M10 43l9-19 6 5"/>'],
  [/colou?r|palette/i, '<path d="M25 5C9 5 3 19 6 31c2 10 11 14 18 11 6-3-4-8 2-11 4-2 9 4 14-3C48 16 36 5 25 5Z"/><circle cx="16" cy="20" r="2.5"/><circle cx="25" cy="13" r="2.5"/><circle cx="35" cy="20" r="2.5"/><circle cx="16" cy="33" r="2.5"/>'],
  [/menu board|board|sign(age)?\b|exterior/i, '<path d="M7 7h33v24H7zM7 16h33M7 22h33M17 31v13M31 31v13M23 2v5"/>'],
  [/menu|food|catering|kitchen/i, '<path d="M10 3v15c0 6 12 6 12 0V3M16 3v43M38 3c-8 10-9 22-1 25M38 3l-1 43"/>'],
  [/interior|mural|wall|graphic/i, '<path d="M6 5h35v37H6zM12 11h23v25H12zM17 29l7-10M24 31l6-9"/>'],
  [/web|site|digital|app/i, '<path d="M7 8h33v27H7zM2 36h44l-2 5H5zM18 36h11"/>'],
  [/window|vinyl|glass/i, '<path d="M6 7h35v33H6zM6 12h35M23 12v28M6 35h35"/>'],
  [/social|campaign|ads?\b|launch/i, '<path d="m5 24 4 13 31-3-8-29c-7 9-17 15-27 19ZM13 37l3 7 7-2-2-7M42 13q5 1 3 8"/>'],
  [/photo|video|shoot|film/i, '<path d="M5 14h9l4-6h12l4 6h9v26H5z"/><circle cx="24" cy="26" r="8"/>'],
]
const fallback = '<path d="M10 5h22l8 9v28H10zM32 5v10h8M17 16h9M17 22h16M17 28h16M17 34h16"/>'
const glyph = (item: any) => {
  const words = [item.name, ...(Array.isArray(item.category_path) ? item.category_path : [])].join(' ')
  return glyphs.find(([pattern]) => pattern.test(words))?.[1] ?? fallback
}
const price = (item: any) => {
  const raw = String(item.price ?? '').trim()
  if (!raw) return 'No price'
  const shown = /^\d+(\.\d+)?$/.test(raw) ? `$${Number(raw).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}` : raw
  const unit = String(item.unit_name ?? '').trim()
  return escape(shown) + (unit ? `<span class="unit">/${escape(unit)}</span>` : '')
}

export function catalogShelf(items: any[]): string {
  const tiles = items.slice(0, 24).map(item => `<li class="tile"><svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">${glyph(item)}</svg><span class="tile-name">${escape(item.name)}</span><span class="tile-price">${price(item)}</span>${item.tax_exempt === true ? '<span class="tile-tag">Non-taxable</span>' : ''}</li>`).join('')
  const more = items.length > 24 ? `<li class="tile tile-more"><a href="/app/import">${items.length - 24} more in the catalog</a></li>` : ''
  return `<section class="shelf" aria-labelledby="shelf-title"><h2 class="shelf-title" id="shelf-title">Catalog</h2>`
    + (items.length ? `<ul class="shelf-row">${tiles}${more}</ul>` : `<p class="shelf-empty"><svg class="glyph" viewBox="0 0 48 48" aria-hidden="true">${fallback}</svg><span>No catalog items yet. <a href="/app/import">Import your catalog</a> from PandaDoc, Proposify, Better Proposals, Qwilr or Ignition to price from it here.</span></p>`)
    + '</section>'
}
