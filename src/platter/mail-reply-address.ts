import type { Bindings } from '../auth.server'
import { need } from './model'

/** Only ciphertext is allowed into the queued transport record. */
export type SealedReplyAddress = string & { readonly sealedReplyAddress:unique symbol }
const context='platter/mail-reply-address/v1'
const bytes=new TextEncoder()
const encode=(value:Uint8Array)=>btoa(String.fromCharCode(...value))
const decode=(value:string)=>Uint8Array.from(atob(value),char=>char.charCodeAt(0))
async function key(env:Bindings) {
 const digest=await crypto.subtle.digest('SHA-256',bytes.encode(env.SESSION_SECRET))
 return crypto.subtle.importKey('raw',digest,{name:'AES-GCM'},false,['encrypt','decrypt'])
}
function validAddress(address:string) {
 return address.length<=318&&/^[a-f0-9]{64}@[a-z0-9](?:[a-z0-9.-]*[a-z0-9])?$/.test(address)
}
export async function sealReplyAddress(env:Bindings,address:string):Promise<SealedReplyAddress> {
 need(validAddress(address),'Invalid mail reply address')
 const iv=crypto.getRandomValues(new Uint8Array(12))
 const encrypted=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:bytes.encode(context+'\n'+env.AUTH_ORIGIN)},await key(env),bytes.encode(address))
 return ('v1:'+encode(iv)+':'+encode(new Uint8Array(encrypted))) as SealedReplyAddress
}
/** Dispatch is the sole caller: the private reply capability never enters public state. */
export async function openReplyAddress(env:Bindings,sealed:string):Promise<string> {
 const [version,nonce,payload,...extra]=sealed.split(':')
 need(version==='v1'&&nonce&&payload&&!extra.length,'Invalid sealed mail reply address')
 const iv=decode(nonce)
 need(iv.length===12,'Invalid sealed mail reply address')
 const decrypted=await crypto.subtle.decrypt({name:'AES-GCM',iv,additionalData:bytes.encode(context+'\n'+env.AUTH_ORIGIN)},await key(env),decode(payload))
 const address=new TextDecoder('utf-8',{fatal:true}).decode(decrypted)
 need(validAddress(address),'Invalid sealed mail reply address')
 return address
}
