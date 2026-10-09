---
"@jielga/react-popup-window": patch
---

Copy CSS-in-JS rules into the popup as they are added.
In production builds, Emotion (including MUI and `@mantine/emotion`) and styled-components add rules with `insertRule()`, which changes no DOM.
The popup only copied a `<style>` when it opened or when its DOM changed, so components that rendered for the first time inside the popup stayed unstyled until the popup was opened again.
Rules added to or removed from a `<style>` sheet with `insertRule` and `deleteRule` are now applied to the popup's copy as they happen, before the content that uses them is painted.
A once-per-frame check also copies a sheet again if its rule count changed in any other way.
