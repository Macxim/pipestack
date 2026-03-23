import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/app/types/pipeline";
import LeadCard from "./LeadCard";
import { useEffect, useState } from "react";

type Props = {
  lead: Lead;
  isSelecting?: boolean;
  isSelected?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onDelete?: () => void;
};

export default function SortableLeadCard({
  lead,
  isSelecting,
  isSelected,
  onToggle,
  onClick,
  onDelete
}: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: lead.id,
    disabled: isSelecting,
  });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(mounted && !isSelecting ? attributes : {})}
      {...(mounted && !isSelecting ? listeners : {})}
    >
      <LeadCard
        lead={lead}
        isSelecting={isSelecting}
        isSelected={isSelected}
        onToggle={onToggle}
        onClick={onClick}
        onDelete={onDelete}
      />
    </div>
  );
}