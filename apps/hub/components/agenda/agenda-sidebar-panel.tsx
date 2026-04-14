'use client'
import { Settings, Sparkles, Send, Loader2, ExternalLink, Check, X, CalendarPlus } from "lucide-react";
import Link from "next/link";
import { cn } from "@monprojetpro/utils";
import { useState } from "react";
import { format } from "date-fns";
import { fr } from "date-fns/locale";
import { newConversation, sendToElio, saveElioMessage } from "@monprojetpro/module-elio";
import { createGoogleCalendarEvent } from "@/app/(dashboard)/modules/agenda/actions/calendar";

interface DynamicFilter {
  key: string;
  label: string;
  color: string;
  enabled: boolean;
}

interface PendingEventAction {
  title: string;
  date: string;        // YYYY-MM-DD
  startHour: number;
  startMinute: number;
  endHour: number;
  endMinute: number;
  label?: string;      // compte Google
  subtitle?: string;
}

interface AgendaSidebarPanelProps {
  filters: DynamicFilter[];
  onToggleFilter: (key: string) => void;
  onOpenSettings: () => void;
  userId: string;
  events: CalendarEvent[];
  currentDate: Date;
  googleAccounts: { label: string; color: string }[];
  onEventCreated: () => Promise<void>;
}

const ELIO_CHIPS = ["Planifie un RDV avec...", "Bloque du temps perso", "Résume ma semaine"];

function buildCalendarContext(events: CalendarEvent[], currentDate: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  const weekLabel = format(currentDate, "'semaine du' d MMMM yyyy", { locale: fr });
  if (events.length === 0) return `Agenda (${weekLabel}) : aucun événement.`;
  const lines = events
    .slice()
    .sort((a, b) => a.date.getTime() - b.date.getTime() || a.startHour - b.startHour)
    .map(e => {
      const day = format(e.date, "EEEE d MMMM", { locale: fr });
      const who = e.clientName ? ` avec ${e.clientName}` : "";
      const sub = e.subtitle ? ` (${e.subtitle})` : "";
      return `- ${day} ${pad(e.startHour)}h${pad(e.startMinute)}-${pad(e.endHour)}h${pad(e.endMinute)} : ${e.title}${who}${sub}`;
    });
  return `Agenda (${weekLabel}) :\n${lines.join("\n")}`;
}

function buildAgentInstructions(googleAccounts: { label: string }[], currentDate: Date): string {
  const today = format(currentDate, "EEEE d MMMM yyyy", { locale: fr });
  const accounts = googleAccounts.length > 0
    ? `Comptes Google disponibles : ${googleAccounts.map(a => `"${a.label}"`).join(", ")}.`
    : "Aucun compte Google connecté.";

  return `Tu es Élio Agenda, assistant de MiKL pour gérer son agenda.
Aujourd'hui : ${today}.
${accounts}

Si l'utilisateur veut créer un événement, réponds en deux parties :
1. Un message naturel confirmant ce que tu vas faire (ex: "Je crée ce RDV pour toi :")
2. Sur la dernière ligne, un bloc JSON préfixé par ÉLIO_ACTION: (sans espace) avec ce format exact :
ÉLIO_ACTION:{"action":"create_event","title":"...","date":"YYYY-MM-DD","startHour":N,"startMinute":N,"endHour":N,"endMinute":N,"label":"${googleAccounts[0]?.label ?? ""}","subtitle":"..."}

Règles JSON :
- date au format YYYY-MM-DD (utilise la date correcte selon "aujourd'hui")
- startHour/endHour en entier 0-23, startMinute/endMinute en entier 0 ou 30
- label = nom du compte Google à utiliser (laisser vide si aucun)
- subtitle optionnel (description courte)
- Réponds en texte brut sans markdown (sans **, sans *, sans #)`;
}

/** Extrait le JSON ÉLIO_ACTION de la réponse et retourne {text, action} */
function parseElioResponse(raw: string): { text: string; action: PendingEventAction | null } {
  const marker = "ÉLIO_ACTION:";
  const idx = raw.indexOf(marker);
  if (idx === -1) return { text: raw.trim(), action: null };

  const text = raw.slice(0, idx).trim();
  const jsonStr = raw.slice(idx + marker.length).trim();
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.action === "create_event" && parsed.title && parsed.date) {
      return { text, action: parsed as PendingEventAction };
    }
  } catch {
    // JSON invalide → on ignore l'action
  }
  return { text, action: null };
}

export function AgendaSidebarPanel({
  filters, onToggleFilter, onOpenSettings,
  events, currentDate, googleAccounts, onEventCreated
}: AgendaSidebarPanelProps) {
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [reply, setReply] = useState<string | null>(null);
  const [pendingAction, setPendingAction] = useState<PendingEventAction | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);

  const reset = () => { setReply(null); setPendingAction(null); setError(null); setExpanded(false); };

  const handleSend = async (text: string) => {
    const msg = text.trim();
    if (!msg || isLoading) return;
    setInput("");
    reset();
    setIsLoading(true);

    const { data: conv } = await newConversation("hub");
    if (!conv) { setError("Impossible de contacter Élio"); setIsLoading(false); return; }

    const calCtx = buildCalendarContext(events, currentDate);
    const agentInstructions = buildAgentInstructions(googleAccounts, currentDate);
    const fullMessage = `${agentInstructions}\n\n${calCtx}\n\nDemande : ${msg}`;

    await saveElioMessage(conv.id, "user", msg);
    const { data: res, error: err } = await sendToElio("hub", fullMessage);
    setIsLoading(false);

    if (err) { setError(err.message); return; }
    if (res) {
      const { text: displayText, action } = parseElioResponse(res.content);
      await saveElioMessage(conv.id, "assistant", res.content);
      setReply(displayText || null);
      setPendingAction(action);
    }
  };

  const handleConfirmEvent = async () => {
    if (!pendingAction) return;
    setIsCreating(true);

    const pad = (n: number) => String(n).padStart(2, "0");
    const label = pendingAction.label || googleAccounts[0]?.label || "";

    if (!label) {
      setError("Aucun compte Google connecté. Connecte un compte dans Paramètres des calendriers.");
      setIsCreating(false);
      setPendingAction(null);
      return;
    }

    const { data, error: createErr } = await createGoogleCalendarEvent({
      label,
      title: pendingAction.title,
      date: pendingAction.date,
      startHour: pendingAction.startHour,
      startMinute: pendingAction.startMinute,
      endHour: pendingAction.endHour,
      endMinute: pendingAction.endMinute,
    });

    setIsCreating(false);

    if (createErr || !data) {
      setError(createErr ?? "Erreur lors de la création");
      setPendingAction(null);
      return;
    }

    // Recharger les événements Google pour afficher le nouvel événement
    await onEventCreated();

    setPendingAction(null);
    setReply(`✓ "${pendingAction.title}" créé dans ton agenda Google.`);
  };

  return (
    <aside className="w-[200px] flex flex-col border-r border-border bg-sidebar shrink-0">
      {/* Filtres calendriers */}
      <div className="px-4 pt-5 pb-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground font-medium mb-2">Mes Calendriers</p>
        <div className="space-y-1.5">
          {filters.map(f => (
            <label key={f.key} className="flex items-center gap-2 text-xs cursor-pointer group">
              <input type="checkbox" checked={f.enabled} onChange={() => onToggleFilter(f.key)} className="sr-only" />
              <span
                className={cn("w-3 h-3 rounded-sm border flex items-center justify-center shrink-0 transition-colors",
                  f.enabled ? "border-transparent" : "border-border bg-transparent")}
                style={f.enabled ? { backgroundColor: f.color } : {}}
              >
                {f.enabled && <span className="text-[8px] text-background font-bold">✓</span>}
              </span>
              <span className="text-secondary-foreground group-hover:text-foreground transition-colors truncate">{f.label}</span>
            </label>
          ))}
        </div>
        <button onClick={onOpenSettings} className="flex items-center gap-1.5 text-[11px] text-muted-foreground hover:text-primary transition-colors mt-3">
          <Settings className="h-3 w-3" />Paramètres des calendriers
        </button>
      </div>

      <div className="flex-1" />

      {/* Widget Élio Agenda */}
      <div className="m-3 p-3 rounded-lg bg-card border border-border">
        {/* Header */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-1.5">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-xs font-semibold text-foreground">Élio Agenda</span>
          </div>
          <Link href="/modules/elio" className="text-muted-foreground hover:text-primary transition-colors" title="Ouvrir Élio">
            <ExternalLink className="h-3 w-3" />
          </Link>
        </div>

        {/* Chargement */}
        {(isLoading || isCreating) && (
          <div className="flex items-center gap-1.5 mb-2">
            <Loader2 className="h-3 w-3 text-primary animate-spin shrink-0" />
            <span className="text-[11px] text-muted-foreground italic">
              {isCreating ? "Création en cours…" : "Élio réfléchit…"}
            </span>
          </div>
        )}

        {/* Réponse texte */}
        {!isLoading && reply && (
          <div className="mb-2">
            <p className={cn("text-[11px] text-foreground/80 leading-relaxed", !expanded && "line-clamp-3")}>
              {reply}
            </p>
            <div className="flex items-center gap-2 mt-1">
              <button onClick={() => setExpanded(v => !v)} className="text-[10px] text-primary hover:underline">
                {expanded ? "Réduire" : "Voir tout"}
              </button>
              <button onClick={reset} className="text-[10px] text-muted-foreground hover:text-foreground transition-colors">
                × Nouvelle question
              </button>
            </div>
          </div>
        )}

        {/* Card de confirmation d'action */}
        {!isLoading && !isCreating && pendingAction && (
          <div className="mb-2 rounded-md border border-primary/30 bg-primary/5 p-2">
            <div className="flex items-center gap-1.5 mb-1.5">
              <CalendarPlus className="h-3 w-3 text-primary shrink-0" />
              <span className="text-[11px] font-semibold text-primary">Créer cet événement ?</span>
            </div>
            <p className="text-[11px] text-foreground font-medium leading-snug mb-0.5">{pendingAction.title}</p>
            {pendingAction.subtitle && (
              <p className="text-[10px] text-muted-foreground mb-0.5">{pendingAction.subtitle}</p>
            )}
            <p className="text-[10px] text-muted-foreground mb-2">
              {format(new Date(pendingAction.date + "T00:00:00"), "EEEE d MMMM", { locale: fr })}
              {" "}·{" "}
              {String(pendingAction.startHour).padStart(2,"0")}h{String(pendingAction.startMinute).padStart(2,"0")}
              {" – "}
              {String(pendingAction.endHour).padStart(2,"0")}h{String(pendingAction.endMinute).padStart(2,"0")}
            </p>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => void handleConfirmEvent()}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md bg-primary text-primary-foreground hover:bg-primary/85 transition-colors"
              >
                <Check className="h-2.5 w-2.5" />Confirmer
              </button>
              <button
                onClick={reset}
                className="flex items-center gap-1 text-[10px] px-2 py-1 rounded-md border border-border text-muted-foreground hover:text-foreground transition-colors"
              >
                <X className="h-2.5 w-2.5" />Annuler
              </button>
            </div>
          </div>
        )}

        {/* Erreur */}
        {!isLoading && error && (
          <p className="text-[11px] text-destructive/80 leading-relaxed mb-2">{error}</p>
        )}

        {/* Suggestions (seulement si pas de réponse ni d'action en attente) */}
        {!isLoading && !reply && !pendingAction && !error && (
          <>
            <p className="text-[10px] text-muted-foreground mb-1.5">Suggestions :</p>
            <div className="flex flex-wrap gap-1 mb-2.5">
              {ELIO_CHIPS.map(chip => (
                <button
                  key={chip}
                  onClick={() => void handleSend(chip)}
                  className="text-[10px] px-2 py-0.5 rounded-full border border-border text-muted-foreground hover:text-primary hover:border-primary/30 transition-colors"
                >
                  {chip}
                </button>
              ))}
            </div>
          </>
        )}

        {/* Input */}
        <div className="flex items-center gap-1 bg-secondary rounded-md">
          <input
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === "Enter") void handleSend(input); }}
            placeholder="Demander à Élio..."
            disabled={isLoading || isCreating}
            className="flex-1 bg-transparent text-[11px] px-2 py-1.5 outline-none text-foreground placeholder:text-muted-foreground disabled:opacity-50"
          />
          <button
            onClick={() => void handleSend(input)}
            disabled={!input.trim() || isLoading || isCreating}
            className="p-1.5 text-primary hover:text-primary/80 transition-colors disabled:opacity-40"
          >
            {isLoading ? <Loader2 className="h-3 w-3 animate-spin" /> : <Send className="h-3 w-3" />}
          </button>
        </div>
      </div>
    </aside>
  );
}
