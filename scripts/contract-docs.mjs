// Generate review documents from the contract without changing acceptance text.
import {readFile,writeFile,mkdir} from 'node:fs/promises'
import {parseContract} from '../node_modules/@runeditrun/rer/foundation/runtime/seed-contract.mjs'
const mode=process.argv[2]
if(!['write','check'].includes(mode))throw Error('Use write or check')
let source=await readFile('CONTRACT.md','utf8')
const rows=source.split('\n').filter(line=>line.startsWith('| `')).map(line=>{const cells=line.split('|').map(c=>c.trim());return {kind:cells[3],status:cells[4]}}).filter(row=>['published','target','push-further'].includes(row.kind)&&['done','partial','missing'].includes(row.status))
const groups=[['Published',rows.filter(c=>c.kind==='published')],['Target and push further',rows.filter(c=>c.kind!=='published')],['All',rows]]
const tally=clauses=>['done','partial','missing'].map(status=>clauses.filter(c=>c.status===status).length)
for(const [label,clauses] of groups){const row=`| ${label} | ${tally(clauses).join(' | ')} | ${clauses.length} |`;source=source.replace(new RegExp('^\\| '+label+' \\|.*$','m'),row)}
const contract=parseContract(source)
const body=clause=>{const match=clause.text.match(/\*Acceptance:\* (.*?)(?: \*Status:\*|$)/);return match?match[1]:clause.text}
const acceptance='# Platter acceptance\n\nGenerated from CONTRACT.md by `node scripts/contract-docs.mjs write`. Edit the contract, then regenerate.\n\n'+contract.areas.map(area=>'## '+area.name+'\n\n'+area.clauses.map(id=>{const c=contract.clauses.find(c=>c.id===id);return `- **${c.id} — ${c.title}** (${c.status}). ${body(c)} Evidence: ${c.evidence.map(p=>'`'+p+'`').join(', ')||'None yet.'}${c.gap?' Gap: '+c.gap:''}`}).join('\n')+'\n').join('\n')
const claimsSource=source.slice(source.indexOf('## Homepage claims')+'## Homepage claims'.length,source.indexOf('\n## Status')).trim()
const claims='# Platter claims\n\nGenerated from CONTRACT.md by `node scripts/contract-docs.mjs write`.\n\n'+claimsSource+'\n\n## Clause status\n\n| Clause | Status |\n| --- | --- |\n'+contract.clauses.map(c=>`| ${c.id} | ${c.status} |`).join('\n')+'\n'
// Encode prose solidi so ordinary alternatives cannot become repository references.
const prose=text=>text.replace(/(?<![./\w-])([A-Za-z][\w-]*)\/([A-Za-z][\w-]*)(?![\w./-])/g,'$1&#47;$2')
for(const [file,contents] of [['CONTRACT.md',source],['ACCEPTANCE.md',prose(acceptance)],['docs/CLAIMS.md',prose(claims)]]){
 let current;try{current=await readFile(file,'utf8')}catch(error){if(error.code!=='ENOENT')throw error}
 if(current===contents)continue
 if(mode==='check')throw Error(file+' is stale; run node scripts/contract-docs.mjs write')
 if(file.startsWith('docs/'))await mkdir('docs',{recursive:true})
 await writeFile(file,contents)
}
console.log('Contract documents '+mode+' passed')
