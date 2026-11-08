import { currentTime } from '../expiry-time'
import { ownTemplate } from '../templates'
import { resourceScope } from '../folders'
import { commit, hash, need, text, type Actor } from '../model'

interface Cohort { templateId:string; version:number; packageCount:number }
interface Source { proposalId:string; revision:number; cohort:number; basis:string; decidedAt:number; snapshotHash:string }
export interface LearningResult {
 id:string; createdAt:number; descriptive:true; minimumSample:number
 cohorts:(Cohort & {sampleSize:number; won:number; lost:number; signedWins:number; recordedWon:number; winRate:number|null; insufficient:boolean})[]
 recommendation:{available:boolean; reason:string; before:any[]; after:any[]; operations:any[]; target:Cohort}
 sources:Source[]
}
const owner=(a:Actor)=>need(a.role==='owner','Only the owner reads template learning',403)
const minimumSample=20
function cohort(value:any):Cohort {
 need(value&&typeof value==='object','Select a template version and offered package count')
 const templateId=text(value.templateId,'a template id'),version=Number(value.version),packageCount=Number(value.packageCount)
 need(Number.isSafeInteger(version)&&version>0&&Number.isSafeInteger(packageCount)&&packageCount>0&&packageCount<=100,'Choose a positive template version and offered package count')
 return {templateId,version,packageCount}
}
export async function learningVersions(db:D1Database,a:Actor){
 owner(a)
 const access=resourceScope(a,'t')
 return (await db.prepare(`SELECT v.template_id AS templateId,v.version,v.name FROM p_template_learning_versions v JOIN p_personal_templates t ON t.id=v.template_id WHERE (t.owner_id=? OR t.shared=1) AND ${access.sql} ORDER BY v.name,v.template_id,v.version`).bind(a.id,...access.values).all<{templateId:string;version:number;name:string}>()).results
}
// Read all decisions together. The latest decision at the current revision wins;
// repeated revision snapshots and duplicate legacy outcomes cannot inflate a cohort.
const decidedSql=`WITH decisions AS (
 SELECT proposal_id,revision,'signed' AS basis,accepted_at AS decided_at,0 AS priority FROM p_acceptances
 UNION ALL SELECT proposal_id,revision,CASE kind WHEN 'won' THEN 'recorded-won' ELSE kind END,occurred_at,1 FROM p_outcome_records
 UNION ALL SELECT proposal_id,revision,kind,occurred_at,2 FROM p_outcomes
), ranked AS (SELECT *,ROW_NUMBER() OVER(PARTITION BY proposal_id ORDER BY revision DESC,priority,decided_at DESC) AS n FROM decisions)
SELECT d.*,r.snapshot,s.template_id,s.template_version FROM ranked d
 JOIN p_proposals p ON p.id=d.proposal_id AND p.revision=d.revision
 JOIN p_revisions r ON r.proposal_id=d.proposal_id AND r.revision=d.revision
 JOIN p_template_sources s ON s.proposal_id=d.proposal_id WHERE d.n=1 ORDER BY d.proposal_id`
const packageSummary=(options:any[])=>options.map(o=>({id:o.id,label:o.label,cents:o.cents}))
export async function captureLearning(db:D1Database,a:Actor,input:Record<string,any>):Promise<LearningResult>{
 owner(a)
 const definitions=[cohort(input.baseline),cohort(input.comparison)]
 need(JSON.stringify(definitions[0])!==JSON.stringify(definitions[1]),'Choose two distinct cohorts')
 await Promise.all(definitions.map(c=>ownTemplate(db,a,c.templateId)))
 const versions=await Promise.all(definitions.map(c=>db.prepare('SELECT name,snapshot FROM p_template_learning_versions WHERE template_id=? AND version=?').bind(c.templateId,c.version).first<{name:string;snapshot:string}>()))
 need(versions.every(Boolean),'An exact template version is unavailable. Select a retained version.',409)
 const rows=(await db.prepare(decidedSql).all<any>()).results,sources:Source[]=[]
 const cohorts=definitions.map((c,i)=>({...c,name:versions[i]!.name,sampleSize:0,won:0,lost:0,signedWins:0,recordedWon:0,winRate:null as number|null,insufficient:true}))
 for(const row of rows){
  const snapshot=JSON.parse(row.snapshot),options=snapshot.options??[]
  const index=definitions.findIndex(c=>c.templateId===row.template_id&&c.version===row.template_version&&c.packageCount===options.length)
  if(index<0)continue
  const c=cohorts[index];c.sampleSize++
  if(row.basis==='signed'||row.basis==='recorded-won'){c.won++;if(row.basis==='signed')c.signedWins++;else c.recordedWon++}else c.lost++
  sources.push({proposalId:row.proposal_id,revision:row.revision,cohort:index,basis:row.basis,decidedAt:row.decided_at,snapshotHash:await hash(row.snapshot)})
 }
 for(const c of cohorts){c.winRate=c.sampleSize?c.won/c.sampleSize:null;c.insufficient=c.sampleSize<minimumSample}
 const before=packageSummary(JSON.parse(versions[0]!.snapshot).options??[]),after=packageSummary(JSON.parse(versions[1]!.snapshot).options??[])
 const enough=cohorts.every(c=>!c.insufficient),higher=enough&&cohorts[1].winRate!>cohorts[0].winRate!,three=definitions[1].packageCount===3&&after.length===3
 const available=higher&&three
 const recommendation={available,reason:!enough?'Insufficient samples: collect at least 20 distinct decided proposals in each cohort.':!three?'Select a three-package comparison version to propose a three-package layout.':!higher?'The selected three-package cohort does not have a higher observed win rate.':'The selected three-package cohort has a higher observed win rate. This descriptive association does not establish causation.',before,after:available?after:[],operations:available?before.filter(b=>!after.some(o=>o.id===b.id)).map(b=>({op:'remove',package:b})).concat(after.filter(o=>!before.some(b=>JSON.stringify(b)===JSON.stringify(o))).map(o=>({op:before.some(b=>b.id===o.id)?'replace':'add',package:o}))):[],target:definitions[0]}
 const id=crypto.randomUUID(),createdAt=await currentTime(db),result:LearningResult={id,createdAt,descriptive:true,minimumSample,cohorts,recommendation,sources}
 // Only this immutable report and references are written. No template, price,
 // catalog, proposal, approval or outbound consumer is changed or authorized.
 await commit(db,a,[db.prepare('INSERT INTO p_template_learning_reports VALUES(?,?,?,?)').bind(id,a.id,createdAt,JSON.stringify({...result,sources:undefined})),...sources.map(s=>db.prepare('INSERT INTO p_template_learning_sources VALUES(?,?,?,?,?,?,?)').bind(id,s.proposalId,s.revision,s.cohort,s.basis,s.decidedAt,s.snapshotHash))])
 return result
}
export async function readLearning(db:D1Database,a:Actor,id:unknown):Promise<LearningResult>{
 owner(a)
 const row=await db.prepare('SELECT result FROM p_template_learning_reports WHERE id=?').bind(text(id,'a learning result')).first<{result:string}>()
 need(row,'Learning result not found',404)
 const result=JSON.parse(row.result)
 await Promise.all(result.cohorts.map((c:Cohort)=>ownTemplate(db,a,c.templateId)))
 const sources=(await db.prepare('SELECT proposal_id AS proposalId,revision,cohort,basis,decided_at AS decidedAt,snapshot_hash AS snapshotHash FROM p_template_learning_sources WHERE report_id=? ORDER BY proposal_id').bind(id).all<Source>()).results
 return {...result,sources}
}
export async function learningSource(db:D1Database,a:Actor,id:unknown,proposalId:unknown){
 const report=await readLearning(db,a,id),source=report.sources.find(s=>s.proposalId===proposalId)
 need(source,'Source not in this result',404)
 const row=await db.prepare('SELECT r.snapshot FROM p_revisions r JOIN p_proposals p ON p.id=r.proposal_id JOIN p_clients c ON c.id=p.client_id WHERE r.proposal_id=? AND r.revision=?').bind(source.proposalId,source.revision).first<{snapshot:string}>()
 need(row&&await hash(row.snapshot)===source.snapshotHash,'Source is unavailable or has changed',410)
 return {...source,snapshot:JSON.parse(row.snapshot)}
}
