import { date, document, escape, field, money, optionPair, panel, type Feedback } from './shared'

export function renderClient(view: any, token: string, feedback?: Feedback): Response {
  const endpoint = `/p/${encodeURIComponent(token)}/action?name=`
  const publicForm = (name: string, body: string): string => `<form method="post" action="${endpoint}${name}">${body}</form>`
  const options = view.options ?? []
  let html = panel('Scope of work', `<p class="preserve">${escape(view.scope)}</p>`)
  html += panel('Offer options', `<p>All prices are GST-free in AUD. Deposit: ${escape(Number(view.deposit_bps) / 100)}% of the chosen option.</p>${optionPair(options, view.deposit_bps, view.acceptance?.optionId)}`)
  if (view.acceptance) {
    const accepted = view.acceptance
    html += panel('Proposal accepted', `<p>This agreement is complete and cannot be changed.</p><dl><dt>Accepted by</dt><dd>${escape(accepted.name)}${accepted.email ? ` · ${escape(accepted.email)}` : ''}</dd><dt>Chosen option</dt><dd>${escape(options.find((option: any) => option.id === accepted.optionId)?.label)}</dd><dt>Total</dt><dd>${money(accepted.totalCents)}</dd><dt>Deposit due</dt><dd>${money(accepted.depositCents)}</dd><dt>Accepted at</dt><dd>${date(accepted.acceptedAt)}</dd></dl>`)
  } else if (view.status === 'accepted') {
    html += panel('Proposal accepted', '<p>This proposal has already been accepted. Its agreement cannot be changed.</p>')
  } else if (!view.verified) {
    html += panel('Verify your email', `<p>A verification code will be sent to ${escape(view.clientEmail)}. Verify your email to accept this offer.</p>` + publicForm('code.request', '<button>Send verification code</button>') + publicForm('code.verify', field('Email verification code', 'code', '', 'required autocomplete="one-time-code" inputmode="numeric"') + '<button>Verify email</button>'))
  } else {
    html += panel('Accept this proposal', '<p>Your email is verified. Choose one option and confirm your acceptance below.</p>' + publicForm('accept', `<fieldset><legend>Choose one option</legend>${options.map((option: any) => `<label class="choice option-choice"><input type="radio" name="optionId" value="${escape(option.id)}" required><span>${escape(option.label)} — ${money(option.cents)}<br><span class="muted">Deposit due: ${money(Math.round(option.cents * view.deposit_bps / 10000))}</span></span></label>`).join('')}</fieldset>` + field('Your full name', 'name', '', 'required autocomplete="name"') + '<label class="choice"><input type="checkbox" name="consent" value="yes" required><span>I accept the scope of work, chosen option, total price, and deposit shown above.</span></label><p>Acceptance is permanent. Check your chosen option before continuing.</p><button>Accept proposal</button>'))
  }
  return document(view.title, html, { client: true, feedback })
}
