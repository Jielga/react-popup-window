import { MantineProvider, useMantineColorScheme } from '@mantine/core'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useEffect, useState } from 'react'
import { CounterExample } from './examples/CounterExample'
import { DataTableExample } from './examples/DataTableExample'
import { PanelsExample } from './examples/PanelsExample'

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
  title: 'People — detached grid',
  features: { width: 720, height: 480 },
})

const peopleGrid = <PeopleGrid /> // TMDataGrid + useQuery() inside

return (
  <>
    {isOpen
      ? <DetachedNote onFocus={focus} onBringBack={close} />
      : <><button onClick={open}>Open grid in new window</button>{peopleGrid}</>}
    <Popup>{peopleGrid}</Popup>
  </>
)`

const PORTAL_TARGET_SNIPPET = `// Mantine portals (menus, popovers, tooltips) mount into the MAIN window's
// document.body — wrong window when the trigger lives in the popup. Portal
// reads default props from the nearest Mantine theme, so: detect the
// document we got mounted into and provide its body as the portal target.
export function SameWindowPortals({ children }) {
  const probeRef = useRef(null)
  const [target, setTarget] = useState(null)
  useEffect(() => setTarget(probeRef.current?.ownerDocument.body ?? null), [])

  const theme = useMemo(() => ({
    components: {
      Portal: Portal.extend({ defaultProps: target ? { target, reuseTargetNode: false } : {} }),
    },
  }), [target])

  return (
    <div ref={probeRef} style={{ display: 'contents' }}>
      <MantineThemeProvider inherit theme={theme}>{children}</MantineThemeProvider>
    </div>
  )
}`

const PANELS_SNIPPET = `const resultsPanelRef = usePanelRef() // react-resizable-panels
const { open, close, focus, isOpen, Popup } = usePopupWindow({ title: 'Search results' })

// Collapse the results panel to a control strip while popped out;
// expand again when the popup closes (button or the user closing it).
useEffect(() => {
  if (isOpen) resultsPanelRef.current?.collapse()
  else resultsPanelRef.current?.expand()
}, [isOpen, resultsPanelRef])

const results = <ResultsGrid filters={filters} /> // filters state stays here

<Panel panelRef={resultsPanelRef} collapsible collapsedSize="56px" minSize="30%">
  {isOpen
    ? <Strip onFocus={focus} onBringBack={close} />
    : <><button onClick={open}>Open in new window ↗</button>{results}</>}
</Panel>
// …
<Popup>{results}</Popup>`

function ThemeToggle() {
  const [dark, setDark] = useState(false)
  const { setColorScheme } = useMantineColorScheme()
  useEffect(() => {
    // Our docs CSS keys off html.dark; Mantine keys off its
    // data-mantine-color-scheme attribute. Both are root attributes, so the
    // popup follows automatically — the library keeps class and data-*
    // attributes on <html>/<body> in sync.
    document.documentElement.classList.toggle('dark', dark)
    setColorScheme(dark ? 'dark' : 'light')
  }, [dark, setColorScheme])
  return (
    <button className="secondary theme-toggle" onClick={() => setDark((d) => !d)}>
      {dark ? 'Light mode' : 'Dark mode'}
    </button>
  )
}

export function App() {
  return (
    <MantineProvider defaultColorScheme="light">
      <AppInner />
    </MantineProvider>
  )
}

function AppInner() {
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
            <h3>Detached data grid (TMDataGrid + TanStack Query)</h3>
            <p>
              A <a href="https://github.com/Jielga/TMDataGrid">@jielga/tmdatagrid</a> grid getting
              its data from <code>useQuery</code>. Both the <code>QueryClientProvider</code> and the{' '}
              <code>MantineProvider</code> the grid requires are mounted once, in this window's tree
              — the popup content reaches them through normal React context, because the portal
              keeps the content in the same tree. While detached, the main window hides the grid.
            </p>
            <div className="demo">
              <DataTableExample />
            </div>
            <pre>
              <code>{TABLE_SNIPPET}</code>
            </pre>
          </div>

          <div className="card">
            <h3>Resizable panels with a pop-out results grid</h3>
            <p>
              Built with{' '}
              <a href="https://github.com/bvaughn/react-resizable-panels">react-resizable-panels</a>{' '}
              and <a href="https://github.com/Jielga/TMDataGrid">@jielga/tmdatagrid</a>: the left
              panel holds the query form, the right panel a grid with 400 virtualized rows —
              sortable, resizable, reorderable and pinnable columns, column filters, row selection,
              and a drag-selectable cell range with Ctrl+C. Popping the results out collapses the
              panel to a control strip (focus / bring back) — and because the filter state lives in
              the main window, editing filters updates the popped-out grid live.
            </p>
            <div className="demo">
              <PanelsExample />
            </div>
            <pre>
              <code>{PANELS_SNIPPET}</code>
            </pre>
          </div>

          <div className="card">
            <h3>UI libraries that portal to document.body</h3>
            <p>
              Component libraries render menus, popovers and tooltips through portals into{' '}
              <code>document.body</code> — which is the <em>main</em> window's body, even for
              components inside the popup. Mantine reads portal defaults from its theme, so a small
              wrapper redirects portals to whichever document the content is rendered in. The grids
              above use it — open a column menu in a popped-out grid and it stays in the popup.
            </p>
            <pre>
              <code>{PORTAL_TARGET_SNIPPET}</code>
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
            <h3>No messaging needed</h3>
            <p>
              There is no message channel in this library — on purpose. Popup content stays in your
              component tree and your JS realm, so props, state and context <em>are</em> the
              communication. If you ever host non-React scripts inside the popup document itself,
              the raw <code>popupWindow</code> handle is the escape hatch for{' '}
              <code>postMessage</code>.
            </p>
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
            </tbody>
          </table>
          <p style={{ marginTop: '0.9rem' }}>
            Options: <code>title</code>, <code>name</code>, <code>features</code> (width/height/…,
            default <code>{'{ popup: true, width: 640, height: 480 }'}</code>), <code>center</code>,{' '}
            <code>copyStyles</code>, <code>onOpen</code>, <code>onClose</code>,{' '}
            <code>onBlocked</code>. Full reference in the{' '}
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
