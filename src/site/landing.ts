// The homepage (evidence/desk-platter/page-s1): one October, six firms and seven proposals, one stage per section.
import { siteDocument } from './frame'
import { heroSection } from './landing/sections/hero'
import { firmsSection } from './landing/sections/firms'
import { draftSection } from './landing/sections/draft'
import { buildSection } from './landing/sections/build'
import { sendSection } from './landing/sections/send'
import { reviseSection } from './landing/sections/revise'
import { signSection } from './landing/sections/sign'
import { booksSection } from './landing/sections/books'
import { paymentsSection } from './landing/sections/payments'
import { changeSection, interludeSection } from './landing/sections/change'
import { moveInSection } from './landing/sections/movein'
import { closingSection } from './landing/sections/closing'

const styles = ['base', 'hero', 'firms', 'draft', 'build', 'send', 'revise', 'sign', 'books', 'payments', 'change', 'movein', 'closing']
const description = 'Platter turns your templates and catalog into branded proposals, sends them from your own mailbox, shows what each client read, and collects the signature and deposit together. 100% free and open source.'

export function landingHtml(): string {
  const content = `<main id="main" class="landing">${[heroSection, firmsSection, draftSection, buildSection, sendSection, reviseSection, signSection, booksSection, paymentsSection, interludeSection, changeSection, moveInSection, closingSection].map(s => s()).join('\n')}</main>`
  const head = styles.map(s => `<link rel="stylesheet" href="/landing/${s}.css">`).join('') + '<link rel="preload" href="/fonts/source-serif-4/source-serif-4-latin-opsz-normal.woff2" as="font" type="font/woff2" crossorigin>'
  return siteDocument('Platter — proposals clients sign and pay', content, description, head)
}
