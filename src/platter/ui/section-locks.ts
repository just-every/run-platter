import { lockChoices } from '../section-locks'
import { escape, form, hidden, panel, proposalPath } from './shared'
export function sectionLocksPanel(s:any,p:any){
 if(!p.lockedSections?.length)return ''
 const label=(section:string)=>lockChoices(p).find(choice=>choice.section===section)?.label??section
 return panel('Locked sections','<p>Locked template content stays fixed until an authorized person explicitly unlocks this proposal. Unlocks are audited. Later edits must pass the current approval policy.</p><ul>'+p.lockedSections.map((section:string)=>'<li>'+escape(label(section))+(p.canUnlock&&(['draft','approved'].includes(p.status)||p.negotiating)?form('proposal.unlock',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+hidden('section',section)+'<button>Unlock '+escape(label(section))+' in this proposal</button>'):'')+'</li>').join('')+'</ul>')
}
