import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
} from 'react';
import { Button } from '@/components/ui/button';
import { supabase } from '@/lib/supabase';
import { PenLine, RotateCcw, Check, AlertCircle } from 'lucide-react';
import { toast } from 'sonner';
import { cn } from '@/lib/utils';

const BUCKET = 'job-proofs';
const INTRINSIC_WIDTH = 720;
const INTRINSIC_HEIGHT = 240;
const STROKE_WIDTH = 4;

// Read the ink color dynamically from the current theme so the signature is
// visible in both light and dark mode. The canvas background is `bg-card`,
// which flips between near-white and a dark slate surface.
function getStrokeStyle(): string {
  if (typeof document === 'undefined') return '#0D1220';
  const isDark = document.documentElement.classList.contains('dark');
  return isDark ? '#F5F7FB' : '#0D1220';
}

interface SignaturePadProps {
  jobId: string;
  initialValue?: string | null;
  onChange: (value: string | null) => void;
}

export interface SignaturePadHandle {
  /** Whether the user has drawn something that hasn't been uploaded yet. */
  hasPendingChanges: () => boolean;
  /**
   * Upload any unsaved canvas drawing to storage and resolve with the resulting
   * path. Returns null when there's nothing to commit (display mode or empty
   * canvas). Throws on upload failure (already toasted internally).
   */
  commit: () => Promise<string | null>;
}

type Mode = 'display' | 'drawing';

// Legacy signature values were plain text (customer name typed into a stopgap
// input). New values are storage paths like "{jobId}/signature.png". Detect
// which shape we have so the display path can branch.
function looksLikeStoragePath(jobId: string, value: string | null | undefined): boolean {
  if (!value) return false;
  return value.startsWith(`${jobId}/`) && /\.(png|jpg|jpeg|webp)$/i.test(value);
}

export const SignaturePad = forwardRef<SignaturePadHandle, SignaturePadProps>(function SignaturePad(
  { jobId, initialValue, onChange },
  ref,
) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mode, setMode] = useState<Mode>('display');
  const [isDrawing, setIsDrawing] = useState(false);
  const [isEmpty, setIsEmpty] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [signedUrl, setSignedUrl] = useState<string | null>(null);
  const [signedUrlError, setSignedUrlError] = useState(false);
  // Stable refs the imperative handle reads from — useImperativeHandle's
  // dependency list shouldn't change every render or the parent's ref will
  // see a different function each time.
  const modeRef = useRef(mode);
  const isEmptyRef = useRef(isEmpty);
  modeRef.current = mode;
  isEmptyRef.current = isEmpty;

  const hasPath = looksLikeStoragePath(jobId, initialValue);
  const legacyText =
    initialValue && !hasPath ? initialValue : null;

  // Fetch the signed URL for an existing stored signature.
  useEffect(() => {
    let cancelled = false;
    setSignedUrlError(false);
    if (!hasPath || !initialValue) {
      setSignedUrl(null);
      return;
    }
    (async () => {
      try {
        const { data } = await supabase.storage
          .from(BUCKET)
          .createSignedUrl(initialValue, 600);
        if (!cancelled) setSignedUrl(data?.signedUrl ?? null);
      } catch {
        if (!cancelled) setSignedUrlError(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasPath, initialValue]);

  // When entering drawing mode, set up the canvas context.
  useEffect(() => {
    if (mode !== 'drawing') return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = getStrokeStyle();
    ctx.lineWidth = STROKE_WIDTH;
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    setIsEmpty(true);

    // If the user flips the theme while the pad is open, re-apply the ink
    // color so the next stroke uses the correct shade. Existing strokes stay
    // the color they were drawn in, which is acceptable for a signature flow.
    const observer = new MutationObserver(() => {
      ctx.strokeStyle = getStrokeStyle();
    });
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ['class'],
    });
    return () => observer.disconnect();
  }, [mode]);

  const getCanvasPos = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current!;
    const rect = canvas.getBoundingClientRect();
    const scaleX = canvas.width / rect.width;
    const scaleY = canvas.height / rect.height;
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const handlePointerDown = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const canvas = canvasRef.current;
    if (!canvas) return;
    canvas.setPointerCapture(e.pointerId);
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    // Refresh the stroke style per-stroke in case the theme changed since
    // the canvas was initialized.
    ctx.strokeStyle = getStrokeStyle();
    const { x, y } = getCanvasPos(e);
    ctx.beginPath();
    ctx.moveTo(x, y);
    // Dot for taps that don't move
    ctx.lineTo(x + 0.1, y + 0.1);
    ctx.stroke();
    setIsDrawing(true);
    setIsEmpty(false);
  };

  const handlePointerMove = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const { x, y } = getCanvasPos(e);
    ctx.lineTo(x, y);
    ctx.stroke();
  };

  const handlePointerUp = (e: ReactPointerEvent<HTMLCanvasElement>) => {
    if (!isDrawing) return;
    try {
      canvasRef.current?.releasePointerCapture(e.pointerId);
    } catch {
      // ignore
    }
    setIsDrawing(false);
  };

  const handleClearCanvas = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setIsEmpty(true);
  };

  // Reusable upload — driven both by the inner Save button and by the parent
  // dialog's commit() ref call. Throws on failure (caller decides how to react).
  const uploadCanvasNow = useCallback(async (): Promise<string | null> => {
    const canvas = canvasRef.current;
    if (!canvas) return null;

    setUploading(true);
    try {
      const blob = await new Promise<Blob | null>((resolve) => {
        canvas.toBlob((b) => resolve(b), 'image/png');
      });
      if (!blob) throw new Error('Failed to export signature');

      const path = `${jobId}/signature.png`;
      const { error } = await supabase.storage.from(BUCKET).upload(path, blob, {
        cacheControl: '3600',
        upsert: true,
        contentType: 'image/png',
      });
      if (error) throw error;

      const { data: signed } = await supabase.storage
        .from(BUCKET)
        .createSignedUrl(path, 600);
      setSignedUrl(signed?.signedUrl ?? null);
      onChange(path);
      setMode('display');
      return path;
    } catch (err) {
      console.error(err);
      const message =
        err && typeof err === 'object' && 'message' in err
          ? String((err as { message: unknown }).message)
          : 'Failed to save signature';
      toast.error(message);
      throw err;
    } finally {
      setUploading(false);
    }
  }, [jobId, onChange]);

  const handleSave = async () => {
    if (isEmpty) return;
    try {
      await uploadCanvasNow();
      toast.success('Signature saved');
    } catch {
      // already toasted inside uploadCanvasNow
    }
  };

  // Imperative handle so parent dialogs can flush a pending canvas drawing on
  // submit, even if the user never clicked the inner Save button.
  useImperativeHandle(
    ref,
    () => ({
      hasPendingChanges: () => modeRef.current === 'drawing' && !isEmptyRef.current,
      async commit() {
        if (modeRef.current !== 'drawing') return null;
        if (isEmptyRef.current) return null;
        return uploadCanvasNow();
      },
    }),
    [uploadCanvasNow],
  );

  const handleResign = () => {
    setMode('drawing');
  };

  if (mode === 'drawing') {
    return (
      <div className="space-y-2">
        <canvas
          ref={canvasRef}
          width={INTRINSIC_WIDTH}
          height={INTRINSIC_HEIGHT}
          className="w-full aspect-[3/1] border-2 border-dashed rounded-lg bg-card touch-none cursor-crosshair"
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onPointerLeave={handlePointerUp}
        />
        <p className="text-[10px] text-muted-foreground text-center">
          Sign with your finger, stylus, or mouse
        </p>
        <div className="flex gap-2">
          <Button
            type="button"
            size="sm"
            variant="outline"
            onClick={handleClearCanvas}
            disabled={isEmpty || uploading}
            className="flex-1 gap-1"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Clear
          </Button>
          <Button
            type="button"
            size="sm"
            onClick={handleSave}
            disabled={isEmpty || uploading}
            className="flex-1 bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            {uploading ? 'Saving…' : 'Save signature'}
          </Button>
        </div>
      </div>
    );
  }

  // Display mode
  if (hasPath && signedUrl) {
    return (
      <div className="space-y-2">
        <div className="border rounded-lg bg-muted p-2 flex items-center justify-center">
          <img
            src={signedUrl}
            alt="Customer signature"
            className="max-h-24 w-auto object-contain"
            referrerPolicy="no-referrer"
          />
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResign}
          className="w-full gap-1"
        >
          <PenLine className="w-3.5 h-3.5" />
          Re-sign
        </Button>
      </div>
    );
  }

  if (hasPath && signedUrlError) {
    return (
      <div className="space-y-2">
        <div className="border border-red-200 rounded-lg bg-red-50 p-3 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
          <p className="text-xs text-red-800">
            Couldn't load the saved signature preview. You can re-sign below.
          </p>
        </div>
        <Button
          type="button"
          size="sm"
          variant="outline"
          onClick={handleResign}
          className="w-full gap-1"
        >
          <PenLine className="w-3.5 h-3.5" />
          Re-sign
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {legacyText && (
        <div className="border rounded-lg bg-amber-50 border-amber-200 p-2">
          <p className="text-[10px] text-amber-900 font-semibold">Previous typed signature</p>
          <p className="text-xs text-amber-900">{legacyText}</p>
        </div>
      )}
      <button
        type="button"
        onClick={handleResign}
        className={cn(
          'w-full h-24 border-2 border-dashed rounded-lg bg-card flex flex-col items-center justify-center gap-1 text-muted-foreground hover:bg-muted hover:border-rebel-accent/40 transition-colors'
        )}
      >
        <PenLine className="w-5 h-5" />
        <span className="text-xs font-semibold">
          {legacyText ? 'Capture drawn signature' : 'Tap to sign'}
        </span>
      </button>
    </div>
  );
});
