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
    <div className="flex flex-col h-full bg-black/40 border border-white/10 rounded-2xl overflow-hidden backdrop-blur-xl">
      <div className="p-4 border-b border-white/10 flex items-center gap-2">
        <MessageSquare className="w-4 h-4 text-primary" />
        <h3 className="font-bold text-sm uppercase tracking-wider">Chat ao Vivo</h3>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4">
          {messages.length === 0 && (
            <p className="text-center text-white/20 text-xs py-10">Nenhuma mensagem ainda. Seja o primeiro!</p>
          )}
          {messages.map((msg) => (
            <div key={msg.id} className="flex gap-3">
              <Avatar className="w-8 h-8 border border-white/10">
                <AvatarImage src={msg.profile?.avatar_url} />
                <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                  {msg.profile?.username?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="flex flex-col">
                <span className="text-[10px] font-bold text-primary">{msg.profile?.username || "Usuário"}</span>
                <p className="text-sm text-white/80 leading-tight">{msg.message}</p>
              </div>
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <Input 
          placeholder="Digite sua mensagem..." 
          className="bg-white/5 border-white/10 h-10 text-sm"
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
        />
        <Button type="submit" size="icon" className="shrink-0 bg-primary text-primary-foreground hover:bg-primary/90">
          <Send className="w-4 h-4" />
        </Button>
      </form>
    </div>
  );
}
