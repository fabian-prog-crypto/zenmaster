# 🧘 Zen Master

Zen Master is a local-only Chrome extension that runs continuously by default. It hides passive discovery feeds and suggested-video modules on 50 adult tube platforms. Search results remain available, the video you deliberately opened remains playable, and account-owned lists such as history, favorites, subscriptions, and playlists remain available.

There is no pause, reveal, or per-site disable control inside the extension. Chrome's normal extension-management controls still apply.

## Behavior

- Hides home feeds, category/tag/model/channel listings, related and recommended modules, up-next controls, end screens, and uploader and creator continuation paths.
- Preserves search forms, filters, pagination, results, the selected player, and essential controls.
- Blocks a confirmed automatic transition to another video without changing current-video autoplay.
- Protects each verified built-in domain root and its subdomains using dedicated adapters plus conservative structural detection. Alternate registrable domains remain explicit, reviewed entries.
- Shows the current page's hidden video-recommendation count on the toolbar icon and in the popup. The badge is blank at zero, exact from 1–99, and reads `99+` above 99.

The live count is recalculated as a page changes and is cleared on navigation. It stays in memory only: Zen Master does not store recommendation counts, page URLs, titles, text, or media identifiers.

To add another HTTP(S) site, open the toolbar popup while on that site and choose **Block recommendations on this site**. Chrome asks for access to that exact scheme and hostname; user-added sites do not silently include subdomains. Remove user-added sites from Settings; built-in sites are fixed for this release.

## Local development

```bash
npm ci
npm run fixture:generate
npm run verify
npm run package
```

Load `dist/` through `chrome://extensions` with Developer mode enabled. The ZIP in `artifacts/` is deterministic and contains only production files.

## Limits

The extension changes page presentation. It does not prevent a site from computing or downloading its own recommendations, and it is not an ad blocker, tracker blocker, parental-control system, or age-assurance bypass. Site markup changes can require a ruleset update. The current rules include Pornhub's right-hand recommendation rail.
