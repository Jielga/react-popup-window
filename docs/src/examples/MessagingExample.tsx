import { useEffect, useState } from 'react'
import { usePopupWindow } from '@jielga/react-popup-window'

/**
 * With portal rendering you usually don't need messaging at all — shared
 * state covers it. The message channel matters when the popup hosts
 * non-React code, or you want to talk to `window` listeners in the popup
 * document itself. This demo exercises both directions over `postMessage`.
 */
export function MessagingExample() {
  const [log, setLog] = useState<string[]>([])
  const popup = usePopupWindow({
    title: 'Messaging demo',
    features: { width: 380, height: 320 },
  })
  const { open, isOpen, popupWindow, sendMessage, onMessage, Popup } = popup

  // Messages posted from the popup window to the opener.
  useEffect(
    () =>
      onMessage((data) => {
        setLog((entries) => [...entries, `popup → main: ${JSON.stringify(data)}`])
      }),
    [onMessage],
  )

  return (
    <div>
      <div className="row">
        <button onClick={open} data-testid="open-messaging">
          Open popup
        </button>
        <button
          className="secondary"
          disabled={!isOpen}
          onClick={() => sendMessage({ greeting: 'hello from main', at: Date.now() })}
          data-testid="send-to-popup"
        >
          sendMessage → popup
        </button>
      </div>
      <div className="log" data-testid="main-log">
        {log.length === 0 ? <div className="muted">— no messages yet —</div> : null}
        {log.map((entry, i) => (
          <div key={i}>{entry}</div>
        ))}
      </div>
      <Popup>
        <PopupContent popupWindow={popupWindow} />
      </Popup>
    </div>
  )
}

interface PopupHostedApi {
  __replyToOpener?: (data: unknown) => void
}

function PopupContent({ popupWindow }: { popupWindow: Window | null }) {
  const [received, setReceived] = useState<string[]>([])

  // This component's closure `window` is the MAIN window (portals don't move
  // the JS realm) — to hear messages addressed to the popup window, listen
  // on the popup window object itself.
  useEffect(() => {
    if (!popupWindow) return
    const handler = (event: MessageEvent) => {
      setReceived((entries) => [...entries, JSON.stringify(event.data)])
    }
    popupWindow.addEventListener('message', handler)
    return () => popupWindow.removeEventListener('message', handler)
  }, [popupWindow])

  // Emulate popup-hosted (non-React) code: a script living in the popup
  // document. Messages must be posted from the popup's own realm for the
  // browser to stamp them with the popup as `event.source` — which is what
  // onMessage() filters on. Calling opener.postMessage from a portal event
  // handler would post *as the main window* instead.
  useEffect(() => {
    if (!popupWindow) return
    const script = popupWindow.document.createElement('script')
    script.textContent =
      "window.__replyToOpener = (data) => window.opener.postMessage(data, '*');"
    popupWindow.document.head.appendChild(script)
  }, [popupWindow])

  return (
    <div className="popup-panel">
      <h2>Messaging</h2>
      <button
        onClick={() =>
          (popupWindow as PopupHostedApi | null)?.__replyToOpener?.({
            reply: 'hi from the popup',
          })
        }
        data-testid="send-to-main"
      >
        postMessage → main window
      </button>
      <div className="log" data-testid="popup-log">
        {received.length === 0 ? <div className="muted">— nothing received —</div> : null}
        {received.map((entry, i) => (
          <div key={i}>main → popup: {entry}</div>
        ))}
      </div>
    </div>
  )
}
