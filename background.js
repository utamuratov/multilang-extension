// ============================================================
//  from-to.uz (bepul endpoint)
// ============================================================
async function translateFromTo(text, langFrom, langTo) {
  const res = await fetch("https://api.from-to.uz/api/v1/translate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: { lang_from: langFrom, lang_to: langTo, resultCase: "latin", text },
    }),
  });
  if (!res.ok) throw new Error(`from-to.uz translate: HTTP ${res.status}`);
  const data = await res.json();
  return data.result ?? "";
}

async function transliterateFromTo(text, langFrom, langTo) {
  const res = await fetch("https://api.from-to.uz/api/v1/transliterate", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      body: { lang_from: langFrom, lang_to: langTo, text },
    }),
  });
  if (!res.ok) throw new Error(`from-to.uz translit: HTTP ${res.status}`);
  const data = await res.json();
  return data.result ?? "";
}

// ============================================================
//  Google Translate (ochiq)
// ============================================================
async function translateGoogle(text, fromLang, toLang) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=${fromLang}&tl=${toLang}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Translate: HTTP ${res.status}`);
  const data = await res.json();
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0][0];
  if (Array.isArray(data)) return data[0];
  return data?.sentences?.map((s) => s.trans).join("") ?? "";
}

// ============================================================
//  Til → Google kodi
// ============================================================
const GOOGLE_CODE = { uz: "uz", ru: "ru", en: "en" };

// ============================================================
//  Asosiy router
//  Qoida: uz — markaziy til.
//  1. Manba uz emas → avval Google orqali uz ga o'tkaziladi
//  2. uz dan:
//     → kk  : from-to.uz translate
//     → uzc : from-to.uz transliterate
//     → ru/en : Google
// ============================================================
async function translateText(text, fromLang, toLang) {
  // 1. Manbani uz ga o'tkazish (agar kerak bo'lsa)
  let uzText = text;
  if (fromLang !== "uz") {
    const googleFrom = GOOGLE_CODE[fromLang] ?? fromLang;
    uzText = await translateGoogle(text, googleFrom, "uz");
  }

  // 2. uz dan maqsad tilga
  if (toLang === "kk") {
    return translateFromTo(uzText, "uzn_Latn", "kaa_Latn");
  }
  if (toLang === "uzc") {
    return transliterateFromTo(uzText, "uz_latin", "uz_cyrillic");
  }
  if (toLang === "uz") {
    return uzText; // allaqachon uz da
  }
  // ru, en va boshqalar → Google
  const googleTo = GOOGLE_CODE[toLang] ?? toLang;
  return translateGoogle(uzText, "uz", googleTo);
}

// ============================================================
//  Message handler
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "TRANSLATE_ALL") return;

  const { sourceLang, sourceText, targetLangs } = request.payload;

  Promise.all(
    targetLangs.map(async (toLang) => {
      const translated = await translateText(sourceText, sourceLang, toLang);
      return { lang: toLang, text: translated };
    }),
  )
    .then((results) => {
      const data = {};
      results.forEach((r) => {
        data[r.lang] = r.text;
      });
      sendResponse({ success: true, data });
    })
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true;
});
