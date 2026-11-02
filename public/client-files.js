// Keep other completed acceptance fields intact while an original uploads.
for(const form of document.querySelectorAll('[data-client-file-upload]'))form.addEventListener('submit',async event=>{
 event.preventDefault()
 const button=form.querySelector('button'),status=form.querySelector('[data-client-file-status]'),fieldId=form.elements.fieldId.value
 button.disabled=true;status.textContent='Uploading…'
 try{
  const response=await fetch(form.action,{method:'POST',body:new FormData(form),headers:{accept:'application/json'}})
  const result=await response.json()
  if(!response.ok)throw Error(result.error||'Upload refused. Reload to check the current offer.')
  const input=Array.from(document.querySelectorAll('input[form="platter-acceptance"]')).find(node=>node.name==='field:'+fieldId)
  input.value=result.id
  const link=document.createElement('a');link.href=new URL(form.action).pathname+'/'+encodeURIComponent(result.id);link.textContent='Download '+result.filename
  form.parentElement.querySelector('[data-client-file-result]').replaceChildren(link)
  status.textContent='Upload complete. This original will be retained when you accept.'
 }catch(error){status.textContent=error.message}
 finally{button.disabled=false}
})
