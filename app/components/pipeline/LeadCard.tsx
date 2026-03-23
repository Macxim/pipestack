import { Lead } from "@/app/types/pipeline";
import { getFollowUpStatus } from "@/lib/follow-up-status";

type Props = {
  lead: Lead;
  isSelecting?: boolean;
  isSelected?: boolean;
  dimmed?: boolean;
  onToggle?: () => void;
  onClick?: () => void;
  onDelete?: (e: React.MouseEvent) => void;
};

export default function LeadCard({
  lead,
  isSelecting,
  isSelected,
  dimmed,
  onToggle = () => {},
  onClick,
  onDelete
}: Props) {
  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  const followUp = getFollowUpStatus(lead.followUpDate);

  return (
    <div
      onClick={(e) => {
        if (isSelecting) {
          onToggle();
        } else if (onClick) {
          onClick();
        }
      }}
      className={`
        group relative bg-white rounded-xl border p-3 shadow-sm transition-all duration-200
        ${isSelecting ? "cursor-pointer" : "cursor-grab active:cursor-grabbing"}
        ${isSelected
          ? "border-blue-400 ring-2 ring-blue-100 shadow-sm"
          : "border-gray-200 hover:border-blue-300"
        }
        ${dimmed ? "opacity-30" : "opacity-100"}
      `}
      style={{
        borderLeft: followUp.state !== "none" && (followUp.state === "overdue" || followUp.state === "today")
          ? `3px solid ${followUp.border}`
          : undefined,
      }}
    >
      {/* Checkbox */}
      <div
        className={`
          absolute top-2 left-2 transition-opacity duration-150 z-10
          ${isSelecting ? "opacity-100" : "opacity-0 group-hover:opacity-100"}
        `}
        onClick={(e) => {
          e.stopPropagation();
          onToggle?.();
        }}
        onPointerDown={(e) => e.stopPropagation()}
      >
        <div
          className={`
            w-5 h-5 rounded-md border-2 flex items-center justify-center
            transition-all duration-150 cursor-pointer
            ${isSelected
              ? "bg-blue-600 border-blue-600"
              : "bg-white border-gray-300 hover:border-blue-400"
            }
          `}
        >
          {isSelected && (
            <svg width="10" height="8" viewBox="0 0 10 8" fill="none">
              <path
                d="M1 4L3.5 6.5L9 1"
                stroke="white"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
      </div>

      <div className={`flex items-start gap-3 ${isSelecting ? "pl-6" : ""}`}>
        {/* Avatar Section */}
        <div className="relative shrink-0">
          {lead.avatarUrl ? (
            <img
              src={lead.avatarUrl}
              alt={lead.name}
              className="w-10 h-10 rounded-full object-cover border border-gray-100 shadow-sm"
            />
          ) : (
            <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-100 to-gray-200 flex items-center justify-center text-gray-500 font-bold text-xs border border-gray-100 shadow-sm">
              {initials}
            </div>
          )}
        </div>

        <div className="flex-1 min-w-0">
          <div className="flex items-start justify-between gap-1">
            <p className="text-sm font-semibold text-gray-900 leading-tight truncate">
              {lead.name}
            </p>



            {onDelete && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(e);
                }}
                className="opacity-0 group-hover:opacity-100 p-1 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded transition-all shrink-0"
                title="Delete lead"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            )}
          </div>

          {/* Social Badges */}
          {lead.platform === "facebook" && lead.profileUrl && (
            <div className="flex items-center gap-2 mt-2">
              <a
                href={lead.profileUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 bg-[#1877F2] rounded-full flex items-center justify-center shadow-sm cursor-pointer"
                title="View Facebook Profile"
              >
                <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M24 12.073c0-6.627-5.373-12-12-12s-12 5.373-12 12c0 5.99 4.388 10.954 10.125 11.854v-8.385H7.078v-3.47h3.047V9.43c0-3.007 1.792-4.669 4.533-4.669 1.312 0 2.686.235 2.686.235v2.953H15.83c-1.491 0-1.956.925-1.956 1.874v2.25h3.328l-.532 3.47h-2.796v8.385C19.612 23.027 24 18.062 24 12.073z" />
                </svg>
              </a>

              <a
                href={`https://m.me/${lead.profileUrl.includes("id=") ? lead.profileUrl.split("id=")[1].split("&")[0] : lead.profileUrl.split("facebook.com/")[1].split("?")[0]}`}
                target="_blank"
                rel="noopener noreferrer"
                onClick={(e) => e.stopPropagation()}
                className="w-4 h-4 bg-[#00B2FF] rounded-full flex items-center justify-center shadow-sm cursor-pointer"
                title="Send Message"
              >
                <svg className="w-2.5 h-2.5 text-white fill-current" viewBox="0 0 24 24">
                  <path d="M12 2C6.477 2 2 6.145 2 11.258c0 2.91 1.455 5.503 3.735 7.152.195.14.316.362.316.598v2.324c0 .35.39.554.672.348l2.67-1.956a.668.668 0 0 1 .494-.105c.677.16 1.393.247 2.13.247 5.523 0 10-4.145 10-9.258S17.523 2 12 2zm1.096 12.551-2.454-2.618-4.786 2.618 5.263-5.592 2.454 2.618 4.786-2.618-5.263 5.592z" />
                </svg>
              </a>
            </div>
          )}

          <div className="flex items-center justify-between mt-1">
          </div>

          {followUp.state !== "none" && (
            <div className="mt-2">
              <span
                className="inline-flex items-center gap-1 text-[11px] font-semibold px-2 py-0.5 rounded-full"
                style={{
                  color: followUp.color,
                  background: `${followUp.color}15`,
                }}
              >
                {followUp.state === "overdue" && "⏰"}
                {followUp.state === "today" && "🔔"}
                {(followUp.state === "tomorrow" || followUp.state === "soon") && "📅"}
                {followUp.state === "future" && "📅"}
                <span className="ml-0.5">{followUp.label}</span>
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}