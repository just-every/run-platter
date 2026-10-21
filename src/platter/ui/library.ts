import { folderSelect } from './folders'
import { libraryEditors } from '../library'
import { escape, area, field, form, hidden, panel } from './shared'
export function libraryPage(s:any){
 const editable=libraryEditors.includes(s.actor.role)
 const controls=(item:any={})=>folderSelect(s,'library',item.folder_id)+field('Item title','title',item.title,'required maxlength="200"')+`<label>Content type<select name="kind">${[['section','Section'],['case_study','Case study'],['bio','Team bio'],['testimonial','Testimonial'],['terms','Terms']].map(([id,name])=>`<option value="${id}"${id===item.kind?' selected':''}>${name}</option>`).join('')}</select></label>`+area('Library text','content',item.content,'required maxlength="10000" aria-label="Library text"')
 return panel('Shared text library','<p>Save reusable text for the firm. Team-limited folders control access. Linked insertion, media and pricing-table items are not available yet.</p>'+(s.libraryItems??[]).map((item:any)=>`<article><h3>${escape(item.title)}</h3><p>Version ${item.version}</p>${editable?form('library.save','/app/library',hidden('id',item.id)+hidden('version',item.version)+controls(item)+'<button>Save library item</button>'):`<p class="preserve">${escape(item.content)}</p>`}</article>`).join(''))+(editable?panel('Create library item',form('library.save','/app/library',controls()+'<button>Create library item</button>')):'')
}
