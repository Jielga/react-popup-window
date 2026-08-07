# @jielga/react-popup-window

[![CI](https://github.com/jielga/react-popup-window/actions/workflows/ci.yml/badge.svg)](https://github.com/jielga/react-popup-window/actions/workflows/ci.yml)
[![npm](https://img.shields.io/npm/v/%40jielga%2Freact-popup-window)](https://www.npmjs.com/package/@jielga/react-popup-window)

A React hook that opens part of your UI in a separate browser popup window — an
"open in new window" panel. The content is rendered with a **portal into the
popup's document**, so it stays part of your component tree: state, context
(TanStack Query, Redux, themes, routers, …) and event handlers all keep working
across windows.

**[Live docs & examples →](https://jielga.github.io/react-popup-window/)**

## Install

```sh
npm install @jielga/react-popup-window
```

Requires React 19.2+.

## Quick start

```tsx
import { usePopupWindow } from '@jielga/react-popup-window'

function Dashboard() {
  const { open, close, isOpen, Popup } = usePopupWindow({
    title: 'Detached panel',
    features: { width: 640, height: 480 },
  })

  return (
    <>
      <button onClick={open}>Open in new window</button>
      <Popup>
        {/* Rendered inside the popup window, but still part of THIS
            component tree: state, context and events keep working. */}
        <MyPanel />
      </Popup>
    </>
  )
}
```

### Detach a section (hide it in the main window while popped out)

```tsx
const { open, close, focus, isOpen, Popup } = usePopupWindow({ title: 'People' })

const table = <DataTable /> // may use useQuery(), useContext(), anything

return (
  <>
    {isOpen ? (
      <p>
        Table is open in another window — <button onClick={focus}>focus</button>{' '}
        <button onClick={close}>bring it back</button>
      </p>
    ) : (
      <>
        <button onClick={open}>Open table in new window</button>
        {table}
      </>
    )}
    <Popup>{table}</Popup>
  </>
)
```

## Why a portal (and not moving a DOM node)?

Two things make "render React content in another window" tricky:

1. **Moving a DOM node breaks React events.** Since React 17, event listeners
   are delegated on the React *root container* in the main document. A node
   physically moved into another document stops receiving `onClick` & friends.
2. **Rendering a separate React root in the popup loses your tree.** State and
   context would need to be bridged manually.

`createPortal` into the popup's document avoids both: React officially supports
cross-document portals (it attaches its event delegation to the portal
container when it lives in another document), and the content never leaves your
component tree — which is exactly why providers like TanStack Query's
`QueryClientProvider` "just work" in the popup with zero configuration.

## API

### `usePopupWindow(options?): PopupWindowApi`

```ts
interface UsePopupWindowOptions {
  title?: string // popup document title (default: opener's title)
  name?: string // window.open target name (default: '_blank')
  features?: PopupWindowFeatures // default: { popup: true, width: 640, height: 480 }
  center?: boolean // center over the opener window (default: true)
  copyStyles?: boolean // mirror + live-sync stylesheets (default: true)
  onOpen?: (popupWindow: Window) => void
  onClose?: () => void // close(), user close, or opener unload
  onBlocked?: () => void // window.open returned null
}
```

Returns:

| Member                                | Description                                                                                                                                  |
| ------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------- |
| `Popup`                               | Portal component (stable identity). Renders children into the popup while open, nothing otherwise.                                            |
| `open()`                              | Opens the popup, or focuses it if already open. Call from a user gesture, or popup blockers step in. Returns the `Window` or `null`.          |
| `close()`                             | Closes the popup. No-op when closed.                                                                                                          |
| `toggle()`                            | Open if closed, close if open.                                                                                                                |
| `focus()`                             | Focuses the popup window.                                                                                                                     |
| `isOpen`                              | Reactive boolean.                                                                                                                             |
| `isBlocked`                           | `true` when the last `open()` was blocked by the browser.                                                                                     |
| `popupWindow`                         | The raw `Window` while open, else `null`.                                                                                                     |

### Communicating with popup content

You don't. There is nothing to communicate *across* — popup content stays in
your component tree and your JS realm, so props, state and context (TanStack
Query, Redux, …) already cover it, exactly like any other component.

The one exception is scripts that live in the popup's own document (e.g. a
non-React widget you inject into `popupWindow.document`). Those run in the
popup's realm and can talk to your app via standard `postMessage` — the raw
`popupWindow` handle is the escape hatch for that. Note that calling
`opener.postMessage` from a portal event handler won't look like a popup
message: portal handlers run in the main window's realm, so the browser stamps
the main window as `event.source`. Only code hosted in the popup document
posts *as* the popup.

### Style syncing

While the popup is open the library mirrors, and keeps in sync:

- `<style>` and `<link rel="stylesheet">` elements (additions, removals and
  text edits — covers Vite HMR, lazily loaded chunk CSS and CSS-in-JS;
  `<style>` contents are serialized from the CSSOM so `insertRule`-based
  libraries work too),
- `class`/`style`/`data-*` attributes on `<html>` and `<body>` (so theme
  classes like `dark` propagate),
- `document.adoptedStyleSheets`.

Set `copyStyles: false` to opt out.

### `copyStyles(source, target, watch?)`

The style mirroring is exported standalone in case you manage your own window:
returns a `stop()` function.

## Good to know

- **Address bar:** browsers no longer allow hiding it completely (anti
  phishing). `popup: true` — the default — gives the most minimal chrome the
  platform allows: no tabs, no toolbar, a slim read-only URL strip.
- **User gesture required:** call `open()` from a click handler; `isBlocked` /
  `onBlocked` tell you when a blocker intervened.
- **Lifecycle:** the popup closes automatically when the owning component
  unmounts and when the main window unloads. Closing the window by hand is
  detected (`isOpen` flips, `onClose` fires) and the portal unmounts.
- **Remounting:** popup content unmounts/remounts when it moves between
  windows. Keep state you care about in the owning component (like the
  examples do) or in a store.
- **SSR-safe:** the hook touches `window` only inside `open()`.

## Repository

- `src/` — the library (built with Vite library mode; ESM + CJS + types)
- `docs/` — the docs/examples app ([deployed to GitHub Pages](https://jielga.github.io/react-popup-window/)); `npm run dev` serves it with the library aliased to source for HMR
- `e2e/` — Playwright tests that exercise real popup windows in Chromium
- `src/**/*.test.*` — Vitest + jsdom unit tests

```sh
npm install
npm run dev        # docs app with live examples
npm test           # unit tests (vitest + jsdom)
npm run e2e        # Playwright end-to-end tests
npm run build      # build the library into dist/
```

## License

MIT © jielga
