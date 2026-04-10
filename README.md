# 🌐 FormLingo — Translate Inputs Instantly

A lightweight Chrome extension for developers building multilingual forms and admin panels. Add a single HTML attribute to your inputs — FormLingo handles the translation automatically.

---

## ✨ Features

- **One-click translation** — type in one field, click 🌐, all other fields are filled instantly
- **Grouped fields** — isolate translation groups so `name` fields don't mix with `description` fields
- **40+ languages** — powered by Google Translate and from-to.uz
- **Framework-friendly** — works with React, Vue, Angular (native value setter + event dispatch)
- **Dynamic DOM** — detects inputs added after page load (MutationObserver)
- **Zero config** — no API keys, no sign-up, no setup

---

## 🚀 Installation

1. Download or clone this repository
2. Open Chrome and go to `chrome://extensions/`
3. Enable **Developer mode** (top right)
4. Click **Load unpacked** and select the extension folder
5. The 🌐 icon will appear in your toolbar

---

## 🛠 Usage

### Basic

Add `data-translate="langCode"` to any `<input>` or `<textarea>`:

```html
<input data-translate="en" placeholder="English" />
<input data-translate="ru" placeholder="Russian" />
<input data-translate="uz" placeholder="Uzbek (Latin)" />
<input data-translate="uzc" placeholder="Uzbek (Cyrillic)" />
<input data-translate="kk" placeholder="Karakalpak" />
```

A 🌐 button will appear inside each field. Type text in one field → click the button → all other fields are translated.

---

### Grouped Fields

By default, all `data-translate` inputs on a page are treated as **one group**. If you have multiple independent translation sets (e.g. `name` and `description`), use `data-formlingo-field` to separate them:

```html
<!-- Group: name — translates independently -->
<input data-translate="en" data-formlingo-field="name" />
<input data-translate="ru" data-formlingo-field="name" />
<input data-translate="uz" data-formlingo-field="name" />

<!-- Group: description — translates independently -->
<textarea data-translate="en" data-formlingo-field="description"></textarea>
<textarea data-translate="ru" data-formlingo-field="description"></textarea>
<textarea data-translate="uz" data-formlingo-field="description"></textarea>

<!-- Group: seo_title -->
<input data-translate="en" data-formlingo-field="seo_title" />
<input data-translate="ru" data-formlingo-field="seo_title" />
```

Each group translates independently — clicking 🌐 on a `name` input will only fill other `name` inputs.

---

### Detecting the Extension from Your Site

FormLingo sets a global variable on the page when it is active. You can use this to show or hide UI elements depending on whether the extension is installed:

```js
if (window.__formLingoExtension) {
  // Extension is installed — translate buttons are active
} else {
  // Extension not installed — show install prompt or fallback UI
}
```

> **Note:** Check this after `DOMContentLoaded` since content scripts inject after the DOM is ready.

```js
document.addEventListener('DOMContentLoaded', () => {
  if (!window.__formLingoExtension) {
    showInstallBanner();
  }
});
```

---

## 🌍 Supported Languages

### Special (via [from-to.uz](https://from-to.uz))

| Code | Language |
|------|----------|
| `uz` | Uzbek (Latin) |
| `uzc` | Uzbek (Cyrillic) |
| `kk` | Karakalpak (Latin) |

These languages always route through `uz` as a pivot:
- `kk` / `uzc` → `uz` → any other language
- Any language → `uz` → `kk` / `uzc`

### Google Translate (40+ languages)

| Code | Language | Code | Language |
|------|----------|------|----------|
| `en` | English | `de` | German |
| `ru` | Russian | `fr` | French |
| `tr` | Turkish | `es` | Spanish |
| `az` | Azerbaijani | `it` | Italian |
| `kz` | Kazakh | `pl` | Polish |
| `ky` | Kyrgyz | `uk` | Ukrainian |
| `tg` | Tajik | `ar` | Arabic |
| `zh` | Chinese | `ja` | Japanese |
| `ko` | Korean | `hi` | Hindi |
| `fa` | Persian | `nl` | Dutch |
| `sv` | Swedish | `pt` | Portuguese |

For a full list see `GOOGLE_CODE` in `background.js`. Any valid Google Translate language code can be used.

---

## ⚙️ Translation Routing

```
uz  ──────────────────────────────► kk   (from-to.uz /translate)
uz  ──────────────────────────────► uzc  (from-to.uz /transliterate)
kk  ──► uz ──────────────────────► any  (from-to.uz → Google)
uzc ──► uz ──────────────────────► any  (from-to.uz → Google)
ru  ──► uz ──► kk / uzc           (Google → from-to.uz)
en  ──► uz ──► kk / uzc           (Google → from-to.uz)
ru  ──────────────────────────────► en   (Google, direct)
en  ──────────────────────────────► de   (Google, direct)
```

**Rule:** `kk` and `uzc` always pass through `uz`. All other language pairs go directly through Google Translate.

---

## 📁 File Structure

```
formlingo-extension/
├── manifest.json       # Extension config (Manifest V3)
├── background.js       # Service worker — API calls & translation routing
├── content.js          # Injected into pages — button injection & DOM logic
├── content.css         # Styles for translate buttons and loading states
├── popup.html          # Extension popup UI
├── popup.js            # Popup logic
└── icons/
    ├── icon16.png
    ├── icon32.png
    ├── icon48.png
    └── icon128.png
```

---

## 🔌 Swapping the Translation API

All translation logic lives in `background.js`. The routing function is:

```js
async function translateText(text, fromLang, toLang) { ... }
```

To use a different API (DeepL, LibreTranslate, Azure, etc.), replace the relevant function (`translateGoogle`, `translateFromTo`, or `transliterateFromTo`) without touching any other file.

**Example — switch Google to DeepL:**

```js
async function translateGoogle(text, fromLang, toLang) {
  const res = await fetch('https://api-free.deepl.com/v2/translate', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      auth_key: 'YOUR_DEEPL_KEY',
      text,
      source_lang: fromLang.toUpperCase(),
      target_lang: toLang.toUpperCase(),
    })
  });
  return (await res.json()).translations[0].text;
}
```

---

## 🔒 Privacy

FormLingo does **not** store, log, or track any data. Text is sent directly to translation APIs (Google Translate / from-to.uz) and is never stored by the extension itself. No analytics, no telemetry.

---

## 📄 License

MIT