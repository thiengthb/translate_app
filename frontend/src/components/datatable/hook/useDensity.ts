import { useCallback, useEffect, useState } from "react";

export type Density = "compact" | "normal" | "comfortable";

interface DensityConfig {
    rowHeight: number;
    rowClassName: string;
    cellClassName: string;
}

export const DENSITY_CONFIG: Record<Density, DensityConfig> = {
    compact: {
        rowHeight: 36,
        rowClassName: "h-9",
        cellClassName: "py-1.5 text-[13px]",
    },
    normal: {
        rowHeight: 49,
        rowClassName: "h-12",
        cellClassName: "py-2.5 text-sm",
    },
    comfortable: {
        rowHeight: 64,
        rowClassName: "h-16",
        cellClassName: "py-4 text-sm",
    },
};

const STORAGE_PREFIX = "protable.density.";

function readDensity(entityName: string): Density {
    try {
        const raw = localStorage.getItem(`${STORAGE_PREFIX}${entityName}`);
        if (raw === "compact" || raw === "normal" || raw === "comfortable") return raw;
    } catch {
        // ignore
    }
    return "normal";
}

function writeDensity(entityName: string, density: Density): void {
    try {
        localStorage.setItem(`${STORAGE_PREFIX}${entityName}`, density);
    } catch {
        // ignore
    }
}

export function useDensity(entityName: string): [Density, (d: Density) => void, DensityConfig] {
    const [density, setDensityState] = useState<Density>(() => readDensity(entityName));

    useEffect(() => {
        setDensityState(readDensity(entityName));
    }, [entityName]);

    const setDensity = useCallback(
        (d: Density) => {
            setDensityState(d);
            writeDensity(entityName, d);
        },
        [entityName],
    );

    return [density, setDensity, DENSITY_CONFIG[density]];
}
