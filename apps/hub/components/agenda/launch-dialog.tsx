'use client'
import { CalendarEvent, SOURCE_LABELS } from "./agenda-types";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@monprojetpro/ui";
import { Button } from "@monprojetpro/ui";
import { Copy, Video } from "lucide-react";
import { toast } from "@monprojetpro/ui";

interface LaunchDialogProps {
  event: CalendarEvent | null;
  open: boolean;
  onClose: () => void;
}

export function LaunchDialog({ event, open, onClose }: LaunchDialogProps) {
  if (!event) return null;
  const pad = (n: number) => n.toString().padStart(2, "0");

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="bg-card border-border max-w-md">
        <DialogHeader>
          <DialogTitle>Préparation de la visio</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="p-3 rounded-md bg-secondary">
            <p className="text-sm font-medium text-foreground">{event.clientName || event.title}</p>
            <div className="flex items-center gap-2 mt-1">
              {event.clientType === "lab" && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#E07856]/20 text-[#E07856] font-medium">Lab</span>
              )}
              {event.clientType === "one" && (
                <span className="text-[10px] px-2 py-0.5 rounded bg-[#F7931E]/20 text-[#F7931E] font-medium">One</span>
              )}
              <span className="text-xs text-muted-foreground">
                {`${pad(event.startHour)}:${pad(event.startMinute)} - ${pad(event.endHour)}:${pad(event.endMinute)}`}
              </span>
            </div>
          </div>
          <div>
            <p className="text-xs text-muted-foreground mb-2">Derniers échanges</p>
            <div className="space-y-1.5">
              {["Brief reçu le 28/01", "Maquettes envoyées le 01/02", "Feedback positif le 02/02"].map((h) => (
                <p key={h} className="text-xs text-secondary-foreground pl-2 border-l-2 border-border">{h}</p>
              ))}
            </div>
          </div>
          {event.subtitle && (
            <div className="p-2 rounded bg-secondary">
              <p className="text-[10px] text-muted-foreground mb-1">Brief</p>
              <p className="text-xs text-secondary-foreground">{event.subtitle}</p>
            </div>
          )}
          <div className="flex gap-2">
            <Button variant="outline" size="sm" className="flex-1" onClick={() => toast.success("Lien copié !")}>
              <Copy className="h-3 w-3 mr-1" />Copier le lien visio
            </Button>
            <Button size="sm" className="flex-1" onClick={() => { toast.success("Connexion à la visio..."); onClose(); }}>
              <Video className="h-3 w-3 mr-1" />Rejoindre la visio
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
