// 12 · Moving in: Fernhill Design Studio, Sat Oct 3. A PandaDoc Word download becomes an editable Platter template.
import run from '../../run.json'
import { escape } from '../../../platter/ui/shared'
import { check, head, line, note, t } from '../parts'

const rows: [string, string, string][] = [
  ['Logo refresh', 'FD-101', 'FD-101'], ['Color palette', '(no SKU)', 'no match'], ['Menu design', 'FD-110', 'FD-110'],
  ['Interior graphics', 'FD-120', 'FD-120'], ['Exterior signage', 'FD-130', 'FD-130'], ['Website updates', 'FD-140', 'FD-140'],
]
const tokens: [string, string, string][] = [['Prepared for', '[Client.Company]', '{client.company}'], ['Hi', '[Client.FirstName],', '{client.first_name}'], ['—', '[Sender.FirstName]', '{sender.first_name}']]
const tickCell = `<span class="ok-ic" aria-label="linked">${check}</span>`

export const moveInSection = (): string => `<section id="move-in" class="sec movein">
<div class="mv-top">${head(['Moving in', 'Fernhill Design Studio', 'Sat Oct 3'], 'Your PandaDoc templates,', 'now editable pages.', t('Ben downloaded his templates from PandaDoc as Word files. Platter made them editable, turned the tokens into fields and matched the quote rows to his catalog.'))}
<figure class="mv-term" aria-label="Run Platter yourself"><span class="mv-lights" aria-hidden="true"><i></i><i></i><i></i></span><pre><code><span class="mv-prompt">$</span> ${run.clone.split(' ').map(arg => `<span class="mv-arg">${escape(arg)}</span>`).join(' ')}
<span class="mv-ready">✓ Platter is ready</span></code></pre></figure></div>
<div class="mv-spread">
<article class="mv-doc" aria-label="Word download from PandaDoc"><p class="mv-file">${line('Brand refresh · Good / Better / Best.docx')}</p>
<ul class="mv-tokens">${tokens.map(([lead, token]) => `<li><span>${lead}</span><mark class="tok">${token}</mark></li>`).join('')}</ul>
<table class="mv-table"><tbody>${rows.map(([name, sku]) => `<tr><td>${name}</td><td><span>${sku}</span></td></tr>`).join('')}</tbody></table></article>
<article class="card mv-tpl" aria-label="The same template in Platter"><p class="mv-file">14 blocks</p>
<ul class="mv-tokens">${tokens.map(([, , field]) => `<li><span class="field">${field}</span></li>`).join('')}</ul>
<table class="mv-table"><tbody>${rows.map(([name, , sku], i) => `<tr${i === 1 ? ' class="nomatch"' : ''}><td>${name}</td><td>${sku}</td><td>${i === 0 ? `${tickCell}<span class="mv-linked">linked to catalog</span>` : i === 1 ? 'listed' : tickCell}</td></tr>`).join('')}</tbody></table>
</article>
<p class="sticky mv-sticky">${note('Ben linked it to Brand palette, FD-105')}</p></div>
<ul class="mv-chips"><li class="pill sage">${line('Catalog CSV · 38 items · 4 bundles → packages ✓')}</li><li class="pill sage">${line('Bulk download · 2 zips, 296 PDFs · 268 signed, kept with their certificates · 28 open as drafts ✓')}</li></ul>
<p class="mv-also">${t('Also moves in from Proposify, Better Proposals, Qwilr and Ignition.')}<br>${t('First proposal from it: Bluebonnet Café, Tue Oct 6.')}</p>
</section>`
