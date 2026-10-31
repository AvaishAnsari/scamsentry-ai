import React from 'react';
import { Outlet } from 'react-router-dom';
import { EmergencyBanner } from './EmergencyBanner';
import { TopNav } from './TopNav';
import { BottomNav } from './BottomNav';
import { Footer } from './Footer';

export const AppShell: React.FC = () => {
  return (
    <div className="min-h-screen flex flex-col bg-surface text-ink">
      {/* 1. Emergency strip: The 1930 helpline sits above everything on every page */}
      <EmergencyBanner />

      {/* 2. Top Navigation */}
      <TopNav />

      {/* 3. Main Content Router View */}
      <main className="flex-1 flex flex-col">
        <Outlet />
      </main>

      {/* 4. Footer */}
      <Footer />

      {/* 5. Mobile Bottom Navigation */}
      <BottomNav />
    </div>
  );
};

