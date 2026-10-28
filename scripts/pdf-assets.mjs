import {readFile} from 'node:fs/promises'
import {createRequire} from 'node:module'
const require=createRequire(import.meta.url)
/** Serve the installed PDF renderer locally; documents never leave this installation. */
export function pdfAssets(){
 const files=new Map([['/pdfjs/pdf.js',require.resolve('pdfjs-dist/build/pdf.mjs')],['/pdfjs/pdf.worker.js',require.resolve('pdfjs-dist/build/pdf.worker.mjs')]])
 return {name:'platter-pdf-assets',configureServer(server){server.middlewares.use(async(request,response,next)=>{const file=files.get(request.url?.split('?')[0]);if(!file)return next();try{response.setHeader('content-type','text/javascript');response.end(await readFile(file))}catch(error){next(error)}})},async generateBundle(){if(this.environment?.name!=='client')return;for(const [name,path]of files)this.emitFile({type:'asset',fileName:name.slice(1),source:await readFile(path)})}}
}
