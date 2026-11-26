import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { supabase, loadWines, saveWines, cercaVino } from "./supabase.js";
import { initialWines } from "./seed.js";
import {
  TIPI, annataLabel, byUrgency, euro, formatDate, getWindowStatus, plural, prezzo, qty, qtyBevuta, toYear,
} from "./data.js";
import { GrapeIcon, Icon, WineBottle, WineGlass } from "./icons.jsx";
import { ConfirmModal, Modal, Stars, StatusBadge, WindowBar, WineCard } from "./components.jsx";
import WineForm, { SourceLink } from "./WineForm.jsx";
import Stats from "./Stats.jsx";
import Settings from "./Settings.jsx";

// ---------- copia locale (offline) ----------
const LOCAL_KEY = "cantina-pwa-v1";
const readLocal = () => {
  try { return JSON.parse(localStorage.getItem(LOCAL_KEY)); } catch { return null; }
};
const writeLocal = (wines, pending) => {
  try { localStorage.setItem(LOCAL_KEY, JSON.stringify({ wines, pending })); } catch {}
};

const FILTRI_STATO = [
  ["Tutti", ""],
  ["All'apice", "apice"],
  ["Pronti", "ottimale"],
  ["In scadenza", "scadenza"],
  ["Scaduti", "scaduta"],
  ["Da aspettare", "presto"],
];

export default function App() {
  const [wines, setWines] = useState(null);
  const [loadError, setLoadError] = useState(false);
  const [session, setSession] = useState(null);
  const [sync, setSync] = useState("idle");
  const [needLogin, setNeedLogin] = useState(false);
  const [view, setView] = useState("cantina");
  const [listView, setListView] = useState("cantina");
  const [selectedId, setSelectedId] = useState(null);
  const [editing, setEditing] = useState(null);
  const [filtroTipo, setFiltroTipo] = useState("Tutti");
  const [filtroStato, setFiltroStato] = useState("");
  const [query, setQuery] = useState("");
  const [drinkId, setDrinkId] = useState(null);
  const [deleteId, setDeleteId] = useState(null);
  const remoteOk = useRef(false);
  const timer = useRef(null);

  // ---------- sincronizzazione ----------
  const push = useCallback(async (list) => {
    setSync("saving");
    try {
      await saveWines(list);
      remoteOk.current = true;
      writeLocal(list, false);
      setSync("saved");
    } catch (e) {
      writeLocal(list, true);
      setSync(e.code === "not_authorized" ? "locked" : "offline");
    }
  }, []);

  const refresh = useCallback(async () => {
    const local = readLocal();
    try {
      // Modifiche fatte offline: hanno la precedenza e vengono inviate
      if (local?.pending && Array.isArray(local.wines) && local.wines.length > 0) {
        setWines(local.wines);
        await push(local.wines);
        return;
      }
      const remote = await loadWines();
      if (remote) {
        remoteOk.current = true;
        setNeedLogin(false);
        setLoadError(false);
        setWines(remote);
        writeLocal(remote, false);
        setSync("saved");
        return;
      }
      const { data } = await supabase.auth.getSession();
      if (!data.session) {
        // La tabella è protetta: senza login non si vede nulla
        setNeedLogin(true);
        setWines(local?.wines ?? []);
        setSync("locked");
        return;
      }
      // Utente collegato ma cantina ancora vuota su Supabase: la creo
      remoteOk.current = true;
      setNeedLogin(false);
      const start = local?.wines?.length ? local.wines : initialWines;
      setWines(start);
      await push(start);
    } catch {
      if (local?.wines) {
        setWines(local.wines);
        setSync("offline");
      } else {
        setLoadError(true);
      }
    }
  }, [push]);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((event, s) => {
      setSession(s);
      if (event === "SIGNED_IN" || event === "SIGNED_OUT") setTimeout(refresh, 0);
    });
    refresh();
    const onVisible = () => document.visibilityState === "visible" && refresh();
    window.addEventListener("online", refresh);
    document.addEventListener("visibilitychange", onVisible);
    return () => {
      sub.subscription.unsubscribe();
      window.removeEventListener("online", refresh);
      document.removeEventListener("visibilitychange", onVisible);
    };
  }, [refresh]);

  /** Applica una modifica, la salva subito sul telefono e poi su Supabase. */
  const update = (fn) => {
    // Senza login non si modifica nulla: una copia locale incompleta sovrascriverebbe la cantina su Supabase
    if (needLogin) {
      go("impostazioni");
      return;
    }
    const next = fn(wines);
    setWines(next);
    writeLocal(next, true);
    if (!remoteOk.current) {
      setSync(needLogin ? "locked" : "offline");
      return;
    }
    clearTimeout(timer.current);
    timer.current = setTimeout(() => push(next), 500);
  };

  // ---------- dati derivati ----------
  const attive = useMemo(() => (wines || []).filter((w) => !w.consumata && qty(w) > 0), [wines]);
  const consumate = useMemo(
    () => (wines || []).filter((w) => w.consumata).sort((a, b) => new Date(b.dataConsuma) - new Date(a.dataConsuma)),
    [wines]
  );
  const counts = useMemo(() => {
    const c = { scaduta: 0, scadenza: 0, apice: 0, ottimale: 0 };
    attive.forEach((w) => { const k = getWindowStatus(w).key; if (k in c) c[k] += qty(w); });
    return c;
  }, [attive]);
  const totBottiglie = attive.reduce((s, w) => s + qty(w), 0);
  const totBevute = consumate.reduce((s, w) => s + qtyBevuta(w), 0);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return attive
      .filter((w) => filtroTipo === "Tutti" || w.tipo === filtroTipo)
      .filter((w) => !filtroStato || getWindowStatus(w).key === filtroStato)
      .filter((w) => !q || [w.nome, w.produttore, w.denominazione, w.regione, w.uvaggio].some((x) => x?.toLowerCase().includes(q)))
      .sort(byUrgency);
  }, [attive, filtroTipo, filtroStato, query]);

  const selected = wines?.find((w) => w.id === selectedId);

  // ---------- azioni ----------
  const go = (v) => { setView(v); window.scrollTo(0, 0); };
  const openWine = (id) => { setSelectedId(id); go("dettaglio"); };
  const openList = (v) => { setListView(v); go(v); };

  const saveForm = (data) => {
    if (editing?.id) {
      update((ws) => ws.map((w) => (w.id === editing.id ? { ...w, ...data } : w)));
      setSelectedId(editing.id);
    } else {
      const id = Date.now();
      update((ws) => [...ws, { ...data, id, consumata: false, dataConsuma: null }]);
      setSelectedId(id);
    }
    setEditing(null);
    go("dettaglio");
  };

  const confirmDrink = ({ n, voto, note, data }) => {
    const wine = wines.find((w) => w.id === drinkId);
    const total = qty(wine);
    const when = new Date(`${data}T12:00:00`).toISOString();
    const record = { consumata: true, quantita: 0, quantitaBevuta: n, dataConsuma: when, voto, noteConsuma: note };
    if (n >= total) {
      update((ws) => ws.map((w) => (w.id === wine.id ? { ...w, ...record } : w)));
    } else {
      update((ws) => [
        ...ws.map((w) => (w.id === wine.id ? { ...w, quantita: total - n } : w)),
        { ...wine, ...record, id: Date.now(), origineId: wine.id },
      ]);
    }
    setDrinkId(null);
    openList("bevute");
  };

  const ripristina = (id) => {
    update((ws) => {
      const w = ws.find((x) => x.id === id);
      const orig = w.origineId && ws.find((x) => x.id === w.origineId && !x.consumata);
      if (orig) {
        // Bevuta parziale: le bottiglie tornano nella voce originale
        return ws.filter((x) => x.id !== id).map((x) => (x.id === orig.id ? { ...x, quantita: qty(x) + qtyBevuta(w) } : x));
      }
      return ws.map((x) => {
        if (x.id !== id) return x;
        const { voto, noteConsuma, quantitaBevuta, ...rest } = x;
        return { ...rest, consumata: false, dataConsuma: null, quantita: qtyBevuta(x) };
      });
    });
    openList("cantina");
  };

  const elimina = () => {
    update((ws) => ws.filter((w) => w.id !== deleteId));
    setDeleteId(null);
    openList(listView);
  };

  // ---------- schermate di caricamento ----------
  if (loadError) {
    return (
      <div className="splash">
        <GrapeIcon size={56} />
        <div>Nessuna connessione</div>
        <p className="note" style={{ fontFamily: "var(--sans)", textAlign: "center", maxWidth: 280 }}>
          Al primo avvio serve la rete per scaricare la cantina.
        </p>
        <button className="btn btn--primary" onClick={() => { setLoadError(false); refresh(); }}>Riprova</button>
      </div>
    );
  }
  if (wines === null) {
    return (
      <div className="splash">
        <GrapeIcon size={56} />
        <div>Apro la cantina…</div>
      </div>
    );
  }

  const syncInfo = {
    saving: ["clock", "Salvo…", ""],
    saved: ["check", "Sincronizzata", "sync--ok"],
    offline: ["cloud", "Offline", "sync--warn"],
    locked: ["alert", "Accedi", "sync--bad"],
  }[sync];

  const tabs = [
    ["cantina", "Cantina", <WineBottle tipo="Rosso" size={24} />],
    ["bevute", "Bevute", <WineGlass size={24} />],
    ["statistiche", "Statistiche", <Icon name="chart" size={24} />],
  ];

  return (
    <div className="app">
      <header className="topbar">
        <div className="topbar__row">
          <GrapeIcon size={34} />
          <div className="topbar__title">
            <h1>La Mia Cantina</h1>
            <div className="topbar__sub">
              {plural(totBottiglie, "bottiglia", "bottiglie")} · {plural(totBevute, "bevuta", "bevute")}
              {syncInfo && (
                <span className={`sync ${syncInfo[2]}`} style={{ marginLeft: 8 }}>
                  <Icon name={syncInfo[0]} size={12} /> {syncInfo[1]}
                </span>
              )}
            </div>
          </div>
          <button className="iconbtn" aria-label="Impostazioni" onClick={() => go("impostazioni")}>
            <Icon name="settings" size={20} />
          </button>
        </div>
      </header>

      <main className="main">
        {needLogin && view !== "impostazioni" && (
          <div className="alert alert--info" onClick={() => go("impostazioni")} style={{ cursor: "pointer" }}>
            <Icon name="user" size={22} />
            <div>
              <div className="alert__title">Accedi per vedere la cantina</div>
              <div className="alert__text">I dati su Supabase sono protetti. Tocca qui per accedere.</div>
            </div>
          </div>
        )}

        {/* ===== CANTINA ===== */}
        {view === "cantina" && (
          <>
            {counts.scaduta > 0 && (
              <div className="alert alert--bad">
                <Icon name="alert" size={22} />
                <div>
                  <div className="alert__title">{plural(counts.scaduta, "bottiglia fuori finestra", "bottiglie fuori finestra")}</div>
                  <div className="alert__text">La finestra ottimale è chiusa: aprile al più presto.</div>
                </div>
              </div>
            )}
            {counts.scadenza > 0 && (
              <div className="alert alert--warn">
                <Icon name="bell" size={22} />
                <div>
                  <div className="alert__title">{plural(counts.scadenza, "bottiglia in scadenza", "bottiglie in scadenza")}</div>
                  <div className="alert__text">Sono negli ultimi anni della finestra.</div>
                </div>
              </div>
            )}
            {counts.scaduta === 0 && counts.scadenza === 0 && counts.apice + counts.ottimale > 0 && (
              <div className="alert alert--ok">
                <WineGlass size={24} color="#2f7d4f" />
                <div>
                  <div className="alert__title">{plural(counts.apice + counts.ottimale, "bottiglia pronta", "bottiglie pronte")}</div>
                  <div className="alert__text">È il momento giusto per aprirle.</div>
                </div>
              </div>
            )}

            <div style={{ position: "relative", marginBottom: 10 }}>
              <span style={{ position: "absolute", left: 12, top: 12, color: "var(--muted)" }}>
                <Icon name="search" size={18} />
              </span>
              <input className="input" style={{ paddingLeft: 38 }} placeholder="Cerca nome, produttore, vitigno…" value={query} onChange={(e) => setQuery(e.target.value)} />
            </div>
            <div className="chips">
              {["Tutti", ...TIPI].map((t) => (
                <button key={t} className={`chip ${filtroTipo === t ? "chip--on" : ""}`} onClick={() => setFiltroTipo(t)}>
                  {t !== "Tutti" && <WineBottle tipo={t} size={16} />} {t}
                </button>
              ))}
            </div>
            <div className="chips" style={{ marginBottom: 14 }}>
              {FILTRI_STATO.map(([label, key]) => (
                <button key={label} className={`chip ${filtroStato === key ? "chip--on" : ""}`} onClick={() => setFiltroStato(key)}>
                  {label}
                </button>
              ))}
            </div>

            {filtered.length === 0 ? (
              <div className="empty">
                <WineBottle tipo="Bianco" size={48} />
                <div>Nessuna bottiglia trovata</div>
              </div>
            ) : (
              <div className="list">
                {filtered.map((w) => <WineCard key={w.id} wine={w} onClick={() => openWine(w.id)} />)}
              </div>
            )}
            {!needLogin && (
              <button className="fab" aria-label="Aggiungi bottiglia" onClick={() => { setEditing({}); go("form"); }}>
                <Icon name="plus" size={28} strokeWidth={2.2} />
              </button>
            )}
          </>
        )}

        {/* ===== BEVUTE ===== */}
        {view === "bevute" && (
          <>
            <h2 className="section-title">Bottiglie bevute</h2>
            {consumate.length === 0 ? (
              <div className="empty">
                <WineGlass size={48} />
                <div>Nessuna bottiglia bevuta, per ora.</div>
              </div>
            ) : (
              <div className="list">
                {consumate.map((w) => (
                  <WineCard key={w.id} wine={w} drunk onClick={() => openWine(w.id)}>
                    <div className="wine__row" style={{ marginBottom: w.noteConsuma ? 6 : 0 }}>
                      <span className="chip chip--soft"><Icon name="calendar" size={12} /> {formatDate(w.dataConsuma)}</span>
                      {qtyBevuta(w) > 1 && <span className="chip chip--soft">×{qtyBevuta(w)}</span>}
                      {w.voto > 0 && <Stars value={w.voto} size={14} />}
                    </div>
                    {w.noteConsuma && <div className="note" style={{ fontStyle: "italic" }}>“{w.noteConsuma}”</div>}
                  </WineCard>
                ))}
              </div>
            )}
          </>
        )}

        {/* ===== STATISTICHE ===== */}
        {view === "statistiche" && <Stats attive={attive} consumate={consumate} onOpen={openWine} />}

        {/* ===== DETTAGLIO ===== */}
        {view === "dettaglio" && selected && (
          <Detail
            wine={selected}
            onBack={() => go(listView)}
            onDrink={() => setDrinkId(selected.id)}
            onEdit={() => { setEditing(selected); go("form"); }}
            onRestore={() => ripristina(selected.id)}
            onDelete={() => setDeleteId(selected.id)}
          />
        )}

        {/* ===== FORM ===== */}
        {view === "form" && (
          <WineForm
            key={editing?.id || "new"}
            initial={editing?.id ? editing : null}
            editMode={!!editing?.id}
            canSearch={!!session}
            onSearch={cercaVino}
            onSave={saveForm}
            onCancel={() => { const wasEdit = !!editing?.id; setEditing(null); go(wasEdit ? "dettaglio" : listView); }}
          />
        )}

        {/* ===== IMPOSTAZIONI ===== */}
        {view === "impostazioni" && (
          <Settings
            session={session}
            sync={sync}
            wines={wines}
            onImport={(list) => update(() => list)}
            onBack={() => go(listView)}
          />
        )}
      </main>

      {view !== "form" && (
        <nav className="tabbar">
          {tabs.map(([v, label, icon]) => (
            <button key={v} className={`tab ${listView === v && ["cantina", "bevute", "statistiche", "dettaglio"].includes(view) ? "tab--on" : ""}`} onClick={() => openList(v)}>
              {icon}
              {label}
            </button>
          ))}
        </nav>
      )}

      {drinkId && (
        <DrinkModal wine={wines.find((w) => w.id === drinkId)} onClose={() => setDrinkId(null)} onConfirm={confirmDrink} />
      )}
      {deleteId && (
        <ConfirmModal
          title="Eliminare la bottiglia?"
          text={`“${wines.find((w) => w.id === deleteId)?.nome}” verrà rimossa dalla cantina. Se l'hai bevuta, usa invece “Segna come bevuta”.`}
          confirmLabel="Elimina"
          danger
          onClose={() => setDeleteId(null)}
          onConfirm={elimina}
        />
      )}
    </div>
  );
}

// ---------- scheda vino ----------
function Detail({ wine, onBack, onDrink, onEdit, onRestore, onDelete }) {
  const da = toYear(wine.finestraDa);
  const a = toYear(wine.finestraA);
  const pDa = toYear(wine.apiceDa);
  const pA = toYear(wine.apiceA);
  const cells = [
    ["calendar", "Annata", annataLabel(wine.annata)],
    ["barrel", "Tipo", wine.tipo],
    ["globe", "Provenienza", [wine.regione, wine.nazione].filter(Boolean).join(", ") || "—"],
    ["info", "Denominazione", wine.denominazione || "—"],
    ["sparkle", "Uvaggio", wine.uvaggio || "—"],
    ["pin", "Posizione", wine.posizione || "—"],
    ["shelf", "Bottiglie", wine.consumata ? `${qtyBevuta(wine)} bevute` : qty(wine)],
  ];
  const p = prezzo(wine);
  if (p !== null) {
    const n = wine.consumata ? qtyBevuta(wine) : qty(wine);
    cells.push(["tag", "Prezzo d'acquisto", n > 1 ? `${euro(p)} × ${n} = ${euro(p * n)}` : euro(p)]);
  }
  const blocks = [
    ["info", "Descrizione", wine.descrizione],
    ["barrel", "Vinificazione e affinamento", wine.affinamento],
    ["fork", "Abbinamenti", wine.abbinamenti],
    ["thermo", "Servizio", wine.servizio],
    ["edit", "Note personali", wine.note],
  ];

  return (
    <div>
      <button className="backlink" onClick={onBack}>
        <Icon name="back" size={18} /> Indietro
      </button>
      <div className="card detail">
        <div className="detail__head">
          <div className="detail__icon"><WineBottle tipo={wine.tipo} size={46} /></div>
          <div style={{ minWidth: 0 }}>
            <h2 className="detail__name">{wine.nome}</h2>
            <div className="detail__prod">{wine.produttore} · {annataLabel(wine.annata)}</div>
          </div>
        </div>

        {wine.consumata ? (
          <div className="drunk-box">
            <div className="label" style={{ color: "var(--ok)" }}>Bevuta il {formatDate(wine.dataConsuma)}</div>
            {wine.voto > 0 && <Stars value={wine.voto} size={20} />}
            {wine.noteConsuma && <div className="note" style={{ fontStyle: "italic", marginTop: 6 }}>“{wine.noteConsuma}”</div>}
          </div>
        ) : (
          (da || a) && (
            <div className="window-box">
              <div className="label">Finestra di bevuta</div>
              <div className="window-box__years">{da && a ? `${da} – ${a}` : da ? `Dal ${da}` : `Entro il ${a}`}</div>
              <StatusBadge wine={wine} />
              <div style={{ marginTop: 18 }}><WindowBar wine={wine} /></div>
              <div className="legend">
                <span><i style={{ background: "#b9d9c3" }} />Finestra</span>
                {pDa && pA && <span><i style={{ background: "var(--gold)" }} />Apice {pDa}–{pA}</span>}
                <span><i style={{ background: "var(--ink)", width: 3 }} />Oggi</span>
              </div>
              {wine.motivazioneFinestra && <div className="window-box__why">{wine.motivazioneFinestra}</div>}
            </div>
          )
        )}

        <div className="grid2">
          {cells.map(([icon, k, v]) => (
            <div key={k} className="cell">
              <div className="cell__k"><Icon name={icon} size={13} /> {k}</div>
              <div className="cell__v">{v}</div>
            </div>
          ))}
        </div>

        {blocks.filter(([, , t]) => t).map(([icon, title, text]) => (
          <div key={title} className="block">
            <div className="block__title"><Icon name={icon} size={14} /> {title}</div>
            <div className="block__text">{text}</div>
          </div>
        ))}

        {wine.fonti?.length > 0 && (
          <div className="block">
            <div className="block__title"><Icon name="link" size={14} /> Fonti</div>
            <div className="sources">{wine.fonti.map((f, i) => <SourceLink key={i} f={f} />)}</div>
          </div>
        )}

        <div className="btn-row" style={{ marginTop: 6 }}>
          {wine.consumata ? (
            <button className="btn" onClick={onRestore}><Icon name="undo" size={18} /> Rimetti in cantina</button>
          ) : (
            <>
              <button className="btn btn--primary" style={{ flex: 2 }} onClick={onDrink}>
                <WineGlass size={20} color="#fff" outline="#fff" /> Segna come bevuta
              </button>
              <button className="btn" style={{ flex: "0 0 auto" }} aria-label="Modifica" onClick={onEdit}><Icon name="edit" size={18} /></button>
            </>
          )}
          <button className="btn btn--danger" style={{ flex: "0 0 auto" }} aria-label="Elimina" onClick={onDelete}><Icon name="trash" size={18} /></button>
        </div>
      </div>
    </div>
  );
}

// ---------- modale "segna come bevuta" ----------
function DrinkModal({ wine, onClose, onConfirm }) {
  const max = qty(wine);
  const [n, setN] = useState(1);
  const [voto, setVoto] = useState(0);
  const [note, setNote] = useState("");
  const [data, setData] = useState(new Date().toISOString().slice(0, 10));
  return (
    <Modal onClose={onClose}>
      <h2>Segna come bevuta</h2>
      <div className="note" style={{ marginBottom: 16 }}>{wine.nome} · {annataLabel(wine.annata)}</div>
      {max > 1 && (
        <div style={{ marginBottom: 16 }}>
          <div className="label">Quante bottiglie? ({max} disponibili)</div>
          <div className="qtypick">
            {Array.from({ length: max }, (_, i) => i + 1).map((i) => (
              <button key={i} className={n === i ? "on" : ""} onClick={() => setN(i)}>{i}</button>
            ))}
          </div>
        </div>
      )}
      <div style={{ marginBottom: 16 }}>
        <div className="label">Quando</div>
        <input className="input" type="date" value={data} onChange={(e) => setData(e.target.value)} />
      </div>
      <div style={{ marginBottom: 16 }}>
        <div className="label">Voto</div>
        <Stars value={voto} onChange={setVoto} size={34} />
      </div>
      <div style={{ marginBottom: 20 }}>
        <div className="label">Note di degustazione</div>
        <textarea className="textarea" rows={3} placeholder="Profumi, sapori, con cosa l'hai bevuto…" value={note} onChange={(e) => setNote(e.target.value)} />
      </div>
      <div className="btn-row">
        <button className="btn" onClick={onClose}>Annulla</button>
        <button className="btn btn--primary" style={{ flex: 2 }} onClick={() => onConfirm({ n, voto, note, data: data || new Date().toISOString().slice(0, 10) })}>
          <Icon name="check" size={18} /> Conferma
        </button>
      </div>
    </Modal>
  );
}
