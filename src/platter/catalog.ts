import { costReaders, flatCostKey, type CostPatch } from './internal-pricing'
import { permitted } from './permissions'
import { negotiatedView, pendingNegotiation } from './negotiation'
import { editablePackages, pricingInput } from './pricing'
import { commit, dollars, exact, hash, need, snapshot, text, type Actor } from './model'
export const catalogEditors=['owner','admin','manager']
export const catalogReaders=[...catalogEditors,'sales','content_editor','billing']
export async function catalogState(db:D1Database,a:Actor){
 if(!catalogReaders.includes(a.role))return []
 const rows=(await db.prepare('SELECT * FROM p_priced_catalog ORDER BY name,id').all<any>()).results
 return rows.map(({unit_cost_cents,...row})=>({...row,...(costReaders.includes(a.role)?{unitCostCents:unit_cost_cents}:{})}))
}
export async function saveCatalog(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(catalogEditors.includes(a.role),'Only owner, admins and managers edit catalog items and prices',403)
 const id=p.id?text(p.id,'a catalog item'):crypto.randomUUID(),old=p.id?await db.prepare('SELECT * FROM p_priced_catalog WHERE id=?').bind(id).first<any>():null
 if(p.id)need(old,'Catalog item not found',404);if(old)exact(old,p)
 const sku=text(p.sku,'a SKU',100),name=text(p.name,'an item name'),unit=String(p.unit),description=String(p.description??''),cents=dollars(p.unitPrice,'a USD unit price')
 need(['hour','day','month','project','each'].includes(unit),'Choose a catalog unit');need(description.length<=2000,'Use at most 2000 description characters')
 const cost=p.unitCost===undefined?old?.unit_cost_cents??null:p.unitCost===''?null:/^0(?:\.0{1,2})?$/.test(String(p.unitCost).trim())?0:dollars(p.unitCost,'an internal unit cost')
 await commit(db,a,[old?db.prepare('UPDATE p_priced_catalog SET sku=?,name=?,description=?,unit=?,unit_cents=?,unit_cost_cents=?,version=version+1,updated_by=?,updated_at=? WHERE id=?').bind(sku,name,description,unit,cents,cost,a.id,Date.now(),id):db.prepare('INSERT INTO p_priced_catalog(id,sku,name,description,unit,unit_cents,unit_cost_cents,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?)').bind(id,sku,name,description,unit,cents,cost,a.id,Date.now())],false,old?{sql:'EXISTS(SELECT 1 FROM p_priced_catalog WHERE id=? AND version=?)',values:[id,old.version]}:undefined)
 return{id,version:(old?.version??0)+1}
}
export async function catalogInsertion(db:D1Database,a:Actor,p:Record<string,unknown>){
 const original=await permitted(db,a,p.id,'edit');exact(original,p)
 const row=negotiatedView(original,await pendingNegotiation(db,original.id));need(['draft','approved'].includes(row.status),'Add catalog items to an unsent draft',409);need(row.currency==='USD','USD catalog prices do not convert historical agreements',409)
 const item=await db.prepare('SELECT * FROM p_priced_catalog WHERE id=?').bind(text(p.catalogId,'a catalog item')).first<any>();need(item,'Catalog item not found',404);need(item.version===Number(p.catalogVersion),'Catalog item changed. Reload before choosing its price.',409)
 const publicOffer=snapshot(row),options=publicOffer.options,option=options.find((o:any)=>o.id===p.optionId);need(option,'Choose a package')
 const tables=pricingInput(options),existing=option.tables??[],line={name:item.name,description:item.description,unit:item.unit,quantity:String(p.quantity??'1'),unitPrice:(item.unit_cents/100).toFixed(2)},baseline=existing.length?[]:[{name:'Original package amount',description:'',unit:'project',quantity:'1',unitPrice:(option.cents/100).toFixed(2)}],tableName='Catalog items'
 tables.push({optionId:option.id,name:tableName,lines:[...baseline,line]})
 const key=await hash(JSON.stringify([option.id,existing.length,baseline.length,tableName,line.name,line.description,line.unit])),costs:CostPatch[]=item.unit_cost_cents===null?[]:[{key,cents:item.unit_cost_cents}]
 if(baseline.length){const oldCost=await db.prepare('SELECT unit_cost_cents FROM p_internal_costs WHERE proposal_id=? AND revision=? AND line_key=?').bind(row.id,row.revision,await flatCostKey(option.id)).first<any>();if(oldCost)costs.push({key:await hash(JSON.stringify([option.id,0,0,tableName,baseline[0].name,baseline[0].description,baseline[0].unit])),cents:oldCost.unit_cost_cents})}
 return {fields:{id:row.id,version:original.version,clientId:row.client_id,title:row.title,scope:row.scope,terms:row.terms??'',sectionConditions:publicOffer.section_conditions??{},depositPercent:row.deposit_bps/100,packages:editablePackages(options),pricingTables:tables},costs}
}
