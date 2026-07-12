"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  closestCenter,
  useSensor,
  useSensors,
} from "@dnd-kit/core";
import {
  SortableContext,
  arrayMove,
  horizontalListSortingStrategy,
  sortableKeyboardCoordinates,
  useSortable,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { saveFlowAction } from "@/lib/actions/flow";
import { ChevronRightIcon } from "@/app/DashboardIcons";

interface Department {
  id: string;
  name: string;
}

interface FlowEditorProps {
  ownerDepartmentId: string;
  allDepartments: Department[];
  initialStageIds: string[];
}

function FixedChip({ label }: { label: string }) {
  return (
    <span className="badge" style={{ fontSize: 13, padding: "6px 14px" }}>
      {label}
    </span>
  );
}

function StageChip({ department, onRemove }: { department: Department; onRemove: () => void }) {
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({ id: department.id });
  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.5 : 1,
  };

  return (
    <span
      ref={setNodeRef}
      style={{
        ...style,
        display: "inline-flex",
        alignItems: "center",
        gap: 6,
        padding: "6px 8px 6px 14px",
        borderRadius: 999,
        fontSize: 13,
        fontWeight: 600,
        background: "var(--accent-soft)",
        color: "var(--accent-hover)",
        border: "1px solid #c9dbfa",
        cursor: "grab",
      }}
      {...attributes}
      {...listeners}
    >
      {department.name}
      <button
        type="button"
        className="secondary"
        // Stop the drag handlers on the parent span from swallowing the click.
        onPointerDown={(e) => e.stopPropagation()}
        onClick={onRemove}
        style={{ padding: "0 6px", fontSize: 12, lineHeight: 1.4 }}
        aria-label={`Remove ${department.name} from flow`}
      >
        ×
      </button>
    </span>
  );
}

export function FlowEditor({ ownerDepartmentId, allDepartments, initialStageIds }: FlowEditorProps) {
  const [stageIds, setStageIds] = useState<string[]>(initialStageIds);
  const [saved, setSaved] = useState(false);

  const departmentsById = useMemo(
    () => new Map(allDepartments.map((d) => [d.id, d])),
    [allDepartments],
  );

  const availableToAdd = allDepartments.filter(
    (d) => d.id !== ownerDepartmentId && !stageIds.includes(d.id),
  );

  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    if (!over || active.id === over.id) return;
    setStageIds((ids) => {
      const oldIndex = ids.indexOf(String(active.id));
      const newIndex = ids.indexOf(String(over.id));
      return arrayMove(ids, oldIndex, newIndex);
    });
    setSaved(false);
  }

  function addStage(id: string) {
    setStageIds((ids) => [...ids, id]);
    setSaved(false);
  }

  function removeStage(id: string) {
    setStageIds((ids) => ids.filter((s) => s !== id));
    setSaved(false);
  }

  return (
    <div>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 8,
          flexWrap: "wrap",
          padding: "16px 0",
        }}
      >
        <FixedChip label="Reception" />
        <ChevronRightIcon size={16} style={{ color: "var(--text-muted)" }} />

        <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
          <SortableContext items={stageIds} strategy={horizontalListSortingStrategy}>
            {stageIds.map((id) => {
              const dept = departmentsById.get(id);
              if (!dept) return null;
              return (
                <span key={id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <StageChip department={dept} onRemove={() => removeStage(id)} />
                  <ChevronRightIcon size={16} style={{ color: "var(--text-muted)" }} />
                </span>
              );
            })}
          </SortableContext>
        </DndContext>

        <FixedChip label="Doctor" />
      </div>

      {availableToAdd.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <p className="muted" style={{ fontSize: 12.5, marginBottom: 6 }}>
            Add a stage (or drag the chips above to reorder):
          </p>
          <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
            {availableToAdd.map((d) => (
              <button
                key={d.id}
                type="button"
                className="secondary"
                onClick={() => addStage(d.id)}
                style={{ fontSize: 12.5 }}
              >
                + Add {d.name}
              </button>
            ))}
          </div>
        </div>
      )}

      <form
        action={saveFlowAction}
        onSubmit={() => setSaved(true)}
        style={{ display: "flex", alignItems: "center", gap: 12 }}
      >
        <input type="hidden" name="ownerDepartmentId" value={ownerDepartmentId} />
        <input type="hidden" name="stageOrder" value={JSON.stringify(stageIds)} />
        <button type="submit">Save flow</button>
        {saved && <span className="muted" style={{ fontSize: 12.5 }}>Saved.</span>}
      </form>
    </div>
  );
}
