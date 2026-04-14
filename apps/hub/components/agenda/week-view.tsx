'use client'
import { CalendarEvent, CalendarFilter } from "./agenda-types";
import { EventCard } from "./event-card";
import { format, isSameDay, addDays, startOfWeek } from "date-fns";
import { fr } from "date-fns/locale";

const HOURS = Array.from({ length: 16 }, (_, i) => i + 7); // 7h → 22h

interface WeekViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  filters: CalendarFilter;
  onEventClick: (e: CalendarEvent) => void;
  onLaunch: (e: CalendarEvent) => void;
  onSlotClick?: (date: Date, hour: number) => void;
}

export function WeekView({ currentDate, events, filters, onEventClick, onLaunch, onSlotClick }: WeekViewProps) {
  const weekStart = startOfWeek(currentDate, { weekStartsOn: 1 });
  const days = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  const today = new Date();
  const filteredEvents = events.filter((e) => filters[e.source]);
  const getEventsForDay = (day: Date) => filteredEvents.filter((e) => isSameDay(e.date, day));

  return (
    <div className="h-full overflow-y-auto">
      <div className="grid grid-cols-[60px_repeat(7,1fr)] border-b border-border sticky top-0 bg-background z-10">
        <div className="p-2" />
        {days.map((day) => {
          const isToday = isSameDay(day, today);
          return (
            <div key={day.toISOString()} className={`p-2 text-center border-l border-border ${isToday ? "text-primary" : "text-muted-foreground"}`}>
              <p className="text-[10px] uppercase tracking-wider">{format(day, "EEE", { locale: fr })}</p>
              <p className={`text-lg font-semibold ${isToday ? "text-primary" : ""}`}>{format(day, "d")}</p>
            </div>
          );
        })}
      </div>
      <div className="grid grid-cols-[60px_repeat(7,1fr)]">
        {HOURS.map((hour) => (
          <div key={hour} className="contents">
            <div className="h-16 flex items-start justify-end pr-2 pt-0.5">
              <span className="text-[10px] text-muted-foreground">{`${hour.toString().padStart(2, "0")}:00`}</span>
            </div>
            {days.map((day) => {
              const startsThisHour = getEventsForDay(day).filter((e) => e.startHour === hour);
              return (
                <div key={`${day.toISOString()}-${hour}`} className="h-16 border-l border-t border-border relative cursor-pointer hover:bg-primary/5 transition-colors" onClick={e => { if (e.target === e.currentTarget) onSlotClick?.(day, hour); }}>
                  {startsThisHour.map((event) => {
                    const durationMinutes = (event.endHour - event.startHour) * 60 + (event.endMinute - event.startMinute);
                    const topOffset = (event.startMinute / 60) * 64;
                    const height = (durationMinutes / 60) * 64;
                    return (
                      <div key={event.id} className="absolute left-0.5 right-0.5 z-10" style={{ top: `${topOffset}px`, height: `${height}px` }}>
                        <EventCard event={event} onClick={onEventClick} onLaunch={onLaunch} />
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
