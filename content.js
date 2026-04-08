(function () {
  'use strict';
  if (window.__multiLangInjected) return;
  window.__multiLangInjected = true;

  const BTN_CLASS = '__ml_btn';
  const WRAP_CLASS = '__ml_wrap';
  let isTranslating = false;

  // ── Tugma yaratish ──────────────────────────────────────────
  function createButton(inputEl) {
    if (inputEl.parentElement?.classList.contains(WRAP_CLASS)) return;
    const lang = inputEl.getAttribute('data-translate');
    if (!lang) return;

    const wrap = document.createElement('div');
    wrap.className = WRAP_CLASS;
    inputEl.parentNode.insertBefore(wrap, inputEl);
    wrap.appendChild(inputEl);

    const btn = document.createElement('button');
    btn.className = BTN_CLASS;
    btn.type = 'button';
    btn.title = 'Tarjima qil';
    btn.innerHTML = `<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round">
      <circle cx="12" cy="12" r="10"/><line x1="2" y1="12" x2="22" y2="12"/>
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"/>
    </svg>`;

    btn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      handleTranslate(inputEl, lang);
    });

    wrap.appendChild(btn);
  }

  function attachButtons() {
    document.querySelectorAll('[data-translate]').forEach(el => {
      if (el.tagName !== 'INPUT' && el.tagName !== 'TEXTAREA') return;
      createButton(el);
    });
  }

  // ── Tarjima logikasi ─────────────────────────────────────────
  async function handleTranslate(sourceEl, sourceLang) {
    if (isTranslating) return;

    const sourceText = sourceEl.value?.trim();
    if (!sourceText) { showNotice('⚠️ Matn bo\'sh'); return; }

    // Sahifadagi barcha data-translate inputlarni yig'ish
    const inputsMap = {};
    document.querySelectorAll('[data-translate]').forEach(el => {
      const l = el.getAttribute('data-translate');
      if (l) inputsMap[l] = el;
    });

    const targetLangs = Object.keys(inputsMap).filter(l => l !== sourceLang);
    if (!targetLangs.length) { showNotice('⚠️ Boshqa data-translate inputlar topilmadi'); return; }

    isTranslating = true;
    setButtonState(sourceEl, 'loading');
    targetLangs.forEach(l => setLoading(inputsMap[l], true));

    try {
      const response = await chrome.runtime.sendMessage({
        type: 'TRANSLATE_ALL',
        payload: { sourceLang, sourceText, targetLangs },
      });

      if (!response.success) throw new Error(response.error);

      targetLangs.forEach(lang => {
        if (response.data[lang] && inputsMap[lang]) {
          setNativeValue(inputsMap[lang], response.data[lang]);
        }
      });

    } catch (err) {
      showNotice('❌ ' + err.message);
    } finally {
      isTranslating = false;
      setButtonState(sourceEl, 'idle');
      targetLangs.forEach(l => { if (inputsMap[l]) setLoading(inputsMap[l], false); });
    }
  }

  function setButtonState(inputEl, state) {
    const btn = inputEl.parentElement?.querySelector('.' + BTN_CLASS);
    if (!btn) return;
    btn.classList.toggle('__ml_loading', state === 'loading');
    btn.disabled = state === 'loading';
  }

  function setLoading(el, on) {
    if (!el) return;
    if (on) { el._ph = el.placeholder; el.placeholder = '⏳ ...'; el.classList.add('__ml_translating'); }
    else    { el.placeholder = el._ph ?? ''; el.classList.remove('__ml_translating'); }
  }

  function setNativeValue(el, val) {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const setter = Object.getOwnPropertyDescriptor(proto, 'value')?.set;
    if (setter) setter.call(el, val); else el.value = val;
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  }

  let _noticeTimer;
  function showNotice(text) {
    let n = document.getElementById('__ml_notice');
    if (!n) { n = document.createElement('div'); n.id = '__ml_notice'; document.body.appendChild(n); }
    n.textContent = text;
    n.classList.add('show');
    clearTimeout(_noticeTimer);
    _noticeTimer = setTimeout(() => n.classList.remove('show'), 3500);
  }

  function startObserver() {
    new MutationObserver(() => attachButtons()).observe(document.body, { childList: true, subtree: true });
  }

  attachButtons();
  startObserver();
})();