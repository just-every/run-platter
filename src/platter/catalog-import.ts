import { catalogValues } from './catalog'
import { commit, hash, need, text, type Actor } from './model'

/** Promotion is a second, explicit review of native pricing, never an import side effect. */
export async function promoteCatalog(db:D1Database,a:Actor,p:Record<string,any>,apply:boolean){
 need(a.role==='owner','Only the owner promotes imported prices',403)
 const selected=p.itemIds??Object.keys(p).filter(k=>k.startsWith('promote:')&&p[k]==='yes').map(k=>k.slice(8))
 need(Array.isArray(selected)&&selected.length>0&&selected.length<=50&&new Set(selected).size===selected.length,'Select 1 to 50 distinct imported items')
 const ids=selected.map(id=>text(id,'an imported item')).sort()
 const sources=(await db.prepare('SELECT * FROM p_catalog_items WHERE id IN (SELECT value FROM json_each(?)) ORDER BY id').bind(JSON.stringify(ids)).all<any>()).results
 need(sources.length===ids.length,'Imported item no longer exists',409)
 const reviewed=[]
 for(const source of sources){
  const record=JSON.parse(source.data_json)
  need(!record.images?.length,'Promote image-free records only. Imported image records remain review only.',409)
  need(!record.package&&!record.bundle_components?.length,'Bundle promotion is not supported. Create its priced items explicitly.',409)
  need(!record.currency||record.currency==='USD','Only USD imported prices can be promoted',409)
  need(!record.price_type||['amount','fixed'].includes(record.price_type.toLowerCase()),'Only fixed imported prices can be promoted',409)
  need(!record.min_price&&!record.max_price&&!record.billing_mode,'Variable or provider billing needs explicit native pricing',409)
  const interval=String(record.billing_frequency||'one-off').trim().toLowerCase()
  const item=catalogValues({name:record.name,sku:record.sku,description:record.description,unit:record.unit_name||p.fallbackUnit,unitPrice:record.price,unitCost:record.cost??'',defaultRecurrence:interval,taxable:record.tax_exempt===false,taxCode:record.tax_code??'',incomeAccount:record.income_account??''})
  reviewed.push({source,item})
 }
 need(!await db.prepare('SELECT id FROM p_priced_catalog WHERE source_id IN (SELECT value FROM json_each(?)) OR sku COLLATE NOCASE IN (SELECT value FROM json_each(?))').bind(JSON.stringify(ids),JSON.stringify(reviewed.map(r=>r.item.sku))).first(),'This record or SKU already has a priced item',409)
 const fingerprint=await hash(JSON.stringify({owner:a.id,reviewed}))
 if(!apply)return {kit:'Catalog promotion',fingerprint,items:reviewed.map(({source,item})=>({sourceId:source.id,...item}))}
 need(p.fingerprint===fingerprint,'Imported records or pricing choices changed. Review promotion again.',409)
 const at=Date.now(),items=reviewed.map(({source,item})=>({id:crypto.randomUUID(),source,item}))
 await commit(db,a,items.map(({id,source,item})=>db.prepare('INSERT INTO p_priced_catalog(id,sku,name,description,unit,unit_cents,unit_cost_cents,default_recurrence,taxable,tax_code,income_account,source_id,source_version,updated_by,updated_at) VALUES(?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)').bind(id,item.sku,item.name,item.description,item.unit,item.unitCents,item.unitCostCents,item.defaultRecurrence,item.taxable?1:0,item.taxCode,item.incomeAccount,source.id,source.version,a.id,at)),false,{
  sql:"NOT EXISTS(SELECT 1 FROM json_each(?) r LEFT JOIN p_catalog_items c ON c.id=json_extract(r.value,'$.id') WHERE c.id IS NULL OR c.version!=json_extract(r.value,'$.version') OR c.data_json!=json_extract(r.value,'$.data_json'))",values:[JSON.stringify(reviewed.map(({source})=>source))],
 })
 return {items:items.map(({id,source})=>({id,sourceId:source.id,version:1}))}
}
