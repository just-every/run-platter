import { runPageHtml, siteNotFoundHtml, type RunData, type SiteBuild } from '../base/run-site'
import { identity } from '../identity'
import { landingHtml } from './landing'
import { docsPages } from './docs'
import run from './run.json'

export function sitePages(): SiteBuild {
  const data: RunData = run
  return {
    pages: [
      { path: '/', html: landingHtml() },
      { path: '/run', html: runPageHtml(identity, data) },
      ...docsPages(),
      { path: '/404', html: siteNotFoundHtml(identity, data) },
    ],
    assets: ['rer-theme.css', 'site.css', 'landing.css', 'docs.css', 'fonts', 'brand'],
  }
}
