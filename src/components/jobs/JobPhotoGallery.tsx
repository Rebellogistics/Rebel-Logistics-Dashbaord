import { useState } from 'react';
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { useJobPhotos, type JobPhotoWithUrl } from '@/hooks/useJobPhotos';
import { Camera, ImageOff } from 'lucide-react';
import { format, parseISO } from 'date-fns';

interface JobPhotoGalleryProps {
  jobId: string;
}

export function JobPhotoGallery({ jobId }: JobPhotoGalleryProps) {
  const { data: photos = [], isLoading } = useJobPhotos(jobId);
  const [preview, setPreview] = useState<JobPhotoWithUrl | null>(null);

  if (isLoading) {
    return (
      <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground justify-center">
        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rebel-accent"></div>
        Loading photos…
      </div>
    );
  }

  if (photos.length === 0) {
    return (
      <div className="flex flex-col items-center gap-2 py-6 text-xs text-muted-foreground">
        <ImageOff className="w-6 h-6 text-muted-foreground/40" />
        No photos for this job yet.
      </div>
    );
  }

  return (
    <>
      <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
        {photos.map((photo) => (
          <button
            type="button"
            key={photo.id}
            onClick={() => setPreview(photo)}
            className="relative aspect-square rounded-lg overflow-hidden bg-muted border group focus:outline-none focus-visible:ring-2 focus-visible:ring-rebel-accent"
          >
            {photo.signedUrl ? (
              <img
                src={photo.signedUrl}
                alt="Proof"
                className="w-full h-full object-cover transition-transform group-hover:scale-105"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
                No preview
              </div>
            )}
          </button>
        ))}
      </div>

      <PhotoLightbox photo={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: JobPhotoWithUrl | null;
  onClose: () => void;
}) {
  if (!photo) return null;

  const uploadedLabel = (() => {
    try {
      return format(parseISO(photo.createdAt), 'd MMM yyyy · HH:mm');
    } catch {
      return photo.createdAt;
    }
  })();

  return (
    <Dialog open={!!photo} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-2xl p-0 overflow-hidden">
        <div className="bg-black">
          {photo.signedUrl ? (
            <img
              src={photo.signedUrl}
              alt="Proof"
              className="w-full max-h-[70vh] object-contain"
              referrerPolicy="no-referrer"
            />
          ) : (
            <div className="flex items-center justify-center h-64 text-muted-foreground text-sm">
              Preview unavailable
            </div>
          )}
        </div>
        <div className="p-4 space-y-1">
          <DialogTitle className="text-base flex items-center gap-2">
            <Camera className="w-4 h-4 text-muted-foreground" />
            Proof photo
          </DialogTitle>
          <DialogDescription className="text-xs">Uploaded {uploadedLabel}</DialogDescription>
        </div>
      </DialogContent>
    </Dialog>
  );
}
