import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FC } from 'react'
import { createPortal, flushSync } from 'react-dom'
import { copyStyles } from './copyStyles'
import type {
  PopupProps,
  PopupWindowApi,
  PopupWindowFeatures,
  UsePopupWindowOptions,
} from './types'

interface PopupState {
  popupWindow: Window | null
  container: HTMLElement | null
  blocked: boolean
}

const INITIAL_STATE: PopupState = { popupWindow: null, container: null, blocked: false }

class PopupStore {
  state: PopupState = INITIAL_STATE
  private listeners = new Set<() => void>()

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => this.listeners.delete(listener)
  }

  getSnapshot = (): PopupState => this.state

  getServerSnapshot = (): PopupState => INITIAL_STATE

  setState(partial: Partial<PopupState>): void {
    this.state = { ...this.state, ...partial }
    for (const listener of this.listeners) listener()
  }
}

const DEFAULT_FEATURES: PopupWindowFeatures = { popup: true, width: 640, height: 480 }

function buildFeatures(options: UsePopupWindowOptions): string {
  const merged: PopupWindowFeatures = { ...DEFAULT_FEATURES, ...options.features }
  if (
    options.center !== false &&
    merged.left === undefined &&
    merged.top === undefined &&
    typeof merged.width === 'number' &&
    typeof merged.height === 'number'
  ) {
    merged.left = Math.max(0, Math.round(window.screenX + (window.outerWidth - merged.width) / 2))
    merged.top = Math.max(0, Math.round(window.screenY + (window.outerHeight - merged.height) / 2))
  }
  return Object.entries(merged)
    .filter(([, value]) => value !== undefined && value !== false)
    .map(([key, value]) => (value === true ? `${key}=yes` : `${key}=${value}`))
    .join(',')
}

function createPopupComponent(store: PopupStore): FC<PopupProps> {
  function Popup({ children }: PopupProps) {
    const { container } = useSyncExternalStore(
      store.subscribe,
      store.getSnapshot,
      store.getServerSnapshot,
    )
    return container ? createPortal(children, container) : null
  }
  Popup.displayName = 'PopupWindow.Popup'
  return Popup
}

/**
 * Open part of your React tree in a separate browser window.
 *
 * The popup content is rendered with a portal into the popup's document, so
 * it stays part of your component tree: state, context and event handlers
 * all keep working across windows.
 *
 * ```tsx
 * const { open, close, isOpen, Popup } = usePopupWindow({ title: 'Panel' })
 *
 * return (
 *   <>
 *     <button onClick={open}>Open panel</button>
 *     <Popup>
 *       <MyPanel />
 *     </Popup>
 *   </>
 * )
 * ```
 */
export function usePopupWindow(options: UsePopupWindowOptions = {}): PopupWindowApi {
  const [store] = useState(() => new PopupStore())
  const [Popup] = useState(() => createPopupComponent(store))

  const optionsRef = useRef(options)
  optionsRef.current = options

  const cleanupRef = useRef<(() => void) | null>(null)
  const unmountPortalRef = useRef<((flush: boolean) => void) | null>(null)

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

  // `userClosed` is true when the window was closed outside our control
  // (user hit the close button, opener unloaded) — then we must not touch it.
  //
  // `flush` unmounts the portal content synchronously *before* the window
  // goes away, so effect cleanups in the popup subtree still see a live
  // document. It must stay false when we are called from a React lifecycle
  // (the owner unmounting) — React is tearing the subtree down itself there,
  // and `flushSync` from inside a lifecycle warns.
  const closePopup = useCallback(
    (userClosed: boolean, flush = false) => {
      const { popupWindow } = store.getSnapshot()
      if (popupWindow && !userClosed && !popupWindow.closed) unmountPortalRef.current?.(flush)
      cleanupRef.current?.()
      cleanupRef.current = null
      unmountPortalRef.current = null
      if (!popupWindow) return
      if (!userClosed && !popupWindow.closed) popupWindow.close()
      store.setState({ popupWindow: null, container: null })
      optionsRef.current.onClose?.()
    },
    [store],
  )

  const open = useCallback((): Window | null => {
    if (typeof window === 'undefined') return null
    const current = store.getSnapshot()
    if (current.popupWindow && !current.popupWindow.closed) {
      current.popupWindow.focus()
      return current.popupWindow
    }

    const opts = optionsRef.current
    const popupWindow = window.open('about:blank', opts.name ?? '_blank', buildFeatures(opts))
    if (!popupWindow) {
      store.setState({ blocked: true })
      opts.onBlocked?.()
      return null
    }

    const doc = popupWindow.document
    doc.title = opts.title ?? document.title

    let stopStyleSync: (() => void) | undefined
    if (opts.copyStyles !== false) {
      stopStyleSync = copyStyles(document, doc)
    }

    const container = doc.createElement('div')
    container.setAttribute('data-popup-window-root', '')
    doc.body.appendChild(container)

    const handleExternalClose = () => closePopup(true)

    // Unmount the portal content while the popup document is still alive.
    //
    // When the user closes the window by hand, the document is torn down
    // immediately: by the next task its `defaultView` is null and its
    // execution context is detached. Effect cleanups in the popup subtree
    // that touch anything window-level of that document — storage APIs,
    // observers, `getComputedStyle`, a captured `ownerDocument.defaultView` —
    // then fail, e.g. Chromium's "Cache storage isn't available on detached
    // context". `pagehide`/`beforeunload` still run against a live document,
    // so tear the portal down synchronously from there.
    const unmountPortal = (flush: boolean) => {
      if (!store.getSnapshot().container) return
      if (flush) flushSync(() => store.setState({ container: null }))
      else store.setState({ container: null })
    }
    unmountPortalRef.current = unmountPortal

    const onPopupUnload = () => {
      unmountPortal(true)
      // pagehide also fires on navigation; only treat it as a close when the
      // window really is gone a tick later. (The content is unmounted either
      // way — the container element belongs to the outgoing document.)
      setTimeout(() => {
        if (popupWindow.closed) handleExternalClose()
      }, 0)
    }
    popupWindow.addEventListener('pagehide', onPopupUnload)
    popupWindow.addEventListener('beforeunload', onPopupUnload)

    // Belt and braces: some browsers don't fire pagehide reliably for popups.
    const closePoll = window.setInterval(() => {
      if (popupWindow.closed) handleExternalClose()
    }, 250)

    const onOpenerPagehide = () => popupWindow.close()
    window.addEventListener('pagehide', onOpenerPagehide)

    cleanupRef.current = () => {
      window.clearInterval(closePoll)
      window.removeEventListener('pagehide', onOpenerPagehide)
      popupWindow.removeEventListener('pagehide', onPopupUnload)
      popupWindow.removeEventListener('beforeunload', onPopupUnload)
      stopStyleSync?.()
    }

    store.setState({ popupWindow, container, blocked: false })
    opts.onOpen?.(popupWindow)
    return popupWindow
  }, [store, closePopup])

  const close = useCallback(() => closePopup(false, true), [closePopup])

  const toggle = useCallback(() => {
    if (store.getSnapshot().popupWindow) {
      closePopup(false, true)
    } else {
      open()
    }
  }, [store, closePopup, open])

  const focus = useCallback(() => {
    const { popupWindow } = store.getSnapshot()
    if (popupWindow && !popupWindow.closed) popupWindow.focus()
  }, [store])

  // Close the popup when the owning component unmounts — its portal content
  // would unmount anyway, leaving an empty window behind.
  useEffect(() => {
    return () => closePopup(false)
  }, [closePopup])

  return {
    open,
    close,
    toggle,
    focus,
    isOpen: state.popupWindow !== null,
    isBlocked: state.blocked,
    popupWindow: state.popupWindow,
    Popup,
  }
}
