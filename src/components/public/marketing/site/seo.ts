import { createContext, useContext, useEffect } from 'react';
import { AREAS, BUSINESS, FAQS, SERVICES } from './data';

// www is the host Vercel actually serves; the apex 308-redirects to it. The
// canonical must name the URL that returns 200, or Google indexes neither.
const SITE = 'https://www.rebellogistics.com.au';

/**
 * One head tag, described rather than applied.
 *
 * The browser turns these into real DOM nodes; the build-time pre-render
 * serialises them straight into the HTML it writes to disk. Describing the
 * head as data is what lets both paths emit byte-identical tags from one
 * source, so a crawler that never runs our JavaScript still gets the full
 * local-business record.
 */
export type HeadTag =
  | { kind: 'title'; text: string }
  | { kind: 'meta'; attr: 'name' | 'property'; key: string; content: string }
  | { kind: 'link'; rel: string; href: string }
  | { kind: 'jsonld'; id: string; data: unknown };

export type SeoInput = {
  title: string;
  description: string;
  path: string;
  image?: string;
  /** Adds Service structured data for a service page. */
  service?: { name: string; description: string };
  /** Adds FAQ structured data (home page). */
  faq?: boolean;
};

/** Pure. No DOM, no side effects — safe to call in Node during the build. */
export function buildHead({
  title,
  description,
  path,
  image = '/site/hero-1.jpg',
  service,
  faq,
}: SeoInput): HeadTag[] {
  const url = `${SITE}${path}`;
  const img = `${SITE}${image}`;

  const tags: HeadTag[] = [
    { kind: 'title', text: title },
    { kind: 'meta', attr: 'name', key: 'description', content: description },
    { kind: 'meta', attr: 'name', key: 'robots', content: 'index,follow,max-image-preview:large' },
    { kind: 'meta', attr: 'name', key: 'geo.region', content: 'AU-VIC' },
    { kind: 'meta', attr: 'name', key: 'geo.placename', content: 'Flemington, Melbourne' },
    { kind: 'link', rel: 'canonical', href: url },

    { kind: 'meta', attr: 'property', key: 'og:type', content: 'website' },
    { kind: 'meta', attr: 'property', key: 'og:site_name', content: BUSINESS.name },
    { kind: 'meta', attr: 'property', key: 'og:locale', content: 'en_AU' },
    { kind: 'meta', attr: 'property', key: 'og:title', content: title },
    { kind: 'meta', attr: 'property', key: 'og:description', content: description },
    { kind: 'meta', attr: 'property', key: 'og:url', content: url },
    { kind: 'meta', attr: 'property', key: 'og:image', content: img },
    { kind: 'meta', attr: 'name', key: 'twitter:card', content: 'summary_large_image' },
    { kind: 'meta', attr: 'name', key: 'twitter:title', content: title },
    { kind: 'meta', attr: 'name', key: 'twitter:description', content: description },
    { kind: 'meta', attr: 'name', key: 'twitter:image', content: img },
  ];

  // Core local business record.
  tags.push({
    kind: 'jsonld',
    id: 'business',
    data: {
      '@context': 'https://schema.org',
      '@type': 'MovingCompany',
      '@id': `${SITE}#business`,
      name: BUSINESS.legal,
      alternateName: BUSINESS.name,
      url: SITE,
      image: img,
      logo: `${SITE}/logo.png`,
      email: BUSINESS.email,
      telephone: BUSINESS.phoneIntl,
      foundingDate: String(BUSINESS.founded),
      description:
        'Specialist white-glove logistics, warehousing and installation in Melbourne for luxury furniture, art, stone and interiors.',
      address: {
        '@type': 'PostalAddress',
        streetAddress: '159 Racecourse Road',
        addressLocality: 'Flemington',
        addressRegion: 'VIC',
        postalCode: '3031',
        addressCountry: 'AU',
      },
      geo: { '@type': 'GeoCoordinates', latitude: -37.7876, longitude: 144.9219 },
      areaServed: AREAS.map((a) => ({ '@type': 'Place', name: `${a}, Victoria` })),
      sameAs: [BUSINESS.instagram],
      hasOfferCatalog: {
        '@type': 'OfferCatalog',
        name: 'Services',
        itemListElement: SERVICES.map((s) => ({
          '@type': 'Offer',
          itemOffered: { '@type': 'Service', name: s.title, description: s.blurb },
        })),
      },
    },
  });

  if (service) {
    tags.push({
      kind: 'jsonld',
      id: 'service',
      data: {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.description,
        serviceType: service.name,
        provider: { '@id': `${SITE}#business` },
        areaServed: { '@type': 'State', name: 'Victoria, Australia' },
        url,
      },
    });
  }

  if (faq) {
    tags.push({
      kind: 'jsonld',
      id: 'faq',
      data: {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      },
    });
  }

  tags.push({
    kind: 'jsonld',
    id: 'breadcrumb',
    data: {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        ...(path === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url }]),
      ],
    },
  });

  return tags;
}

/* ------------------------------------------------------------------ */
/* Browser: apply the described head to the live document             */
/* ------------------------------------------------------------------ */

function setMeta(attr: 'name' | 'property', key: string, content: string) {
  let el = document.head.querySelector<HTMLMetaElement>(`meta[${attr}="${key}"]`);
  if (!el) {
    el = document.createElement('meta');
    el.setAttribute(attr, key);
    document.head.appendChild(el);
  }
  el.setAttribute('content', content);
}

function setLink(rel: string, href: string) {
  let el = document.head.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`);
  if (!el) {
    el = document.createElement('link');
    el.setAttribute('rel', rel);
    document.head.appendChild(el);
  }
  el.setAttribute('href', href);
}

function setJsonLd(id: string, data: unknown) {
  let el = document.head.querySelector<HTMLScriptElement>(`script[data-seo="${id}"]`);
  if (!el) {
    el = document.createElement('script');
    el.type = 'application/ld+json';
    el.setAttribute('data-seo', id);
    document.head.appendChild(el);
  }
  el.textContent = JSON.stringify(data);
}

/** Optional JSON-LD blocks that must be cleared when a page does not use them. */
const OPTIONAL_JSONLD = ['service', 'faq'];

function applyHead(tags: HeadTag[]) {
  const seen = new Set<string>();
  for (const tag of tags) {
    switch (tag.kind) {
      case 'title':
        document.title = tag.text;
        break;
      case 'meta':
        setMeta(tag.attr, tag.key, tag.content);
        break;
      case 'link':
        setLink(tag.rel, tag.href);
        break;
      case 'jsonld':
        setJsonLd(tag.id, tag.data);
        seen.add(tag.id);
        break;
    }
  }
  // A page without Service or FAQ data must not inherit the previous page's.
  for (const id of OPTIONAL_JSONLD) {
    if (!seen.has(id)) document.head.querySelector(`script[data-seo="${id}"]`)?.remove();
  }
}

/* ------------------------------------------------------------------ */
/* Build: collect the head instead of applying it                     */
/* ------------------------------------------------------------------ */

/**
 * Present only while the pre-render renders a route in Node. `useSeo` pushes
 * into it during render, so the script can read the head the page asked for
 * without a DOM.
 */
export const SeoCollector = createContext<{ tags: HeadTag[] } | null>(null);

/** Local-SEO head management: titles, meta, canonical, OG/Twitter, JSON-LD. */
export function useSeo(input: SeoInput) {
  const head = buildHead(input);
  const collector = useContext(SeoCollector);

  // Server pass: hand the tags to the pre-render. There is no document here,
  // and effects never run, so this has to happen during render.
  if (collector) collector.tags = head;

  // Serialised so the effect re-runs on real content changes only — callers
  // pass fresh `service` object literals on every render.
  const key = JSON.stringify(head);
  useEffect(() => {
    applyHead(JSON.parse(key) as HeadTag[]);
  }, [key]);
}
