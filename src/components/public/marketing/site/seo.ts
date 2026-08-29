import { useEffect } from 'react';
import { AREAS, BUSINESS, FAQS, SERVICES } from './data';

const SITE = 'https://rebellogistics.com.au';

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

/** Local-SEO head management: titles, meta, canonical, OG/Twitter, JSON-LD. */
export function useSeo({ title, description, path, image = '/site/hero-1.jpg', service, faq }: SeoInput) {
  useEffect(() => {
    const url = `${SITE}${path}`;
    const img = `${SITE}${image}`;

    document.title = title;
    setMeta('name', 'description', description);
    setMeta('name', 'robots', 'index,follow,max-image-preview:large');
    setMeta('name', 'geo.region', 'AU-VIC');
    setMeta('name', 'geo.placename', 'Flemington, Melbourne');
    setLink('canonical', url);

    setMeta('property', 'og:type', 'website');
    setMeta('property', 'og:site_name', BUSINESS.name);
    setMeta('property', 'og:locale', 'en_AU');
    setMeta('property', 'og:title', title);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:url', url);
    setMeta('property', 'og:image', img);
    setMeta('name', 'twitter:card', 'summary_large_image');
    setMeta('name', 'twitter:title', title);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', img);

    // Core local business record.
    setJsonLd('business', {
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
    });

    if (service) {
      setJsonLd('service', {
        '@context': 'https://schema.org',
        '@type': 'Service',
        name: service.name,
        description: service.description,
        serviceType: service.name,
        provider: { '@id': `${SITE}#business` },
        areaServed: { '@type': 'State', name: 'Victoria, Australia' },
        url,
      });
    } else {
      document.head.querySelector('script[data-seo="service"]')?.remove();
    }

    if (faq) {
      setJsonLd('faq', {
        '@context': 'https://schema.org',
        '@type': 'FAQPage',
        mainEntity: FAQS.map((f) => ({
          '@type': 'Question',
          name: f.q,
          acceptedAnswer: { '@type': 'Answer', text: f.a },
        })),
      });
    } else {
      document.head.querySelector('script[data-seo="faq"]')?.remove();
    }

    setJsonLd('breadcrumb', {
      '@context': 'https://schema.org',
      '@type': 'BreadcrumbList',
      itemListElement: [
        { '@type': 'ListItem', position: 1, name: 'Home', item: SITE },
        ...(path === '/' ? [] : [{ '@type': 'ListItem', position: 2, name: title.split('|')[0].trim(), item: url }]),
      ],
    });
  }, [title, description, path, image, service, faq]);
}
