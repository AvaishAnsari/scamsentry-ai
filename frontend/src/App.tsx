import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AppShell } from './components/common/AppShell';
import { HomePage } from './pages/HomePage';
import { LookupPage } from './pages/LookupPage';
import { ReportPage } from './pages/ReportPage';
import { ReportDonePage } from './pages/ReportDonePage';
import { MapPage } from './pages/MapPage';
import { AlertsPage } from './pages/AlertsPage';
import { HowItWorksPage } from './pages/HowItWorksPage';
import { NotFoundPage } from './pages/NotFoundPage';

export const App: React.FC = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<AppShell />}>
          <Route index element={<HomePage />} />
          <Route path="check" element={<LookupPage />} />
          <Route path="report" element={<ReportPage />} />
          <Route path="report/done" element={<ReportDonePage />} />
          <Route path="map" element={<MapPage />} />
          <Route path="alerts" element={<AlertsPage />} />
          <Route path="how-it-works" element={<HowItWorksPage />} />
          <Route path="404" element={<NotFoundPage />} />
          <Route path="*" element={<Navigate to="/404" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  );
};

export default App;

