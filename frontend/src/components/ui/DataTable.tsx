import React, { useState, useMemo } from 'react';
import {
  ChevronUpIcon,
  ChevronDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
} from '@heroicons/react/24/outline';
import { classNames } from '../../utils/classNames';
import Button from './Button';
import Input from './Input';

export interface Column<T> {
  key: string;
  title: string;
  render?: (value: any, record: T, index: number) => React.ReactNode;
  sortable?: boolean;
  width?: string;
  align?: 'left' | 'center' | 'right';
  className?: string;
}

export interface DataTableProps<T> {
  data: T[];
  columns: Column<T>[];
  loading?: boolean;
  pagination?: {
    current: number;
    pageSize: number;
    total: number;
    onChange: (page: number, pageSize: number) => void;
    showSizeChanger?: boolean;
    pageSizeOptions?: number[];
  };
  rowKey?: string | ((record: T) => string);
  onRow?: (record: T, index: number) => {
    onClick?: () => void;
    onDoubleClick?: () => void;
    className?: string;
  };
  selectedRows?: T[];
  onSelectionChange?: (selectedRows: T[]) => void;
  searchable?: boolean;
  searchPlaceholder?: string;
  emptyText?: string;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

interface SortState {
  key: string;
  direction: 'asc' | 'desc';
}

const sizeClasses = {
  sm: 'text-xs',
  md: 'text-sm', 
  lg: 'text-base'
};

const cellPadding = {
  sm: 'px-3 py-2',
  md: 'px-4 py-3',
  lg: 'px-6 py-4'
};

export default function DataTable<T extends Record<string, any>>({
  data,
  columns,
  loading = false,
  pagination,
  rowKey = 'id',
  onRow,
  selectedRows = [],
  onSelectionChange,
  searchable = false,
  searchPlaceholder = 'Search...',
  emptyText = 'No data available',
  className,
  size = 'md'
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState('');
  const [sortState, setSortState] = useState<SortState | null>(null);

  const getRowKey = (record: T, index: number): string => {
    if (typeof rowKey === 'function') {
      return rowKey(record);
    }
    return record[rowKey] || index.toString();
  };

  // Filter and sort data
  const processedData = useMemo(() => {
    let result = [...data];

    // Apply search filter
    if (searchable && searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((record) =>
        Object.values(record).some((value) =>
          String(value).toLowerCase().includes(query)
        )
      );
    }

    // Apply sorting
    if (sortState) {
      const { key, direction } = sortState;
      result.sort((a, b) => {
        const aVal = a[key];
        const bVal = b[key];
        
        if (aVal < bVal) return direction === 'asc' ? -1 : 1;
        if (aVal > bVal) return direction === 'asc' ? 1 : -1;
        return 0;
      });
    }

    return result;
  }, [data, searchQuery, sortState, searchable]);

  // Paginate data
  const paginatedData = useMemo(() => {
    if (!pagination) return processedData;
    
    const { current, pageSize } = pagination;
    const start = (current - 1) * pageSize;
    const end = start + pageSize;
    
    return processedData.slice(start, end);
  }, [processedData, pagination]);

  const handleSort = (columnKey: string) => {
    const column = columns.find(col => col.key === columnKey);
    if (!column?.sortable) return;

    setSortState(prev => {
      if (prev?.key === columnKey) {
        return prev.direction === 'asc' ? { key: columnKey, direction: 'desc' } : null;
      }
      return { key: columnKey, direction: 'asc' };
    });
  };

  const handleSelectAll = () => {
    if (!onSelectionChange) return;
    
    if (selectedRows.length === paginatedData.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(paginatedData);
    }
  };

  const handleSelectRow = (record: T) => {
    if (!onSelectionChange) return;
    
    const recordKey = getRowKey(record, 0);
    const isSelected = selectedRows.some(row => getRowKey(row, 0) === recordKey);
    
    if (isSelected) {
      onSelectionChange(selectedRows.filter(row => getRowKey(row, 0) !== recordKey));
    } else {
      onSelectionChange([...selectedRows, record]);
    }
  };

  const renderCell = (column: Column<T>, record: T, index: number) => {
    const value = record[column.key];
    const content = column.render ? column.render(value, record, index) : value;
    
    return (
      <td
        key={column.key}
        className={classNames(
          cellPadding[size],
          column.align === 'center' && 'text-center',
          column.align === 'right' && 'text-right',
          column.className
        )}
        style={column.width ? { width: column.width } : undefined}
      >
        {content}
      </td>
    );
  };

  const showSelection = onSelectionChange !== undefined;
  const totalColumns = columns.length + (showSelection ? 1 : 0);

  return (
    <div className={classNames('bg-white rounded-2xl shadow-soft border border-neutral-100', className)}>
      {/* Search and filters */}
      {searchable && (
        <div className="p-6 border-b border-neutral-100 bg-gradient-to-r from-neutral-50/50 to-white">
          <div className="flex items-center justify-between space-x-6">
            <div className="flex-1 max-w-md">
              <Input
                placeholder={searchPlaceholder}
                leftIcon={<MagnifyingGlassIcon />}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="border-neutral-200 focus:border-primary-300 focus:ring-primary-100"
              />
            </div>
            {selectedRows.length > 0 && (
              <div className="flex items-center space-x-3">
                <div className="px-3 py-1.5 bg-primary-100 text-primary-700 rounded-full text-sm font-medium">
                  {selectedRows.length} selected
                </div>
                <Button variant="ghost" size="sm">
                  Bulk Actions
                </Button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Table */}
      <div className="overflow-x-auto">
        <table className={classNames('w-full', sizeClasses[size])}>
          {/* Header */}
          <thead className="bg-gradient-to-r from-neutral-50 to-neutral-25 border-b border-neutral-150">
            <tr>
              {showSelection && (
                <th className={classNames('w-12', cellPadding[size])}>
                  <input
                    type="checkbox"
                    checked={selectedRows.length === paginatedData.length && paginatedData.length > 0}
                    onChange={handleSelectAll}
                    className="h-4 w-4 text-primary-600 focus:ring-primary-200 border-neutral-300 rounded transition-colors"
                  />
                </th>
              )}
              {columns.map((column) => (
                <th
                  key={column.key}
                  className={classNames(
                    cellPadding[size],
                    'font-semibold text-neutral-700 text-left tracking-tight',
                    column.sortable && 'cursor-pointer hover:bg-neutral-100/60 select-none transition-colors duration-150',
                    column.align === 'center' && 'text-center',
                    column.align === 'right' && 'text-right'
                  )}
                  style={column.width ? { width: column.width } : undefined}
                  onClick={() => column.sortable && handleSort(column.key)}
                >
                  <div className="flex items-center space-x-2">
                    <span className="text-sm font-semibold">{column.title}</span>
                    {column.sortable && (
                      <div className="flex flex-col">
                        <ChevronUpIcon
                          className={classNames(
                            'h-3 w-3 transition-colors',
                            sortState?.key === column.key && sortState.direction === 'asc'
                              ? 'text-primary-600'
                              : 'text-neutral-400 hover:text-neutral-500'
                          )}
                        />
                        <ChevronDownIcon
                          className={classNames(
                            'h-3 w-3 -mt-1 transition-colors',
                            sortState?.key === column.key && sortState.direction === 'desc'
                              ? 'text-primary-600'
                              : 'text-neutral-400 hover:text-neutral-500'
                          )}
                        />
                      </div>
                    )}
                  </div>
                </th>
              ))}
            </tr>
          </thead>

          {/* Body */}
          <tbody className="divide-y divide-neutral-100 bg-white">
            {loading ? (
              <tr>
                <td colSpan={totalColumns} className={classNames('text-center text-neutral-500', cellPadding[size])}>
                  <div className="flex items-center justify-center py-12">
                    <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-primary-500 border-t-2 border-t-transparent"></div>
                    <span className="ml-3 text-sm font-medium">Loading...</span>
                  </div>
                </td>
              </tr>
            ) : paginatedData.length === 0 ? (
              <tr>
                <td colSpan={totalColumns} className={classNames('text-center text-neutral-500', cellPadding[size])}>
                  <div className="py-12">
                    <div className="w-16 h-16 mx-auto mb-4 bg-neutral-100 rounded-2xl flex items-center justify-center">
                      <FunnelIcon className="h-8 w-8 text-neutral-400" />
                    </div>
                    <h3 className="text-sm font-medium text-neutral-700 mb-1">No results found</h3>
                    <p className="text-sm text-neutral-500">{emptyText}</p>
                  </div>
                </td>
              </tr>
            ) : (
              paginatedData.map((record, index) => {
                const recordKey = getRowKey(record, index);
                const rowProps = onRow?.(record, index);
                const isSelected = selectedRows.some(row => getRowKey(row, 0) === recordKey);

                return (
                  <tr
                    key={recordKey}
                    className={classNames(
                      'hover:bg-neutral-25 transition-all duration-150 group',
                      isSelected && 'bg-primary-50/50 hover:bg-primary-50',
                      rowProps?.className,
                      rowProps?.onClick && 'cursor-pointer hover:shadow-soft'
                    )}
                    onClick={rowProps?.onClick}
                    onDoubleClick={rowProps?.onDoubleClick}
                  >
                    {showSelection && (
                      <td className={cellPadding[size]}>
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => handleSelectRow(record)}
                          onClick={(e) => e.stopPropagation()}
                          className="h-4 w-4 text-primary-600 focus:ring-primary-200 border-neutral-300 rounded transition-colors"
                        />
                      </td>
                    )}
                    {columns.map((column) => renderCell(column, record, index))}
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {pagination && !loading && (
        <div className="flex items-center justify-between px-6 py-4 border-t border-neutral-100 bg-gradient-to-r from-neutral-25/50 to-white rounded-b-2xl">
          <div className="text-sm text-neutral-600 font-medium">
            Showing {Math.min((pagination.current - 1) * pagination.pageSize + 1, pagination.total)} to{' '}
            {Math.min(pagination.current * pagination.pageSize, pagination.total)} of{' '}
            <span className="font-semibold text-neutral-800">{pagination.total.toLocaleString()}</span> results
          </div>
          
          <div className="flex items-center space-x-1">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(pagination.current - 1, pagination.pageSize)}
              disabled={pagination.current <= 1}
              className="px-3 py-1.5 hover:bg-neutral-100 disabled:hover:bg-transparent"
            >
              <ChevronLeftIcon className="h-4 w-4 mr-1" />
              Previous
            </Button>
            
            <div className="flex items-center space-x-1 mx-4">
              {Array.from({ length: Math.min(5, Math.ceil(pagination.total / pagination.pageSize)) }, (_, i) => {
                const pageNumber = i + 1;
                const isActive = pagination.current === pageNumber;
                return (
                  <Button
                    key={pageNumber}
                    variant={isActive ? 'primary' : 'ghost'}
                    size="sm"
                    onClick={() => pagination.onChange(pageNumber, pagination.pageSize)}
                    className={classNames(
                      'min-w-[2.5rem] h-9',
                      isActive 
                        ? 'bg-primary-600 hover:bg-primary-700 text-white shadow-sm' 
                        : 'text-neutral-600 hover:bg-neutral-100 hover:text-neutral-800'
                    )}
                  >
                    {pageNumber}
                  </Button>
                );
              })}
            </div>

            <Button
              variant="ghost"
              size="sm"
              onClick={() => pagination.onChange(pagination.current + 1, pagination.pageSize)}
              disabled={pagination.current >= Math.ceil(pagination.total / pagination.pageSize)}
              className="px-3 py-1.5 hover:bg-neutral-100 disabled:hover:bg-transparent"
            >
              Next
              <ChevronRightIcon className="h-4 w-4 ml-1" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}