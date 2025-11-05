'use client'

import { useState, useCallback, useMemo } from 'react'

interface UsePaginationOptions {
  initialPage?: number
  initialPageSize?: number
}

export function usePagination(options: UsePaginationOptions = {}) {
  const { initialPage = 1, initialPageSize = 20 } = options

  const [currentPage, setCurrentPage] = useState(initialPage)
  const [pageSize, setPageSize] = useState(initialPageSize)

  const nextPage = useCallback(() => {
    setCurrentPage((prev) => prev + 1)
  }, [])

  const prevPage = useCallback(() => {
    setCurrentPage((prev) => Math.max(1, prev - 1))
  }, [])

  const goToPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page))
  }, [])

  const reset = useCallback(() => {
    setCurrentPage(initialPage)
  }, [initialPage])

  return {
    currentPage,
    pageSize,
    setPageSize,
    nextPage,
    prevPage,
    goToPage,
    reset,
  }
}

interface UseSortOptions<T = string> {
  initialColumn?: T
  initialDirection?: 'asc' | 'desc'
}

export function useSort<T = string>(options: UseSortOptions<T> = {}) {
  const { initialColumn, initialDirection = 'asc' } = options

  const [sortColumn, setSortColumn] = useState<T | undefined>(initialColumn)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>(initialDirection)

  const handleSort = useCallback((column: T) => {
    setSortColumn((prevColumn) => {
      if (prevColumn === column) {
        setSortDirection((prev) => (prev === 'asc' ? 'desc' : 'asc'))
        return column
      } else {
        setSortDirection('asc')
        return column
      }
    })
  }, [])

  const reset = useCallback(() => {
    setSortColumn(initialColumn)
    setSortDirection(initialDirection)
  }, [initialColumn, initialDirection])

  return {
    sortColumn,
    sortDirection,
    handleSort,
    reset,
  }
}

// 테이블 전체 관리 (페이지네이션 + 정렬 + 필터)
interface UseTableOptions<T = any> {
  data: T[]
  initialPage?: number
  initialPageSize?: number
  initialSortColumn?: keyof T
  initialSortDirection?: 'asc' | 'desc'
}

export function useTable<T = any>(options: UseTableOptions<T>) {
  const {
    data,
    initialPage = 1,
    initialPageSize = 20,
    initialSortColumn,
    initialSortDirection = 'asc',
  } = options

  const pagination = usePagination({ initialPage, initialPageSize })
  const sort = useSort({ 
    initialColumn: initialSortColumn as string, 
    initialDirection: initialSortDirection 
  })

  const [searchTerm, setSearchTerm] = useState('')

  // 정렬된 데이터
  const sortedData = useMemo(() => {
    if (!sort.sortColumn) return data

    return [...data].sort((a, b) => {
      const aValue = (a as any)[sort.sortColumn!]
      const bValue = (b as any)[sort.sortColumn!]

      if (aValue === bValue) return 0

      const comparison = aValue < bValue ? -1 : 1
      return sort.sortDirection === 'asc' ? comparison : -comparison
    })
  }, [data, sort.sortColumn, sort.sortDirection])

  // 페이지네이션된 데이터
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize
    const end = start + pagination.pageSize
    return sortedData.slice(start, end)
  }, [sortedData, pagination.currentPage, pagination.pageSize])

  const totalPages = useMemo(() => {
    return Math.ceil(sortedData.length / pagination.pageSize)
  }, [sortedData.length, pagination.pageSize])

  return {
    data: paginatedData,
    totalItems: sortedData.length,
    totalPages,
    searchTerm,
    setSearchTerm,
    ...pagination,
    ...sort,
  }
}

