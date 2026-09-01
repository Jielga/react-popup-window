---
'@jielga/react-popup-window': patch
---

Unmount popup content before the popup window is destroyed.

Closing the window by hand tore the popup document down before React
unmounted the portal, so effect cleanups in the popup subtree ran against a
detached execution context — anything they touched on that window failed
(Chromium: "Cache storage isn't available on detached context"). The portal
is now unmounted synchronously from the popup's `pagehide`/`beforeunload`,
and before `window.close()` on the `close()`/`toggle()` path, so cleanups
always see a live document. Style syncing also stops instead of writing into
a document whose window is gone.
