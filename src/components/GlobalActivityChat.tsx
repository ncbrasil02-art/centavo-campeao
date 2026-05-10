import { useState, useEffect, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Send, MessageSquare, Zap, Users } from "lucide-react";
import { toast } from "sonner";
import { getFallbackAvatarUrl, FICTITIOUS_PARTICIPANTS } from "@/lib/constants";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";

export function GlobalActivityChat() {
  const [items, setItems] = useState<any[]>([]);
  const [onlineUsers, setOnlineUsers] = useState<any[]>([]);
  const [newMessage, setNewMessage] = useState("");
  const [user, setUser] = useState<any>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<string>(`global_chat_${Math.random().toString(36).substring(7)}`);
  const bidChannelRef = useRef<string>(`global_bids_${Math.random().toString(36).substring(7)}`);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null);
    });

    // Populate fictitious online users
    const shuffled = [...FICTITIOUS_PARTICIPANTS].sort(() => 0.5 - Math.random());
    setOnlineUsers(shuffled.slice(0, 12).map(name => ({
      name,
      status: Math.random() > 0.3 ? 'online' : 'away',
      id: Math.random().toString(36).substring(7)
    })));

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
      .channel(bidChannelRef.current)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'bids' },
        (payload) => {
          fetchBidDetail(payload.new.id);
        }
      )
      .subscribe();

    // Periodic status updates for fictitious users
    const statusInterval = setInterval(() => {
      setOnlineUsers(prev => prev.map(u => ({
        ...u,
        status: Math.random() > 0.2 ? 'online' : 'away'
      })));
    }, 15000);

    return () => {
      supabase.removeChannel(chatChannel);
      supabase.removeChannel(bidChannel);
      clearInterval(statusInterval);
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
    <div className="flex flex-col h-full bg-black/40 backdrop-blur-3xl overflow-hidden">
      <Tabs defaultValue="activity" className="flex flex-col h-full">
        <div className="p-1.5 border-b border-white/5 bg-white/[0.02]">
          <TabsList className="w-full bg-black/20 border-white/5 h-9 p-1 rounded-xl">
            <TabsTrigger value="activity" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Zap className="w-3 h-3 mr-1.5" /> Atividade
            </TabsTrigger>
            <TabsTrigger value="participants" className="flex-1 rounded-lg text-[10px] font-black uppercase tracking-widest data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
              <Users className="w-3 h-3 mr-1.5" /> Online ({onlineUsers.length + (user ? 1 : 0)})
            </TabsTrigger>
          </TabsList>
        </div>
        
        <TabsContent value="activity" className="flex-1 flex flex-col m-0 outline-none overflow-hidden">
          <ScrollArea className="flex-1 px-4" ref={scrollRef}>
            <div className="flex flex-col gap-3 py-4">
              {items.length === 0 && (
                <div className="py-10 text-center space-y-2 opacity-20">
                  <MessageSquare className="w-6 h-6 mx-auto" />
                  <p className="text-[10px] font-black uppercase tracking-widest italic">Silêncio no chat...</p>
                </div>
              )}
              {items.map((item) => (
                <div key={item.id} className="animate-in fade-in slide-in-from-bottom-1 duration-300">
                  {item.type === 'chat' ? (
                    <div className="flex gap-2">
                      <Avatar className="w-6 h-6 border border-white/10 shrink-0">
                        <AvatarImage src={item.profile?.avatar_url || getFallbackAvatarUrl(item.profile?.username)} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[8px] font-black">
                          {item.profile?.username?.substring(0, 2).toUpperCase() || "U"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex flex-col min-w-0">
                        <span className="text-[9px] font-black text-primary/80 uppercase tracking-tighter leading-none mb-1">{item.profile?.username}</span>
                        <div className="bg-white/5 rounded-xl rounded-tl-none px-2.5 py-1.5 border border-white/5">
                          <p className="text-xs text-white/70 leading-snug break-words">{item.message}</p>
                        </div>
                      </div>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 bg-primary/5 border border-primary/10 rounded-xl p-2 py-1.5">
                      <div className="w-5 h-5 rounded-full bg-primary/20 flex items-center justify-center shrink-0">
                        <Zap className="w-2.5 h-2.5 text-primary fill-primary animate-pulse" />
                      </div>
                      <div className="text-[9px] leading-tight">
                        <span className="font-black text-white/90">{item.username}</span>
                        <span className="text-white/30 mx-1">lance em</span>
                        <span className="font-black text-primary">{item.productName}</span>
                        <span className="text-white/30 ml-1">por R$ {item.price?.toFixed(2)}</span>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </ScrollArea>

          <form onSubmit={handleSendMessage} className="p-3 border-t border-white/5 bg-white/[0.02] flex gap-2">
            <Input 
              placeholder="Diga algo..." 
              className="bg-black/20 border-white/5 h-9 text-xs rounded-xl placeholder:text-white/20"
              value={newMessage}
              onChange={(e) => setNewMessage(e.target.value)}
            />
            <Button type="submit" size="icon" className="h-9 w-9 shrink-0 bg-primary text-primary-foreground hover:scale-105 active:scale-95 transition-all rounded-xl">
              <Send className="w-3.5 h-3.5" />
            </Button>
          </form>
        </TabsContent>

        <TabsContent value="participants" className="flex-1 m-0 outline-none overflow-hidden">
          <ScrollArea className="h-full">
            <div className="p-4 space-y-4">
              {user && (
                <div className="flex items-center justify-between group">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8 border-2 border-primary shadow-lg shadow-primary/20">
                        <AvatarImage src={getFallbackAvatarUrl(user.email)} />
                        <AvatarFallback className="bg-primary/20 text-primary text-[10px] font-black">VC</AvatarFallback>
                      </Avatar>
                      <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full bg-green-500 border-2 border-black" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white uppercase tracking-widest">Você</span>
                      <span className="text-[8px] font-bold text-primary uppercase">Online</span>
                    </div>
                  </div>
                  <Badge variant="outline" className="text-[8px] font-black border-primary/30 text-primary bg-primary/5 uppercase">Mestre</Badge>
                </div>
              )}
              
              {onlineUsers.map((p) => (
                <div key={p.id} className="flex items-center justify-between group animate-in fade-in slide-in-from-right-1 duration-300">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Avatar className="w-8 h-8 border border-white/10 grayscale-[0.5] group-hover:grayscale-0 transition-all">
                        <AvatarImage src={getFallbackAvatarUrl(p.name)} />
                        <AvatarFallback className="bg-white/5 text-white/20 text-[10px] font-black">
                          {p.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className={`absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 rounded-full border-2 border-black ${
                        p.status === 'online' ? 'bg-green-500' : 'bg-orange-500'
                      }`} />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-[10px] font-black text-white/70 uppercase tracking-widest group-hover:text-white transition-colors">{p.name}</span>
                      <span className={`text-[8px] font-bold uppercase ${
                        p.status === 'online' ? 'text-green-500/60' : 'text-orange-500/60'
                      }`}>{p.status === 'online' ? 'Online' : 'Ausente'}</span>
                    </div>
                  </div>
                  <div className="h-1 w-1 rounded-full bg-white/10 group-hover:bg-primary transition-colors" />
                </div>
              ))}
            </div>
          </ScrollArea>
        </TabsContent>
      </Tabs>
    </div>
  );
}
