import { useQuery } from '@tanstack/react-query'
import { useMemo, useState } from 'react'
import { usePopupWindow } from '@jielga/react-popup-window'

interface Person {
  id: number
  name: string
  role: string
  city: string
  status: 'active' | 'away'
}

const PEOPLE: Person[] = [
  { id: 1, name: 'Alva Lindqvist', role: 'Engineer', city: 'Stockholm', status: 'active' },
  { id: 2, name: 'Noah Berg', role: 'Designer', city: 'Göteborg', status: 'away' },
  { id: 3, name: 'Maja Ekström', role: 'Product', city: 'Malmö', status: 'active' },
  { id: 4, name: 'Elias Sandberg', role: 'Engineer', city: 'Uppsala', status: 'active' },
  { id: 5, name: 'Vera Holm', role: 'Data', city: 'Lund', status: 'away' },
  { id: 6, name: 'Hugo Nilsson', role: 'Engineer', city: 'Umeå', status: 'active' },
]

// Pretend network call so TanStack Query has something to cache.
async function fetchPeople(): Promise<Person[]> {
  await new Promise((resolve) => setTimeout(resolve, 600))
  return PEOPLE
}

function DataTable() {
  // This useQuery resolves against the QueryClientProvider mounted in the
  // MAIN window's tree — even while the table is rendered in the popup.
  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['people'],
    queryFn: fetchPeople,
  })
  const [sortBy, setSortBy] = useState<keyof Person>('name')
  const [asc, setAsc] = useState(true)

  const rows = useMemo(() => {
    const sorted = [...(data ?? [])].sort((a, b) =>
      String(a[sortBy]).localeCompare(String(b[sortBy])),
    )
    return asc ? sorted : sorted.reverse()
  }, [data, sortBy, asc])

  const sort = (key: keyof Person) => {
    if (key === sortBy) setAsc((v) => !v)
    else {
      setSortBy(key)
      setAsc(true)
    }
  }

  const arrow = (key: keyof Person) => (key === sortBy ? (asc ? ' ↑' : ' ↓') : '')

  return (
    <div>
      <div className="row">
        <button className="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refetching…' : 'Refetch (TanStack Query)'}
        </button>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {dataUpdatedAt ? `updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'loading…'}
        </span>
      </div>
      <table className="data-table" data-testid="people-table">
        <thead>
          <tr>
            <th onClick={() => sort('name')}>Name{arrow('name')}</th>
            <th onClick={() => sort('role')}>Role{arrow('role')}</th>
            <th onClick={() => sort('city')}>City{arrow('city')}</th>
            <th onClick={() => sort('status')}>Status{arrow('status')}</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((person) => (
            <tr key={person.id}>
              <td>{person.name}</td>
              <td>{person.role}</td>
              <td>{person.city}</td>
              <td>
                <span className={`status-pill ${person.status}`}>{person.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export function DataTableExample() {
  const { open, close, focus, isOpen, Popup } = usePopupWindow({
    title: 'People — detached table',
    features: { width: 720, height: 480 },
  })

  const table = <DataTable />

  return (
    <div>
      {isOpen ? (
        <div className="popup-note" data-testid="table-detached-note">
          <p>The table is open in a separate window.</p>
          <div className="row">
            <button onClick={focus}>Focus window</button>
            <button className="secondary" onClick={close} data-testid="bring-back">
              Bring it back
            </button>
          </div>
        </div>
      ) : (
        <div>
          <div className="row">
            <button onClick={open} data-testid="open-table">
              Open table in new window
            </button>
          </div>
          {table}
        </div>
      )}
      <Popup>
        <div className="popup-panel">
          <h2>People</h2>
          {table}
        </div>
      </Popup>
    </div>
  )
}
