import { useEffect, useRef, useState } from "react";
import { useServerFn } from "@tanstack/react-start";
import { MessageCircle, X, Send, Loader2, Phone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useSettings } from "@/hooks/useSettings";
import { sendSupportMessage, getSupportHistory } from "@/lib/support-chat.functions";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "assistant"; content: string };

const SESSION_KEY = "lc_support_session_id";

function getSessionId() {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = `s_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 10)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

export function SupportChatWidget() {
  const { whatsapp_number } = useSettings();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Msg[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [handoff, setHandoff] = useState(false);
  const [loadedHistory, setLoadedHistory] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const send = useServerFn(sendSupportMessage);
  const loadHistory = useServerFn(getSupportHistory);

  // Load history when first opened
  useEffect(() => {
    if (!open || loadedHistory) return;
    const sid = getSessionId();
    loadHistory({ data: { sessionId: sid } })
      .then((res: any) => {
        if (res?.messages?.length) {
          setMessages(res.messages);
          setHandoff(!!res.handoff);
        } else {
          setMessages([
            {
              role: "assistant",
              content:
                "Olá! 🙂 Sou a Fernanda, atendente virtual da Lance Certo. Posso te explicar como funcionam os leilões de centavos, o Menor Lance Único, pacotes de lances ou tirar qualquer dúvida. Como posso ajudar?",
            },
          ]);
        }
      })
      .catch(() => {
        setMessages([
          {
            role: "assistant",
            content: "Olá! 🙂 Sou a Fernanda. Como posso ajudar?",
          },
        ]);
      })
      .finally(() => setLoadedHistory(true));
  }, [open, loadedHistory, loadHistory]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, open]);

  useEffect(() => {
    if (open) setTimeout(() => inputRef.current?.focus(), 100);
  }, [open]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || sending) return;
    setInput("");
    setMessages((m) => [...m, { role: "user", content: text }]);
    setSending(true);
    try {
      const sid = getSessionId();
      const res: any = await send({ data: { sessionId: sid, message: text } });
      setMessages((m) => [...m, { role: "assistant", content: res.reply }]);
      if (res.handoff) setHandoff(true);
    } catch (err: any) {
      setMessages((m) => [
        ...m,
        { role: "assistant", content: `Tive um problema: ${err?.message || "erro desconhecido"}. Tente novamente.` },
      ]);
    } finally {
      setSending(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  };

  const waUrl = whatsapp_number
    ? `https://wa.me/${whatsapp_number.replace(/\D/g, "")}?text=${encodeURIComponent("Olá! Vim do chat da Fernanda no site e quero falar com um atendente.")}`
    : null;

  return (
    <>
      {/* Floating bubble */}
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label="Abrir chat de atendimento"
        className={cn(
          "fixed bottom-6 left-6 z-40 h-14 w-14 rounded-full bg-primary text-primary-foreground shadow-2xl flex items-center justify-center transition-all hover:scale-110 active:scale-95",
          open && "rotate-90"
        )}
      >
        {open ? <X className="w-6 h-6" /> : <MessageCircle className="w-6 h-6" />}
        {!open && (
          <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-green-500 ring-2 ring-background animate-pulse" />
        )}
      </button>

      {/* Panel */}
      {open && (
        <div className="fixed bottom-24 left-6 z-40 w-[92vw] max-w-sm h-[70vh] max-h-[560px] flex flex-col rounded-2xl border border-border bg-background shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-3 p-4 bg-primary text-primary-foreground">
            <div className="h-10 w-10 rounded-full bg-primary-foreground/20 flex items-center justify-center font-black">F</div>
            <div className="flex-1 min-w-0">
              <div className="font-black text-sm">Fernanda</div>
              <div className="text-[10px] uppercase tracking-widest opacity-80 flex items-center gap-1">
                <span className="h-1.5 w-1.5 rounded-full bg-green-400 animate-pulse" /> Online
              </div>
            </div>
            <button onClick={() => setOpen(false)} className="p-1 rounded hover:bg-primary-foreground/10">
              <X className="w-4 h-4" />
            </button>
          </div>

          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            <div className="flex flex-col gap-3">
              {messages.map((m, i) => (
                <div
                  key={i}
                  className={cn(
                    "max-w-[85%] rounded-2xl px-3 py-2 text-sm whitespace-pre-wrap break-words",
                    m.role === "user"
                      ? "self-end bg-primary text-primary-foreground rounded-br-sm"
                      : "self-start bg-muted text-foreground rounded-bl-sm"
                  )}
                >
                  {m.content}
                </div>
              ))}
              {sending && (
                <div className="self-start bg-muted text-muted-foreground rounded-2xl rounded-bl-sm px-3 py-2 text-sm flex items-center gap-2">
                  <Loader2 className="w-3 h-3 animate-spin" /> Digitando...
                </div>
              )}
              {handoff && waUrl && (
                <a
                  href={waUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="self-start mt-1 inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-green-500 text-white text-xs font-bold uppercase tracking-wider shadow hover:bg-green-600 transition-colors"
                >
                  <Phone className="w-3 h-3" /> Falar no WhatsApp
                </a>
              )}
            </div>
          </ScrollArea>

          <form onSubmit={handleSend} className="p-3 border-t border-border flex gap-2 bg-muted/30">
            <Input
              ref={inputRef}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Digite sua dúvida..."
              disabled={sending}
              className="flex-1 h-10 text-sm rounded-xl"
            />
            <Button type="submit" size="icon" className="h-10 w-10 rounded-xl shrink-0" disabled={sending || !input.trim()}>
              <Send className="w-4 h-4" />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
