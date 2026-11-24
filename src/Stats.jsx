import { useState } from "react";
import { Icon, WineBottle, WineGlass } from "./icons.jsx";
import { TIPI, annataLabel, getWindowStatus, qty, qtyBevuta } from "./data.js";

function Bars({ title, rows, onPick, gold }) {
  const max = Math.max(...rows.map((r) => r.count), 1);
  return (
    <div className="card bars">
      <div className="label" style={{ marginBottom: 12 }}>{title}</div>
      {rows.length === 0 && <div className="muted">Nessun dato</div>}
      {rows.map((r) => (
        <div key={r.key} className={`bar ${onPick ? "bar--click" : ""}`} onClick={() => onPick?.(r.key)}>
          <div className="bar__head">
            <span>{r.icon}{r.key}</span>
            <strong>{r.count}</strong>
          </div>
          <div className="bar__track">
            <div className={`bar__fill ${gold ? "bar__fill--gold" : ""}`} style={{ width: `${(r.count / max) * 100}%` }} />
          </div>
        </div>
      ))}
    </div>
  );
}

export default function Stats({ attive, consumate, onOpen }) {
  const [nazione, setNazione] = useState(null);
  const [regione, setRegione] = useState(null);
  const sum = (list) => list.reduce((s, w) => s + qty(w), 0);
  const byStatus = (k) => sum(attive.filter((w) => getWindowStatus(w).key === k));

  const tiles = [
    { label: "In cantina", val: sum(attive), icon: <WineBottle tipo="Rosso" size={26} /> },
    { label: "Pronte o all'apice", val: byStatus("ottimale") + byStatus("apice"), icon: <Icon name="check" size={22} />, color: "var(--ok)" },
    { label: "In scadenza / scadute", val: byStatus("scadenza") + byStatus("scaduta"), icon: <Icon name="bell" size={22} />, color: "var(--warn)" },
    { label: "Bevute", val: consumate.reduce((s, w) => s + qtyBevuta(w), 0), icon: <WineGlass size={26} /> },
  ];

  const filtered = attive.filter((w) => (!nazione || w.nazione === nazione) && (!regione || w.regione === regione));
  const count = (list, key) => {
    const m = new Map();
    list.forEach((w) => w[key] && m.set(w[key], (m.get(w[key]) || 0) + qty(w)));
    return [...m.entries()].map(([k, c]) => ({ key: k, count: c })).sort((a, b) => b.count - a.count);
  };
  const tipoRows = TIPI.map((t) => ({
    key: t,
    count: sum(filtered.filter((w) => w.tipo === t)),
    icon: <WineBottle tipo={t} size={18} />,
  })).filter((r) => r.count > 0);
  const regioni = nazione ? count(attive.filter((w) => w.nazione === nazione), "regione") : [];

  return (
    <div>
      <h2 className="section-title">Statistiche</h2>
      <div className="tiles">
        {tiles.map((t) => (
          <div key={t.label} className="card tile">
            <span style={{ color: t.color || "var(--accent)" }}>{t.icon}</span>
            <div className="tile__val">{t.val}</div>
            <div className="tile__label">{t.label}</div>
          </div>
        ))}
      </div>

      <div className="label">Nazione</div>
      <div className="chips">
        <button className={`chip ${!nazione ? "chip--on" : ""}`} onClick={() => { setNazione(null); setRegione(null); }}>Tutte</button>
        {count(attive, "nazione").map((n) => (
          <button key={n.key} className={`chip ${nazione === n.key ? "chip--on" : ""}`} onClick={() => { setNazione(n.key); setRegione(null); }}>
            {n.key} · {n.count}
          </button>
        ))}
      </div>
      {regioni.length > 0 && (
        <>
          <div className="label">Regione</div>
          <div className="chips">
            <button className={`chip ${!regione ? "chip--on" : ""}`} onClick={() => setRegione(null)}>Tutte</button>
            {regioni.map((r) => (
              <button key={r.key} className={`chip ${regione === r.key ? "chip--on" : ""}`} onClick={() => setRegione(r.key)}>
                {r.key} · {r.count}
              </button>
            ))}
          </div>
        </>
      )}

      <Bars title={nazione ? `Per tipo · ${regione || nazione}` : "Per tipo"} rows={tipoRows} />
      {!nazione && <Bars title="Per nazione" rows={count(attive, "nazione")} gold onPick={(k) => setNazione(k)} />}

      {nazione && (
        <div className="card bars">
          <div className="label" style={{ marginBottom: 6 }}>Bottiglie · {regione || nazione}</div>
          {filtered.map((w) => (
            <div key={w.id} className="minirow" onClick={() => onOpen(w.id)}>
              <span style={{ display: "flex", gap: 8, alignItems: "center", minWidth: 0 }}>
                <WineBottle tipo={w.tipo} size={18} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                  {w.nome} <span className="muted">{annataLabel(w.annata)}</span>
                </span>
              </span>
              <span className="muted" style={{ display: "flex", gap: 6, alignItems: "center" }}>
                {qty(w) > 1 && `×${qty(w)}`} <Icon name="next" size={16} />
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
