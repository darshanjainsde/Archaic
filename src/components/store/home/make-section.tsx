"use client";
import { useState } from "react";
import Link from "next/link";
import { Img } from "@/components/ui/img";
import type { OptionGroup, Personalization } from "@/lib/types";

type Product = { name: string; options: OptionGroup[]; personalization: Personalization | null } | null;

const isHex = (h?: string | null): h is string => !!h && /^#[0-9a-f]{6}$/i.test(h);
const list = (xs: string[]) => (xs.length > 6 ? `${xs.slice(0, 6).join(", ")} and more` : xs.join(", "));

/**
 * "Make it yours": numbered steps built from the hero product's real options (scent, wax colour, label),
 * swatches that recolour the sample label, a photo and one button. Nothing here is invented copy.
 */
export function MakeSection({ heading, image, labelName, labelLine, ctaLabel, ctaHref, product }: { heading: string; image: string | null; labelName: string; labelLine: string; ctaLabel: string; ctaHref: string; product: Product }) {
  const opts = product?.options ?? [];
  const scent = opts.find((g) => g.display === "candle") ?? opts.find((g) => /scent|fragrance/i.test(g.name));
  const colour = opts.find((g) => g.display === "swatch" && g.values.some((v) => isHex(v.hex))) ?? opts.find((g) => g !== scent && /colou?r|wax/i.test(g.name));
  const swatches = (colour?.values ?? []).filter((v) => v.available && isHex(v.hex)).slice(0, 8);
  const [pick, setPick] = useState(0);

  const steps: { title: string; text: string }[] = [];
  if (scent) steps.push({ title: scent.name || "Scent", text: list(scent.values.filter((v) => v.available).map((v) => v.label)) });
  if (colour) steps.push({ title: colour.name || "Wax colour", text: list(colour.values.filter((v) => v.available).map((v) => v.label)) });
  if (product?.personalization?.enabled) steps.push({ title: "The label", text: "Their name, a date, a line only they will understand." });
  if (!steps.length) steps.push({ title: "Scent", text: "Choose the blend on the product page." }, { title: "The note", text: "Add gift wrap and a handwritten card at checkout." });

  const accent = swatches[pick]?.hex ?? "#d9a35a";
  const scentName = scent?.values.find((v) => v.available)?.label;

  return (
    <section className="reveal container-x mk" aria-labelledby="mk-h">
      <div className="mk-copy">
        <h2 id="mk-h" className="text-[34px] md:text-[56px]">{heading}</h2>
        <ol className="mk-steps">
          {steps.map((s, i) => (
            <li key={s.title}><b className="mk-n">{i + 1}</b><p><strong>{s.title}.</strong> {s.text}</p></li>
          ))}
        </ol>
        {swatches.length > 1 && (
          <div className="mk-sw" role="radiogroup" aria-label={`${colour?.name || "Wax colour"} preview`}>
            {swatches.map((v, i) => (
              <button key={v.id} type="button" role="radio" aria-checked={i === pick} aria-label={v.label} title={v.label} onClick={() => setPick(i)} style={{ background: v.hex! }} />
            ))}
          </div>
        )}
        {ctaLabel && <Link href={ctaHref} className="btn btn-primary mk-cta">{ctaLabel}</Link>}
      </div>
      <div className="mk-photo">
        <Img src={image || "/images/home/colours.jpg"} alt="Jar candles in several wax colours" fill sizes="(min-width:900px) 50vw, 100vw" className="object-cover" />
        <div className="mk-label" style={{ borderTopColor: accent }}>
          <b>{labelName}</b>
          {(scentName || product?.name) && <small>{scentName ?? product?.name}</small>}
          {labelLine && <i>{labelLine}</i>}
        </div>
      </div>
    </section>
  );
}
