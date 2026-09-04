# 🧘 Zen Master

Zen Master is a local-only Chrome extension that starts in zen mode by default. It hides passive discovery feeds and suggested-video modules on 50 adult tube platforms. Search results remain available, the video you deliberately opened remains playable, and account-owned lists such as history, favorites, subscriptions, and playlists remain available.

There is no pause, reveal, or per-site disable control inside the extension. Chrome's normal extension-management controls still apply.

## Behavior

- Hides home feeds, category/tag/model/channel listings, related and recommended modules, up-next controls, and end screens.
- Preserves search forms, filters, pagination, results, the selected player, and essential controls.
- Blocks a confirmed automatic transition to another video without changing current-video autoplay.
- Uses dedicated adapters for the built-in catalog and conservative structural detection for sites you add.

To add another HTTP(S) site, open the toolbar popup while on that site and choose **Block recommendations on this site**. Chrome asks for access to that exact scheme and hostname. Remove user-added sites from Settings; built-in sites are fixed for this release.

## Local development

```bash
npm ci
npm run fixture:generate
npm run verify
npm run package
```

Load `dist/` through `chrome://extensions` with Developer mode enabled. The ZIP in `artifacts/` is deterministic and contains only production files.

## Limits

The extension changes page presentation. It does not prevent a site from computing or downloading its own recommendations, and it is not an ad blocker, tracker blocker, parental-control system, or age-assurance bypass. Site markup changes can require a ruleset update.
