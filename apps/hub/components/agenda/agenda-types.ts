export type CalendarSource = "monprojetpro" | "perso" | "google" | "calcom" | "ical";
export type ClientType = "lab" | "one";

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
  clientType?: ClientType;
  clientName?: string;
  customColor?: string; // couleur hex personnalisée (override source color)
}

export interface CalendarFilter {
  monprojetpro: boolean;
  perso: boolean;
  google: boolean;
  calcom: boolean;
}

export type ViewMode = "day" | "week" | "month";

export const SOURCE_COLORS: Record<CalendarSource, string> = {
  monprojetpro: "bg-monprojetpro-blue/20 border-monprojetpro-blue text-monprojetpro-blue",
  perso: "bg-monprojetpro-green/20 border-monprojetpro-green text-monprojetpro-green",
  google: "bg-monprojetpro-orange/20 border-monprojetpro-orange text-monprojetpro-orange",
  calcom: "bg-purple-500/20 border-purple-400 text-purple-400",
};

export const SOURCE_DOT_COLORS: Record<CalendarSource, string> = {
  monprojetpro: "bg-monprojetpro-blue",
  perso: "bg-monprojetpro-green",
  google: "bg-monprojetpro-orange",
  calcom: "bg-purple-400",
};

export const SOURCE_LABELS: Record<CalendarSource, string> = {
  monprojetpro: "FOXEO RDV",
  perso: "Perso",
  google: "Google Calendar",
  calcom: "Cal.com",
};
