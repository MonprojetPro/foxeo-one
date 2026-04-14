'use client'
import { CalendarEvent, CalendarFilter } from "./agenda-types";
import { EventCard } from "./event-card";
import { startOfMonth, endOfMonth, startOfWeek, endOfWeek, addDays, isSameMonth, isSameDay, format } from "date-fns";
import { fr } from "date-fns/locale";

interface MonthViewProps {
  currentDate: Date;
  events: CalendarEvent[];
  filters: CalendarFilter;
  onEventClick: (e: CalendarEvent) => void;
  onLaunch: (e: CalendarEvent) => void;
}

export function MonthView({ currentDate, events, filters, onEventClick, onLaunch }: MonthViewProps) {
  const monthStart = startOfMonth(currentDate);
  const monthEnd = endOfMonth(currentDate);
  const calStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });
  const today = new Date();
  const filteredEvents = events.filter((e) => filters[e.source]);

  const days: Date[] = [];
  let d = calStart;
  while (d <= calEnd) {
    days.push(d);
    d = addDays(d, 1);
  }

  const weeks: Date[][] = [];
  for (let i = 0; i < days.length; i += 7) {
    weeks.push(days.slice(i, i + 7));
  }

  const dayNames = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

  return (
    <div className="flex-1 overflow-auto">
      <div className="grid grid-cols-7 border-b border-border">
        {dayNames.map((n) => (
          <div key={n} className="p-2 text-center text-[10px] uppercase tracking-wider text-muted-foreground">{n}</div>
        ))}
      </div>
      {weeks.map((week, wi) => (
        <div key={wi} className="grid grid-cols-7 min-h-[100px]">
          {week.map((day) => {
            const dayEvents = filteredEvents.filter((e) => isSameDay(e.date, day));
            const inMonth = isSameMonth(day, currentDate);
            const isToday = isSameDay(day, today);
            return (
              <div key={day.toISOString()} className={`border border-border p-1 ${!inMonth ? "opacity-30" : ""}`}>
                <p className={`text-xs mb-1 ${isToday ? "text-primary font-bold" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </p>
                <div className="space-y-0.5">
                  {dayEvents.slice(0, 3).map((event) => (
                    <EventCard key={event.id} event={event} compact onClick={onEventClick} onLaunch={onLaunch} />
                  ))}
                  {dayEvents.length > 3 && (
                    <p className="text-[9px] text-muted-foreground">+{dayEvents.length - 3} autres</p>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      ))}
    </div>
  );
}
