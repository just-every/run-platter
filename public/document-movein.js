for (const form of document.querySelectorAll('[data-document-upload]')) {
 form.addEventListener('submit', async event => {
  event.preventDefault()
  const status=form.querySelector('[data-upload-status]'),button=form.querySelector('button'),id=form.dataset.movein
  const command=async(name,input)=>{
   const response=await fetch('/api/platter/command',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:'document-import.'+name,input:{id,...input}})})
   const result=await response.json()
   if(!response.ok)throw Error(result.error||'The upload stopped. Select the same file to resume.')
   return result
  }
  button.disabled=true
  try {
   for(const file of form.elements.files.files) {
    const bytes=new Uint8Array(await file.arrayBuffer())
    const sha256=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),b=>b.toString(16).padStart(2,'0')).join('')
    const upload=await command('upload-start',{filename:file.name,size:bytes.length,sha256})
    if(upload.complete)continue
    for(let position=upload.received;position<bytes.length;) {
     const chunk=bytes.subarray(position,position+48000),base64=btoa(String.fromCharCode(...chunk))
     const next=await command('upload-chunk',{sha256,position,base64})
     position=next.received
     status.textContent=file.name+': '+position+' of '+bytes.length+' bytes saved.'
    }
    await command('upload-finish',{sha256})
   }
   location.assign('/app/import')
  }catch(error){status.textContent=error.message}
  finally{button.disabled=false}
 })
}
