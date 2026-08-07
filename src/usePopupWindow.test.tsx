import { act, cleanup, render, screen } from '@testing-library/react'
import { useEffect, useState } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { usePopupWindow } from './usePopupWindow'
import type { PopupWindowApi, UsePopupWindowOptions } from './types'

interface FakePopup {
  win: Window
  doc: Document
  /** Simulate the user closing the window. */
  closeByUser: () => void
}

function createFakePopup(): FakePopup {
  const doc = document.implementation.createHTMLDocument('popup')
  const listeners = new Map<string, Set<EventListener>>()
  let closed = false

  const win = {
    get document() {
      return doc
    },
    get closed() {
      return closed
    },
    close() {
      closed = true
    },
    focus: vi.fn(),
    postMessage: vi.fn(),
    addEventListener(type: string, listener: EventListener) {
      if (!listeners.has(type)) listeners.set(type, new Set())
      listeners.get(type)!.add(listener)
    },
    removeEventListener(type: string, listener: EventListener) {
      listeners.get(type)?.delete(listener)
    },
  } as unknown as Window

  return {
    win,
    doc,
    closeByUser() {
      closed = true
      for (const listener of listeners.get('pagehide') ?? []) {
        listener(new Event('pagehide'))
      }
    },
  }
}

function Harness({
  onApi,
  options,
}: {
  onApi: (api: PopupWindowApi) => void
  options?: UsePopupWindowOptions
}) {
  const api = usePopupWindow(options)
  const { Popup } = api
  onApi(api)
  return (
    <Popup>
      <span data-testid="popup-content">hello from popup</span>
    </Popup>
  )
}

describe('usePopupWindow', () => {
  let fake: FakePopup

  beforeEach(() => {
    fake = createFakePopup()
    vi.spyOn(window, 'open').mockReturnValue(fake.win)
  })

  afterEach(() => {
    cleanup()
    vi.restoreAllMocks()
  })

  function renderHarness(options?: UsePopupWindowOptions) {
    let api!: PopupWindowApi
    render(<Harness onApi={(a) => (api = a)} options={options} />)
    return () => api
  }

  it('opens a popup and portals children into it', () => {
    const getApi = renderHarness({ title: 'Test panel' })
    expect(getApi().isOpen).toBe(false)

    act(() => {
      getApi().open()
    })

    expect(getApi().isOpen).toBe(true)
    expect(getApi().popupWindow).toBe(fake.win)
    expect(fake.doc.title).toBe('Test panel')
    expect(fake.doc.body.textContent).toContain('hello from popup')
    expect(fake.doc.querySelector('[data-popup-window-root]')).not.toBeNull()
  })

  it('focuses instead of reopening when already open', () => {
    const getApi = renderHarness()
    act(() => {
      getApi().open()
    })
    act(() => {
      getApi().open()
    })
    expect(window.open).toHaveBeenCalledTimes(1)
    expect(fake.win.focus).toHaveBeenCalledTimes(1)
  })

  it('close() closes the window, unmounts the portal and calls onClose', () => {
    const onClose = vi.fn()
    const getApi = renderHarness({ onClose })
    act(() => {
      getApi().open()
    })
    act(() => {
      getApi().close()
    })
    expect(getApi().isOpen).toBe(false)
    expect(fake.win.closed).toBe(true)
    expect(onClose).toHaveBeenCalledTimes(1)
    expect(fake.doc.body.textContent).not.toContain('hello from popup')
  })

  it('detects the user closing the window', () => {
    vi.useFakeTimers()
    const onClose = vi.fn()
    const getApi = renderHarness({ onClose })
    act(() => {
      getApi().open()
    })
    act(() => {
      fake.closeByUser()
      vi.runOnlyPendingTimers()
    })
    expect(getApi().isOpen).toBe(false)
    expect(onClose).toHaveBeenCalledTimes(1)
    vi.useRealTimers()
  })

  it('reports blocked popups', () => {
    vi.spyOn(window, 'open').mockReturnValue(null)
    const onBlocked = vi.fn()
    const getApi = renderHarness({ onBlocked })
    let result: Window | null = fake.win
    act(() => {
      result = getApi().open()
    })
    expect(result).toBeNull()
    expect(getApi().isBlocked).toBe(true)
    expect(getApi().isOpen).toBe(false)
    expect(onBlocked).toHaveBeenCalledTimes(1)
  })

  it('sendMessage posts to the popup window', () => {
    const getApi = renderHarness({ targetOrigin: 'https://example.test' })
    expect(getApi().sendMessage({ ping: 1 })).toBe(false)
    act(() => {
      getApi().open()
    })
    expect(getApi().sendMessage({ ping: 1 })).toBe(true)
    expect(fake.win.postMessage).toHaveBeenCalledWith({ ping: 1 }, 'https://example.test')
  })

  it('onMessage receives messages whose source is the popup window', () => {
    const getApi = renderHarness()
    const handler = vi.fn()
    act(() => {
      getApi().open()
    })
    const unsubscribe = getApi().onMessage(handler)

    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { pong: 2 }, source: fake.win as WindowProxy }),
      )
      window.dispatchEvent(new MessageEvent('message', { data: 'other', source: null }))
    })
    expect(handler).toHaveBeenCalledTimes(1)
    expect(handler).toHaveBeenCalledWith({ pong: 2 }, expect.any(MessageEvent))

    unsubscribe()
    act(() => {
      window.dispatchEvent(
        new MessageEvent('message', { data: { pong: 3 }, source: fake.win as WindowProxy }),
      )
    })
    expect(handler).toHaveBeenCalledTimes(1)
  })

  it('closes the popup when the owning component unmounts', () => {
    const getApi = renderHarness()
    act(() => {
      getApi().open()
    })
    cleanup()
    expect(fake.win.closed).toBe(true)
  })

  it('popup content shares state with the opener tree', () => {
    function Shared() {
      const [count, setCount] = useState(0)
      const { open, Popup } = usePopupWindow()
      useEffect(() => {
        open()
        // eslint-disable-next-line react-hooks/exhaustive-deps
      }, [])
      return (
        <>
          <span data-testid="parent-count">{count}</span>
          <Popup>
            <button onClick={() => setCount((c) => c + 1)}>inc</button>
            <span data-testid="popup-count">{count}</span>
          </Popup>
        </>
      )
    }
    render(<Shared />)
    const button = fake.doc.querySelector('button')!
    act(() => {
      button.click()
    })
    expect(screen.getByTestId('parent-count').textContent).toBe('1')
    expect(fake.doc.querySelector('[data-testid="popup-count"]')!.textContent).toBe('1')
  })
})
