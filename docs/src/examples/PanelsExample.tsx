import { useQuery } from '@tanstack/react-query'
import { useEffect, useMemo, useState } from 'react'
import { Group, Panel, Separator, usePanelRef } from 'react-resizable-panels'
import { usePopupWindow } from '@jielga/react-popup-window'

interface Row {
  id: number
  name: string
  role: string
  city: string
  status: 'active' | 'away'
}

const DIRECTORY: Row[] = [
  { id: 1, name: 'Alva Lindqvist', role: 'Engineer', city: 'Stockholm', status: 'active' },
  { id: 2, name: 'Noah Berg', role: 'Designer', city: 'Göteborg', status: 'away' },
  { id: 3, name: 'Maja Ekström', role: 'Product', city: 'Malmö', status: 'active' },
  { id: 4, name: 'Elias Sandberg', role: 'Engineer', city: 'Uppsala', status: 'active' },
  { id: 5, name: 'Vera Holm', role: 'Data', city: 'Lund', status: 'away' },
  { id: 6, name: 'Hugo Nilsson', role: 'Engineer', city: 'Umeå', status: 'active' },
  { id: 7, name: 'Stella Åberg', role: 'Designer', city: 'Örebro', status: 'active' },
  { id: 8, name: 'Liam Forsberg', role: 'Product', city: 'Linköping', status: 'away' },
  { id: 9, name: 'Ines Dahl', role: 'Data', city: 'Västerås', status: 'active' },
  { id: 10, name: 'Oscar Lundgren', role: 'Engineer', city: 'Helsingborg', status: 'active' },
  { id: 11, name: 'Selma Wikström', role: 'Designer', city: 'Norrköping', status: 'away' },
  { id: 12, name: 'Adam Sjöberg', role: 'Engineer', city: 'Jönköping', status: 'active' },
]

const ROLES = ['Engineer', 'Designer', 'Product', 'Data']

async function fetchDirectory(): Promise<Row[]> {
  await new Promise((resolve) => setTimeout(resolve, 400))
  return DIRECTORY
}

interface Filters {
  search: string
  role: string
  onlyActive: boolean
}

function FiltersForm({
  filters,
  onChange,
}: {
  filters: Filters
  onChange: (filters: Filters) => void
}) {
  return (
    <form className="filters-form" onSubmit={(e) => e.preventDefault()}>
      <h4>Query</h4>
      <label>
        Search
        <input
          type="text"
          placeholder="name or city…"
          value={filters.search}
          onChange={(e) => onChange({ ...filters, search: e.target.value })}
          data-testid="filter-search"
        />
      </label>
      <label>
        Role
        <select
          value={filters.role}
          onChange={(e) => onChange({ ...filters, role: e.target.value })}
          data-testid="filter-role"
        >
          <option value="all">All roles</option>
          {ROLES.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
        </select>
      </label>
      <label className="filters-checkbox">
        <input
          type="checkbox"
          checked={filters.onlyActive}
          onChange={(e) => onChange({ ...filters, onlyActive: e.target.checked })}
          data-testid="filter-active"
        />
        Only active
      </label>
    </form>
  )
}

function ResultsTable({ filters }: { filters: Filters }) {
  const { data, isLoading } = useQuery({ queryKey: ['directory'], queryFn: fetchDirectory })

  const rows = useMemo(() => {
    const needle = filters.search.trim().toLowerCase()
    return (data ?? []).filter(
      (row) =>
        (!needle ||
          row.name.toLowerCase().includes(needle) ||
          row.city.toLowerCase().includes(needle)) &&
        (filters.role === 'all' || row.role === filters.role) &&
        (!filters.onlyActive || row.status === 'active'),
    )
  }, [data, filters])

  if (isLoading) return <p className="muted">Loading…</p>

  return (
    <div>
      <p className="muted" data-testid="results-count">
        {rows.length} of {data?.length ?? 0} people
      </p>
      <table className="data-table" data-testid="results-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Role</th>
            <th>City</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.id}>
              <td>{row.name}</td>
              <td>{row.role}</td>
              <td>{row.city}</td>
              <td>
                <span className={`status-pill ${row.status}`}>{row.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function PanelsExample() {
  const [filters, setFilters] = useState<Filters>({ search: '', role: 'all', onlyActive: false })
  const resultsPanelRef = usePanelRef()

  const { open, close, focus, isOpen, Popup } = usePopupWindow({
    title: 'Search results',
    features: { width: 760, height: 540 },
  })

  // Collapse the results panel to a narrow control strip while its content
  // lives in the popup; expand it again when the popup closes (via the strip
  // button OR the user closing the window by hand — isOpen tracks both).
  useEffect(() => {
    const panel = resultsPanelRef.current
    if (!panel) return
    if (isOpen) panel.collapse()
    else panel.expand()
  }, [isOpen, resultsPanelRef])

  // One element, three possible homes: inline in the right panel, or in the
  // popup. The filter state lives here in the main window either way.
  const results = <ResultsTable filters={filters} />

  return (
    <div>
      <Group orientation="horizontal" className="panels-group">
        <Panel defaultSize="34%" minSize="220px" className="panel-side panel-filters">
          <FiltersForm filters={filters} onChange={setFilters} />
        </Panel>
        <Separator className="panel-separator" />
        <Panel
          panelRef={resultsPanelRef}
          collapsible
          collapsedSize="56px"
          minSize="30%"
          className="panel-side panel-results"
        >
          {isOpen ? (
            <div className="panel-strip" data-testid="panel-strip">
              <button title="Focus the window" aria-label="Focus the window" onClick={focus}>
                ⧉
              </button>
              <button
                className="secondary"
                title="Bring the results back"
                aria-label="Bring the results back"
                onClick={close}
                data-testid="panel-bring-back"
              >
                ✕
              </button>
              <span className="panel-strip-label">Results in separate window</span>
            </div>
          ) : (
            <div className="panel-results-inner">
              <div className="row panel-results-header">
                <h4>Results</h4>
                <button className="secondary" onClick={open} data-testid="open-results">
                  Open in new window ↗
                </button>
              </div>
              {results}
            </div>
          )}
        </Panel>
      </Group>
      <Popup>
        <div className="popup-panel">
          <h2>Search results</h2>
          <p className="muted">
            The query form stays in the main window — edit the filters there and watch this table
            update live.
          </p>
          {results}
        </div>
      </Popup>
    </div>
  )
}
