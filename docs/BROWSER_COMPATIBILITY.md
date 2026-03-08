# Browser Compatibility

> **Supported browsers and wallet extensions for BitFlow Lend.**

---

## Supported Browsers

| Browser | Version | Status | Notes |
|---------|---------|--------|-------|
| Chrome | 90+ | ✅ Fully supported | Recommended |
| Firefox | 90+ | ✅ Fully supported | |
| Edge | 90+ | ✅ Fully supported | Chromium-based |
| Brave | 1.30+ | ✅ Fully supported | Chromium-based |
| Safari | 15+ | ⚠️ Limited | Wallet extension support varies |
| Mobile Chrome | Latest | ⚠️ Limited | Mobile wallet required |
| Mobile Safari | Latest | ⚠️ Limited | Mobile wallet required |

---

## Wallet Extensions

### Leather (formerly Hiro Wallet)

| Browser | Status | Install |
|---------|--------|---------|
| Chrome | ✅ Supported | [Chrome Web Store](https://chrome.google.com/webstore/detail/leather) |
| Firefox | ✅ Supported | [Firefox Add-ons](https://addons.mozilla.org/firefox/addon/leather) |
| Brave | ✅ Supported | Uses Chrome extension |

### Xverse

| Browser | Status | Install |
|---------|--------|---------|
| Chrome | ✅ Supported | [Chrome Web Store](https://chrome.google.com/webstore/detail/xverse) |
| iOS | ✅ Mobile app | App Store |
| Android | ✅ Mobile app | Play Store |

---

## Required Browser Features

The BitFlow frontend requires:

| Feature | Purpose | Fallback |
|---------|---------|----------|
| ES2020+ | Modern JavaScript | Not supported without |
| CSS Grid | Layout | Flexbox fallback |
| Fetch API | Network requests | Not supported without |
| localStorage | Session state | Graceful degradation |
| Web Crypto API | Wallet signing | Required for transactions |
| BigInt | Large number handling | Polyfill available |

---

## Known Browser Issues

| Issue | Browser | Workaround |
|-------|---------|------------|
| Wallet popup blocked | All | Allow popups for the site |
| Extension not detected | Firefox | Restart browser after install |
| Slow transaction signing | Safari | Use Chrome or Firefox |
| Console BigInt warnings | Chrome < 90 | Update browser |

---

## Recommended Setup

For the best experience:

1. **Browser**: Chrome (latest) or Firefox (latest)
2. **Wallet**: Leather extension
3. **Network**: Stable internet connection
4. **Screen**: Desktop (1280px+ width recommended)

---

## Related Documentation

- [Quick Start](QUICKSTART.md) — Getting started guide
- [Troubleshooting](TROUBLESHOOTING.md) — Common issues
- [Known Issues](KNOWN_ISSUES.md) — Current limitations
