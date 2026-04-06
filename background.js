// ============================================================
//  API KEYS. Agar pulligi ishlatilmoqchi bolsa external qo'shiladi!
//  https://from-to.uz/api/v1/external/translate
//  https://from-to.uz/api/v1/external/transliterate
// ============================================================
const FROM_TO_KEY = "ft_YOUR_API_KEY"; // from-to.uz API key

// ============================================================
//  Til konfiguratsiyasi
//  data-translate qiymati → { apiType, langCode }
// ============================================================
const LANG_CONFIG = {
  uz: { label: "uz_latin" },
  ru: { label: "ru" },
  en: { label: "en" },
  kk: { label: "kaa_Latn" }, // Qoraqalpoq lotin
  uzc: { label: "uz_cyrillic" }, // O'zbek kirill
};

// ============================================================
//  1. from-to.uz — tarjima (uz → kk)
// ============================================================
async function translateFromTo(text, langFrom, langTo) {
  const res = await fetch("https://api.from-to.uz/api/v1/translate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 'Authorization': `Bearer ${FROM_TO_KEY}`,
    },
    body: JSON.stringify({
      body: {
        lang_from: langFrom, // 'uzn_Latn'
        lang_to: langTo, // 'kaa_Latn'
        resultCase: "latin",
        text,
      },
    }),
  });
  if (!res.ok) throw new Error(`from-to.uz tarjima: HTTP ${res.status}`);
  const data = await res.json();
  return data.result ?? "";
}

// ============================================================
//  2. from-to.uz — transliteratsiya (uz lotin → uz kirill)
// ============================================================
async function transliterateFromTo(text, langFrom, langTo) {
  const res = await fetch("https://api.from-to.uz/api/v1/transliterate", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      // 'Authorization': `Bearer ${FROM_TO_KEY}`,
    },
    body: JSON.stringify({
      body: { lang_from: langFrom, lang_to: langTo, text },
    }),
  });
  if (!res.ok) throw new Error(`from-to.uz translit: HTTP ${res.status}`);
  const data = await res.json();
  return data.result ?? "";
}

// ============================================================
//  3. Google Translate (ochiq, keysiz)
// ============================================================
async function translateGoogle(text, targetLang) {
  const url = `https://clients5.google.com/translate_a/t?client=dict-chrome-ex&sl=auto&tl=${targetLang}&q=${encodeURIComponent(text)}`;
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Google Translate: HTTP ${res.status}`);
  const data = await res.json();
  // Javob formati: [["tarjima", "asl"]] yoki ["tarjima"]
  if (Array.isArray(data) && Array.isArray(data[0])) return data[0][0];
  if (Array.isArray(data)) return data[0];
  return data?.sentences?.map((s) => s.trans).join("") ?? "";
}

// ============================================================
//  Asosiy router — qaysi API ishlatishni hal qiladi
// ============================================================
async function translateText(text, fromLang, toLang) {
  // uz → kk : from-to.uz translate
  if (toLang === "kk") {
    return await translateFromTo(text, "uzn_Latn", "kaa_Latn");
  }

  // uz → uzc : from-to.uz transliterate
  if (toLang === "uzc") {
    return await transliterateFromTo(text, "uz_latin", "uz_cyrillic");
  }

  // kk → uz : from-to.uz translate (teskari)
  if (fromLang === "kk" && toLang === "uz") {
    return await translateFromTo(text, "kaa_Latn", "uzn_Latn");
  }

  // uzc → uz : from-to.uz transliterate (teskari)
  if (fromLang === "uzc" && toLang === "uz") {
    return await transliterateFromTo(text, "uz_cyrillic", "uz_latin");
  }

  // Qolgan hammasi (uz↔ru, uz↔en, ru↔en, ...) → Google
  const googleTarget = LANG_CONFIG[toLang]?.label?.split("_")[0] ?? toLang;
  return await translateGoogle(text, googleTarget);
}

// ============================================================
//  Message handler
// ============================================================
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type !== "TRANSLATE_ALL") return;

  const { sourceLang, sourceText, targetLangs, accessToken } = request.payload;

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
