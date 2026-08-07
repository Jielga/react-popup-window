import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CounterExample } from './examples/CounterExample'
import { DataTableExample } from './examples/DataTableExample'
import { MessagingExample } from './examples/MessagingExample'

const queryClient = new QueryClient()

const QUICK_START = `import { usePopupWindow } from '@jielga/react-popup-window'

function Dashboard() {
  const { open, close, isOpen, Popup } = usePopupWindow({
    title: 'Detached panel',
    features: { width: 640, height: 480 },
  })

  return (
    <>
      <button onClick={open}>Open in new window</button>
      <Popup>
        {/* Rendered inside the popup window, but still part of THIS
            component tree: state, context and events keep working. */}
        <MyPanel />
      </Popup>
    </>
  )
}`

const TABLE_SNIPPET = `const { open, close, focus, isOpen, Popup } = usePopupWindow({
  title: 'People — detached table',
  features: { width: 720, height: 480 },
})

const table = <DataTable /> // uses useQuery() internally

return (
  <>
    {isOpen
      ? <DetachedNote onFocus={focus} onBringBack={close} />
      : <><button onClick={open}>Open table in new window</button>{table}</>}
    <Popup>{table}</Popup>
  </>
)`

const MESSAGING_SNIPPET = `const { sendMessage, onMessage, popupWindow } = usePopupWindow()

// main ← popup
useEffect(() => onMessage((data) => console.log(data)), [onMessage])

// main → popup
sendMessage({ hello: 'popup' })

// inside popup-hosted code: window.opener.postMessage(data, origin)`

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  useEffect(() => {
    document.documentElement.classList.toggle('dark', dark)
  }, [dark])
  return (
    <button className="secondary theme-toggle" onClick={() => setDark((d) => !d)}>
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <div className="container">
        <header className="site-header">
          <h1>@jielga/react-popup-window</h1>
          <p className="tagline">
            A React hook that opens part of your UI in a separate browser window — rendered with a
            portal so state, context and event handlers keep working across windows.
          </p>
          <div className="header-links">
            <a href="https://github.com/jielga/react-popup-window">GitHub</a>
            <a href="https://www.npmjs.com/package/@jielga/react-popup-window">npm</a>
            <ThemeToggle />
          </div>
        </header>

        <section>
          <h2>Install</h2>
          <pre>
            <code>npm install @jielga/react-popup-window</code>
          </pre>
          <p className="muted">Requires React 19.2+.</p>
        </section>

        <section>
          <h2>Quick start</h2>
          <pre>
            <code>{QUICK_START}</code>
          </pre>
        </section>

        <section>
          <h2>Examples</h2>
          <p className="muted">
            Everything below runs live on this page. Tip: toggle dark mode above with a popup open —
            the popup follows, because stylesheets and root <code>class</code> attributes are kept
            in sync.
          </p>

          <div className="card">
            <h3>Detached data table (TanStack Query)</h3>
            <p>
              The table gets its data from <code>useQuery</code>. The{' '}
              <code>QueryClientProvider</code> is mounted once, in this window's tree — the popup
              content reaches it through normal React context, because the portal keeps the content
              in the same tree. While detached, the main window hides the table.
            </p>
            <div className="demo">
              <DataTableExample />
            </div>
            <pre>
              <code>{TABLE_SNIPPET}</code>
            </pre>
          </div>

          <div className="card">
            <h3>Shared state &amp; events</h3>
            <p>
              A counter whose state lives in the main window. The <code>+1</code> button rendered in
              the popup updates it directly — no messaging, no syncing.
            </p>
            <div className="demo">
              <CounterExample />
            </div>
          </div>

          <div className="card">
            <h3>Messaging</h3>
            <p>
              For popup-hosted non-React code (or just explicit channels), both windows can talk
              over <code>postMessage</code>.
            </p>
            <div className="demo">
              <MessagingExample />
            </div>
            <pre>
              <code>{MESSAGING_SNIPPET}</code>
            </pre>
          </div>
        </section>

        <section>
          <h2>API</h2>
          <p>
            <code>usePopupWindow(options?)</code> returns:
          </p>
          <table className="api-table">
            <thead>
              <tr>
                <th>Member</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td>
                  <code>Popup</code>
                </td>
                <td>
                  Portal component (stable identity). Renders children into the popup window while
                  open, nothing otherwise.
                </td>
              </tr>
              <tr>
                <td>
                  <code>open()</code>
                </td>
                <td>
                  Opens the popup (focuses if already open). Call from a user gesture or the browser
                  will block it. Returns the <code>Window</code> or <code>null</code>.
                </td>
              </tr>
              <tr>
                <td>
                  <code>close()</code> / <code>toggle()</code> / <code>focus()</code>
                </td>
                <td>Window controls.</td>
              </tr>
              <tr>
                <td>
                  <code>isOpen</code> / <code>isBlocked</code> / <code>popupWindow</code>
                </td>
                <td>
                  Reactive state: open flag, popup-blocked flag, and the raw <code>Window</code>{' '}
                  while open.
                </td>
              </tr>
              <tr>
                <td>
                  <code>sendMessage(data)</code>
                </td>
                <td>
                  <code>postMessage</code> to the popup window (<code>targetOrigin</code> option,
                  default <code>'*'</code>).
                </td>
              </tr>
              <tr>
                <td>
                  <code>onMessage(handler)</code>
                </td>
                <td>
                  Subscribe to messages posted from the popup to the opener. Returns an unsubscribe
                  function.
                </td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: '0.9rem' }}>
            Options: <code>title</code>, <code>name</code>, <code>features</code> (width/height/…,
            default <code>{'{ popup: true, width: 640, height: 480 }'}</code>), <code>center</code>,{' '}
            <code>copyStyles</code>, <code>targetOrigin</code>, <code>onOpen</code>,{' '}
            <code>onClose</code>, <code>onBlocked</code>. Full reference in the{' '}
            <a href="https://github.com/jielga/react-popup-window#api">README</a>.
          </p>
        </section>

        <section>
          <h2>Good to know</h2>
          <ul>
            <li>
              Browsers no longer allow hiding the address bar completely — <code>popup: true</code>{' '}
              (the default) gives the most minimal chrome the platform allows.
            </li>
            <li>
              <code>open()</code> must run in response to a user gesture, otherwise popup blockers
              step in (<code>isBlocked</code> tells you when they did).
            </li>
            <li>
              The popup closes automatically when the component that owns the hook unmounts, and
              when the main window unloads.
            </li>
            <li>
              Popup content remounts when moving between windows — lift state you want to keep (as
              the examples here do) into the owning component or a store.
            </li>
          </ul>
        </section>

        <footer className="site-footer">
          MIT © jielga —{' '}
          <a href="https://github.com/jielga/react-popup-window">
            github.com/jielga/react-popup-window
          </a>
        </footer>
      </div>
    </QueryClientProvider>
  )
}
