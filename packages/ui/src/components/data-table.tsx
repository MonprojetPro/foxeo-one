'use client'

import * as React from 'react'
import { cn } from '@monprojetpro/utils'

export type SortDirection = 'asc' | 'desc'

export interface ColumnDef<TData> {
  id: string
  header: string | React.ReactNode
  accessorKey?: keyof TData
  cell?: (row: TData) => React.ReactNode
  sortable?: boolean
  className?: string
}

export interface DataTableProps<TData> {
  data: TData[]
  columns: ColumnDef<TData>[]
  className?: string
  emptyMessage?: string
  onRowClick?: (row: TData) => void
  pageSize?: number
}

export function DataTable<TData extends { id: string }>({
  data,
  columns,
  className,
  emptyMessage = 'Aucune donnée disponible',
  onRowClick,
  pageSize = 0,
}: DataTableProps<TData>) {
  const [sortColumn, setSortColumn] = React.useState<string | null>(null)
  const [sortDirection, setSortDirection] = React.useState<SortDirection>('asc')
  const [currentPage, setCurrentPage] = React.useState(0)

  // Reset page when data changes
  React.useEffect(() => {
    setCurrentPage(0)
  }, [data.length])

  const handleSort = (column: ColumnDef<TData>) => {
    if (!column.sortable || !column.accessorKey) return

    if (sortColumn === column.id) {
      setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortColumn(column.id)
      setSortDirection('asc')
    }
  }

  const getCellValue = (row: TData, column: ColumnDef<TData>) => {
    if (column.cell) {
      return column.cell(row)
    }
    if (column.accessorKey) {
      return String(row[column.accessorKey])
    }
    return null
  }

  const getRawValue = (row: TData, column: ColumnDef<TData>): string => {
    if (column.accessorKey) {
      const val = row[column.accessorKey]
      return val != null ? String(val) : ''
    }
    return ''
  }

  // Sort data
  const sortedData = React.useMemo(() => {
    if (!sortColumn) return data

    const column = columns.find((c) => c.id === sortColumn)
    if (!column?.accessorKey) return data

    return [...data].sort((a, b) => {
      const aVal = getRawValue(a, column)
      const bVal = getRawValue(b, column)
      const cmp = aVal.localeCompare(bVal, 'fr')
      return sortDirection === 'asc' ? cmp : -cmp
    })
  }, [data, sortColumn, sortDirection, columns])

  // Paginate data
  const isPaginated = pageSize > 0
  const totalPages = isPaginated ? Math.ceil(sortedData.length / pageSize) : 1
  const paginatedData = isPaginated
    ? sortedData.slice(currentPage * pageSize, (currentPage + 1) * pageSize)
    : sortedData

  const renderSortIndicator = (column: ColumnDef<TData>) => {
    if (!column.sortable) return null
    if (sortColumn !== column.id) return <span className="ml-1 text-muted-foreground/40">↕</span>
    return (
      <span className="ml-1">
        {sortDirection === 'asc' ? '↑' : '↓'}
      </span>
    )
  }

  return (
    <div className={cn('relative w-full overflow-auto', className)}>
      <table className={cn('w-full caption-bottom text-sm')}>
        <thead className="[&_tr]:border-b">
          <tr className="border-b transition-colors hover:bg-muted/50">
            {columns.map((column) => (
              <th
                key={column.id}
                className={cn(
                  'h-12 px-4 text-left align-middle font-medium text-muted-foreground',
                  column.sortable && 'cursor-pointer select-none hover:text-foreground',
                  column.className
                )}
                onClick={() => handleSort(column)}
              >
                <span className="inline-flex items-center">
                  {column.header}
                  {renderSortIndicator(column)}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="[&_tr:last-child]:border-0">
          {paginatedData.length === 0 ? (
            <tr>
              <td
                colSpan={columns.length}
                className="h-24 text-center text-muted-foreground"
              >
                {emptyMessage}
              </td>
            </tr>
          ) : (
            paginatedData.map((row) => (
              <tr
                key={row.id}
                className={cn(
                  'border-b transition-colors hover:bg-muted/50',
                  onRowClick && 'cursor-pointer'
                )}
                onClick={() => onRowClick?.(row)}
              >
                {columns.map((column) => (
                  <td
                    key={column.id}
                    className={cn('p-4 align-middle', column.className)}
                  >
                    {getCellValue(row, column)}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>

      {isPaginated && totalPages > 1 && (
        <div className="flex items-center justify-between border-t px-4 py-3">
          <span className="text-sm text-muted-foreground">
            {sortedData.length} résultat{sortedData.length > 1 ? 's' : ''}
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              className="rounded px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted"
              disabled={currentPage === 0}
              onClick={() => setCurrentPage((p) => p - 1)}
            >
              Précédent
            </button>
            <span className="text-sm text-muted-foreground">
              {currentPage + 1} / {totalPages}
            </span>
            <button
              type="button"
              className="rounded px-3 py-1 text-sm disabled:opacity-50 hover:bg-muted"
              disabled={currentPage >= totalPages - 1}
              onClick={() => setCurrentPage((p) => p + 1)}
            >
              Suivant
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

DataTable.displayName = 'DataTable'
