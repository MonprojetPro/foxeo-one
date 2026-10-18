'use client'
import { useState, useEffect, useTransition } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input } from "@monprojetpro/ui";
import { Check, X, Loader2, ExternalLink, Plus, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { getCalendarStatus, disconnectCalendar, connectCalcom, connectIcal, CalendarStatus, IcalFeed } from "../../app/(dashboard)/modules/agenda/actions/calendar";
import { showSuccess, showError } from "@monprojetpro/ui";

interface CalendarSettingsProps {
  open: boolean;
  onClose: () => void;
  onStatusChange?: (status: CalendarStatus) => void;
}

/**
 * Adresse à coller dans la configuration webhook de Cal.com.
 *
 * Elle est dérivée de l'URL Supabase du projet plutôt qu'écrite en dur : le
 * Hub tourne sur plusieurs environnements, et une adresse figée enverrait les
 * réservations d'une preview vers la base de production.
 */
const calcomWebhookUrl = `${process.env.NEXT_PUBLIC_SUPABASE_URL ?? ''}/functions/v1/calcom-webhook`

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
  // Pas de valeur par defaut devinee ici : un lien pre-rempli au hasard est
  // exactement le defaut qui a laisse cal.com/mikl-foxeo (mort, pre-rebrand)
  // en base pendant des mois sans que personne ne le remarque (T-048).
  const [calcomUrl, setCalcomUrl] = useState("");
  const [calcomRdvOffertUrl, setCalcomRdvOffertUrl] = useState("");
  const [editingCalcomUrl, setEditingCalcomUrl] = useState(false);
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
        if (data.calcomRdvOffertUrl) setCalcomRdvOffertUrl(data.calcomRdvOffertUrl);
      }
      setLoading(false);
    });
  }, [open]);

  function handleConnectGoogle() {
    if (!newLabel.trim()) return;
    const params = new URLSearchParams({ label: newLabel.trim(), color: newColor });
    window.location.href = `/api/auth/google-calendar?${params.toString()}`;
  }

  // Reconnexion : on repasse le MÊME label et la MÊME couleur, donc le compte
  // garde son identité dans l'agenda (le callback fait un upsert sur ce label).
  function handleReconnectGoogle(label: string, color: string) {
    const params = new URLSearchParams({ label, color });
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
    const rdvOffertUrl = calcomRdvOffertUrl.trim();
    startTransition(async () => {
      const { error } = await connectCalcom(url, rdvOffertUrl || undefined);
      if (error) { showError(`Erreur: ${error}`); return; }
      const newStatus = { ...status, calcom: true, calcomUrl: url, calcomRdvOffertUrl: rdvOffertUrl || undefined };
      setStatus(newStatus);
      onStatusChange?.(newStatus);
      setEditingCalcomUrl(false);
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
                <div key={account.label} className="p-3 rounded-lg bg-secondary space-y-2">
                  <div className="flex items-center gap-3">
                    <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: account.color }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-foreground truncate">{account.label}</p>
                      {account.email && (
                        <p className="text-[10px] text-muted-foreground truncate">{account.email}</p>
                      )}
                    </div>
                    {account.needsReconnect ? (
                      <span className="flex items-center gap-1 text-[10px] text-amber-400 shrink-0">
                        <AlertTriangle className="h-3 w-3" />Reconnexion requise
                      </span>
                    ) : (
                      <span className="flex items-center gap-1 text-[10px] text-green-400 shrink-0">
                        <Check className="h-3 w-3" />Connecté
                      </span>
                    )}
                    <button
                      onClick={() => handleDisconnectGoogle(account.label)}
                      disabled={busy}
                      className="text-muted-foreground hover:text-destructive transition-colors shrink-0"
                      aria-label={`Supprimer le calendrier ${account.label}`}
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  </div>

                  {account.needsReconnect && (
                    <div className="space-y-2">
                      <p className="text-[11px] text-muted-foreground">
                        Google a révoqué l&apos;autorisation de ce compte : ses rendez-vous n&apos;apparaissent plus dans l&apos;agenda.
                      </p>
                      <Button
                        variant="default" size="sm" className="w-full"
                        onClick={() => handleReconnectGoogle(account.label, account.color)}
                        disabled={busy}
                      >
                        <RefreshCw className="h-3 w-3 mr-1" />
                        Reconnecter {account.label}
                      </Button>
                    </div>
                  )}
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
                  Les RDV clients Cal.com apparaissent automatiquement dans l&apos;agenda. Saisis l&apos;URL complète avec l&apos;event-type (ex&nbsp;: <span className="font-mono">cal.com/username/visio-client</span>) pour que la prise de RDV directe fonctionne — c&apos;est CETTE url que le widget du client utilise.
                </p>
                {(!status.calcom || editingCalcomUrl) && (
                  <Input value={calcomUrl} onChange={e => setCalcomUrl(e.target.value)}
                    placeholder="cal.com/username/event-type" className="text-xs" disabled={busy} autoFocus={editingCalcomUrl} />
                )}

                {/* Lien "1er RDV offert" : stocke pour que MiKL l'ait sous la main
                    (decision du 11-10, hors produit — il le diffuse deja depuis
                    son site). Jamais branche sur le widget client. */}
                {(!status.calcom || editingCalcomUrl) && (
                  <div className="space-y-1">
                    <Input value={calcomRdvOffertUrl} onChange={e => setCalcomRdvOffertUrl(e.target.value)}
                      placeholder="cal.com/username/rdv-offert (optionnel, hors produit)" className="text-xs" disabled={busy} />
                    <p className="text-[10px] text-muted-foreground">
                      Lien du 1er RDV offert, pour ton usage perso (ex&nbsp;: depuis ton site). Il n&apos;est jamais proposé au client dans l&apos;app.
                    </p>
                  </div>
                )}

                {status.calcom && !editingCalcomUrl ? (
                  <div className="space-y-1.5">
                    <p className="text-[10px] text-muted-foreground break-all">URL : {status.calcomUrl}</p>
                    {status.calcomRdvOffertUrl && (
                      <p className="text-[10px] text-muted-foreground break-all">RDV offert (hors produit) : {status.calcomRdvOffertUrl}</p>
                    )}
                    {/* L'URL à coller dans Cal.com est celle de l'Edge Function
                        `calcom-webhook`, PAS une route du Hub. Cet écran affichait
                        `{origin}/api/webhooks/cal-com` : une route qui doublonnait
                        l'Edge Function, n'a jamais reçu un seul appel
                        (`calcom_bookings` vide) et acceptait les requêtes non
                        signées. Elle a été supprimée le 2026-09-17 — d'où la
                        correction ici, sans quoi cet écran continuerait à dicter
                        une adresse morte. */}
                    <p className="text-[10px] text-muted-foreground break-all">
                      Webhook :{" "}
                      <span className="font-mono text-foreground">
                        {calcomWebhookUrl}
                      </span>
                    </p>
                    <div className="flex gap-2">
                      <Button variant="outline" size="sm" className="flex-1"
                        onClick={() => setEditingCalcomUrl(true)} disabled={busy}>
                        Modifier l&apos;URL
                      </Button>
                      <Button variant="outline" size="sm" className="flex-1 text-destructive hover:text-destructive"
                        onClick={handleDisconnectCalcom} disabled={busy}>
                        {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                        Déconnecter
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="flex gap-2">
                    <Button variant="default" size="sm" className="flex-1"
                      onClick={handleConnectCalcom} disabled={busy || !calcomUrl.trim()}>
                      {isPending && <Loader2 className="h-3 w-3 animate-spin mr-1" />}
                      {status.calcom ? "Enregistrer" : "Connecter Cal.com"}
                    </Button>
                    {editingCalcomUrl && (
                      <Button variant="outline" size="sm"
                        onClick={() => {
                          setEditingCalcomUrl(false);
                          setCalcomUrl(status.calcomUrl ?? "");
                          setCalcomRdvOffertUrl(status.calcomRdvOffertUrl ?? "");
                        }}
                        disabled={busy}>
                        Annuler
                      </Button>
                    )}
                  </div>
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
