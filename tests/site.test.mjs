// Privacy review, holds and receipt controls run in the lifecycle sanity journey.
// The default entry retains the complete browser suite; CI loads disjoint groups.
const shard = process.env.PLATTER_BROWSER_SHARD
if (shard && !['lifecycle', 'documents'].includes(shard)) throw Error('Unknown browser shard')
if (!shard || shard === 'lifecycle') await import('./site-lifecycle.mjs')
if (!shard || shard === 'documents') await import('./site-documents.mjs')
