import { useState, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Volume2, VolumeX, Wallet, Plus, Settings2, X, Music, User, Camera, Shield, Check } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "@tanstack/react-router";
import { toast } from "sonner";
import { getFallbackAvatarUrl, REAL_PERSON_PHOTOS } from "@/lib/constants";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";

const SOUND_OPTIONS = [
  { id: "default", name: "Alerta Padrão", url: "https://assets.mixkit.co/active_storage/sfx/2571/2571-preview.mp3" },
  { id: "alert-1", name: "Sino Digital", url: "https://assets.mixkit.co/active_storage/sfx/2568/2568-preview.mp3" },
  { id: "alert-2", name: "Bipe Curto", url: "https://assets.mixkit.co/active_storage/sfx/2566/2566-preview.mp3" },
  { id: "alert-3", name: "Notificação", url: "https://assets.mixkit.co/active_storage/sfx/2573/2573-preview.mp3" },
];

export function FloatingControls() {
  const [profile, setProfile] = useState<any>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);
  const [soundEnabled, setSoundEnabled] = useState(true);
  const [selectedSound, setSelectedSound] = useState("default");
  const [editingUsername, setEditingUsername] = useState("");
  const [editingAvatar, setEditingAvatar] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    // Load settings from localStorage
    const savedSoundEnabled = localStorage.getItem("auction_sound_enabled");
    const savedSelectedSound = localStorage.getItem("auction_surpassed_sound");
    
    if (savedSoundEnabled !== null) setSoundEnabled(savedSoundEnabled === "true");
    if (savedSelectedSound !== null) setSelectedSound(savedSelectedSound);

    // Initial session check
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      }
    });

    // Subscribe to auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session?.user) {
        fetchProfile(session.user.id);
      } else {
        setProfile(null);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (!profile?.id) return;

    const channel = supabase
      .channel(`floating_profile_${profile.id}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${profile.id}` },
        (payload) => setProfile(payload.new)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [profile?.id]);

  async function fetchProfile(userId?: string) {
    const targetId = userId || profile?.id;
    if (targetId) {
      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", targetId)
        .single();
      if (data) {
        setProfile(data);
        setEditingUsername(data.username || "");
        setEditingAvatar(data.avatar_url || "");
      }
    }
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

  const handleUpdateProfile = async () => {
    if (!editingUsername.trim()) {
      toast.error("O apelido não pode estar vazio");
      return;
    }

    setSaving(true);
    try {
      const { error } = await supabase
        .from("profiles")
        .update({
          username: editingUsername,
          avatar_url: editingAvatar
        })
        .eq("id", profile.id);

      if (error) throw error;

      toast.success("Perfil atualizado com sucesso!");
      setIsProfileModalOpen(false);
      fetchProfile();
    } catch (err: any) {
      toast.error("Erro ao atualizar perfil: " + err.message);
    } finally {
      setSaving(false);
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
              className="mb-4 w-72 overflow-hidden rounded-[24px] border border-white/10 bg-zinc-900/95 p-4 shadow-2xl backdrop-blur-xl"
            >
              <div className="mb-4 flex items-center justify-between border-b border-white/5 pb-2">
                <span className="text-[10px] font-black uppercase tracking-widest text-white/40">Painel de Controle</span>
                <button onClick={() => setIsOpen(false)} className="text-white/40 hover:text-white">
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-4">
                {/* Profile Quick Info */}
                <div className="flex items-center gap-3 p-2 rounded-2xl bg-white/5 border border-white/5 group hover:border-primary/20 transition-all cursor-pointer" onClick={() => setIsProfileModalOpen(true)}>
                  <Avatar className="h-10 w-10 border border-primary/20">
                    <AvatarImage src={profile.avatar_url || getFallbackAvatarUrl(profile.username)} />
                    <AvatarFallback className="bg-primary/10 text-primary text-xs font-black">
                      {profile.username?.substring(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex flex-col overflow-hidden">
                    <span className="text-sm font-black text-white truncate">{profile.username}</span>
                    <span className="text-[9px] font-bold text-primary flex items-center gap-1 uppercase tracking-tighter">
                      <Settings2 className="h-2 w-2" /> Editar Perfil
                    </span>
                  </div>
                </div>

                {/* Balance Section */}
                <div className="flex items-center justify-between p-3 rounded-2xl bg-primary/5 border border-primary/10">
                  <div className="flex flex-col">
                    <span className="text-[9px] font-black uppercase tracking-widest text-white/30">Seus Lances</span>
                    <div className="flex items-center gap-1.5 text-primary">
                      <Wallet className="h-4 w-4" />
                      <span className="text-xl font-black">{profile.bid_balance}</span>
                    </div>
                  </div>
                  <Button size="sm" className="h-8 rounded-full bg-primary text-primary-foreground font-black text-[10px] uppercase px-4 shadow-[0_0_15px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.3 * 100%))] hover:scale-105" asChild>
                    <Link to="/packages">
                      <Plus className="mr-1 h-3 w-3" /> Pacotes
                    </Link>
                  </Button>
                </div>

                {/* Sound Controls */}
                <div className="space-y-3 pt-2">
                  <div className="flex items-center justify-between">
                    <div className="flex flex-col">
                      <span className="text-xs font-bold text-white/80">Sons de Alerta</span>
                      <span className="text-[9px] text-white/40 font-bold uppercase tracking-tighter">Lance superado</span>
                    </div>
                    <button 
                      onClick={toggleSound}
                      className={`h-9 w-9 rounded-full flex items-center justify-center transition-all ${soundEnabled ? 'bg-primary text-primary-foreground shadow-[0_0_15px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.4 * 100%))]' : 'bg-white/5 text-white/30'}`}
                    >
                      {soundEnabled ? <Volume2 className="h-4 w-4" /> : <VolumeX className="h-4 w-4" />}
                    </button>
                  </div>

                  <div className="space-y-1">
                    <Select value={selectedSound} onValueChange={handleSoundChange}>
                      <SelectTrigger className="h-9 bg-white/5 border-white/10 text-[10px] font-black uppercase tracking-widest">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-zinc-900 border-white/10 text-white">
                        {SOUND_OPTIONS.map(sound => (
                          <SelectItem key={sound.id} value={sound.id} className="text-xs font-bold">
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
          className={`flex h-14 w-14 items-center justify-center rounded-full shadow-[0_10px_40px_rgba(0,0,0,0.5)] transition-all ${isOpen ? 'bg-primary text-primary-foreground' : 'bg-zinc-900/80 border border-white/10 text-primary backdrop-blur-md opacity-80 hover:opacity-100 hover:scale-110'}`}
        >
          {isOpen ? <X className="h-7 w-7" /> : <Settings2 className="h-7 w-7" />}
          {!isOpen && (
            <span className="absolute -top-1 -right-1 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[9px] font-black text-white animate-pulse shadow-[0_0_10px_rgba(239,68,68,0.5)]">
              !
            </span>
          )}
        </motion.button>
      </motion.div>

      {/* Profile Modal */}
      <Dialog open={isProfileModalOpen} onOpenChange={setIsProfileModalOpen}>
        <DialogContent className="bg-zinc-950 border-white/10 text-white sm:max-w-[450px] rounded-[32px] overflow-hidden p-0">
          <div className="bg-primary/20 p-8 flex flex-col items-center border-b border-white/5 relative overflow-hidden">
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,_transparent_0%,_black_70%)] opacity-20"></div>
            <div className="relative group cursor-pointer">
              <Avatar className="h-28 w-28 border-4 border-primary shadow-2xl transition-transform group-hover:scale-105">
                <AvatarImage src={editingAvatar || getFallbackAvatarUrl(editingUsername)} />
                <AvatarFallback className="bg-zinc-900 text-primary text-3xl font-black italic">
                  {editingUsername?.substring(0, 2).toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute inset-0 flex items-center justify-center bg-black/40 rounded-full opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="h-8 w-8 text-white" />
              </div>
            </div>
            <h3 className="mt-4 text-2xl font-black italic uppercase tracking-tighter">Editar <span className="text-primary">Perfil</span></h3>
            <p className="text-[10px] text-white/40 font-bold uppercase tracking-widest mt-1">Personalize sua aparência no site</p>
          </div>

          <div className="p-8 space-y-6">
            <div className="space-y-2">
              <Label className="text-xs font-black uppercase tracking-widest text-white/40">Seu Apelido</Label>
              <Input 
                value={editingUsername}
                onChange={e => setEditingUsername(e.target.value)}
                placeholder="Ex: ArrematadorMaster"
                className="bg-white/5 border-white/10 h-12 text-lg font-bold rounded-xl focus:border-primary/50"
              />
            </div>

            <div className="space-y-3">
              <Label className="text-xs font-black uppercase tracking-widest text-white/40">Escolha um Avatar</Label>
              <div className="grid grid-cols-5 gap-3 h-40 overflow-y-auto pr-2 scrollbar-hide">
                {REAL_PERSON_PHOTOS.slice(0, 20).map((photo, i) => (
                  <button
                    key={i}
                    onClick={() => setEditingAvatar(photo)}
                    className={`relative aspect-square rounded-xl overflow-hidden border-2 transition-all hover:scale-105 ${editingAvatar === photo ? 'border-primary shadow-[0_0_15px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.5 * 100%))] scale-110 z-10' : 'border-transparent opacity-60 hover:opacity-100'}`}
                  >
                    <img src={photo} className="w-full h-full object-cover" alt={`Avatar ${i}`} />
                    {editingAvatar === photo && (
                      <div className="absolute inset-0 bg-primary/20 flex items-center justify-center">
                        <Check className="h-6 w-6 text-primary" strokeWidth={4} />
                      </div>
                    )}
                  </button>
                ))}
              </div>
              <p className="text-[9px] text-white/20 italic text-center">Essas fotos são exclusivas para participantes dos leilões.</p>
            </div>

            <Button 
              className="w-full h-14 bg-primary text-primary-foreground text-lg font-black uppercase italic tracking-tighter rounded-2xl shadow-[0_10px_30px_color-mix(in srgb, var(--primary), transparent calc(100% - 0.3 * 100%))] hover:scale-[1.02] active:scale-95 transition-all"
              onClick={handleUpdateProfile}
              disabled={saving}
            >
              {saving ? "Salvando..." : "Salvar Alterações"}
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
