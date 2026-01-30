import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from './AuthContext';
import type { Database } from '@/integrations/supabase/types';

type Business = Database['public']['Tables']['businesses']['Row'];
type BusinessMembership = Database['public']['Tables']['business_memberships']['Row'];
type BusinessRole = Database['public']['Enums']['business_role'];

interface BusinessWithRole extends Business {
  role: BusinessRole;
}

interface BusinessContextType {
  businesses: BusinessWithRole[];
  currentBusiness: BusinessWithRole | null;
  currentRole: BusinessRole | null;
  loading: boolean;
  setCurrentBusiness: (business: BusinessWithRole | null) => void;
  refreshBusinesses: () => Promise<void>;
  isOwner: boolean;
  isClerk: boolean;
  isWarehouse: boolean;
}

const BusinessContext = createContext<BusinessContextType | undefined>(undefined);

const CURRENT_BUSINESS_KEY = 'current_business_id';

export function BusinessProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [businesses, setBusinesses] = useState<BusinessWithRole[]>([]);
  const [currentBusiness, setCurrentBusinessState] = useState<BusinessWithRole | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchBusinesses = async () => {
    if (!user) {
      setBusinesses([]);
      setCurrentBusinessState(null);
      setLoading(false);
      return;
    }

    try {
      // Fetch memberships with business data
      const { data: memberships, error } = await supabase
        .from('business_memberships')
        .select(`
          role,
          business:businesses(*)
        `)
        .eq('user_id', user.id)
        .eq('is_active', true);

      if (error) throw error;

      const businessesWithRole: BusinessWithRole[] = (memberships || [])
        .filter(m => m.business)
        .map(m => ({
          ...(m.business as Business),
          role: m.role,
        }));

      setBusinesses(businessesWithRole);

      // Restore previously selected business
      const savedBusinessId = localStorage.getItem(CURRENT_BUSINESS_KEY);
      const savedBusiness = businessesWithRole.find(b => b.id === savedBusinessId);
      
      if (savedBusiness) {
        setCurrentBusinessState(savedBusiness);
      } else if (businessesWithRole.length === 1) {
        setCurrentBusinessState(businessesWithRole[0]);
        localStorage.setItem(CURRENT_BUSINESS_KEY, businessesWithRole[0].id);
      } else {
        setCurrentBusinessState(null);
      }
    } catch (error) {
      console.error('Error fetching businesses:', error);
    } finally {
      setLoading(false);
    }
  };

  const setCurrentBusiness = (business: BusinessWithRole | null) => {
    setCurrentBusinessState(business);
    if (business) {
      localStorage.setItem(CURRENT_BUSINESS_KEY, business.id);
    } else {
      localStorage.removeItem(CURRENT_BUSINESS_KEY);
    }
  };

  useEffect(() => {
    fetchBusinesses();
  }, [user]);

  const currentRole = currentBusiness?.role || null;
  const isOwner = currentRole === 'owner';
  const isClerk = currentRole === 'clerk' || isOwner;
  const isWarehouse = currentRole === 'warehouse' || isOwner;

  return (
    <BusinessContext.Provider
      value={{
        businesses,
        currentBusiness,
        currentRole,
        loading,
        setCurrentBusiness,
        refreshBusinesses: fetchBusinesses,
        isOwner,
        isClerk,
        isWarehouse,
      }}
    >
      {children}
    </BusinessContext.Provider>
  );
}

export function useBusiness() {
  const context = useContext(BusinessContext);
  if (context === undefined) {
    throw new Error('useBusiness must be used within a BusinessProvider');
  }
  return context;
}
