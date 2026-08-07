import { MantineThemeProvider, Portal } from '@mantine/core'
import { useEffect, useMemo, useRef, useState } from 'react'
import type { ReactNode } from 'react'

/**
 * Keep Mantine portals (menus, popovers, tooltips) in the window their
 * trigger is rendered in.
 *
 * Mantine's `Portal` mounts into the global `document.body` — the MAIN
 * window's body — even when the component sits in a popup document. A column
 * menu opened from a grid inside the popup would appear in the main window.
 *
 * The fix: `Portal` reads its default props from the nearest Mantine theme,
 * so this wrapper detects which document it got mounted into (via a ref) and
 * provides that document's body as the default portal target. Rendered
 * inline it resolves to the main body (the default behaviour); rendered
 * through `<Popup>` it resolves to the popup body. `MantineThemeProvider`
 * with `inherit` only overrides theme context — no duplicate CSS variables.
 */
export function SameWindowPortals({ children }: { children: ReactNode }) {
  const probeRef = useRef<HTMLDivElement>(null)
  const [target, setTarget] = useState<HTMLElement | null>(null)

  useEffect(() => {
    setTarget(probeRef.current?.ownerDocument.body ?? null)
  }, [])

  const theme = useMemo(
    () => ({
      components: {
        Portal: Portal.extend({ defaultProps: target ? { target, reuseTargetNode: false } : {} }),
      },
    }),
    [target],
  )

  return (
    <div ref={probeRef} style={{ display: 'contents' }}>
      <MantineThemeProvider inherit theme={theme}>
        {children}
      </MantineThemeProvider>
    </div>
  )
}
