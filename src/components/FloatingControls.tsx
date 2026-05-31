import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Wallet, Plus, Settings2, X, Music } from "lucide-react";
import { Button } from "@/components/ui/button";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const SOUND_OPTIONS = [
  { id: "default", name: "Alerta Padrão", url: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" },
  { id: "alert-1", name: "Sino Digital", url: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" },
  { id: "alert-2", name: "Bipe Curto", url: "https://assets.mixkit.co/active_storage/sfx/2566/2566-preview.mp3" },
  { id: "alert-3", name: "Notificação", url: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3" },
];

export function FloatingControls() {
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState("default");
  const audioRef = useRef<HTMLAudioElement | null>(null);

  useEffect(() => {
    // Load settings from localStorage
    const savedSoundEnabled = localStorage.getItem("auction_sound_enabled");
    const savedSelectedSound = localStorage.getItem("auction_surpassed_sound");
    
    if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === "true");
    if (savedSelectedSound !== null) setSelectedSound(savedSelectedSound);

    // Initial profile fetch
    fetchProfile();

    // Subscribe to profile changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile();
        subscribeToProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  async function fetchProfile() {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.user) {
      const { data } = await supabase
        .from("profiles")
        .select("bid_balance, username, avatar_url")
        .eq("id", session.user.id)
        .single();
      if (data) setProfile(data);
    }
  }

  function subscribeToProfile(userId: string) {
    const channel = supabase
      .channel(`floating_profile_${userId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
        (payload) => setProfile(payload.new)
      )
      .subscribe();
    return () => supabase.removeChannel(channel);
  }

  const toggleSound = () => {
    const newState = !soundEnabled;
    setSoundEnabled(newState);
    localStorage.setItem("auction_sound_enabled", String(newState));
    toast.info(newState ? "Sons ativados" : "Sons desativados");
  };

  const handleSoundChange = (val: string) => {
    setSelectedSound(val);
    localStorage.setItem("auction_surpassed_sound", val);
    
    // Play a preview
    const sound = SOUND_OPTIONS.find(s => s.id === val);
    if (sound) {
      const preview = new Audio(sound.url);
      preview.play().catch(e => console.error("Error playing preview:", e));
    }
  };

  if (!profile) return null;

  return (
    <div className="fixed bottom-24 right-4 z-[60]">
      <motion.div
        drag
        dragConstraints={{ left: -window.innerWidth + 100, right: 0, top: -window.innerHeight + 200, bottom: 0 }}
        className="relative"
      >
        <AnimatePresence>
          {isOpen ? (
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="mb-4 w-64 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900/90 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Painel Rápido</span>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Balance Section */}
                <div className="flex items-center justify-between">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-bold uppercase tracking-widest text-white/30">Seu Saldo</span>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Wallet className="h-4 w-4" />
                      <span className="text-lg font-black">{profile.bid_balance}</span>
                    </div>
                  </div>
                  <Button size="sm" className="h-8 rounded-full bg-primary/20 text-primary hover:bg-primary/30" asChild>
                    <Link to="/packages">
                      <Plus className="mr-1 h-3 w-3" /> Recarregar
                    </Link>
                  </Button>
                </div>

                {/* Sound Controls */}
                <div className="space-y-3 pt-2 border-t border-white/5">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-white/60">Notificações de Som</span>
                    <button 
                      onClick={toggleSound}
                      className={`h-8 w-8 rounded-full flex items-center justify-center transition-all ${soundEnabled ? 'bg-primary/20 text-primary' : 'bg-white/5 text-white/30'}`}
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Som ao ser superado</span>
                    <Select value={selectedSound} onValueChange={handleSoundChange}>
                      <SelectTrigger className="h-8 bg-white/5 border-white/10 text-[10px] font-bold">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {SOUND_OPTIONS.map(sound => (
                          <SelectItem key={sound.id} value={sound.id} className="text-xs">
                            {sound.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setIsOpen(!isOpen)}
          className={`flex h-12 w-12 items-center justify-center rounded-full shadow-2xl transition-all ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-zinc-900/80 border border-white/10 text-primary backdrop-blur-md opacity-70 hover:opacity-100'}`}
        >
          {isOpen ? <X className="h-6 w-6" /> : <Settings2 className="h-6 w-6" />}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[8px] font-black text-white animate-pulse">
              !
            </span>
          )}
        </motion.button>

      </motion.div>
    </div>
  );
}
