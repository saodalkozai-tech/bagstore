import { useEffect, useState } from 'react';
import { getStoreSettings } from '@/lib/storage';
import { StoreSettings } from '@/types';

export function useStoreSettings(): StoreSettings {
  const [settings, setSettings] = useState<StoreSettings>(() => getStoreSettings());

  useEffect(() => {
    const refresh = () => {
      setSettings(getStoreSettings());
    };

    window.addEventListener('bagstore:settings-updated', refresh);
    window.addEventListener('storage', refresh);

    return () => {
      window.removeEventListener('bagstore:settings-updated', refresh);
      window.removeEventListener('storage', refresh);
    };
  }, []);

  return settings;
}
