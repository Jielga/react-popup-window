# @jielga/react-popup-window

## 0.1.1

### Patch Changes

- [#3](https://github.com/Jielga/react-popup-window/pull/3) [`f283d4d`](https://github.com/Jielga/react-popup-window/commit/f283d4d9b920812e335236e7d3befb94d4d860d7) Thanks [@Psvensso](https://github.com/Psvensso)! - Document modals and window-bound overlay behavior for popup content.
  The README now states the realm rule (bare `document` is the opener's document, `ownerDocument` of a mounted node is the popup's), inlines the Mantine `SameWindowPortals` wrapper instead of linking a file that is not shipped, covers `withinPortal`, `portalProps` and `target`, gives a general `ownerDocument` recipe for Radix and MUI, and explains why Escape and scroll lock stay bound to the main window (with the popup-window listener workaround).
  The popup-content skill gains a matching mistake entry, the dead `reuseTargetNode: false` prop is removed from the wrapper, and skill source citations now match the README headings.
  The docs site shows a Mantine `Modal` opened from the detached grid, covered by an e2e test.

- [#3](https://github.com/Jielga/react-popup-window/pull/3) [`d8e0a40`](https://github.com/Jielga/react-popup-window/commit/d8e0a405582e34fcacee52fa66f1fef446f685bd) Thanks [@Psvensso](https://github.com/Psvensso)! - Correct the GitHub organization casing in the `repository` and `bugs` URLs, which pointed at `jielga` instead of `Jielga`.

- [#3](https://github.com/Jielga/react-popup-window/pull/3) [`bfb64df`](https://github.com/Jielga/react-popup-window/commit/bfb64dfdca717320867c543ee33265018678f270) Thanks [@Psvensso](https://github.com/Psvensso)! - Treat a popup whose document is not scriptable as blocked.
  Sandboxed embedders (VS Code's built-in browser, CodeSandbox and StackBlitz previews, iframes sandboxed without `allow-popups-to-escape-sandbox`) open popups with an opaque origin, so reading `popupWindow.document` throws.
  `open()` now catches that, closes the stranded window, sets `isBlocked`, calls `onBlocked`, and returns `null` instead of throwing and leaving a blank window behind.
