import { Search, Bell, Plus, ChevronDown } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

export function TopBar() {
  return (
    <header className="h-16 border-b bg-white flex items-center justify-between px-8 sticky top-0 z-10 backdrop-blur-sm bg-white/80">
      <div className="flex-1 max-w-md relative group">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground group-focus-within:text-teal-600 transition-colors" />
        <Input 
          placeholder="Input receipt number" 
          className="pl-10 h-10 bg-slate-50 border-none rounded-xl text-xs focus-visible:ring-1 focus-visible:ring-teal-500"
        />
      </div>

      <div className="flex items-center gap-6">
        <div className="flex items-center gap-3 pl-6 border-l">
          <div className="text-right">
            <p className="text-xs font-bold leading-none">Orely Studio 👋</p>
            <p className="text-[10px] text-muted-foreground mt-1">Admin</p>
          </div>
          <div className="w-10 h-10 rounded-full bg-slate-100 overflow-hidden border-2 border-white shadow-sm">
            <img 
              src="https://api.dicebear.com/7.x/avataaars/svg?seed=Orely" 
              alt="User" 
              className="w-full h-full object-cover"
            />
          </div>
          <ChevronDown className="w-4 h-4 text-muted-foreground" />
        </div>
      </div>
    </header>
  );
}
