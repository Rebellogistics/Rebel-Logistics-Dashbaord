import { StrictMode, lazy, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import { PublicStatusPage } from './components/public/PublicStatusPage';
import { GoogleOAuthCallback } from './components/public/GoogleOAuthCallback';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

const MarketingHome = lazy(() => import('./components/public/marketing/MarketingHome'));
const MarketingPages = () => import('./components/public/marketing/pages/pages');
const LogisticsPage = lazy(() => MarketingPages().then((m) => ({ default: () => <m.ServicePage slug="logistics" /> })));
const WarehousingPage = lazy(() => MarketingPages().then((m) => ({ default: () => <m.ServicePage slug="warehousing" /> })));
const LabourPage = lazy(() => MarketingPages().then((m) => ({ default: () => <m.ServicePage slug="labour" /> })));
const AboutPage = lazy(() => MarketingPages().then((m) => ({ default: m.AboutPage })));
const ContactPage = lazy(() => MarketingPages().then((m) => ({ default: m.ContactPage })));
const QuotePage = lazy(() => MarketingPages().then((m) => ({ default: m.QuotePage })));
const WorkPage = lazy(() => import('./components/public/marketing/pages/WorkPage'));
const AreaPagesMod = () => import('./components/public/marketing/pages/AreaPages');
const AreasIndexPage = lazy(() => AreaPagesMod().then((m) => ({ default: m.AreasIndexPage })));
const AreaPage = lazy(() => AreaPagesMod().then((m) => ({ default: m.AreaPage })));

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <ThemeProvider
        attribute="class"
        defaultTheme="light"
        forcedTheme="light"
        enableSystem={false}
        storageKey="rebel-theme"
        disableTransitionOnChange
      >
        <BrowserRouter>
          <Routes>
            <Route
              path="/"
              element={
                <Suspense fallback={null}>
                  <MarketingHome />
                </Suspense>
              }
            />
            {/* Public marketing pages. These must be declared before the
                catch-all below, or they fall through to the dashboard. */}
            <Route path="/logistics" element={<Suspense fallback={null}><LogisticsPage /></Suspense>} />
            <Route path="/warehousing" element={<Suspense fallback={null}><WarehousingPage /></Suspense>} />
            <Route path="/labour" element={<Suspense fallback={null}><LabourPage /></Suspense>} />
            <Route path="/work" element={<Suspense fallback={null}><WorkPage /></Suspense>} />
            <Route path="/areas" element={<Suspense fallback={null}><AreasIndexPage /></Suspense>} />
            <Route path="/areas/:slug" element={<Suspense fallback={null}><AreaPage /></Suspense>} />
            <Route path="/about" element={<Suspense fallback={null}><AboutPage /></Suspense>} />
            <Route path="/contact" element={<Suspense fallback={null}><ContactPage /></Suspense>} />
            <Route path="/quote" element={<Suspense fallback={null}><QuotePage /></Suspense>} />
            <Route path="/status/:jobId" element={<PublicStatusPage />} />
            <Route path="/integrations/google/callback" element={<GoogleOAuthCallback />} />
            <Route path="/login" element={<LoginPage />} />
            <Route
              path="/*"
              element={
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              }
            />
          </Routes>
        </BrowserRouter>
      </ThemeProvider>
    </QueryClientProvider>
  </StrictMode>,
);
