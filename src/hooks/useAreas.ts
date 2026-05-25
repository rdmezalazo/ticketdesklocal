import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';

export const useAreas = () => {
  const [areas, setAreas] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAreas = async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('area')
          .not('area', 'is', null)
          .not('area', 'eq', '');

        if (error) {
          console.error('Error loading areas:', error);
          return;
        }

        // Get unique areas and sort them
        const uniqueAreas = [...new Set(data?.map(item => item.area).filter(Boolean))] as string[];
        uniqueAreas.sort();
        
        setAreas(uniqueAreas);
      } catch (error) {
        console.error('Error loading areas:', error);
      } finally {
        setLoading(false);
      }
    };

    loadAreas();
  }, []);

  return { areas, loading };
};