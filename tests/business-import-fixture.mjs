import {readFile} from 'node:fs/promises'
import assert from 'node:assert/strict'
export const businessCsv=name=>readFile('fixtures/business/'+name,'utf8')
export async function applyBusiness(h,input,cookie=h.owner){
 const preview=await h.cmd('business-import.preview',input,cookie)
 assert.equal(preview.canApply,true,JSON.stringify(preview.diagnostics))
 let result=await h.cmd('business-import.apply',{...input,fingerprint:preview.fingerprint},cookie),steps=1
 while(result.job.state!=='completed'){
  assert.ok(++steps<100,'import makes bounded progress')
  const before=result.job.checkpoint
  result=await h.cmd('business-import.apply',{...input,fingerprint:preview.fingerprint},cookie)
  assert.ok(result.job.checkpoint>before||result.job.state==='completed')
 }
 return {preview,...result}
}
export async function undoBusiness(h,id,cookie=h.owner){
 let result=await h.cmd('business-import.undo',{id},cookie),steps=0
 while(result.job.state!=='undone'){assert.ok(++steps<100);result=await h.cmd('business-import.undo',{id},cookie)}
 return result
}
export async function fileHost(request,calls=[]){
 const url=new URL(request.url)
 if(url.hostname==='cloudflare-dns.com'){
  const name=url.searchParams.get('name'),type=Number(url.searchParams.get('type'))
  return Response.json({Status:0,Question:[{name,type}],Answer:type===1?[{name,type:1,data:name==='private.vendor.example'?'127.0.0.1':'93.184.216.34'}]:[]})
 }
 if(url.hostname==='socket-edge.invalid'){
  const data=await request.json();calls.push(data)
  const image=await readFile('fixtures/business/brand.png')
  return new Response(Buffer.concat([Buffer.from(`HTTP/1.1 200 OK\r\nContent-Type: image/png\r\nContent-Length: ${image.length}\r\n\r\n`),image]))
 }
 throw Error('Unexpected external request')
}

export function betterProposalsContacts() {
 const csv='Contact ID,Given name,Family name,Company ID,Company,Job title,Telephone,Billing,Service,Exempt,Source note\r\n'+
  'bp-contact-1,Avery,Vale,bp-company-1,  Cedar Studio  ,Finance Director,+44 020 1234,14 Cedar Road,22 Service Road,Yes,Keep exact facts\r\n'+
  'bp-contact-2,Morgan,Park,bp-company-1,  Cedar Studio  ,Operations,+44 020 4567,14 Cedar Road,22 Service Road,Yes,Second supplied contact\r\n'+
  'bp-contact-3,Robin,Quinn,bp-company-2,Willow Studio,Buyer,+44 020 8901,3 Willow Lane,4 Field Lane,No,Ambiguous first identity\r\n'+
  'bp-contact-4,Robin,Quinn,bp-company-2,Willow Studio,Buyer,+44 020 8902,3 Willow Lane,4 Field Lane,No,Ambiguous second identity\r\n'
 const mapping={delimiter:',',columns:{contact_id:'Contact ID',first_name:'Given name',last_name:'Family name',company_id:'Company ID',company_name:'Company',title:'Job title',phone:'Telephone',billing_address:'Billing',service_address:'Service',tax_exempt:'Exempt'},companyIds:{}}
 return {csv,mapping}
}
