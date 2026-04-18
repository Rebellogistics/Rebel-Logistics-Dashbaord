import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';

export interface StorageUsage {
  photoCount: number;
  signatureCount: number;
  estimatedMb: number;
  quotaMb: number;
  pct: number;
}

const AVG_PHOTO_MB = 1.5;
const AVG_SIGNATURE_MB = 0.05;
const FREE_TIER_MB = 500;

export function useStorageUsage() {
  return useQuery<StorageUsage>({
    queryKey: ['storage_usage'],
    staleTime: 5 * 60 * 1000,
    queryFn: async () => {
      const [photosRes, sigsRes] = await Promise.all([
        supabase.from('job_photos').select('id', { count: 'exact', head: true }),
        supabase.from('jobs').select('id', { count: 'exact', head: true }).not('signature', 'is', null),
      ]);
      if (photosRes.error) throw photosRes.error;
      if (sigsRes.error) throw sigsRes.error;
      const photoCount = photosRes.count ?? 0;
      const signatureCount = sigsRes.count ?? 0;
      const estimatedMb = photoCount * AVG_PHOTO_MB + signatureCount * AVG_SIGNATURE_MB;
      const pct = Math.min(100, Math.round((estimatedMb / FREE_TIER_MB) * 100));
      return { photoCount, signatureCount, estimatedMb, quotaMb: FREE_TIER_MB, pct };
    },
  });
}
