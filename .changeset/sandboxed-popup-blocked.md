---
"@jielga/react-popup-window": patch
---

Treat a popup whose document is not scriptable as blocked.
Sandboxed embedders (VS Code's built-in browser, CodeSandbox and StackBlitz previews, iframes sandboxed without `allow-popups-to-escape-sandbox`) open popups with an opaque origin, so reading `popupWindow.document` throws.
`open()` now catches that, closes the stranded window, sets `isBlocked`, calls `onBlocked`, and returns `null` instead of throwing and leaving a blank window behind.
