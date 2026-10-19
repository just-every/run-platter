import { test } from 'node:test'
import assert from 'node:assert/strict'
import { harness } from './harness.mjs'

const offer = {
  title: 'Northstar photography', scope: 'A studio shoot and edited photographs.',
  optionOne: 'Studio', priceOne: '2400', optionTwo: 'Campaign', priceTwo: '4200', depositPercent: '25',
}
const recipient = 'avery@northstar.example'

async function approved(h) {
  const client = await h.cmd('client.save', { name: 'Northstar Coffee', email: recipient })
  const proposal = await h.cmd('proposal.prepare', { ...offer, clientId: client.id })
  await h.cmd('proposal.approve', { id: proposal.id, version: 1, revision: 1 })
  return proposal.id
}

async function finishSetup(h) {
  const response = await h.mf.dispatchFetch(h.origin + '/setup', {
    method: 'POST', headers: { host: new URL(h.origin).host, origin: h.origin, cookie: h.owner, 'content-type': 'application/x-www-form-urlencoded' },
    body: 'confirm=yes', redirect: 'manual',
  })
  await response.text()
  assert.equal(response.status, 303)
}

const mailRows = async h => (await h.db.prepare('SELECT * FROM p_mail ORDER BY created_at, id').all()).results

test('MAIL-001 local proposal and verification mail are captured without provider contact', async () => {
  let calls = 0
  const h = await harness({ outboundService: () => { calls++; return new Response(null, { status: 502 }) } })
  try {
    const id = await approved(h)
    const { shareUrl } = await h.cmd('proposal.send', { id, version: 2 })
    const path = new URL(shareUrl).pathname
    const sent = (await h.state()).outbox
    assert.equal(sent.length, 1)
    assert.equal(sent[0].status, 'local')
    assert.equal(sent[0].recipient, recipient)
    assert.ok(sent[0].body.includes(shareUrl))
    const requested = await h.send(path + '/action?name=code.request', {})
    assert.equal(requested.status, 200, requested.text)
    const outbox = (await h.state()).outbox
    assert.equal(outbox.length, 2)
    assert.ok(outbox.every(row => row.status === 'local' && row.recipient === recipient && row.proposal_id === id))
    const verification = outbox.find(row => row.id !== sent[0].id)
    const code = verification.body.match(/\b\d{6}\b/)?.[0]
    assert.ok(code, 'captured verification mail contains a usable code')
    const verified = await h.send(path + '/action?name=code.verify', { code })
    assert.equal(verified.status, 200, verified.text)
    assert.ok(verified.cookie)
    assert.equal(calls, 0, 'local mail never contacts an external sender')
  } finally { await h.close() }
})

test('MAIL-001 hosted mail commits and claims before provider acceptance; timeout is uncertain and never resent', { timeout: 60000 }, async () => {
  const calls = []
  let timeoutNext = false
  let releaseTimeout
  const stalled = new Promise(resolve => { releaseTimeout = resolve })
  const h = await harness({
    origin: 'https://platter.example',
    auth: { AUTH_LOCAL: 'false', MAIL_PROVIDER: 'resend', MAIL_API_KEY: 'mail-test-key' },
    // This replaces only outbound HTTP. Auth, commands, D1 transactions,
    // signing, dispatch and the Resend serializer/response parser are real.
    outboundService: async (request, mf) => {
      const body = await request.json()
      const db = await mf.getD1Database('DB')
      const row = await db.prepare(`SELECT m.*, p.status AS proposal_status, p.version AS proposal_version,
        p.revision AS proposal_revision, s.token, s.revision AS share_revision,
        s.code_hash, s.code_generation, s.code_expires, s.code_sent_at
        FROM p_mail m JOIN p_proposals p ON p.id=m.proposal_id
        JOIN p_shares s ON s.proposal_id=p.id WHERE m.id=?`)
        .bind(request.headers.get('idempotency-key')).first()
      const timeout = timeoutNext
      timeoutNext = false
      calls.push({ url: request.url, method: request.method, body, row, timeout })
      // No response reaches the adapter before its real transport deadline.
      if (timeout) await stalled
      return Response.json({ id: 'provider-' + calls.length })
    },
  })
  try {
    await finishSetup(h)
    const id = await approved(h)
    const first = await h.cmd('proposal.send', { id, version: 2 })
    assert.equal(calls.length, 1)
    const submission = calls[0]
    assert.equal(submission.url, 'https://api.resend.com/emails')
    assert.equal(submission.method, 'POST')
    assert.equal(submission.row.status, 'sending', 'durable row is claimed before provider contact')
    assert.equal(submission.row.proposal_status, 'sent')
    assert.equal(submission.row.proposal_version, 3)
    assert.equal(submission.row.share_revision, submission.row.proposal_revision)
    assert.equal(first.shareUrl, h.origin + '/p/' + submission.row.token)
    assert.deepEqual(submission.body.to, [recipient])
    assert.equal(submission.body.text, submission.row.body)
    assert.equal(submission.body.subject, submission.row.subject)
    assert.equal((await mailRows(h)).find(row => row.id === submission.row.id).status, 'accepted')
    assert.equal((await h.state()).proposals.find(p => p.id === id).delivery, 'accepted')
    const acceptedPage = await h.send('/app/proposal?id=' + id, undefined, h.owner)
    assert.equal(acceptedPage.status, 200, acceptedPage.text)
    assert.match(acceptedPage.text, /Accepted by provider/i)
    assert.doesNotMatch(acceptedPage.text, /\bdelivered\b/i)
    assert.deepEqual((await h.state()).outbox, [], 'hosted mail bodies are not exposed as a local outbox')

    // A rejected stale action neither changes the share nor leaves orphan mail.
    await h.cmd('proposal.send', { id, version: 2 }, h.owner, 409)
    assert.equal((await mailRows(h)).length, 1)
    assert.equal((await h.state()).proposals.find(p => p.id === id).shareToken, submission.row.token)
    assert.equal(calls.length, 1)

    const firstPath = new URL(first.shareUrl).pathname
    const verification = await h.send(firstPath + '/action?name=code.request', {})
    assert.equal(verification.status, 200, verification.text)
    assert.equal(calls.length, 2)
    const codeSubmission = calls[1]
    assert.equal(codeSubmission.row.status, 'sending')
    assert.equal(codeSubmission.row.proposal_id, id)
    assert.ok(codeSubmission.row.code_hash, 'verification state is durable before the provider call')
    assert.equal(codeSubmission.row.code_generation, 1)
    assert.ok(codeSubmission.row.code_expires > codeSubmission.row.code_sent_at)
    const code = codeSubmission.body.text.match(/\b\d{6}\b/)?.[0]
    assert.ok(code)
    const verified = await h.send(firstPath + '/action?name=code.verify', { code })
    assert.equal(verified.status, 200, verified.text)
    assert.ok(verified.cookie, 'the emailed code matches the committed verification state')

    timeoutNext = true
    const replacement = await h.cmd('proposal.send', { id, version: 3 })
    assert.equal(calls.length, 3)
    const timedOut = calls[2]
    assert.equal(timedOut.timeout, true)
    assert.equal(timedOut.row.status, 'sending')
    assert.equal(timedOut.row.proposal_version, 4)
    assert.notEqual(replacement.shareUrl, first.shareUrl)
    assert.equal((await mailRows(h)).find(row => row.id === timedOut.row.id).status, 'uncertain')
    assert.equal((await h.state()).proposals.find(p => p.id === id).delivery, 'uncertain')
    const uncertainPage = await h.send('/app/proposal?id=' + id, undefined, h.owner)
    assert.equal(uncertainPage.status, 200, uncertainPage.text)
    assert.match(uncertainPage.text, /Status unknown/i)
    assert.doesNotMatch(uncertainPage.text, /\bdelivered\b/i)

    // Two subsequent public actions dispatch this same proposal again.
    // Only the newly queued rows may cross the network boundary.
    const secondCode = await h.send(new URL(replacement.shareUrl).pathname + '/action?name=code.request', {})
    assert.equal(secondCode.status, 200, secondCode.text)
    assert.equal(calls.length, 4)
    await h.cmd('proposal.send', { id, version: 4 })
    assert.equal(calls.length, 5)
    assert.equal(new Set(calls.map(call => call.row.id)).size, calls.length)
    assert.equal(calls.filter(call => call.row.id === timedOut.row.id).length, 1)
    const persisted = await mailRows(h)
    assert.equal(persisted.length, 5)
    assert.equal(persisted.find(row => row.id === timedOut.row.id).status, 'uncertain')
    assert.ok(persisted.filter(row => row.id !== timedOut.row.id).every(row => row.status === 'accepted'))
  } finally {
    releaseTimeout()
    await h.close()
  }
})
