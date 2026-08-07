/**
 * Copy all stylesheets from `source` into `target` and (optionally) keep them
 * in sync while the popup is open:
 *
 * - `<link rel="stylesheet">` and `<style>` elements are mirrored into the
 *   target `<head>`. `<style>` contents are serialized from the CSSOM when
 *   possible, so rules injected via `insertRule` (CSS-in-JS "speedy" mode)
 *   are included.
 * - Additions/removals/edits of style nodes in the source `<head>` are
 *   observed (covers Vite HMR, lazily loaded chunk CSS, styled-components).
 * - `class`/`style`/`data-*` attributes on `<html>` and `<body>` are mirrored
 *   and kept in sync, so theme switching (e.g. a `dark` class) propagates.
 * - `document.adoptedStyleSheets` are re-constructed in the target document.
 *
 * Returns a function that stops observing.
 */
export function copyStyles(source: Document, target: Document, watch = true): () => void {
  const mirrors = new Map<Element, Element>()

  const isStyleNode = (node: Node): node is HTMLStyleElement | HTMLLinkElement => {
    if (node.nodeType !== Node.ELEMENT_NODE) return false
    const el = node as Element
    return (
      el.tagName === 'STYLE' ||
      (el.tagName === 'LINK' && (el.getAttribute('rel') ?? '').toLowerCase().includes('stylesheet'))
    )
  }

  const serializeStyle = (el: HTMLStyleElement): string => {
    const sheet = el.sheet
    if (sheet) {
      try {
        return Array.from(sheet.cssRules)
          .map((rule) => rule.cssText)
          .join('\n')
      } catch {
        // Inaccessible cssRules — fall back to the raw text below.
      }
    }
    return el.textContent ?? ''
  }

  const mirror = (el: HTMLStyleElement | HTMLLinkElement): void => {
    if (mirrors.has(el)) return
    let clone: Element
    if (el.tagName === 'LINK') {
      const link = target.createElement('link')
      link.rel = 'stylesheet'
      // .href resolves to an absolute URL, so relative hrefs keep working
      // from the popup's `about:blank` document.
      link.href = (el as HTMLLinkElement).href
      const media = el.getAttribute('media')
      if (media) link.media = media
      clone = link
    } else {
      const style = target.createElement('style')
      style.textContent = serializeStyle(el as HTMLStyleElement)
      const media = el.getAttribute('media')
      if (media) style.setAttribute('media', media)
      clone = style
    }
    target.head.appendChild(clone)
    mirrors.set(el, clone)
  }

  const refresh = (el: HTMLStyleElement): void => {
    const clone = mirrors.get(el)
    if (clone) clone.textContent = serializeStyle(el)
  }

  const unmirrorSubtree = (removed: Node): void => {
    for (const [src, clone] of mirrors) {
      if (removed === src || (removed.nodeType === Node.ELEMENT_NODE && removed.contains(src))) {
        clone.remove()
        mirrors.delete(src)
      }
    }
  }

  const ROOT_ATTRS = ['class', 'style']
  const syncRootAttrs = (): void => {
    const pairs: Array<[Element | null, Element | null]> = [
      [source.documentElement, target.documentElement],
      [source.body, target.body],
    ]
    for (const [from, to] of pairs) {
      if (!from || !to) continue
      for (const attr of from.attributes) {
        if (ROOT_ATTRS.includes(attr.name) || attr.name.startsWith('data-')) {
          to.setAttribute(attr.name, attr.value)
        }
      }
      for (const attr of Array.from(to.attributes)) {
        if (
          (ROOT_ATTRS.includes(attr.name) || attr.name.startsWith('data-')) &&
          !from.hasAttribute(attr.name)
        ) {
          to.removeAttribute(attr.name)
        }
      }
    }
  }

  const syncAdoptedSheets = (): void => {
    const targetWindow = target.defaultView as (Window & { CSSStyleSheet?: typeof CSSStyleSheet }) | null
    if (!targetWindow?.CSSStyleSheet || !('adoptedStyleSheets' in source)) return
    try {
      target.adoptedStyleSheets = source.adoptedStyleSheets.map((sheet) => {
        const copy = new targetWindow.CSSStyleSheet!()
        copy.replaceSync(
          Array.from(sheet.cssRules)
            .map((rule) => rule.cssText)
            .join('\n'),
        )
        return copy
      })
    } catch {
      // Best effort — older browsers or cross-origin rules.
    }
  }

  for (const el of source.querySelectorAll('style, link[rel~="stylesheet" i]')) {
    mirror(el as HTMLStyleElement | HTMLLinkElement)
  }
  syncRootAttrs()
  syncAdoptedSheets()

  if (!watch || typeof MutationObserver === 'undefined') {
    return () => {}
  }

  const headObserver = new MutationObserver((records) => {
    for (const record of records) {
      if (record.type === 'characterData') {
        const parent = record.target.parentElement
        if (parent?.tagName === 'STYLE') refresh(parent as HTMLStyleElement)
        continue
      }
      // childList
      if (isStyleNode(record.target) && record.target.tagName === 'STYLE') {
        // textContent assignment replaces the text node → childList on <style>
        refresh(record.target as HTMLStyleElement)
      }
      for (const added of record.addedNodes) {
        if (isStyleNode(added)) {
          mirror(added)
        } else if (added.nodeType === Node.ELEMENT_NODE) {
          for (const el of (added as Element).querySelectorAll('style, link[rel~="stylesheet" i]')) {
            mirror(el as HTMLStyleElement | HTMLLinkElement)
          }
        }
      }
      for (const removed of record.removedNodes) {
        unmirrorSubtree(removed)
      }
    }
  })
  headObserver.observe(source.head, { childList: true, subtree: true, characterData: true })

  const rootObserver = new MutationObserver(() => syncRootAttrs())
  rootObserver.observe(source.documentElement, { attributes: true })
  if (source.body) rootObserver.observe(source.body, { attributes: true })

  return () => {
    headObserver.disconnect()
    rootObserver.disconnect()
  }
}
