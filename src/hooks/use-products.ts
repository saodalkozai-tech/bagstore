import { useCallback, useEffect, useState } from 'react';
import { getProducts, PRODUCTS_UPDATED_EVENT, refreshProductsFromSupabase } from '@/lib/storage';
import { Product } from '@/types';

export function useProducts(): Product[] {
  const [products, setProducts] = useState<Product[]>(() => getProducts());

  const refreshLocalProducts = useCallback(() => {
    setProducts(getProducts());
  }, []);

  useEffect(() => {
    let isSyncing = false;

    const syncFromCloud = async () => {
      if (isSyncing) return;
      isSyncing = true;
      try {
        const changed = await refreshProductsFromSupabase();
        if (!changed) {
          refreshLocalProducts();
        }
      } catch {
        refreshLocalProducts();
      } finally {
        isSyncing = false;
      }
    };

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        void syncFromCloud();
      }
    };

    const handleFocus = () => {
      void syncFromCloud();
    };

    window.addEventListener(PRODUCTS_UPDATED_EVENT, refreshLocalProducts);
    window.addEventListener('storage', refreshLocalProducts);
    document.addEventListener('visibilitychange', handleVisibility);
    window.addEventListener('focus', handleFocus);

    void syncFromCloud();

    return () => {
      window.removeEventListener(PRODUCTS_UPDATED_EVENT, refreshLocalProducts);
      window.removeEventListener('storage', refreshLocalProducts);
      document.removeEventListener('visibilitychange', handleVisibility);
      window.removeEventListener('focus', handleFocus);
    };
  }, [refreshLocalProducts]);

  return products;
}
