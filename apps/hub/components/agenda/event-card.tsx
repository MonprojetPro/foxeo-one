'use client'
import { CalendarEvent, SOURCE_COLORS } from "./agenda-types";
import { cn } from "@monprojetpro/utils";

interface EventCardProps {
  event: CalendarEvent;
  compact?: boolean;
  onClick: (event: CalendarEvent) => void;
  onLaunch?: (event: CalendarEvent) => void;
}

export function EventCard({ event, compact, onClick, onLaunch }: EventCardProps) {
  const colorClasses = SOURCE_COLORS[event.source];
  const pad = (n: number) => n.toString().padStart(2, "0");
  const timeStr = `${pad(event.startHour)}:${pad(event.startMinute)} - ${pad(event.endHour)}:${pad(event.endMinute)}`;

  // Style inline si couleur personnalisée, sinon classes Tailwind
  const customStyle = event.customColor ? {
    backgroundColor: `${event.customColor}22`,
    borderColor: event.customColor,
    color: event.customColor,
  } : undefined;

  if (compact) {
    return (
      <button
        onClick={() => onClick(event)}
        style={customStyle}
        className={cn("w-full text-left text-[10px] px-1.5 py-0.5 rounded border-l-2 truncate", !event.customColor && colorClasses)}
      >
        {event.title}
      </button>
    );
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => onClick(event)}
      onKeyDown={(e) => e.key === 'Enter' && onClick(event)}
      style={customStyle}
      className={cn(
        "w-full h-full text-left p-2 rounded-md border-l-[3px] transition-all hover:brightness-125 cursor-pointer overflow-hidden",
        !event.customColor && colorClasses
      )}
    >
      <p className="text-[10px] opacity-70">{timeStr}</p>
      <p className="text-xs font-medium leading-tight">{event.title}</p>
      {event.subtitle && <p className="text-[10px] opacity-70 mt-0.5">{event.subtitle}</p>}
      <div className="flex items-center gap-1.5 mt-1.5 flex-wrap">
        {event.clientType === "lab" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#E07856]/20 text-[#E07856] font-medium">Lab</span>
        )}
        {event.clientType === "one" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F7931E]/20 text-[#F7931E] font-medium">One</span>
        )}
        {event.source === "google" && (
          <span className="text-[9px] px-1.5 py-0.5 rounded bg-[#F7931E]/20 text-[#F7931E] font-medium">Google</span>
        )}
        {event.source === "monprojetpro" && onLaunch && (
          <button
            onClick={(e) => { e.stopPropagation(); onLaunch(event); }}
            className="ml-auto text-[10px] px-2 py-0.5 rounded bg-primary/20 text-primary hover:bg-primary/30 font-medium transition-colors"
          >
            Lancer →
          </button>
        )}
      </div>
    </div>
  );
}
