import { useState } from 'react';
import { Star } from 'lucide-react';
import { cn } from '@/lib/utils';

interface CustomerLike {
  id?: string;
  name: string;
  avatar?: string;
  vip?: boolean;
  type?: 'individual' | 'company';
  companyName?: string;
}

interface CustomerAvatarProps {
  customer: CustomerLike;
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  showVip?: boolean;
  className?: string;
}

const SIZE_CLASSES: Record<NonNullable<CustomerAvatarProps['size']>, { box: string; text: string; star: string; ring: string }> = {
  xs: { box: 'w-6 h-6', text: 'text-[9px]', star: 'w-2 h-2 -top-0 -right-0', ring: 'ring-1' },
  sm: { box: 'w-8 h-8', text: 'text-[10px]', star: 'w-2.5 h-2.5 -top-0 -right-0', ring: 'ring-1' },
  md: { box: 'w-11 h-11', text: 'text-[13px]', star: 'w-3 h-3 -top-0 -right-0', ring: 'ring-2' },
  lg: { box: 'w-14 h-14', text: 'text-[16px]', star: 'w-3.5 h-3.5 -top-0 -right-0', ring: 'ring-2' },
  xl: { box: 'w-20 h-20', text: 'text-[24px]', star: 'w-4 h-4 -top-0 -right-0', ring: 'ring-2' },
};

const GRADIENTS = [
  ['#2D5BFF', '#7B5CFF'],
  ['#0E9F6E', '#10B981'],
  ['#E65F1C', '#F59E0B'],
  ['#E11D48', '#F43F5E'],
  ['#7C3AED', '#A855F7'],
  ['#0891B2', '#06B6D4'],
  ['#9333EA', '#D946EF'],
  ['#0D9488', '#14B8A6'],
];

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h << 5) - h + input.charCodeAt(i);
    h |= 0;
  }
  return Math.abs(h);
}

export function gradientFor(customer: CustomerLike): [string, string] {
  const seed = customer.id ?? customer.name ?? '';
  return GRADIENTS[hashSeed(seed) % GRADIENTS.length] as [string, string];
}

function initialsOf(customer: CustomerLike): string {
  const source =
    customer.type === 'company' && customer.companyName
      ? customer.companyName
      : customer.name;
  return source
    .split(/\s+/)
    .map((w) => w[0])
    .filter(Boolean)
    .slice(0, 2)
    .join('')
    .toUpperCase() || '?';
}

function diceBearUrl(customer: CustomerLike): string {
  const source =
    customer.type === 'company' && customer.companyName
      ? customer.companyName
      : customer.name;
  const seed = encodeURIComponent(source.trim() || 'guest');
  return `https://api.dicebear.com/7.x/lorelei-neutral/svg?seed=${seed}&backgroundColor=transparent`;
}

export function CustomerAvatar({
  customer,
  size = 'md',
  showVip = true,
  className,
}: CustomerAvatarProps) {
  const [imgFailed, setImgFailed] = useState(false);
  const sz = SIZE_CLASSES[size];
  const [from, to] = gradientFor(customer);
  const initials = initialsOf(customer);
  const avatarUrl = diceBearUrl(customer);

  return (
    <div
      className={cn(
        'relative inline-flex shrink-0 rounded-full overflow-visible',
        sz.box,
        className,
      )}
    >
      {!imgFailed ? (
        <div
          className={cn(
            'h-full w-full rounded-full overflow-hidden',
            sz.ring,
            'ring-rebel-border',
          )}
          style={{
            background: `linear-gradient(135deg, ${from}22 0%, ${to}22 100%)`,
          }}
        >
          <img
            src={avatarUrl}
            alt={customer.name}
            referrerPolicy="no-referrer"
            onError={() => setImgFailed(true)}
            className="h-full w-full object-cover"
          />
        </div>
      ) : (
        <div
          className={cn(
            'h-full w-full rounded-full flex items-center justify-center font-bold tracking-tight text-white',
            sz.text,
            sz.ring,
            'ring-rebel-border',
          )}
          style={{
            background: `linear-gradient(135deg, ${from} 0%, ${to} 100%)`,
          }}
        >
          {initials}
        </div>
      )}
      {showVip && customer.vip && (
        <span
          className={cn(
            'absolute rounded-full bg-amber-400 ring-2 ring-rebel-surface flex items-center justify-center',
            sz.star,
          )}
          aria-label="VIP"
          title="VIP customer"
        >
          <Star className="w-2 h-2 text-white fill-white" />
        </span>
      )}
    </div>
  );
}
