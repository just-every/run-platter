(() => {
 for (const select of document.querySelectorAll('[data-collection-provider]')) {
  const form = select.form, stripe = form.querySelector('[data-stripe-methods]'), paypal = form.querySelector('[data-paypal-policy]'), method = form.querySelector('[data-paypal-method]');
  select.addEventListener('change', () => {
   const enabled = select.value === 'paypal', option = select.selectedOptions[0];
   stripe.hidden = enabled; stripe.querySelector('fieldset').disabled = enabled; paypal.hidden = !enabled; method.disabled = !enabled;
   form.elements.namedItem('merchantId').value = enabled ? option.dataset.merchantId : '';
   form.elements.namedItem('connectionVersion').value = enabled ? option.dataset.connectionVersion : '';
   form.querySelector('[data-paypal-merchant]').textContent = 'Verified PayPal merchant: ' + (enabled && option.dataset.merchantId || 'Connect PayPal in Settings before enabling collection.');
  });
 }
 const forms = document.querySelectorAll('[data-paypal-prepare], [data-paypal-capture], [data-paypal-status]');
 if (!forms.length) return;
 const feedback = document.querySelector('[data-paypal-feedback]');
 let pending = false;
 const report = message => { feedback.textContent = message; feedback.focus(); };
 for (const form of forms) form.addEventListener('submit', async event => {
  event.preventDefault();
  if (pending) return;
  pending = true;
  for (const button of document.querySelectorAll('[data-paypal-prepare] button, [data-paypal-capture] button, [data-paypal-status] button')) button.disabled = true;
  const refresh = form.hasAttribute('data-paypal-status'), prepare = form.hasAttribute('data-paypal-prepare');
  try {
   const data = new FormData(form), body = refresh ? {} : { consent: data.get('consent') === 'yes', cents: Number(data.get('cents')), revision: Number(data.get('revision')) };
   const response = await fetch(form.action, { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
   const value = await response.json();
   if (!response.ok) throw Error('PayPal could not confirm this action. Refresh the payment status or contact the firm before taking further action.');
   if (prepare && value.approvalUrl && value.status !== 'succeeded') {
    const url = new URL(value.approvalUrl);
    if (url.protocol !== 'https:' || !['www.paypal.com', 'www.sandbox.paypal.com'].includes(url.hostname) || url.username || url.password || url.port) throw Error('The PayPal approval address could not be verified. Contact the firm.');
    window.location.assign(url.href);
   } else window.location.reload();
  } catch {
   // A response may be lost after the provider acted. Only status refresh remains available.
   for (const action of document.querySelectorAll('[data-paypal-prepare], [data-paypal-capture]')) action.remove();
   report('The PayPal outcome could not be confirmed. Refresh the payment status or contact the firm before taking further action.');
  } finally {
   pending = false;
   for (const button of document.querySelectorAll('[data-paypal-status] button')) button.disabled = false;
  }
 });
})();
