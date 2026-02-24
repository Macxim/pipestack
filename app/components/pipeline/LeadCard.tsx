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
  const initials = lead.name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);

  return (
    <div
      onClick={onClick}
      className="group relative bg-white rounded-lg border border-gray-200 p-3 shadow-sm cursor-grab active:cursor-grabbing hover:border-blue-300 transition-all"
    >
      <div className="flex items-start gap-3">
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
            {lead.value > 0 && (
              <p className="text-xs font-medium text-blue-600">
                ${lead.value.toLocaleString()}
              </p>
            )}

            {lead.status !== "none" && (
              <span
                className={`text-[10px] uppercase tracking-wider font-bold px-1.5 py-0.5 rounded ${statusStyles[lead.status]}`}
              >
                {statusLabel[lead.status]}
              </span>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}