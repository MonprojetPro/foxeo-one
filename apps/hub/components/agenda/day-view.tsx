'use client'
import { CalendarEvent, CalendarFilter } from "./agenda-types";
import { EventCard } from "./event-card";
import { isSameDay } from "date-fns";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7h → 22h

interface DayViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  filters: CalendarFilter;
  onEventClick: (e: CalendarEvent) => void;
  onLaunch: (e: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export function DayView({ currentDate, events, filters, onEventClick, onLaunch, onSlotClick }: DayViewProps) {
  const filteredEvents = events.filter((e) => filters[e.source] && isSameDay(e.date, currentDate));

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-[60px_1fr]">
        {HOURS.map((hour) => {
          const startsThisHour = filteredEvents.filter((e) => e.startHour === hour);
          return (
            <div key={hour} className="contents">
              <div className="h-16 flex items-start justify-end pr-2 pt-0.5">
                <span className="text-[10px] text-muted-foreground">{`${hour.toString().padStart(2, "0")}:00`}</span>
              </div>
              <div className="h-16 border-l border-t border-border relative cursor-pointer hover:bg-primary/5 transition-colors" onClick={e => { if (e.target === e.currentTarget) onSlotClick?.(currentDate, hour); }}>
                {startsThisHour.map((event) => {
                  const durationMinutes = (event.endHour - event.startHour) * 60 + (event.endMinute - event.startMinute);
                  const topOffset = (event.startMinute / 60) * 64;
                  const height = (durationMinutes / 60) * 64;
                  return (
                    <div key={event.id} className="absolute left-1 right-1 z-10" style={{ top: `${topOffset}px`, height: `${height}px` }}>
                      <EventCard event={event} onClick={onEventClick} onLaunch={onLaunch} />
                    </div>
                  );
                })}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
