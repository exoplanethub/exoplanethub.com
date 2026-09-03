'use client';
import { useEffect, useMemo, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { FilterState, parseFilters, serializeFilters } from '@/lib/planetFilters';

const WRITE_DELAY_MS = 300;

export function useFilterParams(): [FilterState, (next: FilterState) => void] {
  const router = useRouter();
  const pathname = usePathname();
  const query = useSearchParams().toString();

  const [unwritten, setUnwritten] = useState<FilterState | null>(null);
  const [lastQuery, setLastQuery] = useState(query);
  const [dispatched, setDispatched] = useState<string[]>([]);

  let edit = unwritten;
  if (query !== lastQuery) {
    setLastQuery(query);
    const landed = dispatched.indexOf(query);

    // Only a query this hook never dispatched is someone else steering, and only that may
    // drop a half-typed edit: Back/Forward, or params arriving after hydration.
    if (landed === -1) {
      setDispatched([]);
      setUnwritten(null);
      edit = null;
    } else {
      setDispatched(dispatched.slice(landed + 1));
    }
  }

  // Memoised so the filter object stays referentially stable, keeping callers' memos alive.
  const fromUrl = useMemo(() => parseFilters(new URLSearchParams(query)), [query]);

  // Re-running on every edit is the debounce: the cleanup drops the write the last edit queued.
  useEffect(() => {
    if (unwritten === null) return;

    const serialized = serializeFilters(unwritten);
    const timer = setTimeout(() => {
      setDispatched((queued) => [...queued, serialized]);
      router.replace(serialized ? `${pathname}?${serialized}` : pathname, { scroll: false });
    }, WRITE_DELAY_MS);

    return () => clearTimeout(timer);
  }, [unwritten, pathname, router]);

  return [edit ?? fromUrl, setUnwritten];
}
