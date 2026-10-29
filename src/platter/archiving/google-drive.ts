import { need } from '../model'

// Each request obtains a fresh credential only after checking execution authority.
export type DriveAuthority = () => Promise<string>
const base='https://www.googleapis.com/drive/v3/files'
export async function driveRequest(authorize:DriveAuthority,url:string,init:RequestInit={}){
 const token=await authorize()
 return fetch(url,{...init,headers:{...init.headers,authorization:'Bearer '+token},redirect:'manual',signal:AbortSignal.timeout(30000)})
}
async function json(response:Response){
 need(response.ok,'Drive refused the archive request; reconcile before any further write',409)
 const raw=await response.text();need(raw.length<=262144,'Drive returned an oversized archive response',409)
 return JSON.parse(raw)
}
export async function driveFolder(authorize:DriveAuthority,id:string){
 const value=await json(await driveRequest(authorize,base+'/'+encodeURIComponent(id)+'?fields=id,name,mimeType,trashed,parents,appProperties,capabilities(canAddChildren)'))
 need(value.id===id&&value.mimeType==='application/vnd.google-apps.folder'&&!value.trashed&&value.capabilities?.canAddChildren===true,'Choose a writable Drive folder',409)
 return value
}
export async function driveId(authorize:DriveAuthority){
 const value=await json(await driveRequest(authorize,base+'/generateIds?count=1&space=drive&type=files'))
 need(Array.isArray(value.ids)&&value.ids.length===1&&/^[A-Za-z0-9_-]{1,200}$/.test(value.ids[0]),'Drive did not reserve a file id',409)
 return value.ids[0] as string
}
export async function createDriveFolder(authorize:DriveAuthority,id:string,parent:string,name:string,client:string){
 const value=await json(await driveRequest(authorize,base+'?fields=id',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({id,name,parents:[parent],mimeType:'application/vnd.google-apps.folder',appProperties:{platterClient:client}})}))
 need(value.id===id,'Drive folder creation is uncertain; reconcile before any further write',409)
}
export async function uploadDrivePdf(authorize:DriveAuthority,id:string,parent:string,name:string,bytes:Uint8Array,digest:string){
 const boundary='platter-'+crypto.randomUUID(),metadata={id,name,parents:[parent],mimeType:'application/pdf',appProperties:{platterSha256:digest}}
 const body=new Blob(['--'+boundary+'\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n'+JSON.stringify(metadata)+'\r\n--'+boundary+'\r\nContent-Type: application/pdf\r\n\r\n',bytes as BlobPart,'\r\n--'+boundary+'--\r\n'])
 const value=await json(await driveRequest(authorize,'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id',{method:'POST',headers:{'content-type':'multipart/related; boundary='+boundary},body}))
 need(value.id===id,'Drive upload is uncertain; reconcile before any further write',409)
}
export async function checkDrivePdf(authorize:DriveAuthority,file:any){
 const metadata=await json(await driveRequest(authorize,base+'/'+encodeURIComponent(file.provider_id)+'?fields=id,name,mimeType,trashed,parents,size'))
 need(metadata.id===file.provider_id&&!metadata.trashed&&metadata.mimeType==='application/pdf'&&metadata.name===file.name&&metadata.parents?.includes(file.folder_id),'The reserved Drive file does not match this archive',409)
 const response=await driveRequest(authorize,base+'/'+encodeURIComponent(file.provider_id)+'?alt=media')
 need(response.ok,'Drive file bytes are unavailable for reconciliation',409)
 const bytes=new Uint8Array(await response.arrayBuffer())
 need(await sha256(bytes)===file.sha256,'Drive file bytes do not match the retained agreement',409)
}
export const sha256=async(bytes:Uint8Array)=>Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes as BufferSource)),b=>b.toString(16).padStart(2,'0')).join('')
