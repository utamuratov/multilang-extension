// ============================================================
//  from-to.uz
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
//  Google Translate
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
//  Google til kodlari (ISO 639-1)
// ============================================================
const GOOGLE_CODE = {
  uz: "uz", ru: "ru", en: "en",
  // Osiyo
  zh: "zh-CN", ja: "ja", ko: "ko", ar: "ar", hi: "hi", fa: "fa",
  tr: "tr", he: "he", th: "th", vi: "vi", id: "id", ms: "ms",
  // Yevropa
  de: "de", fr: "fr", es: "es", it: "it", pt: "pt", pl: "pl",
  nl: "nl", sv: "sv", no: "no", da: "da", fi: "fi", cs: "cs",
  sk: "sk", hu: "hu", ro: "ro", bg: "bg", hr: "hr", sr: "sr",
  uk: "uk", be: "be", lt: "lt", lv: "lv", et: "et", el: "el",
  // Markaziy Osiyo
  kk: "kk", ky: "ky", tg: "tg", tk: "tk", az: "az",
  // Boshqalar
  sw: "sw", af: "af", ca: "ca", eu: "eu", gl: "gl",
};

// ============================================================
//  Yordamchi: til "from-to" tili ekanligini tekshirish
// ============================================================
const FROM_TO_LANGS = new Set(["kk", "uzc"]);

// Ixtiyoriy tilni uz ga keltirish
async function toUzbek(text, fromLang) {
  if (fromLang === "uz")  return text;
  if (fromLang === "kk")  return translateFromTo(text, "kaa_Latn", "uzn_Latn");
  if (fromLang === "uzc") return transliterateFromTo(text, "uz_cyrillic", "uz_latin");
  // Google tili → uz
  const gCode = GOOGLE_CODE[fromLang] ?? fromLang;
  return translateGoogle(text, gCode, "uz");
}

// uz dan ixtiyoriy tilga
async function fromUzbek(uzText, toLang) {
  if (toLang === "uz")  return uzText;
  if (toLang === "kk")  return translateFromTo(uzText, "uzn_Latn", "kaa_Latn");
  if (toLang === "uzc") return transliterateFromTo(uzText, "uz_latin", "uz_cyrillic");
  const gCode = GOOGLE_CODE[toLang] ?? toLang;
  return translateGoogle(uzText, "uz", gCode);
}

// ============================================================
//  Asosiy router
//  - kk/uzc ishtirok etsa → uz orqali
//  - Google tillari o'zaro → to'g'ridan-to'g'ri
// ============================================================
async function translateText(text, fromLang, toLang) {
  const fromIsSpecial = FROM_TO_LANGS.has(fromLang);
  const toIsSpecial   = FROM_TO_LANGS.has(toLang);

  if (fromIsSpecial || toIsSpecial) {
    // uz orqali o'tkazish
    const uzText = await toUzbek(text, fromLang);
    return fromUzbek(uzText, toLang);
  }

  // Ikkalasi ham Google tili → to'g'ridan-to'g'ri
  const gFrom = fromLang === "uz" ? "uz" : (GOOGLE_CODE[fromLang] ?? fromLang);
  const gTo   = toLang   === "uz" ? "uz" : (GOOGLE_CODE[toLang]   ?? toLang);

  if (gFrom === gTo) return text;
  return translateGoogle(text, gFrom, gTo);
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
    })
  )
    .then((results) => {
      const data = {};
      results.forEach((r) => { data[r.lang] = r.text; });
      sendResponse({ success: true, data });
    })
    .catch((err) => sendResponse({ success: false, error: err.message }));

  return true;
});