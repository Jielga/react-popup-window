import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react'
import type { FC } from 'react'
import { createPortal } from 'react-dom'
import { copyStyles } from './copyStyles'
import type {
  PopupMessageHandler,
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

  const messageHandlersRef = useRef(new Set<PopupMessageHandler<never>>())
  const cleanupRef = useRef<(() => void) | null>(null)

  const state = useSyncExternalStore(store.subscribe, store.getSnapshot, store.getServerSnapshot)

  // `userClosed` is true when the window was closed outside our control
  // (user hit the close button, opener unloaded) — then we must not touch it.
  const closePopup = useCallback(
    (userClosed: boolean) => {
      const { popupWindow } = store.getSnapshot()
      cleanupRef.current?.()
      cleanupRef.current = null
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
    const onPopupPagehide = () => {
      // pagehide also fires on navigation; only treat it as a close when the
      // window really is gone a tick later.
      setTimeout(() => {
        if (popupWindow.closed) handleExternalClose()
      }, 0)
    }
    popupWindow.addEventListener('pagehide', onPopupPagehide)

    // Belt and braces: some browsers don't fire pagehide reliably for popups.
    const closePoll = window.setInterval(() => {
      if (popupWindow.closed) handleExternalClose()
    }, 250)

    const onOpenerPagehide = () => popupWindow.close()
    window.addEventListener('pagehide', onOpenerPagehide)

    const onMessage = (event: MessageEvent) => {
      if (event.source !== popupWindow) return
      for (const handler of messageHandlersRef.current) {
        ;(handler as PopupMessageHandler)(event.data, event)
      }
    }
    window.addEventListener('message', onMessage)

    cleanupRef.current = () => {
      window.clearInterval(closePoll)
      window.removeEventListener('pagehide', onOpenerPagehide)
      window.removeEventListener('message', onMessage)
      popupWindow.removeEventListener('pagehide', onPopupPagehide)
      stopStyleSync?.()
    }

    store.setState({ popupWindow, container, blocked: false })
    opts.onOpen?.(popupWindow)
    return popupWindow
  }, [store, closePopup])

  const close = useCallback(() => closePopup(false), [closePopup])

  const toggle = useCallback(() => {
    if (store.getSnapshot().popupWindow) {
      closePopup(false)
    } else {
      open()
    }
  }, [store, closePopup, open])

  const focus = useCallback(() => {
    const { popupWindow } = store.getSnapshot()
    if (popupWindow && !popupWindow.closed) popupWindow.focus()
  }, [store])

  const sendMessage = useCallback(
    (data: unknown): boolean => {
      const { popupWindow } = store.getSnapshot()
      if (!popupWindow || popupWindow.closed) return false
      popupWindow.postMessage(data, optionsRef.current.targetOrigin ?? '*')
      return true
    },
    [store],
  )

  const onMessage = useCallback(<T,>(handler: PopupMessageHandler<T>): (() => void) => {
    const handlers = messageHandlersRef.current
    handlers.add(handler as PopupMessageHandler<never>)
    return () => handlers.delete(handler as PopupMessageHandler<never>)
  }, [])

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
    sendMessage,
    onMessage,
  }
}
