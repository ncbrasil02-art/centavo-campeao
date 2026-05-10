import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Zap } from "lucide-react";
import { toast } from "sonner";
import { getFallbackAvatarUrl } from "@/lib/constants";

export function GlobalActivityChat() {
  const [items, setItems] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<string>(`global_chat_${Math.random().toString(36).substring(7)}`);
  const bidChannelRef = useRef<string>(`global_bids_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    fetchInitialData();

    // Subscribe to general chat messages
    const chatChannel = supabase
      .channel(channelRef.current)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'chat_messages' },
        (payload) => {
          if (!payload.new.auction_id) {
            fetchMessageDetail(payload.new.id);
          }
        }
      )
      .subscribe();

    // Subscribe to ALL bids for activity feed
    const bidChannel = supabase
      .channel('global_bids')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          fetchBidDetail(payload.new.id);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(bidChannel);
    };
  }, []);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [items]);

  async function fetchInitialData() {
    // Get last 20 general messages
    const { data: messages } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .is("auction_id", null)
      .order("created_at", { ascending: false })
      .limit(20);
    
    const formattedMessages = (messages || []).map(m => ({ ...m, type: 'chat' }));
    setItems(formattedMessages.reverse());
  }

  async function fetchMessageDetail(id: string) {
    const { data } = await supabase
      .from("chat_messages")
      .select("*, profile:profiles(username, avatar_url)")
      .eq("id", id)
      .single();
    
    if (data) setItems(prev => [...prev.slice(-49), { ...data, type: 'chat' }]);
  }

  async function fetchBidDetail(id: string) {
    const { data } = await supabase
      .from("bids")
      .select("*, profile:profiles(username), auction:auctions(product:products(name))")
      .eq("id", id)
      .single();
    
    if (data) {
      const bidItem = {
        id: data.id,
        type: 'bid',
        username: data.profile?.username,
        productName: data.auction?.product?.name,
        price: data.price_at_bid,
        created_at: data.created_at
      };
      setItems(prev => [...prev.slice(-49), bidItem]);
    }
  }

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMessage.trim()) return;
    if (!user) {
      toast.error("Entre para participar do chat!");
      return;
    }

    const { error } = await supabase.from("chat_messages").insert({
      user_id: user.id,
      message: newMessage.trim(),
      auction_id: null
    });

    if (error) {
      toast.error("Erro ao enviar.");
    } else {
      setNewMessage("");
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/60 border-l border-white/10 backdrop-blur-3xl">
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-primary" />
          <h3 className="font-bold text-xs uppercase tracking-widest italic">Atividade <span className="text-primary">Global</span></h3>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-[10px] text-white/40 font-bold uppercase">Live</span>
        </div>
      </div>
      
      <ScrollArea className="flex-1 p-4" ref={scrollRef}>
        <div className="flex flex-col gap-4">
          {items.map((item) => (
            <div key={item.id} className="animate-in fade-in slide-in-from-bottom-2 duration-300">
              {item.type === 'chat' ? (
                <div className="flex gap-3">
                  <Avatar className="w-8 h-8 border border-white/10 shrink-0">
                    <AvatarImage src={item.profile?.avatar_url || getFallbackAvatarUrl(item.profile?.username)} />
                    <AvatarFallback className="bg-primary/20 text-primary text-[10px]">
                      {item.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col">
                    <span className="text-[10px] font-bold text-primary">{item.profile?.username}</span>
                    <p className="text-sm text-white/80 leading-tight">{item.message}</p>
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-lg p-2 py-1.5">
                  <Zap className="w-3 h-3 text-primary fill-primary animate-pulse" />
                  <div className="text-[10px] leading-tight">
                    <span className="font-bold text-white">{item.username}</span>
                    <span className="text-white/40 mx-1">deu lance em</span>
                    <span className="font-bold text-primary">{item.productName}</span>
                    <span className="text-white/40 ml-1">por R$ {item.price?.toFixed(2)}</span>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </ScrollArea>

      <form onSubmit={handleSendMessage} className="p-4 border-t border-white/10 flex gap-2">
        <Input 
          placeholder="Mensagem para todos..." 
          className="bg-white/5 border-white/10 h-10 text-xs placeholder:text-primary/50 placeholder:italic"
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
