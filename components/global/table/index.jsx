"use client";

import React, { useState, useMemo, useCallback } from "react";
import { cn } from "@/lib/utils";
import { getCellValue, filterTableData, sortTableData, getRowIdentifier } from "./helpers";
import {
  DENSITY_CELL_PADDING,
  DENSITY_HEADER_PADDING,
  DEFAULT_PAGE_SIZE_OPTIONS,
  DEFAULT_PAGE_SIZE,
} from "./helpers/constants";
import {
  TableContainer,
  TableScrollArea,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
  TableSkeleton,
  TableEmpty,
  TableError,
  TablePagination,
  TableMobileCards,
  TableMobileCardSkeleton,
} from "./fragments";

export {
  TableContainer,
  TableScrollArea,
  Table as TablePrimitive,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  TableToolbar,
  TableSkeleton,
  TableEmpty,
  TableError,
  TablePagination,
  TableMobileCards,
  TableMobileCardSkeleton,
} from "./fragments";

export * from "./helpers";
export * from "./helpers/constants";

export { DataTable, DataTable as Table };

export default function DataTable({
  columns = [],
  data = [],
  rows,
  isLoading = false,
  error = null,
  onRetry,
  emptyState,
  renderMobileCard,
  enableMobileCards = true,
  mobileCardClassName,

  title,
  subtitle,
  actions,
  searchActions,
  hideToolbar = false,
  hideTitleOnMobile = false,
  searchable = false,
  searchPlaceholder = "Search records...",
  searchQuery: controlledSearchQuery,
  searchValue: controlledSearchValue,
  onSearchChange: controlledOnSearchChange,
  searchKeys = [],
  filterTabs,
  activeFilterTab,
  onFilterTabChange,

  selectable = false,
  selectedRows = [],
  onSelectionChange,
  selectionActions,

  sortable = true,
  defaultSort = null,
  onSort,
  manualSorting,
  pagination = false,
  hidePagination = false,
  pageSize = DEFAULT_PAGE_SIZE,
  pageSizeOptions = DEFAULT_PAGE_SIZE_OPTIONS,
  currentPage: controlledPage,
  page,
  totalItems: controlledTotalItems,
  totalCount,
  total,
  onPageChange: controlledOnPageChange,
  onPageSizeChange: controlledOnPageSizeChange,
  manualPagination,
  manualFiltering,

  density = "default",
  maxHeight,
  onRowClick,
  rowKey = "_id",
  containerClassName,
  tableClassName,
  headerClassName,
  rowClassName,
  cellClassName,
  footer,
}) {
  const sourceData = useMemo(() => rows || data || [], [rows, data]);
  const [internalSearchQuery, setInternalSearchQuery] = useState("");
  const activeSearchQuery =
    controlledSearchQuery !== undefined
      ? controlledSearchQuery
      : controlledSearchValue !== undefined
      ? controlledSearchValue
      : internalSearchQuery;
  const isServerFiltered =
    manualFiltering !== undefined ? manualFiltering : Boolean(controlledOnSearchChange);

  const [currentSort, setCurrentSort] = useState(defaultSort || { key: null, direction: null });

  const [internalPage, setInternalPage] = useState(1);
  const [internalPageSize, setInternalPageSize] = useState(pageSize || DEFAULT_PAGE_SIZE);

  const activePage =
    controlledPage !== undefined ? controlledPage : page !== undefined ? page : internalPage;
  const activePageSize = controlledOnPageSizeChange ? pageSize : internalPageSize;
  const activeTotalCount =
    controlledTotalItems !== undefined
      ? controlledTotalItems
      : totalCount !== undefined
      ? totalCount
      : total !== undefined
      ? total
      : undefined;

  const [internalSelected, setInternalSelected] = useState(new Set(selectedRows));
  const getRowId = useCallback((row, idx) => getRowIdentifier(row, idx, rowKey), [rowKey]);

  const handleSort = (col) => {
    if (!col.sortable && !sortable) return;
    const colKey = col.sortKey || col.key || col.accessorKey || col.field;
    if (!colKey) return;

    let nextDirection = "asc";
    if (currentSort.key === colKey) {
      if (currentSort.direction === "asc") nextDirection = "desc";
      else if (currentSort.direction === "desc") nextDirection = null;
    }

    const nextSort = { key: nextDirection ? colKey : null, direction: nextDirection };
    setCurrentSort(nextSort);
    if (onSort) onSort(nextSort);
  };

  const filteredData = useMemo(() => {
    if (isServerFiltered) return sourceData;
    return filterTableData(sourceData, activeSearchQuery, searchKeys, columns);
  }, [sourceData, activeSearchQuery, searchKeys, columns, isServerFiltered]);

  const sortedData = useMemo(() => {
    return sortTableData(filteredData, currentSort, onSort);
  }, [filteredData, currentSort, onSort]);

  const paginatedData = useMemo(() => {
    if (!pagination) return sortedData;
    const start = (activePage - 1) * activePageSize;
    return sortedData.slice(start, start + activePageSize);
  }, [sortedData, pagination, activePage, activePageSize]);

  const visibleColumns = useMemo(
    () => columns.filter((col) => !col.hidden),
    [columns]
  );

  const densityHeaderClass = DENSITY_HEADER_PADDING[density] || DENSITY_HEADER_PADDING.default;
  const densityCellClass = DENSITY_CELL_PADDING[density] || DENSITY_CELL_PADDING.default;

  return (
    <div className="w-full space-y-3">
      {/* 1. Table Toolbar: Title, Badges, Search & Filter Tabs */}
      {!hideToolbar && (
        <TableToolbar
          title={title}
          subtitle={subtitle}
          totalCount={activeTotalCount !== undefined ? activeTotalCount : sourceData.length}
          actions={actions}
          searchActions={searchActions}
          searchable={searchable}
          searchPlaceholder={searchPlaceholder}
          searchQuery={activeSearchQuery}
          onSearchChange={(query) => {
            if (controlledOnSearchChange) controlledOnSearchChange(query);
            else setInternalSearchQuery(query);
            if (!controlledPage && !page) setInternalPage(1);
          }}
          filterTabs={filterTabs}
          activeFilterTab={activeFilterTab}
          onFilterTabChange={onFilterTabChange}
          selectedCount={internalSelected.size}
          onClearSelection={() => {
            setInternalSelected(new Set());
            if (onSelectionChange) onSelectionChange([]);
          }}
          selectionActions={selectionActions}
          hideTitleOnMobile={hideTitleOnMobile}
        />
      )}

      {/* 2. Main Table Container */}
      <TableContainer className={containerClassName}>
        {error ? (
          <TableError error={error} onRetry={onRetry} />
        ) : (
          <>
            {/* Desktop Table View */}
            <div className="hidden md:block">
              <TableScrollArea maxHeight={maxHeight}>
                <Table className={tableClassName}>
                  <TableHeader className={headerClassName}>
                    <TableRow isHoverable={false}>
                      {visibleColumns.map((col, idx) => {
                        const colKey = col.sortKey || col.key || col.accessorKey || col.field;
                        const isSorted = currentSort.key === colKey;
                        const isSortable = col.sortable !== undefined ? col.sortable : sortable;

                        return (
                          <TableHead
                            key={colKey || idx}
                            align={col.align}
                            className={cn(
                              densityHeaderClass,
                              isSortable && colKey && "cursor-pointer select-none hover:text-gray-800 transition-colors",
                              col.headerClassName
                            )}
                            onClick={() => isSortable && colKey && handleSort(col)}
                          >
                            <div
                              className={cn(
                                "flex items-center gap-1.5",
                                col.align === "right" && "justify-end",
                                col.align === "center" && "justify-center"
                              )}
                            >
                              <span>
                                {typeof col.header === "function"
                                  ? col.header({ column: col })
                                  : col.header ?? col.title ?? col.label}
                              </span>

                              {isSortable && colKey && (
                                <span className="text-gray-400">
                                  {isSorted && currentSort.direction === "asc" ? (
                                    <svg className="w-3.5 h-3.5 text-[#DE5437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 15l7-7 7 7" />
                                    </svg>
                                  ) : isSorted && currentSort.direction === "desc" ? (
                                    <svg className="w-3.5 h-3.5 text-[#DE5437]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  ) : (
                                    <svg className="w-3.5 h-3.5 text-gray-300 hover:text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 9l4-4 4 4m0 6l-4 4-4-4" />
                                    </svg>
                                  )}
                                </span>
                              )}
                            </div>
                          </TableHead>
                        );
                      })}
                    </TableRow>
                  </TableHeader>

                  <TableBody>
                    {isLoading ? (
                      <TableSkeleton columnsCount={visibleColumns.length} rows={pageSize > 5 ? 5 : pageSize} />
                    ) : paginatedData.length === 0 ? (
                      <TableRow isHoverable={false}>
                        <TableCell colSpan={visibleColumns.length} className="p-0">
                          {React.isValidElement(emptyState) ? (
                            emptyState
                          ) : (
                            <TableEmpty {...emptyState} />
                          )}
                        </TableCell>
                      </TableRow>
                    ) : (
                      paginatedData.map((row, rIdx) => {
                        const rowId = getRowId(row, rIdx);

                        return (
                          <TableRow
                            key={rowId}
                            className={cn(rowClassName)}
                            onClick={() => onRowClick && onRowClick(row, rIdx)}
                          >
                            {visibleColumns.map((col, cIdx) => {
                              const value = getCellValue(row, col);

                              return (
                                <TableCell
                                  key={`${rowId}-${col.key || col.accessorKey || col.field || cIdx}`}
                                  align={col.align}
                                  className={cn(densityCellClass, cellClassName, col.className)}
                                  style={{
                                    width: col.width,
                                    minWidth: col.minWidth,
                                    maxWidth: col.maxWidth,
                                  }}
                                >
                                  {col.render
                                    ? col.render(row, rIdx, col)
                                    : col.cell
                                    ? col.cell(value, row, rIdx)
                                    : value !== null && value !== undefined
                                    ? String(value)
                                    : "—"}
                                </TableCell>
                              );
                            })}
                          </TableRow>
                        );
                      })
                    )}
                  </TableBody>
                  {footer}
                </Table>
              </TableScrollArea>
            </div>

            {/* Mobile Cards View */}
            {enableMobileCards && (
              <div className="block md:hidden">
                {isLoading ? (
                  <TableMobileCardSkeleton rows={pageSize > 5 ? 5 : pageSize} />
                ) : paginatedData.length === 0 ? (
                  React.isValidElement(emptyState) ? (
                    emptyState
                  ) : (
                    <TableEmpty {...emptyState} />
                  )
                ) : (
                  <TableMobileCards
                    columns={visibleColumns}
                    data={paginatedData}
                    getRowId={getRowId}
                    onRowClick={onRowClick}
                    renderMobileCard={renderMobileCard}
                    className={mobileCardClassName}
                  />
                )}
              </div>
            )}
          </>
        )}

        {/* 3. Table Pagination Footer */}
        {pagination && !hidePagination && !isLoading && !error && (
          <TablePagination
            currentPage={activePage}
            pageSize={activePageSize}
            totalItems={activeTotalCount !== undefined ? activeTotalCount : filteredData.length}
            pageSizeOptions={pageSizeOptions}
            onPageChange={(p) => {
              if (controlledOnPageChange) controlledOnPageChange(p);
              else setInternalPage(p);
            }}
            onPageSizeChange={(s) => {
              if (controlledOnPageSizeChange) controlledOnPageChange(s);
              else setInternalPageSize(s);
              if (!controlledPage && !page) setInternalPage(1);
            }}
          />
        )}
      </TableContainer>
    </div>
  );
}

