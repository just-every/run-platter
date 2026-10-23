// Synchronize disjoint editors in this tab after a successful exact-version save.
window.platterRevisionSaved=(id,previous,result)=>{
 for(const form of document.forms){const record=form.querySelector('input[name="id"]'),version=form.querySelector('input[name="version"]');if(record?.value!==id||version?.value!==String(previous))continue;version.value=String(result.version);if(form.dataset.documentEditor!==undefined)form.dataset.revision=String(result.revision);const revision=form.querySelector('input[name="revision"]');if(revision)revision.value=String(result.revision);}
 for(const link of document.querySelectorAll('a[href^="/app/preview?"]')){const url=new URL(link.href);if(url.searchParams.get('id')===id){url.searchParams.set('revision',String(result.revision));link.href=url.pathname+url.search;}}
};
// Persist only explicitly enabled internal form drafts within this tab.
(() => {
  const scope = document.body.dataset.draftScope;
  if (!scope) return;
  const prefix = `platter:draft:${scope}:`;
  const forms = Array.from(document.querySelectorAll('form[data-draft]'));
  const eligible = form => Array.from(form.elements).filter(field =>
    field.name && !['hidden', 'password', 'checkbox', 'radio', 'submit', 'file'].includes(field.type)
    && !['code', 'token', 'key', 'apiKey', 'confirmName'].includes(field.name));
  try {
    const pending = sessionStorage.getItem(`${prefix}pending`);
    if (pending && document.body.dataset.actionSuccess === 'true') sessionStorage.removeItem(`${prefix}${pending}`);
    sessionStorage.removeItem(`${prefix}pending`);
    for (const form of forms) {
      const key = `${prefix}${form.dataset.draft}`;
      const fields = eligible(form);
      let saved;
      try { saved = JSON.parse(sessionStorage.getItem(key) || 'null'); } catch { sessionStorage.removeItem(key); }
      if (saved && typeof saved === 'object') for (const field of fields) {
        if (typeof saved[field.name] === 'string') field.value = saved[field.name];
      }
      const save = () => {
        try { sessionStorage.setItem(key, JSON.stringify(Object.fromEntries(fields.map(field => [field.name, field.value])))); } catch { /* Native forms remain usable when tab storage is unavailable. */ }
      };
      form.addEventListener('input', save);
      form.addEventListener('change', save);
      window.addEventListener('pagehide', save);
      form.addEventListener('submit', () => {
        save();
        try { sessionStorage.setItem(`${prefix}pending`, form.dataset.draft); } catch { /* Storage is optional. */ }
      });
    }
  } catch { /* Browser storage restrictions do not change submission behavior. */ }
})();

// Live tier columns: each option's deposit and the receipt follow the typed prices and percentage.
// The server prices acceptance itself; this only mirrors what the saved revision will show.
(() => {
  // The server's own rule: up to two decimals, written plain or with US thousands commas and a leading $.
  const cents = value => {
    const written = value.trim(), plain = /^\$?\s*\d{1,3}(,\d{3}){1,2}(\.\d{1,2})?$/.test(written) ? written.replace(/[$,\s]/g, '') : written.replace(/^\$\s*/, '');
    if (!/^\d{1,8}(\.\d{1,2})?$/.test(plain)) return null;
    const amount = Math.round(Number(plain) * 100);
    return amount > 0 && amount <= 1000000000 ? amount : null;
  };
  const show = value => value === null ? '—' : '$' + (value / 100).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
  for (const form of document.querySelectorAll('form.composer')) {
    const page = form.closest('.composer-page');
    const update = () => {
      const percent = Number(form.elements.depositPercent?.value);
      const valid = Number.isFinite(percent) && percent > 0 && percent <= 100;
      for (const tier of form.querySelectorAll('.tier[data-tier]')) {
        const id = tier.dataset.tier, field = tier.querySelector('.tier-price input');
        if (!field) continue;
        const price = cents(field.value);
        field.classList.toggle('invalid', field.value.trim() !== '' && price === null);
        const figure = tier.querySelector('.money-figure');
        if (figure) figure.textContent = price === null ? field.value.trim() : show(price);
        const deposit = price === null || !valid ? null : Math.round(price * percent * 100 / 10000);
        tier.querySelector('[data-line="deposit"]').textContent = show(deposit);
        tier.querySelector('[data-line="balance"]').textContent = show(deposit === null ? null : price - deposit);
        if (valid) tier.querySelector('[data-line="percent"]').textContent = String(percent);
        if (!page || !id) continue;
        const sum = page.querySelector(`[data-sum-price="${id}"]`), part = page.querySelector(`[data-sum-deposit="${id}"]`);
        if (sum) { sum.textContent = show(price); sum.classList.toggle('invalid', price === null); }
        if (part) part.textContent = show(deposit);
        const label = sum?.previousElementSibling, typed = tier.querySelector('.tier-name input')?.value.trim();
        if (label && typed) label.textContent = typed;
      }
      const shown = page?.querySelector('[data-sum-percent]');
      if (shown && valid) shown.textContent = String(percent);
    };
    form.addEventListener('input', update);
    form.addEventListener('click', () => requestAnimationFrame(update));
    update();
  }
})();

// Keep a true client viewport while fitting the preview canvas to its member page.
(() => {
  const frame = document.querySelector('.preview-viewport iframe');
  if (!frame) return;
  const viewport = frame.parentElement;
  const resize = () => {
    const scale = Math.min(1, viewport.clientWidth / Number(frame.getAttribute('width')));
    frame.style.transform = `scale(${scale})`;
    frame.style.position = 'absolute';
    frame.style.top = '0';
    frame.style.left = '0';
    viewport.style.height = `${Number(frame.getAttribute('height')) * scale}px`;
  };
  new ResizeObserver(resize).observe(viewport);
  resize();
})();

// The client's email under its select; the band's inline fix; the catalog shelf folded on phones.
(() => {
  for (const select of document.querySelectorAll('form.composer select[name="clientId"]')) {
    const note = select.parentElement.querySelector('[data-client-email]');
    if (note) select.addEventListener('change', () => { note.textContent = select.selectedOptions[0]?.dataset.email ?? ''; });
  }
  for (const button of document.querySelectorAll('[data-fix-field]')) {
    const field = document.getElementById(button.dataset.fixField);
    if (!field) continue;
    button.hidden = false;
    button.addEventListener('click', () => {
      if (button.dataset.fixValue !== undefined) {
        field.value = button.dataset.fixValue;
        field.dispatchEvent(new Event('input', { bubbles: true }));
      }
      field.focus();
      field.select();
    });
  }
  if (window.matchMedia('(max-width: 600px)').matches) for (const shelf of document.querySelectorAll('details.shelf[open]')) shelf.open = false;
})();
