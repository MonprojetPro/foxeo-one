'use client'
import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input } from "@monprojetpro/ui";
import { Check, X, Loader2, ExternalLink, Plus, Trash2 } from "lucide-react";
import { getCalendarStatus, disconnectCalendar, connectCalcom, connectIcal, CalendarStatus, IcalFeed } from "../../app/(dashboard)/modules/agenda/actions/calendar";
import { showSuccess, showError } from "@monprojetpro/ui";

interface CalendarSettingsProps {
  open: boolean;
  onClose: () => void;
  onStatusChange?: (status: CalendarStatus) => void;
}

const PRESET_COLORS = [
  "#06b6d4", // cyan
  "#3b82f6", // bleu
  "#a855f7", // violet
  "#ec4899", // rose
  "#ef4444", // rouge
  "#f97316", // orange
  "#eab308", // jaune
  "#22c55e", // vert
];

export function CalendarSettings({ open, onClose, onStatusChange }: CalendarSettingsProps) {
  const [status, setStatus] = useState<CalendarStatus>({ googleAccounts: [], calcom: false, icalFeeds: [] });
  const [calcomUrl, setCalcomUrl] = useState("cal.com/mikl-monprojetpro");
  const [loading, setLoading] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Formulaire "ajouter un compte Google"
  const [showAddForm, setShowAddForm] = useState(false);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState(PRESET_COLORS[0]);

  // Formulaire "ajouter un flux iCal"
  const [showAddIcalForm, setShowAddIcalForm] = useState(false);
  const [icalUrl, setIcalUrl] = useState("");
  const [icalLabel, setIcalLabel] = useState("");
  const [icalColor, setIcalColor] = useState(PRESET_COLORS[3]);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getCalendarStatus().then(({ data }) => {
      if (data) {
        setStatus(data);
        if (data.calcomUrl) setCalcomUrl(data.calcomUrl);
      }
      setLoading(false);
    });
  }, [open]);

  function handleConnectGoogle() {
    if (!newLabel.trim()) return;
    const params = new URLSearchParams({ label: newLabel.trim(), color: newColor });
    window.location.href = `/api/auth/google-calendar?${params.toString()}`;
  }

  async function handleDisconnectGoogle(label: string) {
    startTransition(async () => {
      const { error } = await disconnectCalendar("google", label);
      if (error) { showError(`Erreur: ${error}`); return; }
      const newStatus = {
        ...status,
        googleAccounts: status.googleAccounts.filter(a => a.label !== label),
      };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      showSuccess(`"${label}" déconnecté`);
    });
  }

  async function handleConnectCalcom() {
    const url = calcomUrl.trim();
    if (!url) return;
    startTransition(async () => {
      const { error } = await connectCalcom(url);
      if (error) { showError(`Erreur: ${error}`); return; }
      const newStatus = { ...status, calcom: true, calcomUrl: url };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      showSuccess("Cal.com connecté");
    });
  }

  async function handleConnectIcal() {
    if (!icalUrl.trim() || !icalLabel.trim()) return;
    startTransition(async () => {
      const { error } = await connectIcal(icalUrl.trim(), icalLabel.trim(), icalColor);
      if (error) { showError(`Erreur: ${error}`); return; }
      const newFeed: IcalFeed = { label: icalLabel.trim(), color: icalColor, url: icalUrl.trim() };
      const newStatus = { ...status, icalFeeds: [...(status.icalFeeds ?? []), newFeed] };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      showSuccess(`Flux "${icalLabel.trim()}" connecté`);
      setShowAddIcalForm(false);
      setIcalUrl("");
      setIcalLabel("");
      setIcalColor(PRESET_COLORS[3]);
    });
  }

  async function handleDisconnectIcal(label: string) {
    startTransition(async () => {
      const { error } = await disconnectCalendar("ical", label);
      if (error) { showError(`Erreur: ${error}`); return; }
      const newStatus = { ...status, icalFeeds: (status.icalFeeds ?? []).filter(f => f.label !== label) };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      showSuccess(`Flux "${label}" déconnecté`);
    });
  }

  async function handleDisconnectCalcom() {
    startTransition(async () => {
      const { error } = await disconnectCalendar("calcom");
      if (error) { showError(`Erreur: ${error}`); return; }
      const newStatus = { ...status, calcom: false, calcomUrl: undefined };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      showSuccess("Cal.com déconnecté");
    });
  }

  const busy = loading || isPending;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Synchronisation Calendriers</DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">

            {/* Comptes Google connectés */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Google Calendar</p>

              {status.googleAccounts.length === 0 && !showAddForm && (
                <p className="text-xs text-muted-foreground">Aucun compte connecté.</p>
              )}

              {status.googleAccounts.map(account => (
                <div key={account.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{account.label}</p>
                    {account.email && (
                      <p className="text-[10px] text-muted-foreground truncate">{account.email}</p>
                    )}
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                    <Check className="h-3 w-3" />Connecté
                  </span>
                  <button
                    onClick={() => handleDisconnectGoogle(account.label)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {/* Formulaire ajouter */}
              {showAddForm ? (
                <div className="p-3 rounded-lg border border-border bg-secondary/50 space-y-3">
                  <Input
                    value={newLabel}
                    onChange={e => setNewLabel(e.target.value)}
                    placeholder="Nom du calendrier (ex: Pro, Perso, Client...)"
                    className="text-xs"
                    autoFocus
                  />
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Couleur</p>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewColor(c)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: newColor === c ? "white" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default" size="sm" className="flex-1"
                      onClick={handleConnectGoogle}
                      disabled={!newLabel.trim() || busy}
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Connecter via Google
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setShowAddForm(false); setNewLabel(""); setNewColor(PRESET_COLORS[0]); }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddForm(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un compte Google Calendar
                </button>
              )}
            </div>

            <div className="border-t border-border" />

            {/* Cal.com */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Cal.com</p>
              <div className="p-3 rounded-lg bg-secondary space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">Cal.com</p>
                  {status.calcom
                    ? <span className="flex items-center gap-1 text-[10px] text-green-400"><Check className="h-3 w-3" />Connecté</span>
                    : <span className="flex items-center gap-1 text-[10px] text-muted-foreground"><X className="h-3 w-3" />Non connecté</span>
                  }
                </div>
                <p className="text-[11px] text-muted-foreground">
                  Les RDV clients Cal.com apparaissent automatiquement dans l&apos;agenda.
                </p>
                {!status.calcom && (
                  <Input value={calcomUrl} onChange={e => setCalcomUrl(e.target.value)}
                    placeholder="cal.com/votre-url" className="text-xs" disabled={busy} />
                )}
                {status.calcom ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground">URL : {status.calcomUrl}</p>
                    <p className="text-[10px] text-muted-foreground break-all">
                      Webhook :{" "}
                      <span className="font-mono text-foreground">
                        {typeof window !== 'undefined' ? window.location.origin : ''}/api/webhooks/cal-com
                      </span>
                    </p>
                    <Button variant="outline" size="sm" className="w-full text-destructive hover:text-destructive"
                      onClick={handleDisconnectCalcom} disabled={busy}>
                      {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Déconnecter Cal.com
                    </Button>
                  </div>
                ) : (
                  <Button variant="default" size="sm" className="w-full"
                    onClick={handleConnectCalcom} disabled={busy || !calcomUrl.trim()}>
                    {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                    Connecter Cal.com
                  </Button>
                )}
              </div>
            </div>

            <div className="border-t border-border" />

            {/* iCal */}
            <div className="space-y-2">
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground font-medium">Flux iCal (.ics)</p>

              {(status.icalFeeds ?? []).length === 0 && !showAddIcalForm && (
                <p className="text-xs text-muted-foreground">Aucun flux connecté.</p>
              )}

              {(status.icalFeeds ?? []).map(feed => (
                <div key={feed.label} className="flex items-center gap-3 p-3 rounded-lg bg-secondary">
                  <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: feed.color }} />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-foreground truncate">{feed.label}</p>
                    <p className="text-[10px] text-muted-foreground truncate">{feed.url}</p>
                  </div>
                  <span className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                    <Check className="h-3 w-3" />Connecté
                  </span>
                  <button
                    onClick={() => handleDisconnectIcal(feed.label)}
                    disabled={busy}
                    className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              ))}

              {showAddIcalForm ? (
                <div className="p-3 rounded-lg border border-border bg-secondary/50 space-y-3">
                  <Input
                    value={icalUrl}
                    onChange={e => setIcalUrl(e.target.value)}
                    placeholder="https://... ou webcal://..."
                    className="text-xs"
                    autoFocus
                  />
                  <Input
                    value={icalLabel}
                    onChange={e => setIcalLabel(e.target.value)}
                    placeholder="Nom du calendrier (ex: Vacances, Fêtes...)"
                    className="text-xs"
                  />
                  <div className="space-y-1">
                    <p className="text-[10px] text-muted-foreground">Couleur</p>
                    <div className="flex gap-2 flex-wrap">
                      {PRESET_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setIcalColor(c)}
                          className="w-6 h-6 rounded-full border-2 transition-all"
                          style={{
                            backgroundColor: c,
                            borderColor: icalColor === c ? "white" : "transparent",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      variant="default" size="sm" className="flex-1"
                      onClick={handleConnectIcal}
                      disabled={!icalUrl.trim() || !icalLabel.trim() || busy}
                    >
                      {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      Connecter
                    </Button>
                    <Button
                      variant="outline" size="sm"
                      onClick={() => { setShowAddIcalForm(false); setIcalUrl(""); setIcalLabel(""); setIcalColor(PRESET_COLORS[3]); }}
                    >
                      Annuler
                    </Button>
                  </div>
                </div>
              ) : (
                <button
                  onClick={() => setShowAddIcalForm(true)}
                  className="flex items-center gap-1.5 text-xs text-primary hover:text-primary/80 transition-colors"
                >
                  <Plus className="h-3.5 w-3.5" />
                  Ajouter un flux iCal
                </button>
              )}
            </div>

          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
