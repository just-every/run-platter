import type { Actor } from './model'
/** Link-free settings history, distinct from offer revisions and outbound authority. */
export function deliveryChange(db:D1Database,a:Actor,row:{id:string;revision:number},action:string,settings:unknown,at:number){return db.prepare('INSERT INTO p_delivery_changes(id,proposal_id,revision,actor_id,actor_email,action,settings,occurred_at) VALUES(?,?,?,?,?,?,?,?)').bind(crypto.randomUUID(),row.id,row.revision,a.id,a.email,action,JSON.stringify(settings),at)}
