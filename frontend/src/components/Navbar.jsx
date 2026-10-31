import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { LogOut, Shield, Briefcase, Store, Building2, ChevronDown } from 'lucide-react';

export default function Navbar() {
  const { user, logout, switchDemoRole } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [switching, setSwitching] = useState(false);

  const handleRoleSwitch = async (roleKey) => {
    setSwitching(true);
    setDropdownOpen(false);
    try {
      await switchDemoRole(roleKey);
    } catch (err) {
      console.error('Role switch failed:', err);
    } finally {
      setSwitching(false);
    }
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'admin':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium border border-zinc-200/80">
            <Shield className="w-3 h-3 text-zinc-600" /> Admin
          </span>
        );
      case 'staff':
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium border border-zinc-200/80">
            <Briefcase className="w-3 h-3 text-zinc-600" /> Staff
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-md bg-zinc-100 text-zinc-800 font-medium border border-zinc-200/80">
            <Store className="w-3 h-3 text-zinc-600" /> Customer
          </span>
        );
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-sm border-b border-zinc-200/80">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-14">
          
          {/* Brand Logo & Name - Clean & Minimalist */}
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-md bg-zinc-950 flex items-center justify-center text-white font-semibold text-xs tracking-tight shadow-xs">
              B
            </div>
            <div className="flex items-baseline gap-2">
              <span className="font-semibold text-zinc-950 text-sm tracking-tight">Brightloop</span>
              <span className="text-zinc-300">/</span>
              <span className="text-xs text-zinc-500 font-normal hidden sm:inline">Subscription & Billing</span>
            </div>
          </div>

          {/* Right Header: Role Switcher & Account */}
          <div className="flex items-center gap-2.5">
            {/* Minimalist Demo Persona Switcher */}
            <div className="relative">
              <button
                onClick={() => setDropdownOpen(!dropdownOpen)}
                disabled={switching}
                className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-zinc-700 bg-white hover:bg-zinc-50 rounded-lg border border-zinc-200 shadow-2xs transition-colors"
                title="Switch demo persona"
              >
                <span className="text-zinc-400 font-normal">Role:</span>
                <span className="font-semibold text-zinc-900 capitalize">{user?.role || 'Guest'}</span>
                <ChevronDown className="w-3 h-3 text-zinc-400" />
              </button>

              {dropdownOpen && (
                <div className="absolute right-0 mt-1.5 w-52 bg-white rounded-xl shadow-lg border border-zinc-200/90 py-1 z-50 animate-in fade-in zoom-in-95 duration-100">
                  <div className="px-3 py-1.5 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider border-b border-zinc-100">
                    Switch Active Persona
                  </div>
                  <button
                    onClick={() => handleRoleSwitch('admin')}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Shield className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-medium">Administrator</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Full</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('staff')}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Briefcase className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-medium">Staff Representative</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Sales</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('customer')}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Store className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-medium">Retail Customer</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Portal</span>
                  </button>
                  <button
                    onClick={() => handleRoleSwitch('enterprise')}
                    className="w-full text-left px-3 py-2 text-xs text-zinc-700 hover:bg-zinc-50 flex items-center justify-between"
                  >
                    <span className="flex items-center gap-2">
                      <Building2 className="w-3.5 h-3.5 text-zinc-600" />
                      <span className="font-medium">Enterprise Customer</span>
                    </span>
                    <span className="text-[10px] text-zinc-400 font-mono">Portal</span>
                  </button>
                </div>
              )}
            </div>

            {/* User Profile */}
            {user && (
              <div className="flex items-center gap-2 pl-2 border-l border-zinc-200">
                <div className="hidden sm:block text-right">
                  <div className="text-xs font-semibold text-zinc-900 leading-none">{user.full_name}</div>
                  <div className="text-[10px] text-zinc-400 mt-0.5">{user.company_name || user.email}</div>
                </div>
                {getRoleBadge(user.role)}
                <button
                  onClick={logout}
                  className="p-1 text-zinc-400 hover:text-zinc-700 hover:bg-zinc-100 rounded-md transition-colors"
                  title="Sign Out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
}
