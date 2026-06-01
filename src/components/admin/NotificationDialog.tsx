import { useState } from "react";
import { Bell, Loader2, MessageSquare, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";

interface NotificationDialogProps {
  auction: any;
}

export function NotificationDialog({ auction }: NotificationDialogProps) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [timeBefore, setTimeBefore] = useState("1h");
  const [channel, setChannel] = useState("whatsapp");

  const handleNotify = async () => {
    setLoading(true);
    try {
      const startTimeFormatted = format(new Date(auction.start_time), "HH:mm 'do dia' dd/MM", { locale: ptBR });
      const message = `🚨 *OPORTUNIDADE:* O leilão do *${auction.product?.name}* vai começar em breve!\n\n🕒 *Início:* ${startTimeFormatted}\n📍 *Onde:* https://centavo-campeao.lovable.app\n\nPrepare seus lances e boa sorte! 🚀`;

      if (channel === "whatsapp") {
        // Since we don't have a mass WhatsApp API, we generate a link for the admin
        // But for "all users", we should ideally use an API.
        // For now, we'll offer to copy the message and provide a way to open WhatsApp.
        await navigator.clipboard.writeText(message);
        toast.success("Mensagem copiada! Você pode enviá-la para seus grupos ou lista de transmissão.");
        
        // Optionally open WhatsApp Web
        const whatsappUrl = `https://web.whatsapp.com/send?text=${encodeURIComponent(message)}`;
        window.open(whatsappUrl, "_blank");
      } else {
        // Email notification via Edge Function
        const { error } = await supabase.functions.invoke("notify-users", {
          body: {
            auction_id: auction.id,
            time_before: timeBefore,
            channel: "email",
            message: message
          }
        });

        if (error) throw error;
        toast.success("Notificação enviada por e-mail para todos os usuários!");
      }
      setOpen(false);
    } catch (error: any) {
      console.error("Error notifying users:", error);
      toast.error(`Erro ao enviar notificação: ${error.message || "Erro desconhecido"}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          size="icon"
          variant="ghost"
          className="h-8 w-8 hover:bg-blue-500/20 text-blue-500"
          title="Notificar Usuários"
        >
          <Bell className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-zinc-900 border-white/10 text-white sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="text-2xl font-black uppercase italic">
            Notificar <span className="text-primary">Usuários</span>
          </DialogTitle>
          <DialogDescription className="text-white/40">
            Envie um aviso sobre o leilão do <strong>{auction.product?.name}</strong>.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 py-4">
          <div className="space-y-2">
            <label className="text-sm font-bold">Tempo Restante</label>
            <Select value={timeBefore} onValueChange={setTimeBefore}>
              <SelectTrigger className="bg-white/5 border-white/10">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-zinc-800 border-white/10 text-white">
                <SelectItem value="1h">Faltando 1 hora</SelectItem>
                <SelectItem value="30m">Faltando 30 minutos</SelectItem>
                <SelectItem value="10m">Faltando 10 minutos</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-bold">Canal de Envio</label>
            <div className="grid grid-cols-2 gap-2">
              <Button
                type="button"
                variant={channel === "whatsapp" ? "default" : "outline"}
                className={`flex items-center gap-2 ${channel === "whatsapp" ? "bg-green-600 hover:bg-green-700" : "border-white/10"}`}
                onClick={() => setChannel("whatsapp")}
              >
                <MessageSquare className="w-4 h-4" /> WhatsApp
              </Button>
              <Button
                type="button"
                variant={channel === "email" ? "default" : "outline"}
                className={`flex items-center gap-2 ${channel === "email" ? "bg-blue-600 hover:bg-blue-700" : "border-white/10"}`}
                onClick={() => setChannel("email")}
              >
                <Mail className="w-4 h-4" /> E-mail
              </Button>
            </div>
          </div>
        </div>

        <DialogFooter>
          <Button
            className="w-full bg-primary font-bold"
            onClick={handleNotify}
            disabled={loading}
          >
            {loading ? (
              <Loader2 className="w-4 h-4 animate-spin mr-2" />
            ) : (
              "Disparar Notificação"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
