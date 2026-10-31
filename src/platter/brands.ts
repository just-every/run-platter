import { commit, exact, need, text, type Actor } from './model'
import { documentOf, proposalDocument } from './documents/blocks'
export const defaultBrand='default'
export const brandId=(a:Actor)=>a.brandId??defaultBrand
export function brandScope(a:Actor,alias:string){
 const id=brandId(a)
 return {sql:`${alias}.brand_id=? AND (?='owner' OR EXISTS(SELECT 1 FROM p_brand_members bm JOIN oa_operators bo ON bo.id=bm.operator_id WHERE bm.brand_id=${alias}.brand_id AND bm.operator_id=? AND bo.status='active'))`+(a.role==='agent'?` AND ${alias}.brand_id='default'`:''),values:[id,a.role,a.id]}
}
export async function brandContext(db:D1Database,a:Actor){
 if(a.brandId!==undefined)return
 a.brandId=a.role==='agent'?defaultBrand:(await db.prepare('SELECT brand_id FROM p_brand_choices WHERE operator_id=?').bind(a.id).first<any>())?.brand_id??defaultBrand
}
export async function brandAccess(db:D1Database,a:Actor,id=brandId(a)){
 need(a.role!=='agent'||id===defaultBrand,'Machine access to secondary brands is unavailable',403)
 const row=await db.prepare("SELECT b.* FROM p_brands b WHERE id=? AND (?='owner' OR EXISTS(SELECT 1 FROM p_brand_members m JOIN oa_operators o ON o.id=m.operator_id WHERE m.brand_id=b.id AND m.operator_id=? AND o.status='active'))").bind(id,a.role,a.id).first<any>()
 need(row,'Brand membership is required. Choose an available brand in Settings.',403)
 // Separate from proposal scope: nested authorization cannot replace this live check.
 a.brandPermission={sql:"EXISTS(SELECT 1 FROM p_brands b WHERE b.id=? AND (?='owner' OR EXISTS(SELECT 1 FROM p_brand_members m JOIN oa_operators o ON o.id=m.operator_id WHERE m.brand_id=b.id AND m.operator_id=? AND o.status='active')))",values:[id,a.role,a.id]}
 return row
}
const tables={client:'p_clients',template:'p_personal_templates',library:'p_library_items',catalog:'p_priced_catalog',folder:'p_resource_folders',proposal:'p_proposals'} as const
export async function brandRecord(db:D1Database,a:Actor,kind:keyof typeof tables,id:unknown){
 let row=await db.prepare('SELECT * FROM '+tables[kind]+' WHERE id=?').bind(text(id,'a '+kind)).first<any>()
 if(!row&&kind==='folder')row=await db.prepare('SELECT * FROM p_proposal_folders WHERE id=?').bind(String(id)).first<any>()
 need(row,kind+' not found',404);need(row.brand_id===brandId(a),'This record belongs to another brand',403)
 await brandAccess(db,a)
 return row
}
export async function brandState(db:D1Database,a:Actor){
 await brandContext(db,a)
 const brands=(await db.prepare("SELECT b.* FROM p_brands b WHERE (?='owner' OR EXISTS(SELECT 1 FROM p_brand_members m WHERE m.brand_id=b.id AND m.operator_id=?)) AND (?!='agent' OR b.id='default') ORDER BY b.updated_at,b.id").bind(a.role,a.id,a.role).all<any>()).results.map(b=>({...b,kit:JSON.parse(b.kit)}))
 return {brands,activeBrand:brandId(a),brandMembers:a.role==='owner'?(await db.prepare('SELECT * FROM p_brand_members ORDER BY brand_id,operator_id').all<any>()).results:[]}
}
export async function brandCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 need(a.role!=='agent','A person manages brand preparation',403)
 if(name==='brand.select'){
  const id=text(p.brandId,'a brand');await brandAccess(db,a,id)
  await commit(db,a,[db.prepare('INSERT INTO p_brand_choices VALUES(?,?) ON CONFLICT(operator_id) DO UPDATE SET brand_id=excluded.brand_id').bind(a.id,id)])
  a.brandId=id;return {id}
 }
 need(a.role==='owner','Only the owner manages brands and membership',403)
 if(name==='brand.member'){
  const id=text(p.brandId,'a brand'),person=text(p.operatorId,'a confirmed person');need(await db.prepare('SELECT id FROM p_brands WHERE id=?').bind(id).first(),'Brand not found',404)
  need(await db.prepare("SELECT id FROM oa_operators WHERE id=? AND status='active'").bind(person).first(),'Choose an already confirmed person')
  need([true,false,'yes','no'].includes(p.member as any),'Choose brand membership')
  await commit(db,a,[db.prepare(p.member===true||p.member==='yes'?'INSERT OR IGNORE INTO p_brand_members VALUES(?,?)':'DELETE FROM p_brand_members WHERE brand_id=? AND operator_id=?').bind(id,person)])
  return {id}
 }
 if(name==='brand.capture'){
  const id=text(p.id,'a brand');need(id===brandId(a),'Select this brand before copying its kit',403)
  const sourceRef=String(p.sourceRef??'').split(':');const source=await brandRecord(db,a,'proposal',p.sourceId??sourceRef[0]);exact(source,{version:p.sourceVersion??sourceRef[1]})
  const brand=await db.prepare('SELECT * FROM p_brands WHERE id=?').bind(id).first<any>();exact(brand,p)
  const kit=documentOf(source).brand;need(kit,'Choose a proposal with a brand kit')
  const files=kit.logoId?(await db.prepare("SELECT f.id FROM p_attachment_files f JOIN p_document_media m ON m.file_id=f.id WHERE m.proposal_id=? AND f.id=? AND f.media_type IN ('image/png','image/jpeg')").bind(source.id,kit.logoId).all<any>()).results:[]
  need(!kit.logoId||files.length===1,'Choose a logo in this brand’s consented proposal media')
  need(p.consent===true||p.consent==='yes','Authorize using this kit and logo in future brand drafts')
  await commit(db,a,[db.prepare('UPDATE p_brands SET kit=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(JSON.stringify(kit),a.id,Date.now(),id),db.prepare('DELETE FROM p_brand_media WHERE brand_id=?').bind(id),...files.map(file=>db.prepare('INSERT INTO p_brand_media VALUES(?,?)').bind(id,file.id))],false,{sql:'EXISTS(SELECT 1 FROM p_brands WHERE id=? AND version=?) AND EXISTS(SELECT 1 FROM p_proposals WHERE id=? AND version=?)',values:[id,brand.version,source.id,source.version]})
  return {id,version:brand.version+1}
 }
 need(name==='brand.save','Unknown brand command',404)
 const id=p.id?text(p.id,'a brand'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_brands WHERE id=?').bind(id).first<any>():null
 if(p.id){need(old,'Brand not found',404);exact(old,p)}
 let kit=p.kit===undefined?old?JSON.parse(old.kit):{}:p.kit
 if(typeof kit==='string'){try{kit=JSON.parse(kit)}catch{need(false,'Enter a valid brand kit')}}
 if(p.accent!==undefined)kit={name:p.name,accent:p.accent,ink:p.ink,paper:p.paper,font:p.font,cover:p.cover??''}
 need(kit&&typeof kit==='object'&&!Array.isArray(kit),'Enter a valid brand kit')
 const brand=Object.keys(kit as object).length?proposalDocument({version:1,blocks:[],brand:kit}).brand:null
 // Logos stay bound to explicit proposal media custody, not a shared file id.
 need(!brand?.logoId||old&&JSON.parse(old.kit).logoId===brand.logoId,'Choose logos in each draft from its consented media')
 const nameValue=text(p.name,'a brand name'),at=Date.now(),saved=JSON.stringify(brand??{})
 await commit(db,a,[old?db.prepare('UPDATE p_brands SET name=?,kit=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(nameValue,saved,a.id,at,id):db.prepare('INSERT INTO p_brands(id,name,kit,updated_by,updated_at) VALUES(?,?,?,?,?)').bind(id,nameValue,saved,a.id,at)],false,old?{sql:'EXISTS(SELECT 1 FROM p_brands WHERE id=? AND version=?)',values:[id,old.version]}:undefined)
 return {id,version:(old?.version??0)+1}
}
const preparation=new Set(['client.save','proposal.prepare','proposal.revise','proposal.autosave','proposal.document','proposal.quantity','proposal.variables','proposal.duplicate','template.save','template.start','template.delivery','template.locks','library.save','library.insert','catalog.save','catalog.insert','folder.save','proposal.share','proposal.unlock','proposal.folder'])
export async function authorizeBrandCommand(db:D1Database,a:Actor,name:string,p:Record<string,unknown>){
 await brandContext(db,a)
 if(name.startsWith('brand.'))return
 const brand=await brandAccess(db,a)
 if(brandId(a)!==defaultBrand){
  need(preparation.has(name),'Secondary brands support draft preparation only; sending, approval and provider execution are unavailable',409)
  need(!p.variableDeal&&!p.deal&&!p.dealId,'Connected deal execution is unavailable for secondary brands',409)
 }
 if(p.brandId!==undefined)need(p.brandId===brandId(a),'Select this brand in Settings first',403)
 if(p.clientId)await brandRecord(db,a,'client',p.clientId)
 if(p.catalogId)await brandRecord(db,a,'catalog',p.catalogId)
 if(p.itemId)await brandRecord(db,a,'library',p.itemId)
 if(p.templateId&&!String(p.templateId).startsWith('starter:'))await brandRecord(db,a,'template',p.templateId)
 if(p.folderId)await brandRecord(db,a,'folder',p.folderId)
 if(p.id){
  const kind=name==='client.erase'?'client':name==='template.start'||name==='template.delivery'||name==='template.locks'?'template':name==='catalog.save'?'catalog':name==='library.save'?'library':name==='folder.save'?'folder':name.startsWith('proposal.')||name==='template.save'?'proposal':null
  // Missing proposals belong to the native permission gate, which checks role
  // eligibility before reporting record existence. Existing records still pass
  // the brand boundary before any action can run.
  const exists=kind!=='proposal'||await db.prepare('SELECT id FROM p_proposals WHERE id=?').bind(String(p.id)).first()
  if(kind&&exists&&!(kind==='template'&&String(p.id).startsWith('starter:'))&&!(kind==='folder'&&p.kind==='proposal'))await brandRecord(db,a,kind,p.id)
 }
 // New drafts take an independent kit snapshot; subsequent edits never resolve it again.
 if(name==='proposal.prepare'&&!p.templateId&&Object.keys(JSON.parse(brand.kit)).length){
  let doc:any=p.document??{version:1,blocks:[]};if(typeof doc==='string')doc=JSON.parse(doc)
  p.document={...doc,brand:JSON.parse(brand.kit)}
 }
}

export function copyBrandMedia(db:D1Database,a:Actor,id:string,document:any){
 return document.brand?.logoId?[db.prepare('INSERT OR IGNORE INTO p_document_media(proposal_id,file_id) SELECT ?,file_id FROM p_brand_media WHERE brand_id=? AND file_id=?').bind(id,brandId(a),document.brand.logoId)]:[]
}
