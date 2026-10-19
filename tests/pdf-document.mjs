import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Inspect actual downloaded bytes through an independent PDF reader.
export async function pdfPages(bytes) {
 const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false }).promise
 try {
  const pages = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
   const page = await document.getPage(pageNumber)
   pages.push((await page.getTextContent()).items.map(item => item.str).join(' '))
  }
  return pages
 } finally { await document.destroy() }
}
