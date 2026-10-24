import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
export async function richLibrarySource(h,clientId){
 const fields={clientId,title:'Synthetic library originals',scope:'Reusable source blocks',optionOne:'First',priceOne:'100',optionTwo:'Second',priceTwo:'200',depositPercent:'25',pricingTables:[{optionId:'one',name:'Services',lines:[{name:'Delivery',description:'Reviewed service',quantity:'2',unit:'hour',unitPrice:'10.01'}]}]}
 const source=await h.cmd('proposal.prepare',fields),bytes=await readFile('public/brand/apple-touch-icon.png'),videoBytes=await readFile('fixtures/editor/synthetic-platter-1.webm')
 const upload=async(bytes,name,type)=>{
  const form=new FormData();form.set('id',source.id);form.set('version','1');form.set('consent','yes');form.set('file',new File([bytes],name,{type}))
  const request=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:form}),response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(response.status,200,await response.clone().text());return (await response.json()).media
 }
 const image=await upload(bytes,'synthetic-platter-1.png','image/png'),video=await upload(videoBytes,'synthetic-platter-1.webm','video/webm')
 const document={version:1,blocks:[{id:'image',type:'image',title:'Studio image',text:'Original caption',assetId:image.id,alt:'Synthetic studio'},{id:'video',type:'video',title:'Studio video',text:'Original caption',assetId:video.id,posterId:image.id,alt:'Synthetic introduction'},{id:'pricing',type:'pricing',title:'Services',text:'Original caption',optionId:'one',tableIndex:0}]}
 await h.cmd('proposal.document',{id:source.id,version:1,document})
 return {source,fields,document,bytes,videoBytes,image,video}
}
export async function richLibraryPropagation(h,clientId){
 const setup=await h.mf.dispatchFetch(h.origin+'/setup',{method:'POST',headers:{origin:h.origin,cookie:h.owner,'content-type':'application/x-www-form-urlencoded'},body:'confirm=yes',redirect:'manual'});assert.equal(setup.status,303)
 const {source,fields,document,bytes,videoBytes,image,video}=await richLibrarySource(h,clientId)
 const read=async id=>(await h.state()).proposals.find(p=>p.id===id)
 for(const kind of ['image','video','pricing']){
  const input={title:'Synthetic '+kind,kind,sourceRef:source.id+':'+kind,shareConsent:true,tags:['studio','reusable']}
  const noConsent={...input,shareConsent:false},before=await h.state();await h.cmd('library.save',noConsent,h.owner,400);assert.deepEqual(await h.state(),before)
  const item=await h.cmd('library.save',input),linked=await h.cmd('proposal.prepare',{...fields,title:'Linked '+kind,pricingTables:[]}),detached=await h.cmd('proposal.prepare',{...fields,title:'Detached '+kind,pricingTables:[]}),sent=await h.cmd('proposal.prepare',{...fields,title:'Sent '+kind,pricingTables:[]})
  for(const [p,mode] of [[linked,'linked'],[detached,'detached'],[sent,'linked']])await h.cmd('library.insert',{id:p.id,version:1,itemId:item.id,itemVersion:1,mode,consent:true,optionId:'two'})
  let p=await read(sent.id);await h.cmd('proposal.approve',{id:p.id,version:p.version,revision:p.revision});p=await read(sent.id);const path=new URL((await h.cmd('proposal.send',{id:p.id,version:p.version})).shareUrl).pathname
  const sentBefore=await read(sent.id),detachedBefore=await read(detached.id)
  if(kind==='pricing'){assert.equal(sentBefore.options[1].cents,2002);assert.equal(sentBefore.options[0].cents,10000)}
  const sourceBefore=await read(source.id),nextDoc=structuredClone(sourceBefore.document);nextDoc.blocks.find(b=>b.id===kind).text='Updated '+kind+' caption'
  let replacementMedia
  if(kind!=='pricing'){
   const replacementBytes=kind==='image'?await readFile('fixtures/business/brand.png'):videoBytes,form=new FormData();form.set('id',source.id);form.set('version',String(sourceBefore.version));form.set('consent','yes');form.set('file',new File([replacementBytes],'synthetic-platter-replacement.'+(kind==='image'?'png':'webm'),{type:kind==='image'?'image/png':'video/webm'}))
   const request=new Request(h.origin+'/app/document-media',{method:'POST',headers:{origin:h.origin,cookie:h.owner,accept:'application/json'},body:form}),response=await h.mf.dispatchFetch(request.url,{method:'POST',headers:request.headers,body:await request.arrayBuffer()});assert.equal(response.status,200);replacementMedia=(await response.json()).media;nextDoc.blocks.find(b=>b.id===kind).assetId=replacementMedia.id
  }

  let nextFields={...fields,id:source.id,version:sourceBefore.version,document:nextDoc}
  if(kind==='pricing')nextFields.pricingTables=[{...fields.pricingTables[0],lines:[{...fields.pricingTables[0].lines[0],unitPrice:'25.03'}]}]
  await h.cmd('proposal.revise',nextFields)
  const replacement=await h.cmd('library.save',{...input,id:item.id,version:1})
  assert.equal(replacement.version,2)
  assert.equal((await read(linked.id)).document.blocks[0].text,'Updated '+kind+' caption')
  if(kind==='pricing'){assert.equal((await read(linked.id)).options[1].cents,5006);assert.equal((await read(detached.id)).options[1].cents,2002)}
  assert.deepEqual(await read(detached.id),detachedBefore);assert.deepEqual(await read(sent.id),sentBefore,'library replacement never changes sent '+kind)
  const uses=(await h.state()).libraryItems.find(i=>i.id===item.id);assert.deepEqual(uses.tags,['studio','reusable']);assert.equal(uses.uses.length,3);assert.equal(uses.uses.find(u=>u.proposalId===linked.id).mode,'linked')
  if(kind!=='pricing'){
   const updated=await h.mf.dispatchFetch(h.origin+'/api/platter/document-media/'+linked.id+'/'+replacementMedia.id,{headers:{cookie:h.owner}});assert.equal(updated.status,200);assert.deepEqual(Buffer.from(await updated.arrayBuffer()),kind==='image'?await readFile('fixtures/business/brand.png'):videoBytes)
   assert.equal((await h.send(path+'/media/'+replacementMedia.id)).status,404,'later library media never enters a sent revision')
   const file=kind==='image'?image:video,response=await h.mf.dispatchFetch(h.origin+path+'/media/'+file.id);assert.equal(response.status,200);assert.deepEqual(Buffer.from(await response.arrayBuffer()),kind==='image'?bytes:videoBytes)
  }
  const current=await read(linked.id),manual=structuredClone(current.document);manual.blocks[0].text='Independent manual edit'
  await h.cmd('proposal.document',{id:linked.id,version:current.version,document:manual})
  await h.cmd('library.save',{...input,id:item.id,version:2,title:'Later '+kind})
  assert.equal((await read(linked.id)).document.blocks[0].text,'Independent manual edit')
 }
}
