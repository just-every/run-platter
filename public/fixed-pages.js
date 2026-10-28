import {getDocument,GlobalWorkerOptions} from '/pdfjs/pdf.js';
GlobalWorkerOptions.workerSrc='/pdfjs/pdf.worker.js';
async function pages(source,onPage){
 const response=await fetch(source,{credentials:'same-origin'});if(!response.ok)throw Error('Verify your email or reload the proposal to view the original PDF.');
 const pdf=await getDocument({data:new Uint8Array(await response.arrayBuffer()),isEvalSupported:false,useSystemFonts:true}).promise;
 try{for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),viewport=page.getViewport({scale:1.2}),canvas=document.createElement('canvas');canvas.width=Math.ceil(viewport.width);canvas.height=Math.ceil(viewport.height);canvas.className='fixed-pdf-page';canvas.setAttribute('aria-label','Original PDF page '+i);canvas.setAttribute('role','img');canvas.dataset.fixedPage=String(i);await page.render({canvas,canvasContext:canvas.getContext('2d'),viewport}).promise;await onPage(canvas,i);page.cleanup();}return pdf.numPages;}finally{await pdf.destroy();}
}
for(const region of document.querySelectorAll('[data-fixed-pages]')){
 const status=region.querySelector('[role=status]');
 pages(region.dataset.source,async canvas=>{region.append(canvas);}).then(()=>status.remove()).catch(error=>{status.textContent=error.message;status.setAttribute('role','alert');});
}
for(const region of document.querySelectorAll('[data-fixed-word-export]')){
 const status=region.querySelector('[role=status]');
 (async()=>{try{
  const images=[];await pages(region.dataset.source,async(canvas,i)=>{status.textContent='Rendering fixed page '+i+'…';images.push(canvas.toDataURL('image/png').split(',')[1]);canvas.width=canvas.height=1;});
  status.textContent='Building the Word document…';const response=await fetch('/api/platter/document-export?id='+encodeURIComponent(region.dataset.id)+'&format=docx',{method:'POST',credentials:'same-origin',headers:{'content-type':'application/json'},body:JSON.stringify({sha256:region.dataset.sha,images})});if(!response.ok){const result=await response.json();throw Error(result.error??'The document could not be exported.');}
  const url=URL.createObjectURL(await response.blob()),link=document.createElement('a');link.href=url;link.download='proposal.docx';link.textContent='Download Word document';region.append(link);status.textContent='Your Word document contains the fixed pages as images, the original PDF bytes and the appended proposal blocks.';link.click();addEventListener('pagehide',()=>URL.revokeObjectURL(url),{once:true});
 }catch(error){status.textContent=error.message;status.setAttribute('role','alert');}})();
}
