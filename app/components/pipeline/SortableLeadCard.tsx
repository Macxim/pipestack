import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { Lead } from "@/app/types/pipeline";
import LeadCard from "./LeadCard";
import { useEffect, useState } from "react";

type Props = {
  lead: Lead;
  onClick?: () => void;
  onDelete?: () => void;
};

export default function SortableLeadCard({ lead, onClick, onDelete }: Props) {
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
  } = useSortable({ id: lead.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : 1,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(mounted ? attributes : {})}
      {...(mounted ? listeners : {})}
    >
      <LeadCard lead={lead} onClick={onClick} onDelete={onDelete} />
    </div>
  );
}