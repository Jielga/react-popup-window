---
"@jielga/react-popup-window": patch
---

Show popup content only once its copied stylesheets have loaded.
The popup loads each `<link rel="stylesheet">` from the opener again, and `Popup` used to render before that finished, so the first frame showed unstyled content (every time in production builds, where the CSS is a `<link>`).
`Popup` now renders once those stylesheets have loaded or failed, or after 3 seconds.
`isOpen` still turns `true` when the window opens; `onOpen` is now called when `Popup` starts rendering, which can be after `open()` returns.
Copied `<link>` elements now keep `rel`, `title`, `crossorigin`, `referrerpolicy`, and `integrity`, so an alternate stylesheet stays disabled in the popup and the popup sends the same request as the opener.
