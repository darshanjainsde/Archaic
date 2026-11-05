import Link from "next/link";
import { formatMoney } from "@/lib/money";

/** Tokens dropped into the folding box: x, y (of 220), size, colour. */
const TOKENS: [number, number, number, string][] = [[18, 18, 40, "#f2c14e"], [92, 18, 40, "#a58fd0"], [164, 18, 40, "#e58aa0"], [18, 92, 110, "#c9a14a"], [164, 164, 40, "#c0392b"], [92, 164, 40, "#8fc1d4"]];

/** Homepage entry to the box builder: a kraft box folds up, fills, closes, is tied and sealed. */
export function BoxEntry({ heading, text, ctaLabel, sizes, from, packDays, lid }: { heading: string; text: string; ctaLabel: string; sizes: { label: string }[]; from: number | null; packDays: number; lid: string }) {
  const words = heading.trim().split(/\s+/);
  const tail = words.length > 3 ? words.slice(-2).join(" ") : "";
  const head = tail ? words.slice(0, -2).join(" ") : heading;
  return (
    <section className="reveal container-x bxe" aria-labelledby="bxe-h">
      <div className="bxe-copy">
        <p className="eyebrow">New · Build your own</p>
        <h2 id="bxe-h" className="text-[40px] md:text-[64px]">{head}{tail && <> <i>{tail}</i></>}</h2>
        {text && <p className="mt-4 max-w-[44ch] text-[18px]">{text}</p>}
        <ol className="bxe-trail">
          <li><b>1</b><span>Pick a size{sizes.length ? `, from ${sizes[0].label} to ${sizes[sizes.length - 1].label}` : ""}.</span></li>
          <li><b>2</b><span>Dress it: paper, ribbon, filler and a wax seal.</span></li>
          <li><b>3</b><span>Fill it with candles in their scent, with their name on the label.</span></li>
          <li><b>4</b><span>Write the card. We pack it and seal it.</span></li>
        </ol>
        {sizes.length > 1 && <div className="bxe-sizes" aria-label="Box sizes">{sizes.map((s) => <span key={s.label}>{s.label}</span>)}</div>}
        <div className="mt-7 flex flex-wrap gap-3"><Link href="/build-a-box" className="btn btn-primary">{ctaLabel || "Start your box"}</Link></div>
        <p className="mt-3 text-[13px] text-muted">{from !== null ? `Boxes from ${formatMoney(from)} · ` : ""}Packed in {packDays} working day{packDays === 1 ? "" : "s"} · A photo of your box before we seal it</p>
      </div>
      <Link href="/build-a-box" className="bxe-scene" aria-label="A kraft box folds up, fills with candles, closes, is tied with twine and sealed with wax. Open the box builder.">
        <span className="bxe-iso" aria-hidden>
          <span className="bxe-floor">
            <span className="bxe-wall n" /><span className="bxe-wall s" /><span className="bxe-wall w" /><span className="bxe-wall e" />
            {TOKENS.map(([x, y, s, c], i) => (
              <span key={i} className={`bxe-tok t${i}`} style={{ left: x, top: y, width: s, height: s, borderRadius: s > 60 ? 18 : 999, background: s > 60 ? "radial-gradient(circle at 40% 35%, #e3c06a, #a8812f 70%)" : `radial-gradient(circle at 40% 35%, ${c}, ${c} 55%, #6b3a12 57%)` }} />
            ))}
            <span className="bxe-lid"><i className="tw1" /><i className="tw2" />{lid && <span className="nm">{lid}</span>}<span className="seal">A</span></span>
          </span>
        </span>
      </Link>
    </section>
  );
}
