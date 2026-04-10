import { Card, CardContent } from '@/components/ui/card';
import { MapPin, Clock, Navigation } from 'lucide-react';

export function MapPreview() {
  return (
    <Card className="overflow-hidden border-none shadow-none bg-slate-50">
      <CardContent className="p-0">
        <div className="relative h-64 bg-teal-50">
          {/* Simulated Map Background */}
          <div className="absolute inset-0 opacity-20">
             <div className="grid grid-cols-12 grid-rows-12 h-full w-full">
                {Array.from({ length: 144 }).map((_, i) => (
                  <div key={i} className="border-[0.5px] border-teal-200" />
                ))}
             </div>
          </div>
          
          {/* Simulated Route */}
          <svg className="absolute inset-0 w-full h-full pointer-events-none">
            <path 
              d="M 50 200 Q 150 150 250 100 T 450 50" 
              fill="none" 
              stroke="teal" 
              strokeWidth="4" 
              strokeDasharray="8 4"
              className="opacity-40"
            />
          </svg>

          {/* Map Markers */}
          <div className="absolute top-1/4 left-1/4">
            <div className="relative">
              <div className="absolute -inset-4 bg-teal-500/20 rounded-full animate-ping" />
              <div className="relative w-6 h-6 bg-teal-600 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
                <Truck className="w-3 h-3 text-white" />
              </div>
            </div>
          </div>

          <div className="absolute bottom-1/3 right-1/4">
            <div className="w-6 h-6 bg-orange-500 rounded-full border-2 border-white flex items-center justify-center shadow-lg">
              <MapPin className="w-3 h-3 text-white" />
            </div>
          </div>

          {/* Overlay Info */}
          <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-white/20 flex items-center gap-3">
            <div className="w-10 h-10 rounded-full border-2 border-teal-500 flex items-center justify-center text-[10px] font-bold text-teal-700">
              5.0
            </div>
            <div>
              <p className="text-[10px] font-bold">Being Delivered</p>
              <p className="text-[8px] text-muted-foreground">513 Gunung Walat</p>
              <p className="text-[8px] font-medium mt-0.5">20 min • 23 km</p>
            </div>
          </div>

          <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm p-3 rounded-xl shadow-sm border border-white/20 flex items-center gap-3">
            <div className="w-8 h-8 bg-slate-100 rounded-lg flex items-center justify-center">
              <Clock className="w-4 h-4 text-slate-500" />
            </div>
            <div>
              <p className="text-[10px] font-bold">Waiting</p>
              <p className="text-[8px] text-muted-foreground">0865 Cibadak Mall</p>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

import { Truck } from 'lucide-react';
