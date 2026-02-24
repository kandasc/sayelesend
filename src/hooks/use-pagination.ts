import { useState, useMemo, useCallback } from "react";

const DEFAULT_PAGE_SIZE = 15;

type UsePaginationOptions = {
  pageSize?: number;
};

export function usePagination<T>(
  items: T[] | undefined | null,
  options?: UsePaginationOptions,
) {
  const pageSize = options?.pageSize ?? DEFAULT_PAGE_SIZE;
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Clamp current page if items change (e.g. after filtering)
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = useCallback(
    (page: number) => {
      setCurrentPage(Math.max(1, Math.min(page, totalPages)));
    },
    [totalPages],
  );

  const nextPage = useCallback(() => {
    goToPage(safePage + 1);
  }, [safePage, goToPage]);

  const prevPage = useCallback(() => {
    goToPage(safePage - 1);
  }, [safePage, goToPage]);

  const resetPage = useCallback(() => {
    setCurrentPage(1);
  }, []);

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize,
    goToPage,
    nextPage,
    prevPage,
    resetPage,
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
    startIndex: (safePage - 1) * pageSize + 1,
    endIndex: Math.min(safePage * pageSize, totalItems),
  };
}
