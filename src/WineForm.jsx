import { useState } from "react";
import { Icon, WineBottle } from "./icons.jsx";
import { WindowBar } from "./components.jsx";
import { CAMPI_RICERCA, NAZIONI, TIPI, emptyForm, getWindowStatus, isNV, prezzo } from "./data.js";
import { RICERCA_WEB_ATTIVA } from "./supabase.js";

function Field({ label, children }) {
  return (
    <label className="field">
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

/**
 * Form di inserimento/modifica. La ricerca automatica compila i campi della scheda:
 * l'utente li rivede e salva.
 */
export default function WineForm({ initial, editMode, canSearch, onSearch, onSave, onCancel }) {
  const [form, setForm] = useState(() => ({ ...emptyForm(), ...(initial || {}) }));
  const [search, setSearch] = useState({ state: "idle", msg: "" });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));
  const setVal = (key, value) => setForm((f) => ({ ...f, [key]: value }));
  const nv = isNV(form.annata);
  const regioni = NAZIONI[form.nazione] || Object.values(NAZIONI).flat();
  const status = getWindowStatus(form);

  const runSearch = async () => {
    if (!form.nome.trim()) {
      setSearch({ state: "error", msg: "Scrivi almeno il nome del vino." });
      return;
    }
    setSearch({ state: "loading", msg: "" });
    try {
      const r = await onSearch({ nome: form.nome.trim(), produttore: form.produttore.trim(), annata: nv ? 0 : Number(form.annata) });
      setForm((f) => {
        const next = { ...f };
        for (const k of CAMPI_RICERCA) {
          const v = r[k];
          if (v === undefined || v === null || v === "" || (Array.isArray(v) && v.length === 0)) continue;
          if (k === "tipo" && !TIPI.includes(v)) continue;
          next[k] = ["finestraDa", "finestraA", "apiceDa", "apiceA"].includes(k) ? String(v) : v;
        }
        if (!next.produttore && r.produttore) next.produttore = r.produttore;
        return next;
      });
      setSearch({
        state: "done",
        msg: r.affidabilita === "bassa"
          ? "Trovate poche fonti: la finestra è una stima, controllala."
          : "Campi compilati. Rivedili e poi salva.",
      });
    } catch (e) {
      setSearch({ state: "error", msg: e.message || "Ricerca non riuscita." });
    }
  };

  const submit = (e) => {
    e.preventDefault();
    if (!form.nome.trim()) return;
    const p = prezzo(form);
    onSave({
      ...form,
      nome: form.nome.trim(),
      produttore: form.produttore.trim(),
      annata: nv ? 0 : Number(form.annata) || 0,
      prezzo: p === null ? "" : p,
    });
  };

  return (
    <form className="form" onSubmit={submit}>
      <button type="button" className="backlink" onClick={onCancel}>
        <Icon name="back" size={18} /> Annulla
      </button>
      <h2 className="section-title" style={{ margin: 0 }}>{editMode ? "Modifica bottiglia" : "Nuova bottiglia"}</h2>

      {/* 1. Identità + ricerca */}
      <div className="card fieldset">
        <Field label="Nome del vino *">
          <input className="input" value={form.nome} onChange={set("nome")} placeholder="es. Barolo Bussia" required />
        </Field>
        <Field label="Produttore">
          <input className="input" value={form.produttore} onChange={set("produttore")} placeholder="es. Tenuta Rocca" />
        </Field>
        <div className="row2">
          <Field label="Annata">
            <input
              className="input"
              type="number"
              inputMode="numeric"
              value={nv ? "" : form.annata}
              disabled={nv}
              placeholder="NV"
              onChange={(e) => setVal("annata", e.target.value)}
            />
          </Field>
          <label className="check" style={{ alignSelf: "end", paddingBottom: 12 }}>
            <input
              type="checkbox"
              checked={nv}
              onChange={(e) => setVal("annata", e.target.checked ? 0 : new Date().getFullYear())}
            />
            Senza annata (NV)
          </label>
        </div>

        {RICERCA_WEB_ATTIVA && (
          <>
            <button type="button" className="btn btn--gold" onClick={runSearch} disabled={!canSearch || search.state === "loading"}>
              <Icon name={search.state === "loading" ? "clock" : "sparkle"} size={18} className={search.state === "loading" ? "spin" : ""} />
              {search.state === "loading" ? "Sto cercando sul web…" : "Cerca informazioni sul web"}
            </button>
            {!canSearch && <div className="note muted">Per la ricerca automatica accedi dalle Impostazioni.</div>}
          </>
        )}
        {search.state === "loading" && (
          <div className="searchbox">Leggo schede tecniche e recensioni: di solito ci vogliono 30–60 secondi.</div>
        )}
        {(search.state === "done" || search.state === "error") && (
          <div className={`searchbox ${search.state === "error" ? "searchbox--err" : ""}`}>{search.msg}</div>
        )}
      </div>

      {/* 2. Tipo e provenienza */}
      <div className="card fieldset">
        <h3 className="fieldset__title">Tipo e provenienza</h3>
        <div className="typepick">
          {TIPI.map((t) => (
            <button type="button" key={t} className={form.tipo === t ? "on" : ""} onClick={() => setVal("tipo", t)}>
              <WineBottle tipo={t} size={28} />
              {t}
            </button>
          ))}
        </div>
        <div className="row2">
          <Field label="Nazione">
            <input className="input" list="nazioni" value={form.nazione} onChange={(e) => setForm((f) => ({ ...f, nazione: e.target.value }))} />
          </Field>
          <Field label="Regione">
            <input className="input" list="regioni" value={form.regione} onChange={set("regione")} />
          </Field>
        </div>
        <datalist id="nazioni">{Object.keys(NAZIONI).map((n) => <option key={n} value={n} />)}</datalist>
        <datalist id="regioni">{regioni.map((r) => <option key={r} value={r} />)}</datalist>
        <Field label="Denominazione">
          <input className="input" value={form.denominazione} onChange={set("denominazione")} placeholder="es. Barolo DOCG" />
        </Field>
        <Field label="Uvaggio">
          <input className="input" value={form.uvaggio} onChange={set("uvaggio")} placeholder="es. 100% Nebbiolo" />
        </Field>
      </div>

      {/* 3. Finestra di bevuta */}
      <div className="card fieldset">
        <h3 className="fieldset__title">
          <Icon name="calendar" size={18} /> Finestra di bevuta
        </h3>
        <div className="row2">
          <Field label="Dal">
            <input className="input" type="number" inputMode="numeric" value={form.finestraDa} onChange={set("finestraDa")} placeholder="anno" />
          </Field>
          <Field label="Al">
            <input className="input" type="number" inputMode="numeric" value={form.finestraA} onChange={set("finestraA")} placeholder="anno" />
          </Field>
        </div>
        <div className="row2">
          <Field label="Apice dal">
            <input className="input" type="number" inputMode="numeric" value={form.apiceDa} onChange={set("apiceDa")} placeholder="facoltativo" />
          </Field>
          <Field label="Apice al">
            <input className="input" type="number" inputMode="numeric" value={form.apiceA} onChange={set("apiceA")} placeholder="facoltativo" />
          </Field>
        </div>
        {(form.finestraDa || form.finestraA) && (
          <div>
            <span className={`badge badge--${status.key || "none"}`}>{status.label}</span>
            <WindowBar wine={form} />
          </div>
        )}
        <Field label="Perché questa finestra">
          <textarea className="textarea" rows={2} value={form.motivazioneFinestra} onChange={set("motivazioneFinestra")} />
        </Field>
      </div>

      {/* 4. Scheda */}
      <div className="card fieldset">
        <h3 className="fieldset__title">Scheda del vino</h3>
        <Field label="Descrizione">
          <textarea className="textarea" rows={4} value={form.descrizione} onChange={set("descrizione")} />
        </Field>
        <Field label="Vinificazione e affinamento">
          <textarea className="textarea" rows={2} value={form.affinamento} onChange={set("affinamento")} />
        </Field>
        <Field label="Abbinamenti">
          <textarea className="textarea" rows={2} value={form.abbinamenti} onChange={set("abbinamenti")} />
        </Field>
        <Field label="Servizio (temperatura, decantazione)">
          <input className="input" value={form.servizio} onChange={set("servizio")} />
        </Field>
        {form.fonti?.length > 0 && (
          <div>
            <span className="label">Fonti</span>
            <div className="sources">
              {form.fonti.map((f, i) => (
                <div key={i} style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  <SourceLink f={f} />
                  <button type="button" className="iconbtn" style={{ width: 30, height: 30 }} aria-label="Rimuovi fonte"
                    onClick={() => setVal("fonti", form.fonti.filter((_, j) => j !== i))}>
                    <Icon name="close" size={14} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 5. In cantina */}
      <div className="card fieldset">
        <h3 className="fieldset__title">In cantina</h3>
        <div className="row2">
          <Field label="Bottiglie">
            <div className="stepper">
              <button type="button" onClick={() => setVal("quantita", Math.max(1, Number(form.quantita || 1) - 1))}>−</button>
              <div>{form.quantita || 1}</div>
              <button type="button" onClick={() => setVal("quantita", Number(form.quantita || 1) + 1)}>+</button>
            </div>
          </Field>
          <Field label="Posizione">
            <input className="input" value={form.posizione} onChange={set("posizione")} placeholder="es. Scaffale B2" />
          </Field>
        </div>
        <Field label="Prezzo d'acquisto (€ a bottiglia)">
          <input
            className="input"
            inputMode="decimal"
            value={form.prezzo ?? ""}
            onChange={(e) => setVal("prezzo", e.target.value.replace(/[^\d.,]/g, ""))}
            placeholder="es. 35"
          />
        </Field>
        <Field label="Note personali">
          <textarea className="textarea" rows={3} value={form.note} onChange={set("note")} />
        </Field>
      </div>

      <div className="save-bar">
        <button type="submit" className="btn btn--primary btn--block" disabled={!form.nome.trim()}>
          <Icon name="check" size={18} /> {editMode ? "Salva modifiche" : "Aggiungi alla cantina"}
        </button>
      </div>
    </form>
  );
}

export function SourceLink({ f }) {
  const url = typeof f === "string" ? f : f?.url;
  const title = (typeof f === "object" && f?.titolo) || url;
  if (!url || !/^https:\/\//i.test(url)) return <span className="note">{title}</span>;
  return (
    <a href={url} target="_blank" rel="noreferrer noopener">
      <Icon name="link" size={14} /> {title}
    </a>
  );
}
