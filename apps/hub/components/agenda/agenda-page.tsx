'use client'
import { useState, useEffect, useCallback, useRef } from "react";
import { addWeeks, subWeeks, addDays, subDays, addMonths, subMonths, startOfWeek, endOfWeek, startOfMonth, endOfMonth, format } from "date-fns";
import { fr } from "date-fns/locale";
import { Plus, ChevronLeft, ChevronRight, RefreshCw } from "lucide-react";
import { Button, toast } from "@monprojetpro/ui";
import { AgendaSidebarPanel } from "./agenda-sidebar-panel";
import { WeekView } from "./week-view";
import { DayView } from "./day-view";
import { MonthView } from "./month-view";
import { LaunchDialog } from "./launch-dialog";
import { NewRdvDialog } from "./new-rdv-dialog";
import { CalendarSettings } from "./calendar-settings";
import { MOCK_EVENTS } from "./agenda-mock-data";
import { CalendarEvent, ViewMode, SOURCE_DOT_COLORS, SOURCE_LABELS } from "./agenda-types";
import { getGoogleCalendarEvents, getCalcomBookings, getCalendarStatus, getIcalEvents, deleteGoogleCalendarEvent, type ExternalCalendarEvent, type CalendarStatus } from "../../app/(dashboard)/modules/agenda/actions/calendar";
import { useSearchParams } from "next/navigation";

// Filtre dynamique : une entrée par compte Google connecté + calcom
interface DynamicFilter {
  key: string;       // "monprojetpro" | "perso" | "calcom" | label du compte Google
  label: string;
  color: string;     // hex ou classe Tailwind
  enabled: boolean;
}

function externalToCalendarEvent(e: ExternalCalendarEvent): CalendarEvent {
  const start = new Date(e.startTime);
  const end = new Date(e.endTime);
  return {
    id: e.id,
    title: e.title,
    subtitle: e.subtitle,
    date: start,
    startHour: start.getHours(),
    startMinute: start.getMinutes(),
    endHour: end.getHours(),
    endMinute: end.getMinutes(),
    source: e.source === 'calcom' ? 'calcom' : 'google',
    clientName: e.attendeeName,
    customColor: e.customColor,
  };
}

function getWindowForView(date: Date, viewMode: ViewMode): { from: string; to: string } {
  if (viewMode === "week") {
    const ws = startOfWeek(date, { weekStartsOn: 1 });
    const we = endOfWeek(date, { weekStartsOn: 1 });
    return { from: ws.toISOString(), to: we.toISOString() };
  }
  if (viewMode === "day") {
    const start = new Date(date); start.setHours(0, 0, 0, 0);
    const end = new Date(date); end.setHours(23, 59, 59, 999);
    return { from: start.toISOString(), to: end.toISOString() };
  }
  return { from: startOfMonth(date).toISOString(), to: endOfMonth(date).toISOString() };
}

const BASE_FILTERS: DynamicFilter[] = [
  { key: "monprojetpro", label: SOURCE_LABELS.monprojetpro, color: "#06b6d4", enabled: true },
  { key: "perso", label: SOURCE_LABELS.perso, color: "#22c55e", enabled: true },
];

export function AgendaPage({ userId }: { userId: string }) {
  const searchParams = useSearchParams();
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<ViewMode>("week");
  const [baseEvents] = useState<CalendarEvent[]>(MOCK_EVENTS);
  const [externalEvents, setExternalEvents] = useState<CalendarEvent[]>([]);
  const [localEvents, setLocalEvents] = useState<CalendarEvent[]>([]);
  const [calendarStatus, setCalendarStatus] = useState<CalendarStatus>({ googleAccounts: [], calcom: false, icalFeeds: [] });
  const [filters, setFilters] = useState<DynamicFilter[]>(BASE_FILTERS);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [launchEvent, setLaunchEvent] = useState<CalendarEvent | null>(null);
  const [showNewRdv, setShowNewRdv] = useState(false);
  const [newRdvSlot, setNewRdvSlot] = useState<{ date: Date; hour: number } | null>(null);
  const [showSettings, setShowSettings] = useState(false);
  const [showPopover, setShowPopover] = useState(false);
  const [editEvent, setEditEvent] = useState<CalendarEvent | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const syncIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Reconstruire les filtres dynamiques quand le status change
  const rebuildFilters = useCallback((status: CalendarStatus) => {
    setFilters(prev => {
      const base = BASE_FILTERS.map(f => ({
        ...f,
        enabled: prev.find(p => p.key === f.key)?.enabled ?? true,
      }));

      const googleFilters: DynamicFilter[] = status.googleAccounts.map(a => ({
        key: `google:${a.label}`,
        label: a.label,
        color: a.color,
        enabled: prev.find(p => p.key === `google:${a.label}`)?.enabled ?? true,
      }));

      const calcomFilter: DynamicFilter[] = status.calcom ? [{
        key: "calcom",
        label: SOURCE_LABELS.calcom,
        color: "#a855f7",
        enabled: prev.find(p => p.key === "calcom")?.enabled ?? true,
      }] : [];

      const icalFilters: DynamicFilter[] = (status.icalFeeds ?? []).map(f => ({
        key: `ical:${f.label}`,
        label: f.label,
        color: f.color,
        enabled: prev.find(p => p.key === `ical:${f.label}`)?.enabled ?? true,
      }));

      return [...base, ...googleFilters, ...calcomFilter, ...icalFilters];
    });
  }, []);

  // Charger le status au montage
  useEffect(() => {
    getCalendarStatus().then(({ data }) => {
      if (data) {
        setCalendarStatus(data);
        rebuildFilters(data);
      }
    });
  }, [rebuildFilters]);

  // Notification après OAuth redirect
  useEffect(() => {
    const connected = searchParams.get("calendar_connected");
    const error = searchParams.get("calendar_error");
    if (connected === "google") {
      const label = searchParams.get("label") ?? "";
      toast.success(`"${label}" connecté ! Chargement des événements...`);
      // Recharger le status
      getCalendarStatus().then(({ data }) => {
        if (data) { setCalendarStatus(data); rebuildFilters(data); }
      });
    }
    if (error) {
      const messages: Record<string, string> = {
        access_denied: "Connexion Google annulée",
        invalid_state: "Erreur de sécurité — réessayez",
        token_exchange_failed: "Impossible d'obtenir les tokens Google",
        not_configured: "Google OAuth non configuré",
        not_authenticated: "Vous devez être connecté",
        db_error: "Erreur lors de la sauvegarde",
        unexpected: "Erreur inattendue",
      };
      toast.error(messages[error] ?? "Erreur lors de la connexion");
    }
  }, [searchParams, rebuildFilters]);

  // Charger les événements externes
  const loadExternalEvents = useCallback(async () => {
    const { from, to } = getWindowForView(currentDate, viewMode);
    const results: CalendarEvent[] = [];

    if (calendarStatus.googleAccounts.length > 0) {
      const { data, error } = await getGoogleCalendarEvents(from, to, calendarStatus.googleAccounts);
      if (error) toast.error(error);
      results.push(...data.map(externalToCalendarEvent));
    }
    if (calendarStatus.calcom) {
      const { data } = await getCalcomBookings(from, to);
      results.push(...data.map(externalToCalendarEvent));
    }
    if (calendarStatus.icalFeeds.length > 0) {
      const { data } = await getIcalEvents(from, to, calendarStatus.icalFeeds);
      results.push(...data.map(externalToCalendarEvent));
    }

    setExternalEvents(results);
  }, [currentDate, viewMode, calendarStatus]);

  useEffect(() => { loadExternalEvents(); }, [loadExternalEvents]);

  // Auto-refresh toutes les 5 minutes
  useEffect(() => {
    syncIntervalRef.current = setInterval(() => { void loadExternalEvents(); }, 5 * 60 * 1000);
    return () => { if (syncIntervalRef.current) clearInterval(syncIntervalRef.current); };
  }, [loadExternalEvents]);

  // Refresh quand l'onglet redevient visible
  useEffect(() => {
    const handleVisibility = () => { if (document.visibilityState === 'visible') void loadExternalEvents(); };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [loadExternalEvents]);

  const handleManualSync = async () => {
    setIsSyncing(true);
    await loadExternalEvents();
    setIsSyncing(false);
  };

  // Filtrer les événements selon les filtres actifs
  const enabledKeys = new Set(filters.filter(f => f.enabled).map(f => f.key));

  const allEvents = [...baseEvents, ...externalEvents, ...localEvents].filter(e => {
    if (e.source === "monprojetpro") return enabledKeys.has("monprojetpro");
    if (e.source === "perso") return enabledKeys.has("perso");
    if (e.source === "calcom") return enabledKeys.has("calcom");
    if (e.source === "google") {
      const matchingFilter = filters.find(f => f.key.startsWith("google:") && e.customColor === f.color);
      return matchingFilter ? matchingFilter.enabled : enabledKeys.has("monprojetpro");
    }
    if (e.source === "ical") {
      const matchingFilter = filters.find(f => f.key.startsWith("ical:") && e.customColor === f.color);
      return matchingFilter ? matchingFilter.enabled : true;
    }
    return true;
  });

  const goPrev = () => {
    if (viewMode === "week") setCurrentDate(d => subWeeks(d, 1));
    else if (viewMode === "day") setCurrentDate(d => subDays(d, 1));
    else setCurrentDate(d => subMonths(d, 1));
  };

  const goNext = () => {
    if (viewMode === "week") setCurrentDate(d => addWeeks(d, 1));
    else if (viewMode === "day") setCurrentDate(d => addDays(d, 1));
    else setCurrentDate(d => addMonths(d, 1));
  };

  const getDateLabel = () => {
    if (viewMode === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 1 });
      const we = addDays(ws, 6);
      return `${format(ws, "d")} - ${format(we, "d MMMM yyyy", { locale: fr })}`;
    }
    if (viewMode === "day") return format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
    return format(currentDate, "MMMM yyyy", { locale: fr });
  };

  const handleEventClick = (event: CalendarEvent) => { setSelectedEvent(event); setShowPopover(true); };

  const handleDeleteEvent = (id: string) => {
    setLocalEvents(prev => prev.filter(e => e.id !== id));
    setExternalEvents(prev => prev.filter(e => e.id !== id));
    setShowPopover(false); setSelectedEvent(null);
    toast.success("Événement supprimé");
  };

  const handleCreateEvent = (event: CalendarEvent) => setLocalEvents(prev => [...prev, event]);

  const toggleFilter = (key: string) => {
    setFilters(prev => prev.map(f => f.key === key ? { ...f, enabled: !f.enabled } : f));
  };

  return (
    <div className="flex overflow-hidden" style={{ height: 'calc(100vh - 64px)' }}>
      <AgendaSidebarPanel
        filters={filters}
        onToggleFilter={toggleFilter}
        onOpenSettings={() => setShowSettings(true)}
        userId={userId}
        events={allEvents}
        currentDate={currentDate}
        googleAccounts={calendarStatus.googleAccounts}
        onEventCreated={loadExternalEvents}
      />

      <main className="flex-1 flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-border shrink-0">
          <h1 className="text-2xl font-bold text-foreground">Agenda</h1>
          <div className="flex items-center gap-3">
            <div className="hidden lg:flex items-center gap-3 mr-4">
              {filters.map(f => (
                <div key={f.key} className="flex items-center gap-1.5">
                  <span className="w-2 h-2 rounded-full" style={{ backgroundColor: f.color }} />
                  <span className="text-[10px] text-muted-foreground">{f.label}</span>
                </div>
              ))}
            </div>
            <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => void handleManualSync()} title="Synchroniser">
              <RefreshCw className={`h-4 w-4 ${isSyncing ? 'animate-spin' : ''}`} />
            </Button>
            <Button onClick={() => setShowNewRdv(true)} size="sm">
              <Plus className="h-4 w-4 mr-1" />Nouveau RDV
            </Button>
          </div>
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-border shrink-0">
          <div className="flex items-center gap-1 bg-secondary rounded-md p-0.5">
            {(["day", "week", "month"] as ViewMode[]).map(v => (
              <button key={v} onClick={() => setViewMode(v)}
                className={`px-3 py-1 text-xs rounded transition-colors ${viewMode === v ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"}`}>
                {v === "day" ? "Jour" : v === "week" ? "Semaine" : "Mois"}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goPrev}><ChevronLeft className="h-4 w-4" /></Button>
            <span className="text-sm font-medium text-foreground min-w-[200px] text-center capitalize">{getDateLabel()}</span>
            <Button variant="ghost" size="icon" className="h-7 w-7" onClick={goNext}><ChevronRight className="h-4 w-4" /></Button>
            <Button variant="outline" size="sm" className="text-xs h-7 ml-2" onClick={() => setCurrentDate(new Date())}>Aujourd&apos;hui</Button>
          </div>
          <div className="w-[120px]" />
        </div>

        {/* Calendar View */}
        <div className="flex-1 min-h-0 overflow-hidden">
          {viewMode === "week" && <WeekView currentDate={currentDate} events={allEvents} filters={{ monprojetpro: true, perso: true, google: true, calcom: true }} onEventClick={handleEventClick} onLaunch={setLaunchEvent} onSlotClick={(date, hour) => setNewRdvSlot({ date, hour })} />}
          {viewMode === "day" && <DayView currentDate={currentDate} events={allEvents} filters={{ monprojetpro: true, perso: true, google: true, calcom: true }} onEventClick={handleEventClick} onLaunch={setLaunchEvent} onSlotClick={(date, hour) => setNewRdvSlot({ date, hour })} />}
          {viewMode === "month" && <MonthView currentDate={currentDate} events={allEvents} filters={{ monprojetpro: true, perso: true, google: true, calcom: true }} onEventClick={handleEventClick} onLaunch={setLaunchEvent} />}
        </div>
      </main>

      {/* Event detail popover */}
      {selectedEvent && showPopover && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-background/60" onClick={() => setShowPopover(false)}>
          <div className="bg-card border border-border rounded-lg p-4 w-64 space-y-2" onClick={e => e.stopPropagation()}>
            <p className="text-sm font-medium text-foreground">{selectedEvent.title}</p>
            {selectedEvent.subtitle && <p className="text-[10px] text-muted-foreground">{selectedEvent.subtitle}</p>}
            <p className="text-[11px] text-muted-foreground">
              {`${selectedEvent.startHour.toString().padStart(2, "0")}:${selectedEvent.startMinute.toString().padStart(2, "0")} - ${selectedEvent.endHour.toString().padStart(2, "0")}:${selectedEvent.endMinute.toString().padStart(2, "0")}`}
            </p>
            <div className="flex items-center gap-1.5">
              {selectedEvent.customColor && (
                <span className="w-2 h-2 rounded-full" style={{ backgroundColor: selectedEvent.customColor }} />
              )}
              <p className="text-[10px] text-muted-foreground">{SOURCE_LABELS[selectedEvent.source]}</p>
            </div>
            <div className="flex gap-1.5 pt-1">
              <Button variant="outline" size="sm" className="text-[11px] h-7 flex-1"
                onClick={() => { setEditEvent(selectedEvent); setShowPopover(false); }}>Modifier</Button>
              {(selectedEvent.source === "monprojetpro" || selectedEvent.source === "perso") && (
                <Button variant="outline" size="sm" className="text-[11px] h-7 flex-1 text-destructive hover:text-destructive"
                  onClick={() => handleDeleteEvent(selectedEvent.id)}>Supprimer</Button>
              )}
              {selectedEvent.source === "google" && (
                <Button variant="outline" size="sm" className="text-[11px] h-7 flex-1 text-destructive hover:text-destructive"
                  onClick={async () => {
                    const label = calendarStatus.googleAccounts.find(a => a.color === selectedEvent.customColor)?.label ?? calendarStatus.googleAccounts[0]?.label ?? "";
                    const { error } = await deleteGoogleCalendarEvent(selectedEvent.id, label);
                    if (error) { toast.error(error); return; }
                    toast.success("RDV supprimé");
                    setShowPopover(false);
                    setSelectedEvent(null);
                    await loadExternalEvents();
                  }}>Supprimer</Button>
              )}
              {selectedEvent.source === "monprojetpro" && (
                <Button size="sm" className="text-[11px] h-7 flex-1"
                  onClick={() => { setShowPopover(false); setLaunchEvent(selectedEvent); }}>Lancer</Button>
              )}
            </div>
          </div>
        </div>
      )}

      <LaunchDialog event={launchEvent} open={!!launchEvent} onClose={() => setLaunchEvent(null)} />
      <NewRdvDialog
        open={showNewRdv || !!newRdvSlot}
        onClose={() => { setShowNewRdv(false); setNewRdvSlot(null); }}
        onCreateEvent={handleCreateEvent}
        onRefreshEvents={loadExternalEvents}
        initialDate={newRdvSlot?.date ?? currentDate}
        initialHour={newRdvSlot?.hour}
        googleAccounts={calendarStatus.googleAccounts}
      />
      <NewRdvDialog
        open={!!editEvent}
        onClose={() => setEditEvent(null)}
        onCreateEvent={handleCreateEvent}
        onRefreshEvents={loadExternalEvents}
        googleAccounts={calendarStatus.googleAccounts}
        editEvent={editEvent ?? undefined}
        editGoogleLabel={
          editEvent?.source === "google"
            ? (calendarStatus.googleAccounts.find(a => a.color === editEvent.customColor)?.label ?? calendarStatus.googleAccounts[0]?.label)
            : undefined
        }
      />
      <CalendarSettings
        open={showSettings}
        onClose={() => setShowSettings(false)}
        onStatusChange={status => {
          setCalendarStatus(status);
          rebuildFilters(status);
          if (status.googleAccounts.length === 0) setExternalEvents(prev => prev.filter(e => e.source !== "google"));
          if (!status.calcom) setExternalEvents(prev => prev.filter(e => e.source !== "calcom"));
        }}
      />
    </div>
  );
}
