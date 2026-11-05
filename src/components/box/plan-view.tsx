import QRCode from "qrcode";
import type { BoxSnapshot } from "@/lib/box/core";
import { formatMoney } from "@/lib/money";
import { siteUrl } from "@/lib/utils";

/**
 * The packing plan for one custom box: a numbered map of the compartments and what goes where,
 * the box itself, the card, the customer's own gift and the voice-note QR. Server component;
 * `variant="print"` drops colour and decoration for the packing slip.
 */
const WAY: Record<"drop" | "pickup" | "courier", string> = { drop: "Customer drops it at the workshop", pickup: "We pick it up from the customer", courier: "Customer couriers it to us" };
const CUSTOMER_WAY: Record<"drop" | "pickup" | "courier", string> = { drop: "You drop it at our workshop", pickup: "We pick it up from you", courier: "You courier it to us" };
const FONT_NAME: Record<string, string> = { kalam: "Kalam", caveat: "Caveat", apple: "Homemade Apple" };

export async function voiceQrSvg(token: string) {
  return QRCode.toString(siteUrl(`/note/${token}`), { type: "svg", margin: 1, color: { dark: "#2b2216", light: "#ffffff" } });
}

export async function BoxPlanView({ box, quantity = 1, variant = "admin", ownAddress }: { box: BoxSnapshot; quantity?: number; variant?: "admin" | "customer" | "print"; ownAddress?: string }) {
  const c = 44, pad = 10, { cols, rows } = box.size, W = cols * c + pad * 2, H = rows * c + pad * 2;
  const print = variant === "print";
  const qr = box.voice?.token && variant !== "customer" ? await voiceQrSvg(box.voice.token) : null;
  return (
    <div className="grid gap-5 text-[14px]">
      <div className="grid gap-5 @2xl:grid-cols-[auto_minmax(0,1fr)] @2xl:items-start">
        <svg viewBox={`0 0 ${W} ${H}`} width={Math.min(W, 360)} className="h-auto max-w-full" role="img" aria-label={`Packing plan, ${rows} by ${cols} spaces`}>
          <rect width={W} height={H} rx="4" fill={print ? "#fff" : box.finish.color} stroke="#2b2216" strokeWidth={print ? 1.5 : 0} />
          <rect x={pad} y={pad} width={cols * c} height={rows * c} fill={print ? "#fff" : "#f1e4cb"} />
          {Array.from({ length: cols - 1 }, (_, i) => <line key={`v${i}`} x1={pad + (i + 1) * c} y1={pad} x2={pad + (i + 1) * c} y2={pad + rows * c} stroke="#bfa98a" strokeDasharray="3 3" />)}
          {Array.from({ length: rows - 1 }, (_, i) => <line key={`h${i}`} x1={pad} y1={pad + (i + 1) * c} x2={pad + cols * c} y2={pad + (i + 1) * c} stroke="#bfa98a" strokeDasharray="3 3" />)}
          {box.items.map((it, i) => (
            <g key={i}>
              <rect x={pad + it.x * c + 3} y={pad + it.y * c + 3} width={it.w * c - 6} height={it.h * c - 6} rx="5" fill={print ? "#fff" : it.color} stroke="#2b2216" strokeWidth="1.5" />
              <circle cx={pad + (it.x + it.w / 2) * c} cy={pad + (it.y + it.h / 2) * c} r="11" fill="#fff" stroke="#2b2216" />
              <text x={pad + (it.x + it.w / 2) * c} y={pad + (it.y + it.h / 2) * c + 4.5} textAnchor="middle" fontSize="13" fontWeight="700" fill="#2b2216">{i + 1}</text>
            </g>
          ))}
          {box.own && (
            <g>
              <rect x={pad + box.own.x * c + 3} y={pad + box.own.y * c + 3} width={box.own.w * c - 6} height={box.own.h * c - 6} fill="none" stroke="#a85a1f" strokeWidth="2" strokeDasharray="6 4" />
              <text x={pad + (box.own.x + box.own.w / 2) * c} y={pad + (box.own.y + box.own.h / 2) * c + 4} textAnchor="middle" fontSize="11" fontWeight="700" fill="#a85a1f">GIFT</text>
            </g>
          )}
        </svg>

        <div className="min-w-0 space-y-3">
          <p><b>{box.size.name} box, {box.size.rows} × {box.size.cols}</b>{quantity > 1 && <b> · make {quantity}</b>}<br /><span className="text-muted">Outside {box.size.outside} · {box.size.cellCm} cm spaces</span></p>
          <dl className="grid grid-cols-[auto_minmax(0,1fr)] gap-x-4 gap-y-1">
            <dt className="text-muted">Box</dt><dd>{box.finish.name}</dd>
            <dt className="text-muted">Ribbon</dt><dd>{box.ribbon.name}</dd>
            <dt className="text-muted">Filler</dt><dd>{box.filler.name}</dd>
            {box.seal && <><dt className="text-muted">Wax seal</dt><dd>{box.seal.name}, letter <b className="text-[16px]">{box.sealLetter || "none"}</b></dd></>}
            {box.lidName && <><dt className="text-muted">On the lid</dt><dd><b>“{box.lidName}”</b></dd></>}
          </dl>
        </div>
      </div>

      <ol className="grid gap-2">
        {box.items.map((it, i) => (
          <li key={i} className="grid grid-cols-[28px_minmax(0,1fr)_auto] items-start gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-current text-[12px] font-bold">{i + 1}</span>
            <span className="min-w-0">
              <b>{it.name}</b>
              {it.selections.length > 0 && <span className="text-muted"> · {it.selections.map((x) => x.value).join(", ")}</span>}
              {it.personalization && <span className="block">Label: <b>“{it.personalization}”</b></span>}
              <span className="block text-[12px] text-muted">Row {it.y + 1}, space {it.x + 1} · {it.w} × {it.h}</span>
            </span>
            {!print && <span className="tabular-nums">{formatMoney(it.price)}</span>}
          </li>
        ))}
        {box.own && (
          <li className="grid grid-cols-[28px_minmax(0,1fr)] gap-2">
            <span className="grid h-6 w-6 place-items-center rounded-full border border-dashed border-current text-[10px] font-bold">G</span>
            <span><b>{variant === "customer" ? "Space for your gift" : "Customer’s own gift"}</b> · {box.own.w} × {box.own.h} at row {box.own.y + 1}, space {box.own.x + 1}<span className="block text-muted">{(variant === "customer" ? CUSTOMER_WAY : WAY)[box.own.way]}{box.own.fee ? ` · ${formatMoney(box.own.fee)}` : ""}</span>
              {variant === "customer" && ownAddress && box.own.way !== "pickup" && <span className="mt-1 block whitespace-pre-line rounded bg-surface p-2 text-paper-ink">{ownAddress}</span>}
            </span>
          </li>
        )}
      </ol>

      <div className="grid gap-3 @xl:grid-cols-[minmax(0,1fr)_auto]">
        <div className={print ? "border border-black p-3" : "rounded bg-field/60 p-3"}>
          <p className="text-[12px] font-semibold uppercase tracking-wide text-muted">Card · {box.card.paper.name} · {FONT_NAME[box.card.font] ?? box.card.font} handwriting</p>
          <p className="mt-2 whitespace-pre-line text-[15px]">{box.card.to && <>Dear {box.card.to},<br /></>}{box.card.message || <span className="text-muted">No message</span>}{box.card.from && <><br />— {box.card.from}</>}</p>
        </div>
        {box.card.voice && (
          <div className="grid justify-items-center gap-1 text-center text-[12px]">
            {qr && <span className="block h-28 w-28 [&_svg]:h-full [&_svg]:w-full" dangerouslySetInnerHTML={{ __html: qr }} />}
            <span>{box.voice?.url ? "Voice note recorded" : "Voice note not recorded yet"}</span>
            {qr && <span className="text-muted">Print this on the card</span>}
          </div>
        )}
      </div>
    </div>
  );
}
