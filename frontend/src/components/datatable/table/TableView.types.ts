/**
 * Pin style shape returned by `useColumnPinning`. Mirrored here so
 * TableView doesn't have to import the hook just to type a prop.
 */
export interface ColumnPinStyle {
    style: React.CSSProperties;
    className: string;
}

export type PinStyles = Record<string, ColumnPinStyle>;
export type PinSidesMap = Record<string, "left" | "right" | null>;
