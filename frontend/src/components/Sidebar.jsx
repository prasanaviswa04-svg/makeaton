import React from 'react';
import { useAuth } from '../context/AuthContext';
import {
  LayoutDashboard,
  FileText,
  Zap,
  CreditCard,
  Package,
  Calendar,
  Percent,
  Users,
  Store,
} from 'lucide-react';

export default function Sidebar({ currentTab, setCurrentTab }) {
  const { isAdmin, isCustomer } = useAuth();

  const adminStaffNav = [
    { id: 'finance', label: 'Finance Overview', icon: LayoutDashboard },
    { id: 'subscriptions', label: 'Subscriptions & Quotes', icon: FileText },
    { id: 'billing', label: 'Recurring Billing', icon: Zap },
    { id: 'payments', label: 'Payments & Receipts', icon: CreditCard },
    { id: 'products', label: 'Products & Variants', icon: Package },
    { id: 'plans', label: 'Plans & Policies', icon: Calendar },
    { id: 'team', label: 'Users & Customers', icon: Users },
    ...(isAdmin ? [
      { id: 'discounts', label: 'Discounts & Taxes', icon: Percent },
    ] : []),
    { id: 'portal', label: 'Customer Portal', icon: Store, isPreview: true },
  ];

  const customerNav = [
    { id: 'portal', label: 'My Subscriptions & Billing', icon: Store },
  ];

  const navItems = isCustomer ? customerNav : adminStaffNav;

  return (
    <aside className="w-60 bg-white border-r border-zinc-200/80 shrink-0 min-h-[calc(100vh-3.5rem)] flex flex-col justify-between p-3">
      <div className="space-y-0.5">
        <div className="px-2.5 py-2 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">
          {isCustomer ? 'Customer Portal' : 'Workspace'}
        </div>
        {navItems.map((item) => {
          const Icon = item.icon;
          const isActive = currentTab === item.id;
          return (
            <button
              key={item.id}
              onClick={() => setCurrentTab(item.id)}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                isActive
                  ? 'bg-zinc-950 text-white shadow-2xs font-semibold'
                  : 'text-zinc-600 hover:text-zinc-950 hover:bg-zinc-100/80'
              }`}
            >
              <div className="flex items-center gap-2.5">
                <Icon className={`w-3.5 h-3.5 ${isActive ? 'text-white' : 'text-zinc-400'}`} />
                <span>{item.label}</span>
              </div>
              {item.isPreview && !isActive && (
                <span className="text-[10px] font-mono text-zinc-400">
                  view
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Footer Info Box - Minimalist */}
      <div className="pt-3 border-t border-zinc-100">
        <div className="p-2.5 bg-zinc-50 rounded-lg border border-zinc-200/60 text-xs space-y-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-zinc-900">Brightloop Core</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
          </div>
          <p className="text-[10px] text-zinc-400 leading-tight">
            Recurring billing & plan lifecycle engine
          </p>
        </div>
      </div>
    </aside>
  );
}
