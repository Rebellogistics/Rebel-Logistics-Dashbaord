import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { JobPhoto } from '../lib/types';

const BUCKET = 'job-proofs';
const SIGNED_URL_TTL_SECONDS = 600;

export interface JobPhotoWithUrl extends JobPhoto {
  signedUrl: string | null;
}

export interface RecentJobPhoto extends JobPhotoWithUrl {
  customerName: string | null;
  pickupAddress: string | null;
  deliveryAddress: string | null;
  jobDate: string | null;
}

function toCamelCase<T>(obj: any): T {
  if (Array.isArray(obj)) return obj.map((v) => toCamelCase(v)) as any;
  if (obj !== null && obj !== undefined && typeof obj === 'object' && obj.constructor === Object) {
    return Object.keys(obj).reduce((result, key) => {
      const camelKey = key.replace(/_([a-z])/g, (g) => g[1].toUpperCase());
      result[camelKey] = toCamelCase(obj[key]);
      return result;
    }, {} as any);
  }
  return obj;
}

export function useRecentJobPhotos(limit: number = 30) {
  return useQuery<RecentJobPhoto[]>({
    queryKey: ['recent_job_photos', limit],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('job_photos')
        .select(
          `
          id,
          job_id,
          storage_path,
          caption,
          uploaded_by,
          created_at,
          jobs (
            customer_name,
            pickup_address,
            delivery_address,
            date
          )
        `
        )
        .order('created_at', { ascending: false })
        .limit(limit);

      if (error) throw error;

      const rows = (data ?? []) as any[];

      const withUrls: RecentJobPhoto[] = await Promise.all(
        rows.map(async (row) => {
          let signedUrl: string | null = null;
          try {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(row.storage_path, SIGNED_URL_TTL_SECONDS);
            signedUrl = signed?.signedUrl ?? null;
          } catch {
            signedUrl = null;
          }
          const job = row.jobs ?? {};
          return {
            id: row.id,
            jobId: row.job_id,
            storagePath: row.storage_path,
            caption: row.caption ?? undefined,
            uploadedBy: row.uploaded_by ?? undefined,
            createdAt: row.created_at,
            signedUrl,
            customerName: job.customer_name ?? null,
            pickupAddress: job.pickup_address ?? null,
            deliveryAddress: job.delivery_address ?? null,
            jobDate: job.date ?? null,
          };
        })
      );

      return withUrls;
    },
  });
}

export function useJobPhotos(jobId: string | null | undefined) {
  return useQuery<JobPhotoWithUrl[]>({
    queryKey: ['job_photos', jobId],
    enabled: !!jobId,
    queryFn: async () => {
      if (!jobId) return [];
      const { data, error } = await supabase
        .from('job_photos')
        .select('*')
        .eq('job_id', jobId)
        .order('created_at', { ascending: true });

      if (error) throw error;

      const photos = toCamelCase<JobPhoto[]>(data || []);

      const withUrls: JobPhotoWithUrl[] = await Promise.all(
        photos.map(async (photo) => {
          try {
            const { data: signed } = await supabase.storage
              .from(BUCKET)
              .createSignedUrl(photo.storagePath, SIGNED_URL_TTL_SECONDS);
            return { ...photo, signedUrl: signed?.signedUrl ?? null };
          } catch {
            return { ...photo, signedUrl: null };
          }
        })
      );

      return withUrls;
    },
  });
}

interface UploadPhotoParams {
  jobId: string;
  file: Blob;
  fileName: string;
}

export function useUploadJobPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ jobId, file, fileName }: UploadPhotoParams) => {
      const storagePath = `${jobId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from(BUCKET)
        .upload(storagePath, file, {
          cacheControl: '3600',
          upsert: false,
          contentType: (file as any).type || 'image/jpeg',
        });

      if (uploadError) {
        throw uploadError;
      }

      const { data: session } = await supabase.auth.getSession();
      const userId = session.session?.user?.id ?? null;

      const { data: row, error: insertError } = await supabase
        .from('job_photos')
        .insert([
          {
            job_id: jobId,
            storage_path: storagePath,
            uploaded_by: userId,
          },
        ])
        .select()
        .single();

      if (insertError) {
        // Try to clean up the orphaned file so re-upload doesn't hit a conflict.
        try {
          await supabase.storage.from(BUCKET).remove([storagePath]);
        } catch {
          // best effort
        }
        throw insertError;
      }

      return toCamelCase<JobPhoto>(row);
    },
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: ['job_photos', variables.jobId] });
    },
  });
}

export function useDeleteJobPhoto() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ id, storagePath, jobId }: { id: string; storagePath: string; jobId: string }) => {
      const { error: dbError } = await supabase.from('job_photos').delete().eq('id', id);
      if (dbError) throw dbError;

      try {
        await supabase.storage.from(BUCKET).remove([storagePath]);
      } catch {
        // storage cleanup is best-effort
      }

      return { id, jobId };
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['job_photos', data.jobId] });
    },
  });
}
