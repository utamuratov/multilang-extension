const LANG_MAP = {
  uz:  'uz',
  ru:  'ru',
  kk:  'kar',
  uzc: 'uzCyrillic',
};

const API_URL = 'https://padm.uzedu.uz/api/core/RefInterfaceTranslation/TextTranslator';

async function translateText(text, from, to, accessToken) {
  const fromCode = LANG_MAP[from];
  const toCode   = LANG_MAP[to];
  if (!fromCode || !toCode) throw new Error(`Noma'lum til: ${from} → ${to}`);

  const res = await fetch(API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      translationTechnology: 1,
      from: fromCode,
      to:   toCode,
      text,
    }),
  });

  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data = await res.json();
  return data.result ?? data.data ?? data.text ?? data ?? '';
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== 'TRANSLATE_ALL') return;

  const { sourceLang, sourceText, targetLangs, accessToken } = request.payload;

  if (!accessToken) {
    sendResponse({ success: false, error: 'localStorage da accessToken topilmadi. Avval tizimga kiring.' });
    return;
  }

  Promise.all(
    targetLangs.map(async (toLang) => {
      const translated = await translateText(sourceText, sourceLang, toLang, accessToken);
      return { lang: toLang, text: translated };
    })
  )
    .then(results => {
      const data = {};
      results.forEach(r => { data[r.lang] = r.text; });
      sendResponse({ success: true, data });
    })
    .catch(err => sendResponse({ success: false, error: err.message }));

  return true;
});
