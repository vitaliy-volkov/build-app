// src/modules/core/layout/Layout.tsx
import React, { ReactNode } from 'react';
import { Sidebar } from '../../../components/Layout'; // We will refactor Sidebar later, importing from legacy location for now
import { useAuthStore } from '../auth/store';
import { Navigate } from 'react-router-dom';

interface LayoutProps {
  children: ReactNode;
}

export const Layout: React.FC<LayoutProps> = ({ children }) => {
  const { isAuthenticated } = useAuthStore();

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  // Reuse the existing layout structure
  // Note: We'll eventually move Sidebar to this module too
  return (
    <div className="flex h-screen bg-slate-50 overflow-hidden">
        {/* Legacy Sidebar wrapper */}
        <div className="flex-none">
            {/* We need to ensure Sidebar works with new store eventually */}
            <Sidebar />
        </div>

        <main className="flex-1 overflow-auto w-full relative">
            <div className="max-w-[1920px] mx-auto p-4 md:p-6 lg:p-8 min-h-full">
                {children}
            </div>
        </main>
    </div>
  );
};
