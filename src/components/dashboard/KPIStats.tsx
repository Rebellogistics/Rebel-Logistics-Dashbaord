import { Card, CardContent } from '@/components/ui/card';
import { KPIStats } from '@/lib/types';
import { ArrowUpRight, Truck, Package, CheckCircle2 } from 'lucide-react';

interface KPIStatsProps {
  stats: KPIStats;
}

export function KPIStatsCards({ stats }: KPIStatsProps) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      <Card className="bg-orange-50 border-none shadow-none">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-orange-100 rounded-xl flex items-center justify-center">
            <Truck className="w-6 h-6 text-orange-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-orange-900/60 mb-1">On Going</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-orange-900">{stats.onGoing}</span>
              <span className="text-[10px] font-semibold text-orange-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> 12.4%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-green-50 border-none shadow-none">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
            <Package className="w-6 h-6 text-green-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-green-900/60 mb-1">Shipped</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-green-900">{stats.shipped}</span>
              <span className="text-[10px] font-semibold text-green-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> 10.4%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card className="bg-teal-50 border-none shadow-none">
        <CardContent className="p-6 flex items-center gap-4">
          <div className="w-12 h-12 bg-teal-100 rounded-xl flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6 text-teal-600" />
          </div>
          <div>
            <p className="text-xs font-medium text-teal-900/60 mb-1">Completed</p>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-teal-900">{stats.completed.toLocaleString()}</span>
              <span className="text-[10px] font-semibold text-teal-600 flex items-center gap-0.5">
                <ArrowUpRight className="w-3 h-3" /> 2.4%
              </span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
