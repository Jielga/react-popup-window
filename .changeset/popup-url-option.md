---
"@jielga/react-popup-window": minor
---

Add the `url` option: a same-origin page the popup loads instead of `about:blank`, so the address bar shows the app's own URL.
`isOpen` turns `true` when the window opens; `Popup` renders once the page has loaded.
If the page ends up on another origin, the popup closes and is reported through `onBlocked`.
