import { Lead } from "@/app/types/pipeline";

const statusStyles: Record<string, string> = {
  overdue: "bg-red-500 text-white",
  today: "bg-green-400 text-white",
  upcoming: "bg-yellow-400 text-white",
  none: "",
};

const statusLabel: Record<string, string> = {
  overdue: "Overdue",
  today: "Today",
  upcoming: "Upcoming",
  none: "",
};

type Props = {
  lead: Lead;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
};

export default function LeadCard({ lead, onClick, onDelete }: Props) {
  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-colors"
    >
      <div className="flex items-start justify-between gap-2">
        <p className="text-sm font-medium text-gray-800 leading-snug">
          {lead.name}
        </p>

        {onDelete && (
          <button
            onClick={(e) => {
              e.stopPropagation();
              onDelete(e);
            }}
            className="opacity-0 group-hover:opacity-100 p-1 text-gray-300 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
            title="Delete lead"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        )}
      </div>

      {lead.value > 0 && (
        <p className="text-xs text-gray-400 mt-1">
          ${lead.value.toLocaleString()}
        </p>
      )}

      {lead.status !== "none" && (
        <div className="mt-2">
          <span
            className={`text-xs font-medium px-2 py-0.5 rounded-full ${statusStyles[lead.status]}`}
          >
            {statusLabel[lead.status]}
          </span>
        </div>
      )}
    </div>
  );
}