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
      {/*
        Section order is a conversion sequence, not a content list:
        1  Hero          promise + primary action
        2  Trust         borrowed authority before any ask
        3  Quote form    capture while intent is highest
        4  Film          motion holds attention, then pushes back to the form
        5  Services      what we actually do
        6  Proof         evidence it is real
        7  Sectors       "this is for someone like me"
        8  Process       removes the risk of saying yes
        9  Coverage      local relevance
        10 FAQ           handles the last objections
        11 Footer CTA    final ask
      */}
      <main>
        <Hero />
        <BrandsBand />
        <QuoteBand />
        <InstagramWall />
        <ServicesOverview />
        <Proof />
        <Sectors />
        <Process />
        <Coverage />
        <Faq />
      </main>
      <SiteFooter />
    </div>
  );
}
