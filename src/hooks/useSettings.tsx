import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  logo_url: string;
  primary_color: string;
  secondary_color: string;
  mercado_pago_public_key: string;
  pix_key: string;
  pix_name: string;
}

const SettingsContext = createContext<SiteSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "Leilão de Centavos",
    logo_url: "",
    primary_color: "#8B5CF6",
    secondary_color: "#7C3AED",
    mercado_pago_public_key: "",
    pix_key: "",
    pix_name: "",
  });

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (data && !error) {
        setSettings({
          site_name: data.site_name || "Leilão de Centavos",
          logo_url: data.logo_url || "",
          primary_color: data.primary_color || "#8B5CF6",
          secondary_color: data.secondary_color || "#7C3AED",
          mercado_pago_public_key: data.mercado_pago_public_key || "",
          pix_key: data.pix_key || "",
          pix_name: data.pix_name || "",
        });

        // Apply colors to document
        document.documentElement.style.setProperty("--primary", data.primary_color || "#8B5CF6");
        // Update document title
        document.title = data.site_name || "Leilão de Centavos";
      }
    }

    fetchSettings();

    // Subscribe to changes
    const channel = supabase
      .channel("site_settings_changes")
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "site_settings" },
        (payload) => {
          const newData = payload.new as any;
          setSettings(prev => ({
            ...prev,
            site_name: newData.site_name || prev.site_name,
            logo_url: newData.logo_url || prev.logo_url,
            primary_color: newData.primary_color || prev.primary_color,
            secondary_color: newData.secondary_color || prev.secondary_color,
          }));
          
          if (newData.primary_color) {
            document.documentElement.style.setProperty("--primary", newData.primary_color);
          }
          if (newData.site_name) {
            document.title = newData.site_name;
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  return (
    <SettingsContext.Provider value={settings}>
      {children}
    </SettingsContext.Provider>
  );
}

export const useSettings = () => {
  const context = useContext(SettingsContext);
  if (!context) {
    return {
      site_name: "Leilão de Centavos",
      logo_url: "",
      primary_color: "#8B5CF6",
      secondary_color: "#7C3AED",
      mercado_pago_public_key: "",
      pix_key: "",
      pix_name: "",
    };
  }
  return context;
};