'use client'
import { useState, useEffect, useTransition, useRef } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, Button, Input, Label } from "@monprojetpro/ui";
import { CalendarEvent } from "./agenda-types";
import { toast } from "@monprojetpro/ui";
import { Settings } from "lucide-react";
import { createGoogleCalendarEvent, updateGoogleCalendarEvent } from "../../app/(dashboard)/modules/agenda/actions/calendar";

interface GoogleAccount {
  label: string;
  color: string;
}

interface NewRdvDialogProps {
  open: boolean;
  onClose: () => void;
  onRefreshEvents?: () => Promise<void>;
  onOpenSettings?: () => void;
  initialDate?: Date;
  initialHour?: number;
  googleAccounts?: GoogleAccount[];
  editEvent?: CalendarEvent;        // si fourni → mode édition
  editGoogleLabel?: string;         // compte Google de l'événement à modifier
}

function formatDateValue(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function NewRdvDialog({
  open, onClose, onRefreshEvents, onOpenSettings,
  initialDate, initialHour, googleAccounts = [],
  editEvent, editGoogleLabel,
}: NewRdvDialogProps) {
  const isEdit = !!editEvent;
  const hasGoogleAccount = googleAccounts.length > 0;
  const [title, setTitle] = useState("");
  const [dateValue, setDateValue] = useState(formatDateValue(new Date()));
  const [selectedLabel, setSelectedLabel] = useState("");
  const [startHour, setStartHour] = useState("10");
  const [startMinute, setStartMinute] = useState("00");
  const [endHour, setEndHour] = useState("11");
  const [endMinute, setEndMinute] = useState("00");
  const [isPending, startTransition] = useTransition();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    if (editEvent) {
      // Mode édition — pré-remplir avec les données existantes
      setTitle(editEvent.title);
      setDateValue(formatDateValue(editEvent.date));
      setStartHour(String(editEvent.startHour).padStart(2, '0'));
      setStartMinute(String(editEvent.startMinute).padStart(2, '0'));
      setEndHour(String(editEvent.endHour).padStart(2, '0'));
      setEndMinute(String(editEvent.endMinute).padStart(2, '0'));
      setSelectedLabel(editGoogleLabel ?? googleAccounts[0]?.label ?? "");
    } else {
      // Mode création
      const base = initialDate ?? new Date();
      const h = initialHour ?? 10;
      setTitle("");
      setDateValue(formatDateValue(base));
      setStartHour(String(h).padStart(2, '0'));
      setStartMinute("00");
      setEndHour(String(Math.min(h + 1, 23)).padStart(2, '0'));
      setEndMinute("00");
      setSelectedLabel(googleAccounts[0]?.label ?? "");
    }
    setDropdownOpen(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, editEvent, editGoogleLabel, initialDate, initialHour]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const selectedAccount = googleAccounts.find(a => a.label === selectedLabel);

  const handleSubmit = () => {
    if (!title.trim() || !selectedLabel) return;
    const sH = parseInt(startHour);
    const sM = parseInt(startMinute);
    const eH = parseInt(endHour);
    const eM = parseInt(endMinute);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;

    startTransition(async () => {
      if (isEdit && editEvent) {
        // Mise à jour
        const { error } = await updateGoogleCalendarEvent({
          eventId: editEvent.id,
          label: selectedLabel,
          title,
          date: dateValue,
          startHour: sH,
          startMinute: sM,
          endHour: eH,
          endMinute: eM,
          timeZone: tz,
        });
        if (error) { toast.error(error); return; }
        toast.success("RDV modifié !");
      } else {
        // Création
        const { error } = await createGoogleCalendarEvent({
          label: selectedLabel,
          title,
          date: dateValue,
          startHour: sH,
          startMinute: sM,
          endHour: eH,
          endMinute: eM,
          timeZone: tz,
        });
        if (error) { toast.error(error); return; }
        toast.success(`RDV créé dans "${selectedLabel}" !`);
      }
      await onRefreshEvents?.();
      onClose();
    });
  };

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-sm">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Modifier le RDV" : "Nouveau RDV"}</DialogTitle>
        </DialogHeader>
        {!hasGoogleAccount ? (
          <div className="space-y-3">
            <p className="text-sm text-muted-foreground">
              Aucun compte Google Calendar n&apos;est connecté. Les RDV sont créés directement dans ton Google Calendar — connecte un compte pour continuer.
            </p>
            {onOpenSettings && (
              <Button variant="outline" className="w-full" onClick={onOpenSettings}>
                <Settings className="h-4 w-4 mr-1" />Ouvrir les paramètres des calendriers
              </Button>
            )}
          </div>
        ) : (
        <div className="space-y-3">
          <div>
            <Label className="text-xs text-muted-foreground">Titre</Label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Titre du RDV" className="mt-1" autoFocus />
          </div>

          <div>
            <Label className="text-xs text-muted-foreground">Date</Label>
            <input
              type="date"
              value={dateValue}
              onChange={e => setDateValue(e.target.value)}
              className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
            />
          </div>

          <div className="grid grid-cols-2 gap-2">
            <div>
              <Label className="text-xs text-muted-foreground">Début</Label>
              <div className="flex gap-1 mt-1">
                <Input value={startHour} onChange={(e) => setStartHour(e.target.value)} className="w-14 text-center" maxLength={2} />
                <span className="text-muted-foreground self-center">:</span>
                <Input value={startMinute} onChange={(e) => setStartMinute(e.target.value)} className="w-14 text-center" maxLength={2} />
              </div>
            </div>
            <div>
              <Label className="text-xs text-muted-foreground">Fin</Label>
              <div className="flex gap-1 mt-1">
                <Input value={endHour} onChange={(e) => setEndHour(e.target.value)} className="w-14 text-center" maxLength={2} />
                <span className="text-muted-foreground self-center">:</span>
                <Input value={endMinute} onChange={(e) => setEndMinute(e.target.value)} className="w-14 text-center" maxLength={2} />
              </div>
            </div>
          </div>

          {!isEdit && (
            <div>
              <Label className="text-xs text-muted-foreground">Compte Google</Label>
              <div className="relative mt-1" ref={dropdownRef}>
                <button
                  type="button"
                  onClick={() => setDropdownOpen(p => !p)}
                  className="w-full flex items-center gap-2 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground hover:bg-secondary transition-colors"
                >
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: selectedAccount?.color }} />
                  <span className="flex-1 text-left truncate">{selectedAccount?.label}</span>
                  <svg className="h-4 w-4 text-muted-foreground shrink-0" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                </button>
                {dropdownOpen && (
                  <div className="absolute top-full left-0 right-0 z-50 mt-1 rounded-md border border-border bg-card shadow-lg overflow-hidden">
                    {googleAccounts.map(a => (
                      <button
                        key={a.label}
                        type="button"
                        onClick={() => { setSelectedLabel(a.label); setDropdownOpen(false); }}
                        className={`w-full flex items-center gap-2 px-3 py-2 text-sm transition-colors hover:bg-secondary ${selectedLabel === a.label ? 'bg-secondary text-foreground' : 'text-foreground'}`}
                      >
                        <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: a.color }} />
                        <span className="truncate">{a.label}</span>
                        {selectedLabel === a.label && (
                          <svg className="ml-auto h-3.5 w-3.5 text-primary shrink-0" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                          </svg>
                        )}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              <p className="text-[10px] text-primary mt-1">✓ Le RDV sera créé dans ton Google Calendar</p>
            </div>
          )}

          <Button onClick={handleSubmit} className="w-full" disabled={!title.trim() || !selectedLabel || isPending}>
            {isPending ? (isEdit ? "Modification..." : "Création...") : (isEdit ? "Enregistrer" : "Créer")}
          </Button>
        </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
