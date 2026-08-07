---
name: popup-content
description: >
  Render real application UI inside the popup window: stylesheet
  synchronization (copyStyles, CSSOM serialization, root class and data-*
  attributes, adoptedStyleSheets), theme switching across windows,
  bounded-height layouts for virtualized content, and third-party component
  libraries whose overlays portal to document.body (Mantine, Radix, MUI).
  Load when popup content renders unstyled, a theme change does not reach
  the popup, or menus, popovers, modals, and tooltips open in the main
  window instead of the popup.
metadata:
  type: sub-skill
  library: '@jielga/react-popup-window'
  library_version: '0.1.0'
requires:
  - '@jielga/react-popup-window/getting-started'
sources:
  - 'Jielga/react-popup-window:README.md'
  - 'Jielga/react-popup-window:src/copyStyles.ts'
  - 'Jielga/react-popup-window:docs/src/examples/SameWindowPortals.tsx'
---

# react-popup-window — Popup content

This skill builds on getting-started. Read it first for the portal model
and hook API.

The popup document starts as an unstyled `about:blank` page. While it is
open, the library mirrors the opener's styling into it and keeps the mirror
current:

- `<style>` and `<link rel="stylesheet">` elements are copied into the
  popup `<head>`. `<style>` contents are serialized from the CSSOM, so
  rules injected with `insertRule` (CSS-in-JS) are included at copy time.
- Additions, removals, and edits of style nodes in the opener's `<head>`
  are observed and re-mirrored. This covers Vite HMR and lazily loaded
  chunk CSS.
- `class`, `style`, and `data-*` attributes on `<html>` and `<body>` are
  mirrored and kept in sync. Theme systems keyed on a root class or data
  attribute (for example Mantine's `data-mantine-color-scheme`) follow
  automatically.
- `document.adoptedStyleSheets` are reconstructed in the popup document.

`copyStyles: false` disables all of it. The mechanism is also exported
standalone as `copyStyles(source, target, watch?)`, returning a `stop`
function, for windows managed outside the hook.

## Setup

Redirect portal-based overlays into the popup document. Component libraries
mount menus, popovers, and tooltips into `document.body`, which is the main
window's body even for components rendered in the popup. For Mantine, a
wrapper can supply the correct body through theme default props:

```tsx
import { MantineThemeProvider, Portal } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

export function SameWindowPortals({ children }: { children: ReactNode }) {
  const probeRef = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTarget(probeRef.current?.ownerDocument.body ?? null)
  }, [])

  const theme = useMemo(
    () => ({
      components: {
        Portal: Portal.extend({ defaultProps: target ? { target, reuseTargetNode: false } : {} }),
      },
    }),
    [target],
  )

  return (
    <div ref={probeRef} style={{ display: 'contents' }}>
      <MantineThemeProvider inherit theme={theme}>
        {children}
      </MantineThemeProvider>
    </div>
  )
}
```

The wrapper resolves its own `ownerDocument` after mount, so the same
component works inline (main body, the default behavior) and inside
`<Popup>` (popup body). For other libraries, use their per-component portal
container prop (`container` in Radix and MUI) with
`popupWindow.document.body`.

## Core patterns

### Full-height popup layout

```tsx
<Popup>
  <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <VirtualizedGrid style={{ flex: 1, minHeight: 0 }} />
  </div>
</Popup>
```

The portal container is an unsized `<div>` in the popup body. Content that
measures itself — virtualized lists, grids, editors — needs an explicit
bounded height; the popup viewport (`100vh`) is the natural bound.

### Theme switching across windows

```tsx
// A root-attribute theme reaches the popup with no additional wiring:
document.documentElement.classList.toggle('dark', dark)
```

Root `class` and `data-*` attributes are mirrored while the popup is open,
so any CSS keyed on them applies in both windows.

## Common mistakes

### HIGH Overlays from UI libraries open in the main window

Wrong:

```tsx
<Popup>
  <DataGrid /> {/* column menu portals to the main window's document.body */}
</Popup>
```

Correct:

```tsx
<Popup>
  <SameWindowPortals>
    <DataGrid />
  </SameWindowPortals>
</Popup>
```

Portal-based overlays default to the global `document.body`. The content
sits in the popup document, but the overlay mounts — and positions itself —
in the main window. Supply a portal target inside the popup document.

Source: docs/src/examples/SameWindowPortals.tsx

### HIGH Unbounded height collapses measured content

Wrong:

```tsx
<Popup>
  <VirtualizedGrid style={{ flex: 1, minHeight: 0 }} /> {/* parent has no height */}
</Popup>
```

Correct:

```tsx
<Popup>
  <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
    <VirtualizedGrid style={{ flex: 1, minHeight: 0 }} />
  </div>
</Popup>
```

`flex: 1` resolves against a sized parent. Without one, a virtualizer
measures zero height and renders no rows, or the content renders at full
natural height and scrolls the popup body instead.

Source: README.md

### MEDIUM Listening on the wrong window object

Wrong:

```tsx
// inside <Popup> content
useEffect(() => {
  window.addEventListener('resize', onResize) // main window: closures keep the opener's globals
  return () => window.removeEventListener('resize', onResize)
}, [])
```

Correct:

```tsx
const { popupWindow } = usePopupWindow(/* ... */)

useEffect(() => {
  if (!popupWindow) return
  popupWindow.addEventListener('resize', onResize)
  return () => popupWindow.removeEventListener('resize', onResize)
}, [popupWindow])
```

Portal content executes in the main window's realm; `window` in its
closures is the opener. Window-level events of the popup — resize, scroll,
message — require listeners on the `popupWindow` object.

Source: README.md (Communicating with popup content)

### MEDIUM Expecting CSSOM-only rule changes to sync after open

Wrong:

```tsx
// after the popup is open
someStyleSheet.insertRule('.late { color: red }') // no DOM mutation; not observed
```

Correct:

```tsx
// inject a new <style> element instead; node additions are observed
const el = document.createElement('style')
el.textContent = '.late { color: red }'
document.head.appendChild(el)
```

Style synchronization serializes each sheet when it is copied and re-reads
it when its DOM node changes. A rule inserted directly into an existing
sheet's CSSOM after the popup opened produces no mutation and is not
re-mirrored. Most CSS-in-JS libraries create or update style elements and
are unaffected.

Source: src/copyStyles.ts
