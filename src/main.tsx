import { StrictMode, type ReactNode } from 'react';
import { createRoot, hydrateRoot } from 'react-dom/client';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { ThemeProvider } from 'next-themes';
import App from './App.tsx';
import MarketingHome from './components/public/marketing/MarketingHome';
import WorkPage from './components/public/marketing/pages/WorkPage';
import { ServicePage, AboutPage, ContactPage, QuotePage } from './components/public/marketing/pages/pages';
import { AreasIndexPage, AreaPage } from './components/public/marketing/pages/AreaPages';
import { AudiencePage } from './components/public/marketing/pages/AudiencePages';
import { PublicStatusPage } from './components/public/PublicStatusPage';
import { GoogleOAuthCallback } from './components/public/GoogleOAuthCallback';
import { LoginPage } from './components/auth/LoginPage';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import './index.css';

// Marketing routes are imported eagerly, not via React.lazy. They ship
// pre-rendered to static HTML, and `lazy` would suspend on the very first
// hydration render — handing React a `null` fallback to reconcile against
// finished server markup, which fails hydration and repaints the page.
// Loading them up front also removes a round-trip before first paint.

/**
 * next-themes only matters to the dashboard (Toaster and the theme toggle read
 * it). It is deliberately not wrapped around the marketing routes: it renders
 * an inline <script> whose minified text differs between the client bundle and
 * the pre-render's SSR bundle, which fails hydration on every static page. The
 * stylesheet has no `.light` rules, so the public site renders identically
 * without it.
 */
function Themed({ children }: { children: ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="light"
      forcedTheme="light"
      enableSystem={false}
      storageKey="rebel-theme"
      disableTransitionOnChange
    >
      {children}
    </ThemeProvider>
  );
}

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      staleTime: 1000 * 60 * 5,
    },
  },
});

const container = document.getElementById('root')!;

const tree = (
  <StrictMode>
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<MarketingHome />} />
          {/* Public marketing pages. These must be declared before the
              catch-all below, or they fall through to the dashboard. */}
          <Route path="/logistics" element={<ServicePage slug="logistics" />} />
          <Route path="/warehousing" element={<ServicePage slug="warehousing" />} />
          <Route path="/labour" element={<ServicePage slug="labour" />} />
          <Route path="/work" element={<WorkPage />} />
          <Route path="/areas" element={<AreasIndexPage />} />
          <Route path="/areas/:slug" element={<AreaPage />} />
          <Route path="/for/:slug" element={<AudiencePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="/contact" element={<ContactPage />} />
          <Route path="/quote" element={<QuotePage />} />
          <Route path="/status/:jobId" element={<Themed><PublicStatusPage /></Themed>} />
          <Route path="/integrations/google/callback" element={<Themed><GoogleOAuthCallback /></Themed>} />
          <Route path="/login" element={<Themed><LoginPage /></Themed>} />
          <Route
            path="/*"
            element={
              <Themed>
                <ProtectedRoute>
                  <App />
                </ProtectedRoute>
              </Themed>
            }
          />
        </Routes>
      </BrowserRouter>
    </QueryClientProvider>
  </StrictMode>
);

// The marketing routes are pre-rendered to static HTML at build time, so the
// container already holds markup — hydrate it rather than discarding it and
// repainting. Dashboard routes are still served the empty shell and mount
// normally.
if (container.hasChildNodes()) {
  hydrateRoot(container, tree);
} else {
  createRoot(container).render(tree);
}
