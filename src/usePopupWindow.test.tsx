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

  it('reports blocked when the popup document is not scriptable (sandboxed embedder)', () => {
    let closed = false
    const sandboxedWin = {
      get document(): Document {
        throw new DOMException(
          'Blocked a frame with origin "null" from accessing a cross-origin frame.',
          'SecurityError',
        )
      },
      get closed() {
        return closed
      },
      close() {
        closed = true
      },
    } as unknown as Window
    vi.spyOn(window, 'open').mockReturnValue(sandboxedWin)

    const onBlocked = vi.fn()
    const getApi = renderHarness({ onBlocked })
    let result: Window | null = sandboxedWin
    act(() => {
      result = getApi().open()
    })
    expect(result).toBeNull()
    expect(getApi().isBlocked).toBe(true)
    expect(getApi().isOpen).toBe(false)
    expect(onBlocked).toHaveBeenCalledTimes(1)
    expect(closed).toBe(true)
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
