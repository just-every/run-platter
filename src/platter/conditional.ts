import { selectedDocument, documentFields, documentOf } from './documents/blocks'
import { need } from './model'

/** Each section shows for every selection, for one package id, or (`item:<id>`) only while that optional item is added. */
export type SectionConditions = Partial<Record<'scope' | 'terms', string>>
type Offered = { id: string, optionalItems?: { id: string }[] }
type Chosen = { id: string }[]

const itemOf = (condition: string) => condition.startsWith('item:') ? condition.slice(5) : undefined

/** Missing conditions preserve legacy offers. Only offered package or optional-item ids are valid. */
export function sectionConditions(value: unknown, options?: Offered[]): SectionConditions {
 let parsed: unknown = value ?? {}
 if(typeof value==='string'){try{parsed=JSON.parse(value)}catch{need(false,'Invalid section conditions')}}
 need(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Invalid section conditions')
 for (const [section, condition] of Object.entries(parsed as Record<string,unknown>)) {
  need(['scope', 'terms'].includes(section), 'Choose a scope or terms section')
  need(typeof condition === 'string', 'Choose an offered option for the section')
  const item = itemOf(condition)
  need(/^[a-zA-Z0-9_-]{1,80}$/.test(item ?? condition) && (!options || options.some(option => item ? option.optionalItems?.some(extra => extra.id === item) : option.id === condition)), item ? 'Choose an offered optional item for the section' : 'Choose an offered option for the section')
 }
 return parsed as SectionConditions
}

/** A package condition holds for that package; an item condition holds while the chosen package's item is added, at any allowed quantity. */
export function selectedContent(view: any, optionId: string, items: Chosen = []) {
 const conditions = sectionConditions(view.section_conditions)
 const shown = (condition?: string) => !condition || (itemOf(condition) ? items.some(item => item.id === itemOf(condition)) : condition === optionId)
 return { ...view,documentConditional:documentOf(view).blocks.some(b=>Boolean(b.condition)),...(Object.keys(documentFields(view)).length?{document:selectedDocument(view.document,optionId,items)}:{}),
  scope: shown(conditions.scope) ? view.scope : '',
  terms: shown(conditions.terms) ? view.terms : '',
  hiddenSections: Object.entries(conditions).filter(([, condition]) => !shown(condition)).map(([section]) => section),
 }
}

/** Accepted records contain only the text selected, never excluded section text. */
export function agreementContent(view: any, optionId: string, items: Chosen = []): any {
 const {section_conditions, hiddenSections, ...content} = selectedContent(view, optionId, items)
 return content
}
