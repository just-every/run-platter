import { canonicalJson, sha256, retireD1ImportCustody, type D1Sql, type D1ImportContext } from '../../modules/import-kit/src/d1/index.ts'
import { clientTargets, destination, mappingVersion } from './targets'
import { namespace } from './csv'
import type { Actor } from '../model'
import { documentTargets,documentDestination } from './document-targets'
import { documentNamespace } from './document-source'
import { businessTargets } from './business-targets'
import { businessDestination, businessNamespace, businessMappingVersion } from './business-model'
import { targetErasure } from '../../modules/import-kit/src/d1/erasure'
import { d1RequestContext } from '../../modules/import-kit/src/d1/index'
import { packGuards } from '../../modules/import-kit/src/d1/budget'
import { readonlyChecks } from '../../modules/import-kit/src/d1/database'

/** Bridge Base's prepared checkpoint statements to the import kit's inert SQL.
 * Reads still use the real binding; no SQL is inferred from a statement object. */
export function captureSql(db: D1Database) {
 const queryKey=Symbol('privacy inert SQL')
 const originals = new WeakMap<object,D1PreparedStatement>()
 const wrap = (statement:D1PreparedStatement, query:D1Sql):D1PreparedStatement => {
  const proxy = new Proxy(statement,{get(target,key) {
   if(key===queryKey)return query
   if(key==='bind')return (...params:any[])=>wrap(target.bind(...params),{sql:query.sql,params})
   const value=Reflect.get(target,key)
   return typeof value==='function'?value.bind(target):value
  }})
  originals.set(proxy,statement);return proxy
 }
 return {database:new Proxy(db,{get(target,key) {
  if(key==='prepare')return (sql:string)=>wrap(target.prepare(sql),{sql,params:[]})
  if(key==='batch')return (statements:D1PreparedStatement[])=>target.batch(statements.map(s=>originals.get(s)??s))
  const value=Reflect.get(target,key);return typeof value==='function'?value.bind(target):value
 }}),query(statement:D1PreparedStatement) {
  const query=(statement as any)[queryKey] as D1Sql|undefined
  if(!query)throw new Error('Uncaptured privacy statement')
  return query
 }}
}

export async function eraseClientImport(db:D1Database,actor:Actor,id:string,email:string,native:D1Sql[],checkpoint:D1Sql[]) {
 // The native row remains only as an anonymous foreign-key anchor for agreements.
 // Its import identity is absent once the erasure fence and anonymization exist.
 const targets={...clientTargets,matches(row:Parameters<typeof clientTargets.matches>[0],dest:string,kind:string,targetId:string) {
  return row?clientTargets.matches(row,dest,kind,targetId):{sql:"EXISTS(SELECT 1 FROM p_clients c JOIN p_erased_clients e ON e.client_id=c.id WHERE c.id=? AND c.name='Erased contact' AND c.variable_fields='{}') AND NOT EXISTS(SELECT 1 FROM p_import_client_revisions WHERE client_id=?)",params:[targetId,targetId]}
 }}
 const context:D1ImportContext={destination,namespace,mappingVersion,storage:{database:db,targets},
  originalErasurePolicy:'withdraw-affected-artifacts',authorization:{principalId:actor.id,predicate:()=>({sql:"EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')",params:[actor.id]})}}
 return retireD1ImportCustody({target:{kind:'clients',id},values:[email]},native,context,checkpoint)
}

/** Compose the kit's guarded custody statements into the same native publication.
 * The owner selected this exact contact ID; names never establish a match. */
export async function businessContactErasure(db:D1Database,actor:Actor,contact:any) {
 if(!contact)return {before:[] as D1Sql[],after:[] as D1Sql[]}
 const companyId=contact.company_id
 const context=d1RequestContext({destination:businessDestination,namespace:businessNamespace,mappingVersion:businessMappingVersion,
  storage:{database:db,targets:businessTargets},originalErasurePolicy:'withdraw-affected-artifacts',
  authorization:{principalId:actor.id,predicate:()=>({sql:"EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')",params:[actor.id]})}})
 const erasure=await targetErasure({kind:'contacts',id:contact.id},context,companyId?{source:record=>record.kind==='companies'&&(record.payload as any).value?.id===companyId}:undefined)
 return {before:packGuards(erasure.before),after:[...packGuards(erasure.after),...readonlyChecks(erasure.final)]}
}

export async function importedDocumentErasure(db:D1Database,actor:Actor,ids:string[],originalArtifacts:{job_id:string;name:string;sha256:string}[]) {
 if(!ids.length)return {before:[] as D1Sql[],after:[] as D1Sql[]}
 const selected=new Set(ids),originals=new Set(originalArtifacts.map(o=>canonicalJson([o.job_id,o.name,o.sha256])))
 const context=d1RequestContext({destination:documentDestination,namespace:documentNamespace,mappingVersion:'exported-documents-v1',
  storage:{database:db,targets:documentTargets},originalErasurePolicy:'withdraw-affected-artifacts',
  authorization:{principalId:actor.id,predicate:()=>({sql:"EXISTS(SELECT 1 FROM oa_operators WHERE id=? AND role='owner' AND status='active')",params:[actor.id]})}})
 const erasure=await targetErasure({kind:'documents',id:ids[0]},context,{source:record=>record.kind==='documents'&&selected.has(record.sourceId),original:(_bytes,original)=>originals.has(canonicalJson([original.jobId,original.name,original.sha256]))})
 return {before:packGuards(erasure.before),after:[...packGuards(erasure.after),...readonlyChecks(erasure.final)]}
}

export const importTargetIdentity=(destination:string,kind:string,id:string)=>sha256(canonicalJson([destination,kind,id]))
