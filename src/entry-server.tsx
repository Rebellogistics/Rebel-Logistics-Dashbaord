/**
 * Build-time server entry for the public marketing site.
 *
 * Only the marketing routes are pre-rendered. The dashboard, driver shell and
 * anything behind auth stay a client-side app — they are private, so there is
 * nothing for a crawler to gain and a lot of Supabase state to go wrong.
 *
 * The route table below deliberately mirrors the public routes in `main.tsx`.
 * It cannot reuse them: those are `React.lazy`, and `renderToString` does not
 * await lazy components — it would emit the Suspense fallback (`null`) and we
 * would ship the same empty page we are trying to fix. Add a public route in
 * one place and add it here too; `npm run prerender` fails the build if a
 * route renders empty markup or no head.
 */
import { StrictMode } from 'react';
import { renderToString } from 'react-dom/server';
import { StaticRouter } from 'react-router-dom/server';
import { Routes, Route } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

import MarketingHome from './components/public/marketing/MarketingHome';
import WorkPage from './components/public/marketing/pages/WorkPage';
import { ServicePage, AboutPage, ContactPage, QuotePage } from './components/public/marketing/pages/pages';
import { AreasIndexPage, AreaPage } from './components/public/marketing/pages/AreaPages';
import { AREAS_DATA } from './components/public/marketing/site/areas';
import { SeoCollector, type HeadTag } from './components/public/marketing/site/seo';

/** Every URL the build writes a static HTML file for. */
export function getPrerenderRoutes(): string[] {
  return [
    '/',
    '/logistics',
    '/warehousing',
    '/labour',
    '/work',
    '/areas',
    '/about',
    '/contact',
    '/quote',
    ...AREAS_DATA.map((a) => `/areas/${a.slug}`),
  ];
}

export type RenderResult = { html: string; head: HeadTag[] };

export function render(url: string): RenderResult {
  const collector: { tags: HeadTag[] } = { tags: [] };

  // A fresh client per route: nothing should leak between pages, and no query
  // is expected to run during a static render anyway.
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false, staleTime: Infinity } },
  });

  const html = renderToString(
    <StrictMode>
      <QueryClientProvider client={queryClient}>
        <SeoCollector.Provider value={collector}>
          <StaticRouter location={url}>
            <Routes>
              <Route path="/" element={<MarketingHome />} />
              <Route path="/logistics" element={<ServicePage slug="logistics" />} />
              <Route path="/warehousing" element={<ServicePage slug="warehousing" />} />
              <Route path="/labour" element={<ServicePage slug="labour" />} />
              <Route path="/work" element={<WorkPage />} />
              <Route path="/areas" element={<AreasIndexPage />} />
              <Route path="/areas/:slug" element={<AreaPage />} />
              <Route path="/about" element={<AboutPage />} />
              <Route path="/contact" element={<ContactPage />} />
              <Route path="/quote" element={<QuotePage />} />
            </Routes>
          </StaticRouter>
        </SeoCollector.Provider>
      </QueryClientProvider>
    </StrictMode>,
  );

  return { html, head: collector.tags };
}
