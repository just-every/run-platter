import fontkit from '@pdf-lib/fontkit'
import { PDFDocument, rgb, type PDFFont, type PDFPage } from 'pdf-lib'
import { need } from '../model'

type Run = { text: string; font: PDFFont }
const ink = rgb(0.12, 0.16, 0.15)
const muted = rgb(0.38, 0.42, 0.40)
const accent = rgb(0.16, 0.32, 0.26)
const letter: [number, number] = [612, 792]
const margin = 48
const bottom = 64

/** Paginated text with exact font coverage checks, including grapheme-safe URL wrapping. */
export class PdfText {
 private page!: PDFPage
 private y = 0
 private readonly coverage: Set<number>[]
 private readonly choices = new Map<string, PDFFont>()
 private readonly segmenter = new Intl.Segmenter(undefined, { granularity: 'grapheme' })

 private constructor(readonly document: PDFDocument, private fonts: PDFFont[], private revision: number, private footer?: string) {
  this.coverage = fonts.map(font => new Set(font.getCharacterSet()))
  this.newPage()
 }

 static async create(revision: number, fontBytes: (Uint8Array | ArrayBuffer)[] = [], footer?: string) {
  need(fontBytes.length > 0, 'PDF fonts are unavailable.', 503)
  const document = await PDFDocument.create()
  document.registerFontkit(fontkit)
  const fonts: PDFFont[] = []
  for (const bytes of fontBytes) fonts.push(await document.embedFont(bytes, { subset: true }))
  return new PdfText(document, fonts, revision, footer)
 }

 private runs(text: string): Run[] {
  const runs: Run[] = []
  for (const { segment } of this.segmenter.segment(text)) {
   let font = this.choices.get(segment)
   if (!font) {
    const points = Array.from(segment, character => character.codePointAt(0)!)
    const index = this.coverage.findIndex(set => points.every(point => set.has(point)))
    need(index >= 0, `PDF font cannot display ${points.map(point => 'U+' + point.toString(16).toUpperCase().padStart(4, '0')).join(' ')}. Supply a font covering this text.`, 422)
    font = this.fonts[index]
    this.choices.set(segment, font)
   }
   const previous = runs.at(-1)
   if (previous?.font === font) previous.text += segment
   else runs.push({ text: segment, font })
  }
  return runs
 }

 private width(text: string, size: number) {
  return this.runs(text).reduce((width, run) => width + run.font.widthOfTextAtSize(run.text, size), 0)
 }

 private draw(text: string, x: number, y: number, size: number, color = ink) {
  for (const run of this.runs(text)) {
   this.page.drawText(run.text, { x, y, size, font: run.font, color })
   x += run.font.widthOfTextAtSize(run.text, size)
  }
 }

 private newPage() {
  this.page = this.document.addPage(letter)
  this.page.drawLine({ start: { x: margin, y: 48 }, end: { x: letter[0] - margin, y: 48 }, thickness: 0.6, color: rgb(0.8, 0.83, 0.81) })
  this.draw(this.footer??`Not signed, revision ${this.revision}`, margin, 32, 9, muted)
  this.draw(`Page ${this.document.getPageCount()}`, letter[0] - margin - 48, 32, 9, muted)
  this.y = letter[1] - margin
 }

 private room(height: number) {
  if (this.y - height < bottom) this.newPage()
 }

 gap(height = 10) {
  this.y = Math.max(bottom, this.y - height)
 }

 pageBreak(){this.newPage()}

 heading(text: string) {
  this.room(48)
  this.gap(12)
  this.text(text, 13, accent)
  this.gap(3)
 }

 text(value: string, size = 10.5, color = ink) {
  // Tabs and line endings keep their document meaning; other unsupported
  // characters are rejected by the coverage check rather than substituted.
  const paragraphs = value.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n')
  const width = letter[0] - 2 * margin
  const leading = Math.max(15, size * 1.45)
  for (const paragraph of paragraphs) {
   const characters = Array.from(this.segmenter.segment(paragraph), entry => entry.segment)
   if (!characters.length) {
    this.room(leading)
    this.y -= leading
    continue
   }
   let start = 0
   while (start < characters.length) {
    // Exponential bounds keep measuring a very long unbroken URL linear in
    // its rendered length instead of repeatedly shaping the entire remainder.
    let fit = 0
    let upper = 1
    const remaining = characters.length - start
    while (upper <= remaining && this.width(characters.slice(start, start + upper).join(''), size) <= width) {
     fit = upper
     upper *= 2
    }
    let low = fit + 1
    let high = Math.min(upper, remaining)
    while (low <= high) {
     const middle = Math.floor((low + high) / 2)
     if (this.width(characters.slice(start, start + middle).join(''), size) <= width) {
      fit = middle
      low = middle + 1
     } else high = middle - 1
    }
    need(fit > 0, 'A PDF text character is wider than the printable page.', 422)
    let end = start + fit
    if (end < characters.length) {
     for (let index = end - 1; index > start; index--) {
      if (/^\s+$/u.test(characters[index])) {
       end = index + 1
       break
      }
     }
    }
    const line = characters.slice(start, end).join('')
    this.room(leading)
    this.y -= leading
    this.draw(line, margin, this.y, size, color)
    start = end
   }
  }
 }
}
