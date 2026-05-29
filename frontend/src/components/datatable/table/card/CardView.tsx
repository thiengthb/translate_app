import { ScrollHintContainer } from "@/components/common/ScrollHintContainer";
import type { FieldSchema } from "@/types/common/datatable";
import { CardItem } from "./CardItem";
import { CardSelectAllBar } from "./CardSelectAllBar";

interface CardViewProps {
  table: any;
  onRowClick?: (row: any) => void;
  showActions?: boolean;
  renderRowActions?: (row: any) => React.ReactNode;
  onView: (row: any) => void;
  onEdit: (row: any) => void;
  onDelete: (row: any) => void;
  onBooleanToggle: (id: any, fieldName: string, newValue: boolean) => void;
  disableBooleanToggle?: boolean;
}

export function CardView({
  table,
  onRowClick,
  renderRowActions,
  onView,
  onEdit,
  onDelete,
  onBooleanToggle,
  showActions = true,
  disableBooleanToggle = false,
}: CardViewProps) {
  const { schema } = table;

  const allIds = (table.data ?? []).map((row: any) => row[schema.idField]);
  const selectedCount = table.selected?.length ?? 0;
  const allSelected =
    allIds.length > 0 &&
    allIds.every((id: any) => table.selected?.includes(id));
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelectAll = () => {
    if (allSelected) {
      table.setSelected((prev: any[]) =>
        prev.filter((id: any) => !allIds.includes(id))
      );
    } else {
      table.setSelected((prev: any[]) => {
        const set = new Set([...prev, ...allIds]);
        return Array.from(set);
      });
    }
  };

  const toggleSelect = (id: any) => {
    table.setSelected((prev: any[]) =>
      prev.includes(id) ? prev.filter((x: any) => x !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex flex-col overflow-hidden h-full">
      <CardSelectAllBar
        totalCount={allIds.length}
        selectedCount={selectedCount}
        allSelected={allSelected}
        someSelected={someSelected}
        onToggleSelectAll={toggleSelectAll}
      />

      <ScrollHintContainer
        axis="vertical"
        className={`flex-1 transition-opacity ${table.isFetching ? "opacity-50" : ""}`}
        viewportClassName="grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 p-3"
      >
        {table.data?.map((row: any, idx: number) => {
          const id = row[schema.idField];
          return (
            <CardItem
              key={id}
              row={row}
              index={(table.page || 0) * (table.size || 10) + idx}
              idField={schema.idField}
              isSelected={table.selected?.includes(id) || false}
              showActions={showActions}
              visibleFields={table.visibleFields as FieldSchema[]}
              relationOptions={table.relationOptions}
              onSelect={toggleSelect}
              onRowClick={onRowClick}
              renderRowActions={renderRowActions}
              onView={onView}
              onEdit={onEdit}
              onDelete={onDelete}
              disableBooleanToggle={disableBooleanToggle}
              onBooleanToggle={onBooleanToggle}
            />
          );
        })}
      </ScrollHintContainer>
    </div>
  );
}
