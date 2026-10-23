import type { Bindings } from '../../auth.server'
import { providerJson } from '../connections'
import { commit, need, text, type Actor } from '../model'
const base=(account:string)=>'https://quickbooks.api.intuit.com/v3/company/'+encodeURIComponent(account)+'/'
export async function verifyItem(item:string,income:string,account:string,token:string){
 const value=await providerJson(base(account)+'item/'+encodeURIComponent(item),token)
 need(value.Item?.Id===item&&value.Item?.IncomeAccountRef?.value===income,'The accounting item must use the selected income account',409)
}
export async function mapCatalog(env:Bindings,a:Actor,p:Record<string,unknown>,context:any){
 need(['owner','admin'].includes(a.role),'Only owner and admins map accounting items',403)
 const id=text(p.catalogId,'a catalog item'),item=text(p.itemId,'an accounting item id'),tax=text(p.taxCode,'a tax code'),income=text(p.incomeAccount,'an income account')
 need(await env.DB.prepare('SELECT 1 FROM p_priced_catalog WHERE id=?').bind(id).first(),'Catalog item not found',404)
 await verifyItem(item,income,context.account,context.token)
 await commit(env.DB,a,[env.DB.prepare('INSERT INTO p_accounting_catalog(catalog_id,authority,account_id,item_id,tax_code,income_account) VALUES(?,?,?,?,?,?) ON CONFLICT(catalog_id,authority,account_id) DO UPDATE SET item_id=excluded.item_id,tax_code=excluded.tax_code,income_account=excluded.income_account').bind(id,context.settings.authority,context.account,item,tax,income)])
 return{id}
}
export async function invoiceLines(env:Bindings,accepted:any,amount:any,settings:any,token:string,account:string){
 const snap=JSON.parse(accepted.snapshot),option=snap.options.find((o:any)=>o.id===accepted.option_id)
 const lines:any[]=option.tables?.length?option.tables.flatMap((t:any)=>t.lines.map((l:any)=>({label:l.name+' ('+l.quantity+' '+l.unit+')',basis:l.lineTotalCents,catalogId:l.catalogId}))):[{label:option.label,basis:option.discount?.grossCents??option.cents}]
 for(const item of snap.selection?.items??[])lines.push({label:item.label+' ('+item.quantity+')',basis:item.totalCents})
 const basis=lines.reduce((n,l)=>n+BigInt(l.basis),0n);need(basis>0n,'Invoice source has no priced items',409)
 const allocated=lines.map((l,i)=>({...l,index:i,cents:Number(BigInt(amount.cents)*BigInt(l.basis)/basis),remainder:BigInt(amount.cents)*BigInt(l.basis)%basis}))
 let remaining=amount.cents-allocated.reduce((n,l)=>n+l.cents,0)
 for(const line of [...allocated].sort((a,b)=>a.remainder===b.remainder?a.index-b.index:a.remainder>b.remainder?-1:1)){if(remaining-->0)line.cents++}
 const result=[],verified=new Set<string>()
 for(const line of allocated.filter(l=>l.cents>0)){
  const mapping=line.catalogId?await env.DB.prepare('SELECT * FROM p_accounting_catalog WHERE catalog_id=? AND authority=? AND account_id=?').bind(line.catalogId,settings.authority,account).first<any>():settings
  need(mapping,'Map each catalog item to its accounting item, tax code and income account before invoicing',409)
  if(!verified.has(mapping.item_id)){await verifyItem(mapping.item_id,mapping.income_account,account,token);verified.add(mapping.item_id)}
  result.push({Amount:line.cents/100,Description:amount.label+': '+line.label,DetailType:'SalesItemLineDetail',SalesItemLineDetail:{ItemRef:{value:mapping.item_id},TaxCodeRef:{value:mapping.tax_code},Qty:1,UnitPrice:line.cents/100}})
 }
 return result
}
