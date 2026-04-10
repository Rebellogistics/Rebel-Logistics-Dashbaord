import { LucideIcon, LayoutDashboard, Truck, MapPin, Users, MessageSquare, Settings, LogOut, CreditCard, FileText, Wallet } from 'lucide-react';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';

interface NavItem {
  label: string;
  icon: LucideIcon;
  active?: boolean;
  badge?: number;
}

const mainNav: NavItem[] = [
  { label: 'Dashboard', icon: LayoutDashboard },
  { label: 'Shipping', icon: Truck, active: true },
  { label: 'Orders', icon: FileText },
  { label: 'Tracking', icon: MapPin },
  { label: 'Customers', icon: Users },
  { label: 'Message', icon: MessageSquare, badge: 2 },
];

const paymentNav: NavItem[] = [
  { label: 'Ledger', icon: Wallet },
  { label: 'Taxes', icon: FileText },
  { label: 'Payment Methods', icon: CreditCard },
];

interface SidebarProps {
  activeTab: string;
  onTabChange: (tab: string) => void;
}

export function Sidebar({ activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-64 border-r bg-white flex flex-col h-screen sticky top-0">
      <div className="p-6 flex items-center gap-3">
        <div className="w-8 h-8 bg-teal-600 rounded-lg flex items-center justify-center text-white font-bold">
          RL
        </div>
        <div>
          <h1 className="font-bold text-sm leading-none">Rebel Logistics</h1>
          <p className="text-[10px] text-muted-foreground mt-1">admin panel</p>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-8">
        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            Dashboard
          </p>
          <nav className="space-y-1">
            {mainNav.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                onClick={() => onTabChange(item.label)}
                className={cn(
                  "w-full justify-start gap-3 px-2 h-10 font-medium text-sm",
                  activeTab === item.label ? "bg-teal-50 text-teal-700 hover:bg-teal-50 hover:text-teal-700" : "text-muted-foreground"
                )}
              >
                <item.icon className="w-4 h-4" />
                {item.label}
                {item.badge && (
                  <span className="ml-auto bg-orange-500 text-white text-[10px] px-1.5 py-0.5 rounded-full">
                    {item.badge}
                  </span>
                )}
                {activeTab === item.label && <div className="ml-auto w-1 h-4 bg-teal-600 rounded-full" />}
              </Button>
            ))}
          </nav>
        </div>

        <div>
          <p className="text-[10px] font-semibold text-muted-foreground uppercase tracking-wider mb-4 px-2">
            Payment
          </p>
          <nav className="space-y-1">
            {paymentNav.map((item) => (
              <Button
                key={item.label}
                variant="ghost"
                className="w-full justify-start gap-3 px-2 h-10 font-medium text-sm text-muted-foreground"
              >
                <item.icon className="w-4 h-4" />
                {item.label}
              </Button>
            ))}
          </nav>
        </div>

        <div className="bg-teal-50 rounded-xl p-4 mt-8">
          <p className="text-xs font-semibold text-teal-900 mb-1">Customer Support</p>
          <p className="text-[10px] text-teal-700 mb-3">Having a trouble in delivering?</p>
          <Button className="w-full bg-teal-600 hover:bg-teal-700 text-white text-xs h-8">
            Contact Us
          </Button>
        </div>
      </div>

      <div className="p-4 border-t space-y-2">
        <Button variant="ghost" className="w-full justify-start gap-3 px-2 h-10 text-muted-foreground">
          <Settings className="w-4 h-4" />
          Settings
        </Button>
        <Button variant="ghost" className="w-full justify-start gap-3 px-2 h-10 text-red-500 hover:text-red-600 hover:bg-red-50">
          <LogOut className="w-4 h-4" />
          Logout
        </Button>
      </div>
    </aside>
  );
}
