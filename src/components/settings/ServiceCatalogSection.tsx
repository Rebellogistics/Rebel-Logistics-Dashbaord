import { useEffect, useState, type ReactNode } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Boxes, Plus, Pencil, Trash2, Lock } from 'lucide-react';
import {
  useServices,
  useCreateService,
  useUpdateService,
  useDeleteService,
} from '@/hooks/useServices';
import type { Service } from '@/lib/types';
import { sanitiseDecimal } from '@/lib/utils';
import { toast } from 'sonner';

/**
 * V5 Phase 10 — service catalog editor.
 *
 * Lives next to PricingPanel in Settings → Pricing. The 3 builtins
 * (Standard / White Glove / House Move) are rendered as locked rows
 * since the pricing calculator still hardcodes their behaviour. Custom
 * services Yamin adds become picker options on the CustomerDialog's
 * Default pricing preset (V5 P3).
 */
export function ServiceCatalogSection() {
  const { data: services = [], isLoading } = useServices();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<Service | null>(null);
  const deleteService = useDeleteService();

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (svc: Service) => {
    setEditing(svc);
    setDialogOpen(true);
  };

  const handleDelete = async (svc: Service) => {
    if (svc.builtin) return;
    if (!confirm(`Delete "${svc.name}"? Customers using it as a default will fall back to no preset.`)) {
      return;
    }
    try {
      await deleteService.mutateAsync(svc.id);
      toast.success(`${svc.name} deleted`);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Failed to delete';
      toast.error(message);
    }
  };

  return (
    <>
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold inline-flex items-center gap-1.5">
                <Boxes className="w-4 h-4 text-rebel-accent" />
                Services
              </h3>
              <p className="text-[11px] text-muted-foreground mt-0.5">
                Custom services appear in the customer pricing preset dropdown. Builtins
                (Standard, White Glove, House Move) are locked — their pricing rules live
                in the calculator and need a code change to alter.
              </p>
            </div>
            <Button
              size="sm"
              className="bg-rebel-accent hover:bg-rebel-accent-hover text-white gap-1"
              onClick={handleNew}
            >
              <Plus className="w-3.5 h-3.5" />
              New service
            </Button>
          </div>

          {isLoading ? (
            <p className="text-xs text-muted-foreground py-4 text-center">Loading services…</p>
          ) : services.length === 0 ? (
            <p className="text-xs text-muted-foreground py-4 text-center">No services yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border">
              {services.map((svc) => (
                <li
                  key={svc.id}
                  className="flex items-center gap-2 px-3 py-2"
                >
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold">{svc.name}</span>
                      {svc.builtin && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none gap-1 text-[9.5px]">
                          <Lock className="w-2.5 h-2.5" />
                          Builtin
                        </Badge>
                      )}
                      {!svc.active && (
                        <Badge variant="secondary" className="bg-muted text-muted-foreground border-none text-[9.5px]">
                          Hidden
                        </Badge>
                      )}
                    </div>
                    {svc.description && (
                      <p className="text-[10.5px] text-muted-foreground truncate">{svc.description}</p>
                    )}
                  </div>
                  <div className="text-right shrink-0 mr-1">
                    {svc.defaultRate != null && (
                      <p className="text-[11px] font-semibold" title="Ex GST">
                        ${svc.defaultRate.toFixed(0)}
                        <span className="text-[9px] text-muted-foreground ml-0.5">ex GST</span>
                      </p>
                    )}
                    {svc.defaultDurationMinutes != null && (
                      <p className="text-[10px] text-muted-foreground">
                        ~{svc.defaultDurationMinutes}m
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-0.5 shrink-0">
                    <Button
                      variant="ghost"
                      size="xs"
                      className="h-7 w-7 p-0"
                      onClick={() => handleEdit(svc)}
                      aria-label="Edit"
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </Button>
                    {!svc.builtin && (
                      <Button
                        variant="ghost"
                        size="xs"
                        className="h-7 w-7 p-0 text-rebel-danger hover:bg-rebel-danger-surface"
                        onClick={() => handleDelete(svc)}
                        aria-label="Delete"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <ServiceDialog
        open={dialogOpen}
        onOpenChange={(open) => {
          setDialogOpen(open);
          if (!open) setEditing(null);
        }}
        service={editing}
      />
    </>
  );
}

function ServiceDialog({
  open,
  onOpenChange,
  service,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  service: Service | null;
}) {
  const isEditing = !!service;
  const isBuiltin = !!service?.builtin;
  const create = useCreateService();
  const update = useUpdateService();

  const [name, setName] = useState(service?.name ?? '');
  const [rate, setRate] = useState(service?.defaultRate != null ? String(service.defaultRate) : '');
  const [duration, setDuration] = useState(
    service?.defaultDurationMinutes != null ? String(service.defaultDurationMinutes) : '',
  );
  const [description, setDescription] = useState(service?.description ?? '');
  const [active, setActive] = useState(service?.active ?? true);

  // Reset state when dialog opens with a different service.
  useEffect(() => {
    if (!open) return;
    setName(service?.name ?? '');
    setRate(service?.defaultRate != null ? String(service.defaultRate) : '');
    setDuration(
      service?.defaultDurationMinutes != null ? String(service.defaultDurationMinutes) : '',
    );
    setDescription(service?.description ?? '');
    setActive(service?.active ?? true);
  }, [open, service]);

  const canSubmit = name.trim() && !create.isPending && !update.isPending;

  const handleSubmit = async () => {
    if (!canSubmit) return;
    const parsedRate = rate.trim() ? parseFloat(rate) : null;
    const parsedDuration = duration.trim() ? parseInt(duration, 10) : null;
    const payload = {
      name: name.trim(),
      defaultRate: parsedRate != null && !isNaN(parsedRate) ? parsedRate : null,
      defaultDurationMinutes:
        parsedDuration != null && !isNaN(parsedDuration) ? parsedDuration : null,
      description: description.trim() || null,
    };
    try {
      if (isEditing && service) {
        await update.mutateAsync({
          id: service.id,
          ...payload,
          // Builtins can't be renamed (the calculator looks up by name).
          ...(isBuiltin ? { name: service.name } : {}),
          active,
        });
        toast.success(`${payload.name} updated`);
      } else {
        await create.mutateAsync(payload);
        toast.success(`${payload.name} created`);
      }
      onOpenChange(false);
    } catch (err) {
      const message = err instanceof Error ? err.message : 'Save failed';
      toast.error(message);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>{isEditing ? `Edit ${service?.name}` : 'New service'}</DialogTitle>
          <DialogDescription>
            {isBuiltin
              ? 'Builtin services have hardcoded pricing in the calculator. You can tweak the description, default rate, and active flag — name is locked.'
              : 'Custom services appear as a Default pricing preset option on the customer dialog. Set an ex-GST rate so the Pre-fill button surfaces it.'}
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-3 py-2">
          <Field label="Name" required>
            <Input
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Pallet delivery"
              disabled={isBuiltin}
              autoFocus={!isBuiltin}
            />
          </Field>
          <div className="grid grid-cols-2 gap-3">
            <Field label="Default rate (AUD ex GST)">
              <Input
                type="text"
                inputMode="decimal"
                pattern="[0-9]*\.?[0-9]*"
                value={rate}
                onChange={(e) => setRate(sanitiseDecimal(e.target.value))}
                placeholder="optional"
              />
            </Field>
            <Field label="Default duration (min)">
              <Input
                type="text"
                inputMode="numeric"
                pattern="[0-9]*"
                value={duration}
                onChange={(e) => setDuration(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="optional"
              />
            </Field>
          </div>
          <Field label="Description">
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Internal note — what this service covers, billing terms, etc."
              rows={2}
              className="w-full rounded-lg border border-input bg-transparent px-2.5 py-1.5 text-sm outline-none focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50"
            />
          </Field>
          {isEditing && (
            <label className="flex items-center gap-2 text-xs cursor-pointer">
              <input
                type="checkbox"
                checked={active}
                onChange={(e) => setActive(e.target.checked)}
                className="h-3.5 w-3.5 rounded border-border"
              />
              <span>Active — show in customer dropdown</span>
            </label>
          )}
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            className="bg-rebel-accent hover:bg-rebel-accent-hover text-white"
            disabled={!canSubmit}
            onClick={handleSubmit}
          >
            {create.isPending || update.isPending ? 'Saving…' : isEditing ? 'Save' : 'Create'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function Field({
  label,
  required,
  children,
}: {
  label: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="space-y-1">
      <Label className="text-xs text-muted-foreground font-medium">
        {label}
        {required && <span className="text-red-500 ml-0.5">*</span>}
      </Label>
      {children}
    </div>
  );
}
