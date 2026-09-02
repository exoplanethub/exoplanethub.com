'use client';
import { useState } from 'react';

export interface Pagination {
  page: number;
  totalPages: number;
  goTo: (page: number) => void;
  pageItems: <T>(items: T[]) => T[];
}

export function usePagination(itemCount: number, itemsPerPage: number): Pagination {
  const [requested, setRequested] = useState(1);
  const totalPages = Math.max(1, Math.ceil(itemCount / itemsPerPage));
  const page = Math.min(Math.max(1, requested), totalPages);

  // Page count, clamp and slice bounds leave this hook already applied, so no caller can disagree with it.
  return {
    page,
    totalPages,
    goTo: setRequested,
    pageItems: (items) => items.slice((page - 1) * itemsPerPage, page * itemsPerPage),
  };
}
