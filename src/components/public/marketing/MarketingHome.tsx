import { SiteHeader, SiteFooter } from './site/Chrome';
import { Hero } from './sections/Hero';
import {
  BrandsBand,
  QuoteBand,
  ServicesOverview,
  Proof,
  Sectors,
  Process,
  InstagramWall,
  Coverage,
  Faq,
} from './sections/homeSections';
import { useSeo } from './site/seo';

export default function MarketingHome() {
  useSeo({
    title: 'Rebel Logistics | White-Glove Furniture & Art Logistics Melbourne',
    description:
      'Melbourne specialists in white-glove furniture delivery, art handling, craning, warehousing and installation for luxury interiors. Trusted by leading designers and brands. Same-day quotes.',
    path: '/',
    faq: true,
  });

  return (
    <div className="rl min-h-screen">
      <SiteHeader overHero />
      <main>
        <Hero />
        <BrandsBand />
        <QuoteBand />
        <ServicesOverview />
        <Proof />
        <InstagramWall />
        <Sectors />
        <Process />
        <Coverage />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
