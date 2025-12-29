# Multilingual Rollout Plan

## Overview

Target Markets: US + Latin America (initial), then global expansion
Base Language: English
Skip: Arabic (RTL complexity not worth it for our market)

---

## Current i18n Infrastructure

| Component | Status | Location |
|-----------|--------|----------|
| i18n-js library | Installed | `package.json` |
| expo-localization | Installed | Device locale detection |
| Translation files | Exist | `src/translations/` |
| useTranslations hook | Available | via dopebase |
| English keys | 134 defined | `src/translations/en.json` |

---

## Phase 1: Launch Markets (English + Spanish)

### Technical Setup
- [ ] Audit all hardcoded strings in main screens
- [ ] Create comprehensive `es.json` translation file
- [ ] Implement locale detection with `expo-localization`
- [ ] Add language switcher in Settings (optional for Phase 1)
- [ ] Test Spanish translations on device

### Screen-by-Screen Extraction
- [ ] **CreateScreen.js** (~80 strings)
  - [ ] Generation tips array
  - [ ] Form labels and placeholders
  - [ ] Button text (Generate, Cancel, etc.)
  - [ ] Alert messages
  - [ ] Advanced options labels
- [ ] **LibraryScreen.js** (~120 strings)
  - [ ] Filter tabs (All, Playlists, Songs, Videos)
  - [ ] Sort options
  - [ ] Section headers
  - [ ] Empty state messages
  - [ ] Menu items and actions
  - [ ] Delete confirmations
- [ ] **Feed/FeedItem.js** (~30 strings)
  - [ ] Action labels (Like, Comment, Share)
  - [ ] Timestamps and counts
- [ ] **Comments components** (~20 strings)
  - [ ] Input placeholders
  - [ ] Action labels
  - [ ] Empty states
- [ ] **FullPlayer** (~25 strings)
  - [ ] Controls labels
  - [ ] Queue/playlist text
  - [ ] Lyrics view labels
- [ ] **Profile/Settings** (~40 strings)
  - [ ] Menu items
  - [ ] Account settings labels
  - [ ] Confirmation dialogs
- [ ] **Onboarding/Auth** (~50 strings)
  - [ ] Login/signup forms
  - [ ] Error messages
  - [ ] Welcome text

### Languages
| Language | Code | File | Speakers | Market |
|----------|------|------|----------|--------|
| English | `en` | `en.json` | 1.5B | US, Global |
| Spanish | `es` | `es.json` | 500M+ | Latin America, US Hispanic |

### Quality Assurance
- [ ] Native speaker review of Spanish translations
- [ ] Test text expansion (Spanish is ~20% longer than English)
- [ ] Verify no truncation in UI elements
- [ ] Test on both iOS locales (es-MX, es-ES)
- [ ] Verify pluralization works correctly

---

## Phase 2: High-Value Western Markets

### Prerequisites
- [ ] Phase 1 complete and stable
- [ ] Translation workflow established
- [ ] String extraction automated or documented

### Languages
| Language | Code | File | Speakers | Market | Priority |
|----------|------|------|----------|--------|----------|
| Portuguese (BR) | `pt-BR` | `pt-BR.json` | 260M | Brazil (#4 app market) | High |
| French | `fr` | `fr.json` | 300M | France, Canada, Africa | High |
| German | `de` | `de.json` | 100M | Highest spending EU users | Medium |

### Portuguese (Brazilian)
- [ ] Create `pt-BR.json` translation file
- [ ] Hire/contract Brazilian Portuguese translator
- [ ] Review music-specific terminology (differs from Portugal Portuguese)
- [ ] Test with Brazilian locale settings
- [ ] Native speaker QA review

### French
- [ ] Expand existing `fr.json` (currently only 3 keys)
- [ ] Complete all translation keys
- [ ] Review for Canadian French compatibility
- [ ] Native speaker QA review

### German
- [ ] Create `de.json` translation file
- [ ] Handle compound words (German words can be very long)
- [ ] Test UI for text overflow
- [ ] Native speaker QA review

### Quality Assurance
- [ ] Test all three languages on device
- [ ] Verify date/time formatting per locale
- [ ] Check number formatting (decimals, thousands separators)
- [ ] Verify currency display if applicable

---

## Phase 3: Asian Growth Markets

### Prerequisites
- [ ] Phase 2 complete
- [ ] Font support verified for CJK characters
- [ ] Consider separate translation management tool (Phrase, Crowdin)

### Languages
| Language | Code | File | Speakers | Market | Difficulty |
|----------|------|------|----------|--------|------------|
| Japanese | `ja` | `ja.json` | 125M | #3 app revenue, music lovers | Medium |
| Korean | `ko` | `ko.json` | 80M | K-pop culture, high engagement | Medium |
| Simplified Chinese | `zh-CN` | `zh-CN.json` | 1.1B | #2 market (regulations apply) | Medium |
| Hindi | `hi` | `hi.json` | 600M | Fastest growing mobile market | Medium |

### Japanese
- [ ] Create `ja.json` translation file
- [ ] Verify Japanese font rendering
- [ ] Handle honorifics and formality levels appropriately
- [ ] Test character wrapping and line breaks
- [ ] Professional translator (machine translation inadequate)
- [ ] Native speaker QA review

### Korean
- [ ] Create `ko.json` translation file
- [ ] Verify Hangul font rendering
- [ ] Handle formality levels (Korean has multiple)
- [ ] Professional translator required
- [ ] Native speaker QA review

### Simplified Chinese
- [ ] Create `zh-CN.json` translation file
- [ ] Verify Chinese font rendering
- [ ] Research China App Store requirements (if targeting)
- [ ] Consider separate builds for China market
- [ ] Professional translator required
- [ ] Native speaker QA review

### Hindi
- [ ] Create `hi.json` translation file
- [ ] Verify Devanagari script rendering
- [ ] Test on lower-end Android devices (India market)
- [ ] Professional translator required
- [ ] Native speaker QA review

### Technical Considerations
- [ ] Add CJK font fallbacks if needed
- [ ] Test text rendering performance
- [ ] Verify emoji compatibility across languages
- [ ] Handle mixed-script content (English artist names in Japanese UI)

---

## Phase 4: Additional Reach

### Languages
| Language | Code | File | Speakers | Market | Notes |
|----------|------|------|----------|--------|-------|
| Italian | `it` | `it.json` | 65M | High engagement EU | Easy |
| Dutch | `nl` | `nl.json` | 25M | Tech-savvy, high spending | Easy |
| Polish | `pl` | `pl.json` | 45M | Growing Eastern EU | Easy |
| Indonesian | `id` | `id.json` | 200M | Young mobile-first users | Easy |
| Turkish | `tr` | `tr.json` | 80M | Active social media users | Easy |

### Italian
- [ ] Create `it.json` translation file
- [ ] Professional translation
- [ ] Native speaker QA review

### Dutch
- [ ] Create `nl.json` translation file
- [ ] Professional translation
- [ ] Native speaker QA review

### Polish
- [ ] Create `pl.json` translation file
- [ ] Handle Polish pluralization (complex rules)
- [ ] Professional translation
- [ ] Native speaker QA review

### Indonesian
- [ ] Create `id.json` translation file
- [ ] Professional translation
- [ ] Native speaker QA review

### Turkish
- [ ] Create `tr.json` translation file
- [ ] Handle Turkish-specific characters (ı, İ, ş, ğ)
- [ ] Professional translation
- [ ] Native speaker QA review

---

## Translation Key Naming Convention

Use consistent naming pattern across all files:

```
{screen}.{section}.{element}

Examples:
- create.form.songDescription
- create.button.generate
- create.alert.missingDescription.title
- create.alert.missingDescription.message
- library.tabs.all
- library.tabs.playlists
- library.empty.noSongs.title
- library.empty.noSongs.subtitle
- common.button.cancel
- common.button.ok
- common.error.generic
```

---

## Translation File Template

```json
{
  "common": {
    "button": {
      "ok": "OK",
      "cancel": "Cancel",
      "save": "Save",
      "delete": "Delete",
      "edit": "Edit",
      "done": "Done"
    },
    "error": {
      "generic": "Something went wrong",
      "network": "Network error. Please try again."
    }
  },
  "create": {
    "title": "Create",
    "form": {
      "songDescription": "Song Description",
      "placeholder": "Describe the song you want to create..."
    },
    "button": {
      "generate": "Generate Song",
      "generating": "Generating..."
    }
  },
  "library": {
    "title": "My Catalog",
    "tabs": {
      "all": "All",
      "playlists": "Playlists",
      "songs": "Songs",
      "videos": "Videos"
    }
  }
}
```

---

## Testing Checklist (Per Language)

### Functional Testing
- [ ] App launches with correct locale detected
- [ ] All screens display translated text
- [ ] No missing translation keys (no fallback to English unexpectedly)
- [ ] Alerts and dialogs fully translated
- [ ] Error messages translated
- [ ] Push notification text translated (if applicable)

### Visual Testing
- [ ] No text truncation or overflow
- [ ] Buttons accommodate longer text
- [ ] Tables and lists align properly
- [ ] Font renders correctly for all characters
- [ ] Text is readable (not too small after expansion)

### Edge Cases
- [ ] Pluralization works (1 song vs 2 songs)
- [ ] Date formatting correct for locale
- [ ] Number formatting correct (1,000 vs 1.000)
- [ ] Empty states display correctly
- [ ] Loading states translated

---

## Tools & Resources

### Translation Management
- [ ] Consider Phrase (phrase.com) for team translation
- [ ] Consider Crowdin for community translation
- [ ] Consider Lokalise for developer-friendly workflow

### Quality Assurance
- [ ] Use pseudolocalization for testing (expand text by 30%)
- [ ] Use i18n linting in CI/CD
- [ ] Implement missing translation detection

### Professional Translation Services
- Gengo (gengo.com) - Fast, affordable
- One Hour Translation - Good for apps
- Translated.com - High quality

---

## Estimated Timeline

| Phase | Languages | Estimated Effort |
|-------|-----------|------------------|
| Phase 1 | English, Spanish | 1-2 weeks (string extraction + translation) |
| Phase 2 | Portuguese, French, German | 2-3 weeks |
| Phase 3 | Japanese, Korean, Chinese, Hindi | 3-4 weeks |
| Phase 4 | Italian, Dutch, Polish, Indonesian, Turkish | 2-3 weeks |

**Note:** Timeline assumes professional translators. DIY/machine translation would be faster but lower quality.

---

## Success Metrics

- [ ] Define target % of users seeing native language
- [ ] Track language-specific retention rates
- [ ] Monitor app store ratings by region
- [ ] Track support tickets by language (fewer = better translations)

---

## Notes

- **Skipped:** Arabic - RTL support requires significant layout work
- **Priority:** Spanish is #1 priority for Latin American market
- **Quality:** Professional translation for customer-facing text; machine translation acceptable for internal/debug only
