import { useState } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { useRecentJobPhotos, type RecentJobPhoto } from '@/hooks/useJobPhotos';
import { Camera, CheckCircle2, RefreshCw } from 'lucide-react';
import { format, parseISO } from 'date-fns';
import { cn } from '@/lib/utils';

export function RecentPhotosPanel() {
  const { data: photos = [], isLoading, isFetching, refetch } = useRecentJobPhotos(24);
  const [preview, setPreview] = useState<RecentJobPhoto | null>(null);

  return (
    <>
      <Card className="border-border shadow-none bg-card">
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center justify-between border-b pb-3">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-purple-100 text-purple-700">
                <Camera className="w-4 h-4" />
              </div>
              <div>
                <h3 className="font-bold text-sm">Recent proof photos</h3>
                <p className="text-[11px] text-muted-foreground">
                  Latest uploads across all jobs
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="border-none bg-muted text-muted-foreground">
                {photos.length}
              </Badge>
              <Button
                size="icon-sm"
                variant="outline"
                onClick={() => refetch()}
                disabled={isFetching}
                aria-label="Refresh photos"
                title="Refresh"
              >
                <RefreshCw
                  className={cn('w-3.5 h-3.5', isFetching && 'animate-spin')}
                />
              </Button>
            </div>
          </div>

          {isLoading ? (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground justify-center">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-rebel-accent"></div>
              Loading photos…
            </div>
          ) : photos.length === 0 ? (
            <div className="flex items-center gap-2 py-6 text-xs text-muted-foreground justify-center">
              <CheckCircle2 className="w-4 h-4 text-green-600" />
              No proof photos yet. They'll appear here as drivers upload them.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
              {photos.map((photo) => (
                <PhotoTile
                  key={photo.id}
                  photo={photo}
                  onClick={() => setPreview(photo)}
                />
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <PhotoLightbox photo={preview} onClose={() => setPreview(null)} />
    </>
  );
}

function PhotoTile({
  photo,
  onClick,
}: {
  photo: RecentJobPhoto;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="relative aspect-square rounded-lg overflow-hidden bg-muted border group focus:outline-none focus-visible:ring-2 focus-visible:ring-rebel-accent"
    >
      {photo.signedUrl ? (
        <img
          src={photo.signedUrl}
          alt={photo.customerName ?? 'Proof photo'}
          className="w-full h-full object-cover transition-transform group-hover:scale-105"
          referrerPolicy="no-referrer"
        />
      ) : (
        <div className="flex items-center justify-center h-full text-[10px] text-muted-foreground">
          No preview
        </div>
      )}
      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
        <p className="text-[10px] text-white font-semibold truncate">
          {photo.customerName ?? 'Unknown'}
        </p>
      </div>
    </button>
  );
}

function PhotoLightbox({
  photo,
  onClose,
}: {
  photo: RecentJobPhoto | null;
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
              alt={photo.customerName ?? 'Proof photo'}
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
          <DialogTitle className="text-base">
            {photo.customerName ?? 'Unknown customer'}
          </DialogTitle>
          <DialogDescription className="text-xs">
            {photo.pickupAddress ?? '—'} → {photo.deliveryAddress ?? '—'}
          </DialogDescription>
          <p className="text-[11px] text-muted-foreground pt-1">Uploaded {uploadedLabel}</p>
        </div>
      </DialogContent>
    </Dialog>
  );
}
