import { useState, useEffect, useCallback, useRef } from 'react';

export function useDataCache<T>(
    key: string,
    fetcher: () => Promise<T>,
    refreshInterval = 120000, // Default 2 minutes
    dependencies: any[] = []
) {
    const [data, setData] = useState<T | null>(null);
    const [isLoading, setIsLoading] = useState(true);
    const [error, setError] = useState<any>(null);

    // Use ref to avoid infinite loop if fetcher isn't memoized
    const fetcherRef = useRef(fetcher);
    useEffect(() => {
        fetcherRef.current = fetcher;
    }, [fetcher]);

    const loadData = useCallback(async (isRefresh = false) => {
        if (!isRefresh) setIsLoading(true);
        try {
            const newData = await fetcherRef.current();
            setData(newData);
            // Update Cache
            sessionStorage.setItem(key, JSON.stringify(newData));
            sessionStorage.setItem(`${key}_timestamp`, Date.now().toString());
        } catch (err) {
            setError(err);
            console.error(`Cache fetch failed for ${key}:`, err);
        } finally {
            if (!isRefresh) setIsLoading(false);
        }
    }, [key]); // Removed fetcher from deps, using ref

    useEffect(() => {
        // Initial Load Strategy
        const cached = sessionStorage.getItem(key);
        const timestamp = sessionStorage.getItem(`${key}_timestamp`);
        const now = Date.now();

        // If cache exists and is fresh (less than interval)
        if (cached && timestamp && (now - Number(timestamp) < refreshInterval)) {
            try {
                setData(JSON.parse(cached));
                setIsLoading(false);
                // Even if we use cache, we should set up the interval for NEXT fetch
            } catch (e) {
                console.error("Failed to parse cache", e);
                loadData();
            }
        } else {
            // Cache stale or missing
            loadData();
        }

        // Set up Auto-Refresh Interval
        const interval = setInterval(() => {
            console.log(`Auto-refreshing ${key}...`);
            loadData(true); // Silent refresh
        }, refreshInterval);

        return () => clearInterval(interval);
    }, [key, refreshInterval, loadData, ...dependencies]);

    return { data, isLoading, error, refetch: () => loadData(false) };
}
