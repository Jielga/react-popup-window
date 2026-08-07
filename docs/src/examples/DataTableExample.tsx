import { Badge } from '@mantine/core'
import { useQuery } from '@tanstack/react-query'
import {
  createTMDataGridColumnHelper,
  TMDataGrid,
  useTMDataGrid,
} from '@jielga/tmdatagrid'
import { usePopupWindow } from '@jielga/react-popup-window'
import { fetchPeople } from './people'
import type { Person } from './people'
import { SameWindowPortals } from './SameWindowPortals'

const columnHelper = createTMDataGridColumnHelper<Person>()

const columns = columnHelper.columns([
  columnHelper.accessor('name', { header: 'Name', minSize: 150, meta: { flex: 1.3 } }),
  columnHelper.accessor('role', { header: 'Role', minSize: 100 }),
  columnHelper.accessor('city', { header: 'City', minSize: 110 }),
  columnHelper.accessor('status', {
    header: 'Status',
    minSize: 100,
    cell: (info) => (
      <Badge variant="light" size="sm" color={info.getValue() === 'active' ? 'green' : 'gray'}>
        {info.getValue()}
      </Badge>
    ),
  }),
])

const EMPTY: Person[] = []

function PeopleGrid() {
  // Resolves against the QueryClientProvider mounted in the MAIN window's
  // tree — even while the grid is rendered in the popup. The same goes for
  // the MantineProvider the grid requires.
  const { data, isFetching, refetch, dataUpdatedAt } = useQuery({
    queryKey: ['people', 12],
    queryFn: () => fetchPeople(12),
  })

  const grid = useTMDataGrid({
    data: data ?? EMPTY,
    columns,
    getRowId: (row) => String(row.id),
    enableRowSelection: false,
    meta: { loading: !data },
  })

  return (
    <div className="grid-host" data-testid="people-grid">
      <div className="row grid-query-row">
        <button className="secondary" onClick={() => refetch()} disabled={isFetching}>
          {isFetching ? 'Refetching…' : 'Refetch (TanStack Query)'}
        </button>
        <span className="muted" style={{ fontSize: '0.8rem' }}>
          {dataUpdatedAt ? `updated ${new Date(dataUpdatedAt).toLocaleTimeString()}` : 'loading…'}
        </span>
      </div>
      <SameWindowPortals>
        <TMDataGrid {...grid} size="sm" style={{ flex: 1, minHeight: 0 }}>
          <TMDataGrid.Toolbar>
            <TMDataGrid.SummaryCount />
            <TMDataGrid.Spacer />
            <TMDataGrid.ColumnsButton />
          </TMDataGrid.Toolbar>
          <TMDataGrid.Table<Person> />
        </TMDataGrid>
      </SameWindowPortals>
    </div>
  )
}

export function DataTableExample() {
  const { open, close, focus, isOpen, Popup } = usePopupWindow({
    title: 'People — detached grid',
    features: { width: 720, height: 480 },
  })

  const peopleGrid = <PeopleGrid />

  return (
    <div>
      {isOpen ? (
        <div className="popup-note" data-testid="table-detached-note">
          <p>The grid is open in a separate window.</p>
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
              Open grid in new window
            </button>
          </div>
          {peopleGrid}
        </div>
      )}
      <Popup>
        <div className="popup-grid-panel">{peopleGrid}</div>
      </Popup>
    </div>
  )
}
