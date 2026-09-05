---
'@jielga/react-popup-window': patch
---

Document modals and window-bound overlay behavior for popup content.
The README now states the realm rule (bare `document` is the opener's document, `ownerDocument` of a mounted node is the popup's), inlines the Mantine `SameWindowPortals` wrapper instead of linking a file that is not shipped, covers `withinPortal`, `portalProps` and `target`, gives a general `ownerDocument` recipe for Radix and MUI, and explains why Escape and scroll lock stay bound to the main window (with the popup-window listener workaround).
The popup-content skill gains a matching mistake entry, the dead `reuseTargetNode: false` prop is removed from the wrapper, and skill source citations now match the README headings.
The docs site shows a Mantine `Modal` opened from the detached grid, covered by an e2e test.
