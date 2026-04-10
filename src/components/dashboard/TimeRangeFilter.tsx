import { Button } from '@/components/ui/button';
import { TimeRange } from '@/lib/types';
import { cn } from '@/lib/utils';

interface TimeRangeFilterProps {
  value: TimeRange;
  onChange: (value: TimeRange) => void;
}

export function TimeRangeFilter({ value, onChange }: TimeRangeFilterProps) {
  const ranges: { label: string; value: TimeRange }[] = [
    { label: 'Daily', value: '1d' },
    { label: '7 Days', value: '7d' },
    { label: '30 Days', value: '30d' },
  ];

  return (
    <div className="flex items-center p-1 bg-slate-100 rounded-lg w-fit">
      {ranges.map((range) => (
        <Button
          key={range.value}
          variant="ghost"
          size="sm"
          onClick={() => onChange(range.value)}
          className={cn(
            "h-7 px-3 text-[10px] font-bold rounded-md transition-all",
            value === range.value ? "bg-white text-teal-700 shadow-sm" : "text-muted-foreground hover:text-teal-600"
          )}
        >
          {range.label}
        </Button>
      ))}
    </div>
  );
}
