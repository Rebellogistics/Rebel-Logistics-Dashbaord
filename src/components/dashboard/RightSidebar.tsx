import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Bell, Plus, Search, ChevronRight, Clock } from 'lucide-react';
import { Input } from '@/components/ui/input';

export function RightSidebar() {
  return (
    <div className="w-80 border-l bg-white flex flex-col h-screen sticky top-0 p-6 space-y-8">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="icon" className="h-9 w-9 rounded-full">
            <Bell className="w-5 h-5 text-muted-foreground" />
          </Button>
          <Button className="bg-teal-600 hover:bg-teal-700 text-white gap-2 h-9 text-xs rounded-lg">
            <Plus className="w-4 h-4" />
            Add Report
          </Button>
        </div>
      </div>

      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="font-bold text-sm">Delivery Goals</h3>
          <span className="text-red-500 text-[10px] font-bold">🚩</span>
        </div>
        
        <div className="flex items-baseline gap-2">
          <span className="text-2xl font-bold">603</span>
          <span className="text-[10px] text-muted-foreground">vs 966 from last period</span>
        </div>

        <div className="relative h-48 flex items-center justify-center">
          <div className="w-32 h-32 relative">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                className="text-slate-100"
              />
              <circle
                cx="64"
                cy="64"
                r="58"
                stroke="currentColor"
                strokeWidth="12"
                fill="transparent"
                strokeDasharray={364.4}
                strokeDashoffset={364.4 * (1 - 0.6)}
                className="text-teal-500"
              />
            </svg>
            <div className="absolute inset-0 flex flex-col items-center justify-center">
              <span className="text-xl font-bold">60%</span>
            </div>
          </div>
        </div>
        
        <p className="text-[10px] text-center text-muted-foreground">
          Deliver <span className="font-bold text-foreground">1,000 package</span> to reach your 100% target
        </p>
      </div>

      <div className="space-y-4 pt-4">
        <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-orange-100 rounded-lg flex items-center justify-center">
                <Truck className="w-4 h-4 text-orange-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Tracking number</p>
                <p className="text-xs font-bold mt-1">ORL20589632LY</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
          <div className="bg-white rounded-lg p-2 text-[10px] text-center text-muted-foreground">
            Status: Delivered to Riko Sapto Dimo
          </div>
        </div>

        <div className="bg-slate-50 rounded-2xl p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-teal-100 rounded-lg flex items-center justify-center">
                <Clock className="w-4 h-4 text-teal-600" />
              </div>
              <div>
                <p className="text-[10px] text-muted-foreground leading-none">Tracking number</p>
                <p className="text-xs font-bold mt-1">ORL20589632LY</p>
              </div>
            </div>
            <ChevronRight className="w-4 h-4 text-muted-foreground" />
          </div>
        </div>
      </div>

      <div className="flex-1" />

      <div className="relative group">
        <img 
          src="https://picsum.photos/seed/delivery-illustration/400/400" 
          alt="Delivery Illustration" 
          className="w-full rounded-2xl aspect-square object-cover"
          referrerPolicy="no-referrer"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent rounded-2xl flex flex-col justify-end p-4">
          <p className="text-white text-xs font-bold">Efficient Logistics</p>
          <p className="text-white/70 text-[10px]">Optimizing every route for you.</p>
        </div>
      </div>
    </div>
  );
}

import { Truck } from 'lucide-react';
