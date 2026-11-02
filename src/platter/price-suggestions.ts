import { dollars, need, exact, snapshot, type Actor } from './model'
import { permitted, senders } from './permissions'
import { editablePackages, pricingInput } from './pricing'
import { performanceHistory } from './reports/performance'

export async function priceSuggestions(db:D1Database,a:Actor,id:unknown){
 need(senders.includes(a.role),'Your role cannot use historical price suggestions',403)
 const p=await permitted(db,a,id,'edit'),content=snapshot(p),segment=(await db.prepare('SELECT segment FROM p_clients WHERE id=?').bind(p.client_id).first<any>()).segment
 const history=(await performanceHistory(db,a)).filter(h=>h.id!==p.id&&(h.accepted||h.lost)&&h.currency===p.currency&&h.segment===segment)
 const suggestions:any[]=[]
 for(const [tableIndex,table] of pricingInput(content.options).entries())for(const [lineIndex,line] of table.lines.entries()){
  if(!line.catalogId)continue
  const sample=history.flatMap(h=>{const l=h.lines.find((l:any)=>l.catalogId===line.catalogId);return l?[{id:h.id,title:h.title,won:h.won,unitCents:Math.round(Number(l.unitPrice)*100)}]:[]}).sort((a,b)=>a.unitCents-b.unitCents||a.id.localeCompare(b.id))
  if(!sample.length)continue
  const lowCents=sample[0].unitCents,highCents=sample.at(-1)!.unitCents
  suggestions.push({tableIndex,lineIndex,name:line.name,catalogId:line.catalogId,segment,currency:p.currency,sampleSize:sample.length,lowCents,highCents,currentCents:Math.round(Number(line.unitPrice)*100),examples:sample.slice(0,3)})
 }
 return {id:p.id,version:p.version,revision:p.revision,suggestions}
}
export async function applyPriceFields(db:D1Database,a:Actor,input:Record<string,unknown>){
 const row=await permitted(db,a,input.id,'edit');exact(row,input)
 need(['draft','approved'].includes(row.status),'Apply a suggestion only to an unsent draft',409)
 const suggestions=await priceSuggestions(db,a,row.id),tableIndex=Number(input.tableIndex),lineIndex=Number(input.lineIndex),suggestion=suggestions.suggestions.find(s=>s.tableIndex===tableIndex&&s.lineIndex===lineIndex)
 need(suggestion,'No matching historical suggestion',409)
 const cents=input.unitPrice===undefined?Number(input.unitCents):dollars(input.unitPrice);need(Number.isSafeInteger(cents)&&cents>=suggestion.lowCents&&cents<=suggestion.highCents,'Choose a unit price within the shown historical range')
 const content=snapshot(row),tables=pricingInput(content.options);tables[tableIndex].lines[lineIndex].unitPrice=(cents/100).toFixed(2)
 return {id:row.id,version:row.version,clientId:row.client_id,title:row.title,scope:row.scope,terms:row.terms??'',depositPercent:row.deposit_bps/100,packages:editablePackages(content.options),pricingTables:tables}
}
