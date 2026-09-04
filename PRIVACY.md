# Privacy

Zen Master performs all detection and hiding inside the browser.

- No telemetry, analytics, crash reporting, remote rules, or extension-owned network requests.
- No browsing history, page URLs, paths, queries, search terms, titles, media identifiers, or blocked counts are persisted.
- User-added configuration is stored only in `chrome.storage.local` as scheme, hostname, and the time it was added.
- The built-in catalog and executable rules are packaged with the extension.
- Sanitized test fixtures contain no thumbnails, videos, titles, usernames, or live query values.

Required permissions are `storage`, `scripting`, and `activeTab`. Persistent host access covers only the 50 built-in platforms and approved aliases. Broad HTTP(S) patterns are declared only as optional capability; after a toolbar click the extension requests one exact current scheme and hostname.

Removing a custom site unregisters its future scripts, deletes its local record, and removes its exact host permission. Reload an already-open page to restore that page's original presentation.
