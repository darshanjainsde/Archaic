import Link from "next/link";
import { Img } from "@/components/ui/img";

export type HeroSlide = { title: string; text: string; ctaLabel: string; ctaHref: string; image: string | null; mobileImage?: string | null };

/** The apothecary label: a paper panel on the dark ground carrying the title, one sentence and one action, with the product drawing beside it. */
export function Hero({ slides, storeName, tagline }: { slides: HeroSlide[]; storeName: string; tagline: string }) {
  const many = slides.length > 1;
  return (
    <section aria-label="Featured" className="relative">
      <div className={many ? "snap-row no-scrollbar auto-cols-[100%]" : ""}>
        {slides.map((s, i) => (
          <div key={i} className="container-x grid items-stretch gap-4 pb-10 pt-4 md:grid-cols-12 md:gap-6 md:pb-16 md:pt-8" id={`hero-${i}`}>
            <div className="label-panel order-2 flex flex-col justify-between gap-8 p-6 md:order-2 md:col-span-12 md:p-12 lg:order-1 lg:col-span-6 lg:min-h-[640px]">
              <div className="flex items-baseline justify-between gap-4 text-[15px]">
                <span className="font-display text-[19px]">{storeName}</span>
                              </div>
              <div>
                {i === 0 ? (
                  <h1 className="text-[36px] leading-[0.98] sm:text-[48px] lg:text-[56px] xl:text-[68px]">{s.title}</h1>
                ) : (
                  <h2 className="text-[36px] leading-[0.98] sm:text-[48px] lg:text-[56px] xl:text-[68px]">{s.title}</h2>
                )}
                <div className="perforated my-6 text-paper-ink" aria-hidden />
                <p className="max-w-[40ch] text-[17px] md:text-[19px]">{s.text || tagline}</p>
              </div>
              <div className="flex flex-wrap items-center gap-4">
                {s.ctaLabel && s.ctaHref && (
                  <Link href={s.ctaHref} className="btn" style={{ background: "var(--paper-ink)", color: "var(--paper)" }}>
                    {s.ctaLabel}
                  </Link>
                )}
                <Link href="/shop" className="tap-y text-[15px] font-semibold underline underline-offset-4">Browse everything</Link>
              </div>
            </div>
            <div className="relative order-1 aspect-[5/4] overflow-hidden bg-surface md:order-1 md:col-span-12 md:aspect-[16/9] lg:order-2 lg:col-span-6 lg:aspect-auto" style={{ borderRadius: "var(--radius)" }}>
              {s.image ? (
                <Img src={s.image} alt="" fill priority={i === 0} sizes="(min-width:768px) 55vw, 100vw" className="object-cover" />
              ) : null}
            </div>
          </div>
        ))}
      </div>
      {many && (
        <div className="container-x -mt-6 flex gap-1 pb-6" aria-label="Slides">
          {slides.map((_, i) => (
            <a key={i} href={`#hero-${i}`} aria-label={`Slide ${i + 1}`} className="grid h-6 w-6 place-items-center before:block before:h-2.5 before:w-2.5 before:rounded-full before:bg-ink/40 before:content-[''] hover:before:bg-ink" />
          ))}
        </div>
      )}
    </section>
  );
}
