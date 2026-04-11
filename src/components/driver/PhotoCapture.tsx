import { useEffect, useMemo, useRef, useState, type ChangeEvent } from 'react';
import imageCompression from 'browser-image-compression';
import { Camera, X, AlertCircle, Loader2, CheckCircle2, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useUploadJobPhoto, useJobPhotos, useDeleteJobPhoto } from '@/hooks/useJobPhotos';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

interface PhotoCaptureProps {
  jobId: string;
  maxPhotos?: number;
  onUploadedFirstPath?: (path: string) => void;
}

type LocalStatus = 'compressing' | 'uploading' | 'success' | 'failed';

interface LocalPhoto {
  localId: string;
  file: File;
  previewUrl: string;
  status: LocalStatus;
  error?: string;
  storagePath?: string;
  uploadedId?: string;
}

const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  fileType: 'image/jpeg' as const,
};

function extensionFromFile(file: File): string {
  const type = file.type.toLowerCase();
  if (type.includes('png')) return 'png';
  if (type.includes('webp')) return 'webp';
  if (type.includes('heic') || type.includes('heif')) return 'heic';
  return 'jpg';
}

function generateFileName(file: File): string {
  const id =
    typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
      ? crypto.randomUUID()
      : `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
  // After compression everything is jpeg, but fall back to original extension if not.
  return `${id}.${extensionFromFile(file)}`;
}

export function PhotoCapture({
  jobId,
  maxPhotos = 10,
  onUploadedFirstPath,
}: PhotoCaptureProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [localPhotos, setLocalPhotos] = useState<LocalPhoto[]>([]);
  const uploadPhoto = useUploadJobPhoto();
  const deletePhoto = useDeleteJobPhoto();
  const { data: existing = [], isLoading: existingLoading } = useJobPhotos(jobId);

  // Revoke object URLs on unmount so we don't leak memory.
  useEffect(() => {
    return () => {
      for (const p of localPhotos) URL.revokeObjectURL(p.previewUrl);
    };
  }, [localPhotos]);

  // Once a successfully-uploaded local photo shows up in the server query,
  // prune it from local state so it doesn't render twice.
  useEffect(() => {
    setLocalPhotos((prev) => {
      const toKeep = prev.filter(
        (p) => !p.storagePath || !existing.some((e) => e.storagePath === p.storagePath)
      );
      // Revoke blob URLs for the ones we're dropping.
      for (const p of prev) {
        if (!toKeep.includes(p)) URL.revokeObjectURL(p.previewUrl);
      }
      return toKeep.length === prev.length ? prev : toKeep;
    });
  }, [existing]);

  // Defense in depth: filter during render in case state hasn't pruned yet.
  const localPhotosToShow = useMemo(
    () =>
      localPhotos.filter(
        (p) => !p.storagePath || !existing.some((e) => e.storagePath === p.storagePath)
      ),
    [localPhotos, existing]
  );

  const totalCount =
    existing.length + localPhotosToShow.filter((p) => p.status !== 'failed').length;
  const canAddMore = totalCount < maxPhotos;

  const handleCameraClick = () => {
    fileInputRef.current?.click();
  };

  const uploadFile = async (localPhoto: LocalPhoto) => {
    try {
      setLocalPhotos((prev) =>
        prev.map((p) => (p.localId === localPhoto.localId ? { ...p, status: 'compressing' } : p))
      );

      const compressed = await imageCompression(localPhoto.file, COMPRESSION_OPTIONS);

      setLocalPhotos((prev) =>
        prev.map((p) => (p.localId === localPhoto.localId ? { ...p, status: 'uploading' } : p))
      );

      const fileName = generateFileName(localPhoto.file);
      const result = await uploadPhoto.mutateAsync({
        jobId,
        file: compressed,
        fileName,
      });

      setLocalPhotos((prev) =>
        prev.map((p) =>
          p.localId === localPhoto.localId
            ? {
                ...p,
                status: 'success',
                storagePath: result.storagePath,
                uploadedId: result.id,
              }
            : p
        )
      );

      if (onUploadedFirstPath && existing.length === 0) {
        const firstUploadedLocally = localPhotos.find((p) => p.status === 'success');
        if (!firstUploadedLocally) {
          onUploadedFirstPath(result.storagePath);
        }
      }
    } catch (err) {
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Upload failed';
      setLocalPhotos((prev) =>
        prev.map((p) =>
          p.localId === localPhoto.localId ? { ...p, status: 'failed', error: message } : p
        )
      );
    }
  };

  const handleFileChange = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files ?? []);
    if (files.length === 0) return;

    // Reset so the same file name can be picked again.
    if (fileInputRef.current) fileInputRef.current.value = '';

    const room = Math.max(0, maxPhotos - totalCount);
    const slice = files.slice(0, room);
    if (files.length > room) {
      toast.error(`Only room for ${room} more photo${room === 1 ? '' : 's'}`);
    }

    const newLocalPhotos: LocalPhoto[] = slice.map((file) => ({
      localId:
        typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function'
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random()}`,
      file,
      previewUrl: URL.createObjectURL(file),
      status: 'compressing',
    }));

    setLocalPhotos((prev) => [...prev, ...newLocalPhotos]);

    for (const photo of newLocalPhotos) {
      void uploadFile(photo);
    }
  };

  const handleRetry = (photo: LocalPhoto) => {
    void uploadFile(photo);
  };

  const handleRemoveLocal = (photo: LocalPhoto) => {
    URL.revokeObjectURL(photo.previewUrl);
    setLocalPhotos((prev) => prev.filter((p) => p.localId !== photo.localId));
    if (photo.uploadedId && photo.storagePath) {
      deletePhoto.mutate(
        { id: photo.uploadedId, storagePath: photo.storagePath, jobId },
        {
          onError: () => toast.error('Photo removed from list but delete failed on server'),
        }
      );
    }
  };

  const handleRemoveExisting = async (existingId: string, storagePath: string) => {
    try {
      await deletePhoto.mutateAsync({ id: existingId, storagePath, jobId });
    } catch (err) {
      console.error(err);
      toast.error('Failed to delete photo');
    }
  };

  return (
    <div className="space-y-3">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        onChange={handleFileChange}
        className="hidden"
      />

      <Button
        type="button"
        variant="outline"
        onClick={handleCameraClick}
        disabled={!canAddMore}
        className="w-full h-11 gap-2"
      >
        <Camera className="w-4 h-4" />
        {canAddMore
          ? `Take photo${totalCount > 0 ? ` (${totalCount}/${maxPhotos})` : ''}`
          : `Maximum ${maxPhotos} photos`}
      </Button>

      {(existing.length > 0 || localPhotosToShow.length > 0 || existingLoading) && (
        <div className="grid grid-cols-3 gap-2">
          {existingLoading && (
            <div className="col-span-3 text-[11px] text-muted-foreground text-center py-2">
              Loading existing photos…
            </div>
          )}
          {existing.map((photo) => (
            <ExistingThumbnail
              key={photo.id}
              url={photo.signedUrl}
              onRemove={() => handleRemoveExisting(photo.id, photo.storagePath)}
            />
          ))}
          {localPhotosToShow.map((photo) => (
            <LocalThumbnail
              key={photo.localId}
              photo={photo}
              onRemove={() => handleRemoveLocal(photo)}
              onRetry={() => handleRetry(photo)}
            />
          ))}
        </div>
      )}
    </div>
  );
}

function ExistingThumbnail({
  url,
  onRemove,
}: {
  url: string | null;
  onRemove: () => void;
}) {
  return (
    <div className="relative aspect-square rounded-lg overflow-hidden bg-muted border">
      {url ? (
        <img
          src={url}
          alt="Proof"
          className="w-full h-full object-cover"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
          No preview
        </div>
      )}
      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
      >
        <X className="w-3.5 h-3.5" />
      </button>
      <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
        <CheckCircle2 className="w-3 h-3" />
      </div>
    </div>
  );
}

function LocalThumbnail({
  photo,
  onRemove,
  onRetry,
}: {
  photo: LocalPhoto;
  onRemove: () => void;
  onRetry: () => void;
}) {
  return (
    <div
      className={cn(
        'relative aspect-square rounded-lg overflow-hidden bg-muted border',
        photo.status === 'failed' && 'border-red-300'
      )}
    >
      <img
        src={photo.previewUrl}
        alt="Preview"
        className="w-full h-full object-cover"
      />

      {photo.status === 'compressing' && <StatusOverlay label="Compressing" />}
      {photo.status === 'uploading' && <StatusOverlay label="Uploading" />}

      {photo.status === 'failed' && (
        <div className="absolute inset-0 bg-red-900/60 flex flex-col items-center justify-center gap-1">
          <AlertCircle className="w-5 h-5 text-white" />
          <button
            type="button"
            onClick={onRetry}
            className="text-[10px] text-white font-semibold bg-white/20 rounded px-2 py-0.5 flex items-center gap-1"
          >
            <RotateCw className="w-3 h-3" />
            Retry
          </button>
        </div>
      )}

      <button
        type="button"
        onClick={onRemove}
        aria-label="Remove photo"
        className="absolute top-1 right-1 w-6 h-6 rounded-full bg-black/60 text-white flex items-center justify-center hover:bg-black/80"
      >
        <X className="w-3.5 h-3.5" />
      </button>

      {photo.status === 'success' && (
        <div className="absolute bottom-1 left-1 w-5 h-5 rounded-full bg-green-500 text-white flex items-center justify-center">
          <CheckCircle2 className="w-3 h-3" />
        </div>
      )}
    </div>
  );
}

function StatusOverlay({ label }: { label: string }) {
  return (
    <div className="absolute inset-0 bg-black/50 flex flex-col items-center justify-center gap-1">
      <Loader2 className="w-5 h-5 text-white animate-spin" />
      <span className="text-[10px] text-white font-semibold">{label}</span>
    </div>
  );
}
