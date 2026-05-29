import { useEffect, useState } from "react";

/**
 * Returns a debounced copy of `value` — only updates after `delay` ms have
 * passed without `value` changing. Cancels pending update on unmount.
 */
export function useDebouncedValue<T>(value: T, delay = 300): T {
    const [debounced, setDebounced] = useState(value);

    useEffect(() => {
        const handle = setTimeout(() => setDebounced(value), delay);
        return () => clearTimeout(handle);
    }, [value, delay]);

    return debounced;
}
