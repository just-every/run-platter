import { getDocument,OPS } from 'pdfjs-dist/legacy/build/pdf.mjs'

// Inspect actual downloaded bytes through an independent PDF reader.
export async function pdfPages(bytes,layout=false) {
 const document = await getDocument({ data: new Uint8Array(bytes), useSystemFonts: true, isEvalSupported: false }).promise
 try {
  const pages = []
  for (let pageNumber = 1; pageNumber <= document.numPages; pageNumber++) {
   const page = await document.getPage(pageNumber)
   const items=(await page.getTextContent()).items,text=items.map(item=>item.str).join(' ')
   if(layout){const viewport=page.getViewport({scale:1}),operators=await page.getOperatorList(),images=operators.fnArray.flatMap((fn,i)=>fn===OPS.paintImageXObject||fn===OPS.paintInlineImageXObject?[operators.argsArray[i]]:[]);pages.push({text,width:viewport.width,height:viewport.height,imageCount:images.length,items:items.map(item=>({text:item.str,x:item.transform[4],y:item.transform[5]}))})}else pages.push(text)
  }
  return pages
 } finally { await document.destroy() }
}
