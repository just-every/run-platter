import { Buffer } from 'node:buffer'
import type { Bindings } from '../auth.server'
import { need, type Actor } from './model'
import { businessImportCommand, businessImportJobs, businessImageUrls } from './movein/business-import'
import { acquireCatalogImages } from './movein/catalog-images'

export async function businessRecords(db: D1Database, actor: Actor) {
 if(actor.role!=='owner')return {companies:[],contacts:[],catalog:[]}
 need(await db.prepare("SELECT id FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first(),'Owner access required',403)
 const tables={companies:'p_companies',contacts:'p_contacts',catalog:'p_catalog_items'}
 const entries=await Promise.all(Object.entries(tables).map(async([kind,table])=>[kind,(await db.prepare(`SELECT data_json FROM ${table} ORDER BY id`).all<{data_json:string}>()).results.map(r=>JSON.parse(r.data_json))]))
 return Object.fromEntries(entries)
}
export async function businessCommand(env: Bindings, actor: Actor, name: string, input: Record<string,unknown>) {
 need(actor.role==='owner'&&await env.DB.prepare("SELECT id FROM oa_operators WHERE id=? AND role='owner' AND status='active'").bind(actor.id).first(),'Only the active owner imports business records',403)
 const images=['business-import.preview','business-import.apply'].includes(name)?await acquireCatalogImages(businessImageUrls(input)):{}
 return businessImportCommand(env.DB,actor,name,input,{...images,allowUnfetched:input.omitUnfetchedImages===true||input.omitUnfetchedImages==='yes'})
}
export async function businessState(db:D1Database,actor:Actor) {
 return actor.role==='owner'?{businessRecords:await businessRecords(db,actor),businessImportJobs:await businessImportJobs(db,actor)}:{businessRecords:{companies:[],contacts:[],catalog:[]},businessImportJobs:[]}
}
export async function businessOriginal(env:Bindings,actor:Actor,query:URLSearchParams) {
 const journal=await businessImportCommand(env.DB,actor,'business-import.journal',{id:query.get('job')})
 const original=(journal as any).originals.find((o:any)=>o.name===query.get('name'))
 need(original&&original.original.status==='retained','Original file unavailable',404)
 return new Response(Buffer.from(original.original.base64,'base64'),{headers:{'content-type':'application/octet-stream','content-disposition':'attachment; filename="import-original"','cache-control':'no-store','x-content-type-options':'nosniff'}})
}
