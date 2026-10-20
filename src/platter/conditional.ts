import { need } from './model'

export type SectionConditions = Partial<Record<'scope' | 'terms', string>>

/** Missing conditions preserve legacy offers. Only existing option ids are valid. */
export function sectionConditions(value: unknown, options?: {id:string}[]): SectionConditions {
 let parsed: unknown = value ?? {}
 if(typeof value==='string'){try{parsed=JSON.parse(value)}catch{need(false,'Invalid section conditions')}}
 need(parsed && typeof parsed === 'object' && !Array.isArray(parsed), 'Invalid section conditions')
 for (const [section, option] of Object.entries(parsed as Record<string,unknown>)) {
  need(['scope', 'terms'].includes(section), 'Choose a scope or terms section')
  need(typeof option === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(option) && (!options || options.some(item => item.id === option)), 'Choose an offered option for the section')
 }
 return parsed as SectionConditions
}

export function selectedContent(view: any, optionId: string) {
 const conditions = sectionConditions(view.section_conditions)
 return { ...view,
  scope: conditions.scope && conditions.scope !== optionId ? '' : view.scope,
  terms: conditions.terms && conditions.terms !== optionId ? '' : view.terms,
  hiddenSections: Object.entries(conditions).filter(([, option]) => option !== optionId).map(([section]) => section),
 }
}

/** Accepted records contain only the text selected, never excluded section text. */
export function agreementContent(view: any, optionId: string): any {
 const {section_conditions, hiddenSections, ...content} = selectedContent(view, optionId)
 return content
}
