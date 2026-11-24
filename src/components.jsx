import { useEffect } from "react";
import { Icon, WineBottle } from "./icons.jsx";
import { annataLabel, getWindowStatus, qty, STATUS_COLOR, toYear } from "./data.js";

export function StatusBadge({ wine }) {
  const s = getWindowStatus(wine);
  return <span className={`badge badge--${s.key || "none"}`}>{s.label}</span>;
}

export function Stars({ value = 0, onChange, size = 30 }) {
  return (
    <div className={`stars ${onChange ? "" : "stars--sm"}`}>
      {[1, 2, 3, 4, 5].map((i) =>
        onChange ? (
          <button key={i} type="button" onClick={() => onChange(i === value ? 0 : i)} aria-label={`${i} stelle`}>
            <Icon name={i <= value ? "starFill" : "star"} size={size} />
          </button>
        ) : (
          <Icon key={i} name={i <= value ? "starFill" : "star"} size={size} />
        )
      )}
    </div>
  );
}

/** Barra orizzontale: finestra di bevuta (verde), apice (oro) e anno corrente. */
export function WindowBar({ wine, size = "lg" }) {
  const now = new Date().getFullYear();
  const da = toYear(wine.finestraDa);
  const a = toYear(wine.finestraA);
  if (!da && !a) return null;
  const pDa = toYear(wine.apiceDa);
  const pA = toYear(wine.apiceA);
  const vintage = toYear(wine.annata);
  const winStart = da ?? Math.min(now, a - 3);
  const winEnd = a ?? Math.max(now, da + 5);
  const start = Math.min(vintage ?? winStart - 2, winStart - 1, now - 1);
  const end = Math.max(winEnd + 2, now + 1);
  const span = end - start || 1;
  // Ogni anno occupa l'intervallo [anno, anno+1)
  const pos = (y) => `${((y - start) / span) * 100}%`;
  const width = (y1, y2) => `${((y2 + 1 - y1) / span) * 100}%`;
  const past = a && now > a;

  return (
    <div className={`wbar ${size === "mini" ? "wbar--mini" : "wbar--lg"} ${past ? "wbar--past" : ""}`}>
      <div className="wbar__track">
        <div className="wbar__win" style={{ left: pos(winStart), width: width(winStart, Math.min(winEnd, end - 1)) }} />
        {pDa && pA && <div className="wbar__peak" style={{ left: pos(pDa), width: width(pDa, pA) }} />}
        <div className="wbar__now" style={{ left: `calc(${((now + 0.5 - start) / span) * 100}% - 1px)` }} />
      </div>
      {size !== "mini" && (
        <div className="wbar__scale">
          <span>{start}</span>
          <span>{end}</span>
        </div>
      )}
    </div>
  );
}

export function WineCard({ wine, onClick, drunk = false, children }) {
  const s = getWindowStatus(wine);
  const n = qty(wine);
  return (
    <button
      type="button"
      className="card wine"
      style={{ "--status": drunk ? "var(--ok)" : STATUS_COLOR[s.key] }}
      onClick={onClick}
    >
      <div className="wine__icon">
        <WineBottle tipo={wine.tipo} size={32} />
      </div>
      <div className="wine__body">
        <div className="wine__name">
          {wine.nome}
          <span className="wine__year">{annataLabel(wine.annata)}</span>
        </div>
        <div className="wine__meta">
          {[wine.produttore, [wine.regione, wine.nazione].filter(Boolean).join(", ")].filter(Boolean).join(" · ")}
        </div>
        {children ?? (
          <>
            <div className="wine__row">
              <span className={`badge badge--${s.key || "none"}`}>{s.label}</span>
              {wine.posizione && (
                <span className="chip chip--soft">
                  <Icon name="pin" size={12} /> {wine.posizione}
                </span>
              )}
            </div>
            <WindowBar wine={wine} size="mini" />
          </>
        )}
      </div>
      {!drunk && n > 1 && <span className="wine__qty">×{n}</span>}
    </button>
  );
}

export function Modal({ children, onClose }) {
  useEffect(() => {
    const onKey = (e) => e.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [onClose]);
  return (
    <div className="modal-back" onClick={(e) => e.target === e.currentTarget && onClose?.()}>
      <div className="modal" role="dialog" aria-modal="true">
        {children}
      </div>
    </div>
  );
}

export function ConfirmModal({ title, text, confirmLabel = "Conferma", danger = false, onConfirm, onClose }) {
  return (
    <Modal onClose={onClose}>
      <h2>{title}</h2>
      <p className="note" style={{ margin: "6px 0 18px" }}>{text}</p>
      <div className="btn-row">
        <button className="btn" onClick={onClose}>Annulla</button>
        <button className={`btn ${danger ? "btn--danger" : "btn--primary"}`} onClick={onConfirm}>
          {confirmLabel}
        </button>
      </div>
    </Modal>
  );
}
