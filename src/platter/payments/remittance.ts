import { commit, need, text, type Actor } from '../model'
export async function remittanceSettings(db:D1Database){return await db.prepare('SELECT * FROM p_remittance_settings WHERE singleton=1').first<any>()??{instructions:'',version:0}}
export async function remittanceInstructions(db:D1Database){const settings=await remittanceSettings(db);return settings.instructions||(await db.prepare('SELECT remittance FROM p_accounting_settings WHERE singleton=1').first<any>())?.remittance||''}
export async function setRemittance(db:D1Database,a:Actor,p:Record<string,unknown>){
 need(['owner','admin'].includes(a.role),'Only owner and admins publish remittance instructions',403)
 need(p.consent===true||p.consent==='yes','Confirm these instructions may appear on client invoices')
 const old=await remittanceSettings(db);need(Number(p.version)===old.version,'Remittance instructions changed. Reload.',409)
 const instructions=text(p.instructions,'client-visible check and wire instructions',2000)
 await commit(db,a,[db.prepare('INSERT INTO p_remittance_settings(singleton,instructions,updated_by,updated_at) VALUES(1,?,?,?) ON CONFLICT(singleton) DO UPDATE SET instructions=excluded.instructions,updated_by=excluded.updated_by,updated_at=excluded.updated_at,version=p_remittance_settings.version+1').bind(instructions,a.id,Date.now())],false,{sql:'COALESCE((SELECT version FROM p_remittance_settings WHERE singleton=1),0)=?',values:[old.version]})
 return{id:'installation',published:true}
}
