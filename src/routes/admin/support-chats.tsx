import { createFileRoute } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Badge } from "@/components/ui/badge";
import { MessageCircle, Phone, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export const Route = createFileRoute("/admin/support-chats")({
  component: SupportChatsAdmin,
});

type Chat = {
  id: string;
  session_id: string;
  user_id: string | null;
  visitor_name: string | null;
  message_count: number;
  handoff_whatsapp: boolean;
  last_message_at: string;
  created_at: string;
};

type Msg = { role: string; content: string; created_at: string };

function SupportChatsAdmin() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [selected, setSelected] = useState<Chat | null>(null);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [loading, setLoading] = useState(false);

  const loadChats = async () => {
    setLoading(true);
    const { data } = await supabase
      .from("support_chats")
      .select("*")
      .order("last_message_at", { ascending: false })
      .limit(200);
    setChats((data || []) as Chat[]);
    setLoading(false);
  };

  useEffect(() => {
    loadChats();
  }, []);

  useEffect(() => {
    if (!selected) return;
    supabase
      .from("support_chat_messages")
      .select("role, content, created_at")
      .eq("chat_id", selected.id)
      .order("created_at", { ascending: true })
      .then(({ data }) => setMessages((data || []) as Msg[]));
  }, [selected]);

  return (
    <div className="min-h-screen bg-background text-white p-8">
      <div className="max-w-7xl mx-auto">
        <div className="mb-6 flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-black italic uppercase tracking-tighter">
              Atendimentos <span className="text-primary">Fernanda</span>
            </h1>
            <p className="text-white/40 text-sm">Conversas do atendente virtual com visitantes e usuários.</p>
          </div>
          <Button variant="outline" size="sm" onClick={loadChats} disabled={loading}>
            <RefreshCw className={cn("w-4 h-4 mr-2", loading && "animate-spin")} /> Atualizar
          </Button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-[360px_1fr] gap-4 h-[75vh]">
          <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950/40">
            <ScrollArea className="h-full">
              {chats.length === 0 && (
                <div className="p-6 text-center text-white/40 text-sm">Nenhuma conversa ainda.</div>
              )}
              {chats.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelected(c)}
                  className={cn(
                    "w-full text-left p-4 border-b border-white/5 hover:bg-white/5 transition-colors",
                    selected?.id === c.id && "bg-primary/10"
                  )}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-bold truncate">
                      {c.visitor_name || (c.user_id ? "Usuário" : "Visitante")}
                    </span>
                    {c.handoff_whatsapp && (
                      <Badge className="bg-green-600 hover:bg-green-600 text-[9px] gap-1">
                        <Phone className="w-2.5 h-2.5" /> WA
                      </Badge>
                    )}
                  </div>
                  <div className="flex items-center gap-2 text-[10px] text-white/40 uppercase">
                    <MessageCircle className="w-3 h-3" /> {c.message_count} msgs
                    <span>•</span>
                    <span>{new Date(c.last_message_at).toLocaleString("pt-BR")}</span>
                  </div>
                  <div className="text-[10px] text-white/30 mt-1 truncate">{c.session_id}</div>
                </button>
              ))}
            </ScrollArea>
          </div>

          <div className="border border-white/10 rounded-xl overflow-hidden bg-zinc-950/40 flex flex-col">
            {!selected ? (
              <div className="flex-1 flex items-center justify-center text-white/40 text-sm">
                Selecione uma conversa para ver as mensagens.
              </div>
            ) : (
              <>
                <div className="p-4 border-b border-white/10">
                  <div className="font-bold">{selected.visitor_name || "Visitante"}</div>
                  <div className="text-xs text-white/40">
                    {selected.message_count} mensagens • Iniciado em{" "}
                    {new Date(selected.created_at).toLocaleString("pt-BR")}
                  </div>
                </div>
                <ScrollArea className="flex-1 p-4">
                  <div className="flex flex-col gap-3">
                    {messages.map((m, i) => (
                      <div
                        key={i}
                        className={cn(
                          "max-w-[80%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap",
                          m.role === "user"
                            ? "self-end bg-primary text-primary-foreground"
                            : "self-start bg-white/10 text-white"
                        )}
                      >
                        <div className="text-[9px] uppercase tracking-widest opacity-60 mb-0.5">
                          {m.role === "user" ? "Usuário" : "Fernanda"} •{" "}
                          {new Date(m.created_at).toLocaleTimeString("pt-BR")}
                        </div>
                        {m.content}
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
