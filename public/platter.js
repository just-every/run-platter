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
