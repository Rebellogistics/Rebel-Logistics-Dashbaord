import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, AreaChart, Area } from 'recharts';

interface DeliveryChartProps {
  data: any[];
}

export function DeliveryChart({ data }: DeliveryChartProps) {
  return (
    <Card className="border-none shadow-none bg-white">
      <CardHeader className="px-0 pt-0 pb-4 flex flex-row items-center justify-between">
        <div>
          <CardTitle className="text-sm font-semibold">Timeline</CardTitle>
          <p className="text-[10px] text-muted-foreground mt-1">Updated 5 min ago</p>
        </div>
      </CardHeader>
      <CardContent className="px-0 h-48">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={data}>
            <defs>
              <linearGradient id="colorJobs" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#0d9488" stopOpacity={0.1}/>
                <stop offset="95%" stopColor="#0d9488" stopOpacity={0}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
            <XAxis 
              dataKey="name" 
              axisLine={false} 
              tickLine={false} 
              tick={{ fontSize: 10, fill: '#94a3b8' }}
              dy={10}
            />
            <YAxis hide />
            <Tooltip 
              contentStyle={{ 
                borderRadius: '12px', 
                border: 'none', 
                boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)',
                fontSize: '10px'
              }} 
            />
            <Area 
              type="monotone" 
              dataKey="jobs" 
              stroke="#0d9488" 
              strokeWidth={2}
              fillOpacity={1} 
              fill="url(#colorJobs)" 
            />
          </AreaChart>
        </ResponsiveContainer>
      </CardContent>
    </Card>
  );
}
