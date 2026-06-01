import { createContext, useContext, useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

interface SiteSettings {
  site_name: string;
  logo_url: string;
  favicon_url: string;
  primary_color: string;
  secondary_color: string;
  mercado_pago_public_key: string;
  pix_key: string;
  pix_name: string;
  hero_display_mode: 'phrases' | 'banners';
  theme_mode: 'light' | 'dark';
  ga_id: string;
  fb_pixel_id: string;
  meta_title: string;
  meta_description: string;
  meta_keywords: string;
  google_site_verification: string;
  font_color_primary: string;
  font_color_secondary: string;
  card_background_color: string;
  block_background_color: string;
  page_background_color: string;
  border_color: string;
}

const SettingsContext = createContext<SiteSettings | null>(null);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
  const [settings, setSettings] = useState<SiteSettings>({
    site_name: "Leilão de Centavos",
    logo_url: "",
    favicon_url: "",
    primary_color: "#8B5CF6",
    secondary_color: "#7C3AED",
    mercado_pago_public_key: "",
    pix_key: "",
    pix_name: "",
    hero_display_mode: 'phrases',
    theme_mode: 'dark',
    ga_id: "",
    fb_pixel_id: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    google_site_verification: "",
    font_color_primary: "#ffffff",
    font_color_secondary: "#a1a1aa",
    card_background_color: "#18181b",
    block_background_color: "#27272a",
    page_background_color: "#09090b",
    border_color: "#3f3f46",
  });

  const updateMetaTags = (data: Partial<SiteSettings>) => {
    // Title
    const title = data.meta_title || data.site_name || "Leilão de Centavos";
    document.title = title;

    // Favicon
    if (data.favicon_url) {
      let link = document.querySelector("link[rel~='icon']") as HTMLLinkElement;
      if (!link) {
        link = document.createElement('link');
        link.rel = 'icon';
        document.getElementsByTagName('head')[0].appendChild(link);
      }
      link.href = data.favicon_url;
    }

    // Meta Description
    if (data.meta_description) {
      let metaDesc = document.querySelector("meta[name='description']") as HTMLMetaElement;
      if (!metaDesc) {
        metaDesc = document.createElement('meta');
        metaDesc.name = 'description';
        document.getElementsByTagName('head')[0].appendChild(metaDesc);
      }
      metaDesc.content = data.meta_description;
    }

    // Meta Keywords
    if (data.meta_keywords) {
      let metaKeywords = document.querySelector("meta[name='keywords']") as HTMLMetaElement;
      if (!metaKeywords) {
        metaKeywords = document.createElement('meta');
        metaKeywords.name = 'keywords';
        document.getElementsByTagName('head')[0].appendChild(metaKeywords);
      }
      metaKeywords.content = data.meta_keywords;
    }

    // Google Site Verification
    if (data.google_site_verification) {
      let metaVerify = document.querySelector("meta[name='google-site-verification']") as HTMLMetaElement;
      if (!metaVerify) {
        metaVerify = document.createElement('meta');
        metaVerify.name = 'google-site-verification';
        document.getElementsByTagName('head')[0].appendChild(metaVerify);
      }
      metaVerify.content = data.google_site_verification;
    }
  };

  const injectScripts = (ga_id?: string, fb_pixel_id?: string) => {
    // Google Analytics
    if (ga_id && !document.getElementById('ga-script-1')) {
      const script1 = document.createElement('script');
      script1.id = 'ga-script-1';
      script1.async = true;
      script1.src = `https://www.googletagmanager.com/gtag/js?id=${ga_id}`;
      document.head.appendChild(script1);

      const script2 = document.createElement('script');
      script2.id = 'ga-script-2';
      script2.innerHTML = `
        window.dataLayer = window.dataLayer || [];
        function gtag(){dataLayer.push(arguments);}
        gtag('js', new Date());
        gtag('config', '${ga_id}');
      `;
      document.head.appendChild(script2);
    }

    // Facebook Pixel
    if (fb_pixel_id && !document.getElementById('fb-pixel-script')) {
      const script = document.createElement('script');
      script.id = 'fb-pixel-script';
      script.innerHTML = `
        !function(f,b,e,v,n,t,s)
        {if(f.fbq)return;n=f.fbq=function(){n.callMethod?
        n.callMethod.apply(n,arguments):n.queue.push(arguments)};
        if(!f._fbq)f._fbq=n;n.push=n;n.loaded=!0;n.version='2.0';
        n.queue=[];t=b.createElement(e);t.async=!0;
        t.src=v;s=b.getElementsByTagName(e)[0];
        s.parentNode.insertBefore(t,s)}(window, document,'script',
        'https://connect.facebook.net/en_US/fbevents.js');
        fbq('init', '${fb_pixel_id}');
        fbq('track', 'PageView');
      `;
      document.head.appendChild(script);
    }
  };

  useEffect(() => {
    async function fetchSettings() {
      const { data, error } = await supabase
        .from("site_settings")
        .select("*")
        .single();

      if (data && !error) {
        const fetchedSettings: SiteSettings = {
          site_name: data.site_name || "Leilão de Centavos",
          logo_url: data.logo_url || "",
          favicon_url: data.favicon_url || "",
          primary_color: data.primary_color || "#8B5CF6",
          secondary_color: data.secondary_color || "#7C3AED",
          mercado_pago_public_key: data.mercado_pago_public_key || "",
          pix_key: data.pix_key || "",
          pix_name: data.pix_name || "",
          hero_display_mode: (data.hero_display_mode as any) || 'phrases',
          theme_mode: (data.theme_mode as any) || 'dark',
          ga_id: data.ga_id || "",
          fb_pixel_id: data.fb_pixel_id || "",
          meta_title: data.meta_title || "",
          meta_description: data.meta_description || "",
          meta_keywords: data.meta_keywords || "",
          google_site_verification: data.google_site_verification || "",
          font_color_primary: data.font_color_primary || (data.theme_mode === 'dark' ? "#ffffff" : "#000000"),
          font_color_secondary: data.font_color_secondary || (data.theme_mode === 'dark' ? "#a1a1aa" : "#666666"),
          card_background_color: data.card_background_color || (data.theme_mode === 'dark' ? "#18181b" : "#ffffff"),
          block_background_color: data.block_background_color || (data.theme_mode === 'dark' ? "#27272a" : "#f3f4f6"),
          page_background_color: data.page_background_color || (data.theme_mode === 'dark' ? "#09090b" : "#ffffff"),
          border_color: data.border_color || (data.theme_mode === 'dark' ? "#3f3f46" : "#e5e7eb"),
        };
        
        setSettings(fetchedSettings);
        updateMetaTags(fetchedSettings);
        injectScripts(fetchedSettings.ga_id, fetchedSettings.fb_pixel_id);

        // Apply theme to document
        if (fetchedSettings.theme_mode === 'dark') {
          document.documentElement.classList.add('dark');
        } else {
          document.documentElement.classList.remove('dark');
        }

        // Apply colors to document
        document.documentElement.style.setProperty("--primary", data.primary_color || "#8B5CF6");
        document.documentElement.style.setProperty("--secondary", data.secondary_color || "#7C3AED");
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
          setSettings(prev => {
            const updated = {
              ...prev,
              site_name: newData.site_name || prev.site_name,
              logo_url: newData.logo_url || prev.logo_url,
              favicon_url: newData.favicon_url || prev.favicon_url,
              primary_color: newData.primary_color || prev.primary_color,
              secondary_color: newData.secondary_color || prev.secondary_color,
              hero_display_mode: newData.hero_display_mode || prev.hero_display_mode,
              theme_mode: newData.theme_mode || prev.theme_mode,
              ga_id: newData.ga_id || prev.ga_id,
              fb_pixel_id: newData.fb_pixel_id || prev.fb_pixel_id,
              meta_title: newData.meta_title || prev.meta_title,
              meta_description: newData.meta_description || prev.meta_description,
              meta_keywords: newData.meta_keywords || prev.meta_keywords,
              google_site_verification: newData.google_site_verification || prev.google_site_verification,
            };
            updateMetaTags(updated);
            injectScripts(updated.ga_id, updated.fb_pixel_id);

            // Update theme class
            if (updated.theme_mode === 'dark') {
              document.documentElement.classList.add('dark');
            } else {
              document.documentElement.classList.remove('dark');
            }
            
            return updated;
          });
          
          if (newData.primary_color) {
            document.documentElement.style.setProperty("--primary", newData.primary_color);
          }
          if (newData.secondary_color) {
            document.documentElement.style.setProperty("--secondary", newData.secondary_color);
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
      favicon_url: "",
      primary_color: "#8B5CF6",
      secondary_color: "#7C3AED",
      mercado_pago_public_key: "",
      pix_key: "",
      pix_name: "",
      hero_display_mode: 'phrases' as const,
      theme_mode: 'dark' as const,
      ga_id: "",
      fb_pixel_id: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      google_site_verification: "",
    };
  }
  return context;
};
