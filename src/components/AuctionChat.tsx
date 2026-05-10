import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare } from "lucide-react";
import { toast } from "sonner";

export function AuctionChat({ auctionId }: { auctionId: string }) {
  const [messages, setMessages] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    fetchMessages();

    const channel = supabase
      .channel(`chat:${auctionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages', filter: `auction_id=eq.${auctionId}` },
        (payload) => {
          fetchMessageDetail(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [auctionId]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  async function fetchMessages() {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("auction_id", auctionId)
      .order("created_at", { ascending: true })
      .limit(50);
    
    if (data) setMessages(data);
  }

  async function fetchMessageDetail(id: string) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("id", id)
      .single();
    
    if (data) setMessages(prev => [...prev, data]);
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      toast.error("Você precisa estar logado para enviar mensagens.");
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      auction_id: auctionId,
      user_id: user.id,
      message: newMessage.trim(),
    });

    if (error) {
      toast.error("Erro ao enviar mensagem.");
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/20 border border-white/5 rounded-[32px] overflow-hidden backdrop-blur-3xl">
      <div className="p-6 border-b border-white/10 flex items-center justify-between bg-white/5">
        <div className="flex items-center gap-2">
          <div className="p-2 bg-primary/10 rounded-lg">
            <MessageSquare className="w-4 h-4 text-primary" />
          </div>
          <h3 className="font-black text-xs uppercase tracking-[0.2em] text-white">Chat do <span className="text-primary">Arremate</span></h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] font-black text-white/40 uppercase">LIVE</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-6" ref={scrollRef}>
        <div className="flex flex-col gap-6">
          {messages.length === 0 && (
            <div className="py-20 text-center space-y-3">
              <div className="inline-flex p-3 rounded-full bg-white/5 text-white/10">
                <MessageSquare className="w-8 h-8" />
              </div>
              <p className="text-white/20 font-black uppercase tracking-widest text-[10px] italic">Inicie a conversa agora!</p>
            </div>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
              <Avatar className="w-9 h-9 border border-white/10 shadow-sm shrink-0">
                <AvatarImage src={msg.profile?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary font-black text-xs">
                  {msg.profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col gap-1 min-w-0">
                <span className="text-[10px] font-black text-primary uppercase tracking-widest leading-none">{msg.profile?.username || "Usuário"}</span>
                <div className="bg-white/5 border border-white/5 rounded-2xl rounded-tl-none p-3 shadow-sm">
                  <p className="text-sm text-white/80 leading-relaxed break-words">{msg.message}</p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-6 border-t border-white/10 bg-white/5 flex gap-3">
        <Input 
          placeholder="Escreva algo épico..." 
          className="bg-black/40 border-white/10 h-12 text-sm rounded-2xl focus:ring-primary/50 transition-all placeholder:text-white/20 font-medium"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="icon" className="h-12 w-12 shrink-0 bg-primary text-primary-foreground hover:bg-primary/90 rounded-2xl shadow-lg transition-all hover:scale-105 active:scale-95">
          <Send className="w-5 h-5" />
        </Button>
      </form>
    </div>
  );
}
