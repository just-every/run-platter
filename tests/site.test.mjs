// The default entry retains the complete browser suite; CI loads disjoint groups.
const shard = process.env.PLATTER_BROWSER_SHARD
if (shard && !['lifecycle', 'documents'].includes(shard)) throw Error('Unknown browser shard')
if (!shard || shard === 'lifecycle') await import('./site-lifecycle.mjs')
if (!shard || shard === 'documents') await import('./site-documents.mjs')
// Learning belongs to the commercial document shard and runs in ordinary Verify.
if (!shard || shard === 'documents') {
 const { test } = await import('node:test')
 const { learningBrowser } = await import('./template-learning-browser.mjs')
 test('AGENT-007 compiled cohort recommendation and source revision inspection', { timeout:180000 }, learningBrowser)
}
