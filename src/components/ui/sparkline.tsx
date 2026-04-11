import { cn } from '@/lib/utils';

interface SparklineProps {
  values: number[];
  width?: number;
  height?: number;
  stroke?: string;
  fill?: string;
  className?: string;
}

export function Sparkline({
  values,
  width = 80,
  height = 24,
  stroke = 'var(--rebel-accent)',
  fill = 'rgba(45, 91, 255, 0.12)',
  className,
}: SparklineProps) {
  if (values.length === 0) {
    return (
      <svg width={width} height={height} className={cn('opacity-30', className)}>
        <line
          x1="0"
          y1={height / 2}
          x2={width}
          y2={height / 2}
          stroke="var(--rebel-border-strong)"
          strokeDasharray="2 3"
          strokeWidth="1"
        />
      </svg>
    );
  }

  const max = Math.max(...values, 1);
  const min = Math.min(...values, 0);
  const range = max - min || 1;
  const stepX = values.length > 1 ? width / (values.length - 1) : 0;
  const padY = 2;
  const usableH = height - padY * 2;

  const points = values.map((v, i) => {
    const x = i * stepX;
    const y = padY + usableH - ((v - min) / range) * usableH;
    return [x, y] as const;
  });

  const d = points.map(([x, y], i) => `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`).join(' ');
  const dArea = `${d} L${width.toFixed(1)},${(height - padY).toFixed(1)} L0,${(height - padY).toFixed(1)} Z`;

  return (
    <svg width={width} height={height} className={className}>
      <path d={dArea} fill={fill} />
      <path d={d} fill="none" stroke={stroke} strokeWidth="1.5" strokeLinejoin="round" strokeLinecap="round" />
      {points.length > 0 && (
        <circle
          cx={points[points.length - 1][0]}
          cy={points[points.length - 1][1]}
          r="1.6"
          fill={stroke}
        />
      )}
    </svg>
  );
}
