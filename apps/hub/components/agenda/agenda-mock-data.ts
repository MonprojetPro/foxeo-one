import { CalendarEvent } from "./agenda-types";
import { addDays, startOfWeek } from "date-fns";

const weekStart = startOfWeek(new Date(), { weekStartsOn: 1 });

export const MOCK_EVENTS: CalendarEvent[] = [
  {
    id: "1",
    title: "Visio Pierre",
    subtitle: "Validation logo",
    date: addDays(weekStart, 1),
    startHour: 10,
    startMinute: 30,
    endHour: 11,
    endMinute: 30,
    source: "monprojetpro",
    clientType: "lab",
    clientName: "Pierre Moreau",
  },
  {
    id: "2",
    title: "Visio Garage Dupont",
    subtitle: "Suivi mensuel",
    date: addDays(weekStart, 1),
    startHour: 14,
    startMinute: 0,
    endHour: 15,
    endMinute: 0,
    source: "monprojetpro",
    clientType: "one",
    clientName: "Garage Dupont",
  },
  {
    id: "3",
    title: "Sport",
    date: addDays(weekStart, 2),
    startHour: 9,
    startMinute: 0,
    endHour: 10,
    endMinute: 0,
    source: "perso",
  },
  {
    id: "4",
    title: "Call partenaire",
    subtitle: "Google Calendar",
    date: addDays(weekStart, 3),
    startHour: 16,
    startMinute: 0,
    endHour: 17,
    endMinute: 0,
    source: "google",
  },
];
