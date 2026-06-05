import { useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAssets = () => {
  const [assets, setAssets] = useState<Record<string, string>>({});

  useEffect(() => {
    const fetchAssets = async () => {
      try {
        const { data, error } = await supabase.storage.from('assets-public').list();
        if (error) {
          console.error('Error listing assets:', error);
          return;
        }

        const assetUrls: Record<string, string> = {};
        data.forEach(file => {
          const { data: { publicUrl } } = supabase.storage.from('assets-public').getPublicUrl(file.name);
          assetUrls[file.name] = publicUrl;
        });
        setAssets(assetUrls);
      } catch (e) {
        console.error('Unexpected error fetching assets:', e);
      }
    };

    fetchAssets();
  }, []);

  return assets;
};
