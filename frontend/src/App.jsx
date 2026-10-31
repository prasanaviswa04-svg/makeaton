import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Sidebar from './components/Sidebar';
import AuthPage from './pages/AuthPage';
import FinanceDashboard from './pages/FinanceDashboard';
import SubscriptionsPage from './pages/SubscriptionsPage';
import BillingPage from './pages/BillingPage';
import PaymentsPage from './pages/PaymentsPage';
import ProductsPage from './pages/ProductsPage';
import PlansPage from './pages/PlansPage';
import DiscountsTaxesPage from './pages/DiscountsTaxesPage';
import TeamPage from './pages/TeamPage';
import CustomerPortal from './pages/CustomerPortal';

function MainApp() {
  const { user, loading, isCustomer } = useAuth();
  const [currentTab, setCurrentTab] = useState(isCustomer ? 'portal' : 'finance');

  React.useEffect(() => {
    if (isCustomer) {
      setCurrentTab('portal');
    } else if (currentTab === 'portal' && !isCustomer) {
      setCurrentTab('finance');
    }
  }, [user?.role]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-zinc-900 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs font-medium text-zinc-500">Loading workspace...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return <AuthPage />;
  }

  return (
    <div className="min-h-screen bg-[#fafafa] flex flex-col font-sans selection:bg-zinc-900 selection:text-white">
      <Navbar />

      <div className="flex-1 flex max-w-7xl w-full mx-auto">
        <Sidebar currentTab={currentTab} setCurrentTab={setCurrentTab} />

        <main className="flex-1 p-5 sm:p-6 overflow-y-auto">
          {currentTab === 'finance' && (
            <FinanceDashboard onNavigateToBilling={() => setCurrentTab('billing')} />
          )}
          {currentTab === 'subscriptions' && <SubscriptionsPage />}
          {currentTab === 'billing' && <BillingPage />}
          {currentTab === 'payments' && <PaymentsPage />}
          {currentTab === 'products' && <ProductsPage />}
          {currentTab === 'plans' && <PlansPage />}
          {currentTab === 'discounts' && <DiscountsTaxesPage />}
          {currentTab === 'team' && <TeamPage />}
          {currentTab === 'portal' && <CustomerPortal />}
        </main>
      </div>
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
