import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import type { ProductWithStatus } from './useProducts';

const PRODUCTS_CACHE_KEY = 'products_cache';
const CACHE_VERSION = '1.0';
const CACHE_EXPIRY_HOURS = 24;

interface CachedProducts {
  version: string;
  timestamp: number;
  businessId: string;
  products: ProductWithStatus[];
}

export function useOfflineProducts(businessId: string | undefined, products: ProductWithStatus[]) {
  const queryClient = useQueryClient();

  // Save products to localStorage whenever they change
  useEffect(() => {
    if (!businessId || !products || products.length === 0) return;

    try {
      const cache: CachedProducts = {
        version: CACHE_VERSION,
        timestamp: Date.now(),
        businessId,
        products,
      };

      localStorage.setItem(PRODUCTS_CACHE_KEY, JSON.stringify(cache));
      console.log(`📦 ${products.length} productos guardados en caché`);
    } catch (error) {
      console.error('Error guardando productos en caché:', error);
    }
  }, [businessId, products]);

  // Load cached products on mount if offline or no data
  useEffect(() => {
    if (!businessId) return;

    const loadCachedProducts = () => {
      try {
        const cached = localStorage.getItem(PRODUCTS_CACHE_KEY);
        if (!cached) return null;

        const cache: CachedProducts = JSON.parse(cached);

        // Validate cache
        if (cache.version !== CACHE_VERSION) {
          console.log('⚠️ Versión de caché obsoleta, limpiando...');
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
          return null;
        }

        if (cache.businessId !== businessId) {
          console.log('⚠️ Caché de otro negocio, ignorando...');
          return null;
        }

        // Check if cache is expired
        const hoursSinceCache = (Date.now() - cache.timestamp) / (1000 * 60 * 60);
        if (hoursSinceCache > CACHE_EXPIRY_HOURS) {
          console.log('⚠️ Caché expirado, limpiando...');
          localStorage.removeItem(PRODUCTS_CACHE_KEY);
          return null;
        }

        console.log(`✅ Cargando ${cache.products.length} productos desde caché`);
        return cache.products;
      } catch (error) {
        console.error('Error cargando productos desde caché:', error);
        return null;
      }
    };

    // If offline or no products, try to load from cache
    if (!navigator.onLine || !products || products.length === 0) {
      const cachedProducts = loadCachedProducts();
      if (cachedProducts) {
        // Set cached products in react-query
        queryClient.setQueryData(['products', businessId], cachedProducts);
      }
    }
  }, [businessId, products, queryClient]);

  return {
    clearCache: () => {
      localStorage.removeItem(PRODUCTS_CACHE_KEY);
      console.log('🗑️ Caché de productos limpiado');
    },
  };
}
