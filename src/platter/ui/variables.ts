import { missingMerge, variableNames } from '../variables'
import { unfilledVariables } from '../api/variables'
import { escape, field, form, hidden, panel, proposalPath } from './shared'
export function variablesPanel(p:any){
 if(!p.canEdit||!['draft','approved'].includes(p.status))return ''
 const missing=[...new Set([...unfilledVariables({title:p.title,scope:p.scope,terms:p.terms,options:p.options,document:p.document}),...missingMerge(p)])]
 const names=[...new Set([...missing,...variableNames(Object.values(p.document?.merge?.patterns??{})),...(p.document?.merge?.conditions??[])])].sort()
 return panel('Variables',`<p>Use tokens such as {{Client.Company}}, {{Contact.Title}}, {{Deal.Name}}, {{Deal.Amount}}, {{Sender.FirstName}} or {{Custom.Region}} in text and prices. Fill from client records or choose a connected HubSpot deal. A sent revision keeps its values.</p>`+(missing.length?'<p role="status">Unfilled variables: '+missing.map(escape).join(', ')+'</p>':'<p>All recorded variables are filled.</p>')+form('proposal.variables',proposalPath(p.id),hidden('id',p.id)+hidden('version',p.version)+'<label>Deal provider<select name="dealProvider"><option value="hubspot">HubSpot</option><option value="salesforce"'+(p.document?.merge?.deal?.provider==='salesforce'?' selected':'')+'>Salesforce</option></select></label>'+field('Connected deal ID (optional)','dealId',p.document?.merge?.deal?.id??'')+names.map(name=>field(name,'variable:'+name,'')+'<label class="choice"><input type="checkbox" name="clear:'+escape(name)+'" value="yes">Deliberately clear '+escape(name)+'</label>').join('')+'<button>Fill proposal variables</button>'))
}
