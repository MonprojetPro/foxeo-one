export type CalendarSource = "google" | "calcom" | "ical";

export interface CalendarEvent {
  id: string;
  title: string;
  subtitle?: string;
  date: Date;
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  source: CalendarSource;
  clientName?: string;
  customColor?: string; // couleur hex personnalisée (override source color)
}

export type ViewMode = "day" | "week" | "month";

export const SOURCE_COLORS: Record<CalendarSource, string> = {
  google: "bg-monprojetpro-orange/20 border-monprojetpro-orange text-monprojetpro-orange",
  calcom: "bg-purple-500/20 border-purple-400 text-purple-400",
  ical: "bg-blue-500/20 border-blue-400 text-blue-400",
};

export const SOURCE_LABELS: Record<CalendarSource, string> = {
  google: "Google Calendar",
  calcom: "Cal.com",
  ical: "iCal",
};
