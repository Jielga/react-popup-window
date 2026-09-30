import { describe, expect, it } from 'vitest'
import { copyStyles, mirrorStyles } from './copyStyles'

const nextTick = () => new Promise((resolve) => setTimeout(resolve, 0))

function createTarget(): Document {
  return document.implementation.createHTMLDocument('popup')
}

function addStyle(css: string): HTMLStyleElement {
  const style = document.createElement('style')
  style.textContent = css
  document.head.appendChild(style)
  return style
}

describe('copyStyles', () => {
  it('copies existing <style> elements into the target head', () => {
    const style = addStyle('.a { color: red; }')
    const target = createTarget()
    const stop = copyStyles(document, target, false)

    const copied = target.head.querySelectorAll('style')
    expect(copied.length).toBeGreaterThanOrEqual(1)
    expect(Array.from(copied).some((el) => el.textContent?.includes('color: red'))).toBe(true)

    stop()
    style.remove()
  })

  it('copies <link rel="stylesheet"> with absolute href', () => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/styles/app.css'
    document.head.appendChild(link)
    const target = createTarget()
    const stop = copyStyles(document, target, false)

    const copied = target.head.querySelector('link[rel="stylesheet"]') as HTMLLinkElement
    expect(copied).not.toBeNull()
    expect(copied.getAttribute('href')).toMatch(/^https?:\/\/.+\/styles\/app\.css$/)

    stop()
    link.remove()
  })

  it('copies the attributes that shape the <link> request and whether it applies', () => {
    const link = document.createElement('link')
    link.rel = 'alternate stylesheet'
    link.title = 'High contrast'
    link.href = '/styles/contrast.css'
    link.media = 'screen'
    link.setAttribute('crossorigin', '')
    link.setAttribute('referrerpolicy', 'no-referrer')
    document.head.appendChild(link)
    const target = createTarget()
    const stop = copyStyles(document, target, false)

    const copied = target.head.querySelector('link') as HTMLLinkElement
    expect(copied.rel).toBe('alternate stylesheet')
    expect(copied.title).toBe('High contrast')
    expect(copied.media).toBe('screen')
    expect(copied.getAttribute('crossorigin')).toBe('')
    expect(copied.getAttribute('referrerpolicy')).toBe('no-referrer')

    stop()
    link.remove()
  })

  it('mirrorStyles returns the <link> elements it created', () => {
    const style = addStyle('.a { color: red; }')
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = '/styles/app.css'
    document.head.appendChild(link)
    const target = createTarget()
    const { stop, links } = mirrorStyles(document, target, false)

    expect(links).toEqual([target.head.querySelector('link')])

    stop()
    style.remove()
    link.remove()
  })

  it('mirrors added and removed style nodes while watching', async () => {
    const target = createTarget()
    const stop = copyStyles(document, target)

    const style = addStyle('.late { display: none; }')
    await nextTick()
    expect(
      Array.from(target.head.querySelectorAll('style')).some((el) =>
        el.textContent?.includes('.late'),
      ),
    ).toBe(true)

    style.remove()
    await nextTick()
    expect(
      Array.from(target.head.querySelectorAll('style')).some((el) =>
        el.textContent?.includes('.late'),
      ),
    ).toBe(false)

    stop()
  })

  it('updates the mirror when style text changes (HMR)', async () => {
    const style = addStyle('.hmr { color: blue; }')
    const target = createTarget()
    const stop = copyStyles(document, target)

    style.textContent = '.hmr { color: green; }'
    await nextTick()
    expect(
      Array.from(target.head.querySelectorAll('style')).some((el) =>
        el.textContent?.includes('color: green'),
      ),
    ).toBe(true)

    stop()
    style.remove()
  })

  it('mirrors class attributes on <html> and <body>', async () => {
    document.documentElement.classList.add('dark')
    const target = createTarget()
    const stop = copyStyles(document, target)

    expect(target.documentElement.classList.contains('dark')).toBe(true)

    document.documentElement.classList.remove('dark')
    document.body.classList.add('compact')
    await nextTick()
    expect(target.documentElement.classList.contains('dark')).toBe(false)
    expect(target.body.classList.contains('compact')).toBe(true)

    stop()
    document.body.classList.remove('compact')
  })
})
