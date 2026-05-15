import { createContext, useContext, useId, type ReactNode, type CSSProperties } from "react";
import {
  DndContext, DragOverlay, PointerSensor, TouchSensor,
  closestCenter, useSensor, useSensors,
  type DragEndEvent, type DragStartEvent,
} from "@dnd-kit/core";
import {
  SortableContext, useSortable,
  verticalListSortingStrategy,
  arrayMove,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical } from "lucide-react";
import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

// ── Context para o drag handle ────────────────────────────────────────────────
interface DragHandleCtx {
  listeners: Record<string, unknown> | undefined;
  attributes: Record<string, unknown> | undefined;
  isDragging: boolean;
  isDisabled: boolean;
}
const DragHandleContext = createContext<DragHandleCtx>({
  listeners: undefined, attributes: undefined, isDragging: false, isDisabled: true,
});

// ── SortableItem — wrapper por card ──────────────────────────────────────────
interface SortableItemProps {
  id: string;
  disabled?: boolean;
  className?: string;
  style?: CSSProperties;
  children: ReactNode;
}

export const SortableRoutineItem = ({ id, disabled = false, className = "", style, children }: SortableItemProps) => {
  const {
    attributes, listeners, setNodeRef,
    transform, transition, isDragging,
  } = useSortable({ id, disabled });

  const itemStyle: CSSProperties = {
    ...style,
    transform: CSS.Transform.toString(transform),
    transition,
    zIndex: isDragging ? 30 : undefined,
    position: "relative",
  };

  return (
    <DragHandleContext.Provider value={{ listeners: listeners as any, attributes: attributes as any, isDragging, isDisabled: disabled }}>
      <div
        ref={setNodeRef}
        style={itemStyle}
        className={`${className} ${isDragging ? "opacity-50 scale-[1.01]" : ""}`}
      >
        {children}
      </div>
    </DragHandleContext.Provider>
  );
};

// ── Drag handle — GripVertical que aciona o DnD ───────────────────────────────
interface DragHandleProps {
  className?: string;
}

export const RoutineDragHandle = ({ className = "" }: DragHandleProps) => {
  const { listeners, attributes, isDragging, isDisabled } = useContext(DragHandleContext);
  if (isDisabled) return null;
  return (
    <button
      type="button"
      {...listeners}
      {...attributes}
      className={`touch-none flex items-center justify-center w-8 h-8 rounded-lg text-muted-foreground/60 hover:text-muted-foreground hover:bg-muted/40 transition-colors cursor-grab active:cursor-grabbing ${isDragging ? "cursor-grabbing" : ""} ${className}`}
      aria-label="Arrastar para reordenar"
    >
      <GripVertical size={16} />
    </button>
  );
};

// ── Lista sortable — wraps DndContext + SortableContext ───────────────────────
interface SortableListProps {
  items: string[];          // IDs na ordem atual
  onReorder: (newOrder: string[]) => void;
  disabled?: boolean;       // quando não está em modo edição
  overlayLabel?: (id: string) => string; // label para o overlay de arrasto
  children: ReactNode;
}

export const SortableRoutineList = ({
  items, onReorder, disabled = false, overlayLabel, children,
}: SortableListProps) => {
  const [activeId, setActiveId] = useState<string | null>(null);
  const dndId = useId();

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: { distance: 6 },
    }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 180, tolerance: 8 },
    }),
  );

  const handleDragStart = ({ active }: DragStartEvent) => {
    setActiveId(active.id as string);
  };

  const handleDragEnd = ({ active, over }: DragEndEvent) => {
    setActiveId(null);
    if (!over || active.id === over.id) return;
    const oldIdx = items.indexOf(active.id as string);
    const newIdx = items.indexOf(over.id as string);
    if (oldIdx < 0 || newIdx < 0) return;
    onReorder(arrayMove(items, oldIdx, newIdx));
  };

  if (disabled) {
    return <>{children}</>;
  }

  return (
    <DndContext
      id={dndId}
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <SortableContext items={items} strategy={verticalListSortingStrategy}>
        {children}
      </SortableContext>

      {/* Overlay — card ghost durante o arrasto */}
      <DragOverlay dropAnimation={{ duration: 200, easing: "ease" }}>
        <AnimatePresence>
          {activeId && (
            <motion.div
              initial={{ scale: 0.98, opacity: 0.8 }}
              animate={{ scale: 1.03, opacity: 1 }}
              className="lg-surface-step rounded-2xl shadow-2xl border-2 border-primary/30 px-4 py-3 flex items-center gap-3"
              style={{ backdropFilter: "blur(8px)" }}
            >
              <GripVertical size={16} className="text-primary/60 flex-shrink-0" />
              <p className="text-sm font-semibold text-foreground truncate">
                {overlayLabel?.(activeId) ?? "Movendo passo…"}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </DragOverlay>
    </DndContext>
  );
};
