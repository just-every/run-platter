import { escape, form, hidden, panel, proposalPath } from './shared'
export function sectionLocksPanel(s:any,p:any){
 if(!p.lockedSections?.length)return ''
 return panel('Locked sections','<p>Locked template content stays fixed until an authorized person explicitly unlocks this proposal. Unlocks are audited. Later edits must pass the current approval policy.</p><ul>'+p.lockedSections.map((section:string)=>'<li>'+escape(section)+(['owner','admin','manager'].includes(s.actor.role)&&p.canEdit&&(['draft','approved'].includes(p.status)||p.negotiating)?form('proposal.unlock',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+hidden('section',section)+'<button>Unlock '+escape(section)+' in this proposal</button>'):'')+'</li>').join('')+'</ul>')
}
