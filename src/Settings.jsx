import { useRef, useState } from "react";
import { Icon, GrapeIcon } from "./icons.jsx";
import { ConfirmModal } from "./components.jsx";
import { supabase } from "./supabase.js";

const SYNC_TEXT = {
  idle: "Sincronizzata con Supabase",
  saving: "Salvataggio in corso…",
  saved: "Sincronizzata con Supabase",
  offline: "Senza rete: le modifiche sono salvate sul telefono e verranno inviate appena torni online",
  locked: "Supabase rifiuta le modifiche: accedi qui sotto",
  error: "Errore di sincronizzazione",
};

export default function Settings({ session, sync, wines, onImport, onBack }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [authMsg, setAuthMsg] = useState("");
  const [busy, setBusy] = useState(false);
  const [pending, setPending] = useState(null);
  const fileRef = useRef(null);

  const login = async (e) => {
    e.preventDefault();
    setBusy(true);
    setAuthMsg("");
    const { error } = await supabase.auth.signInWithPassword({ email: email.trim(), password });
    setBusy(false);
    if (error) setAuthMsg("Accesso non riuscito: controlla email e password.");
    else setPassword("");
  };

  const exportJson = async () => {
    const name = `cantina_${new Date().toISOString().slice(0, 10)}.json`;
    const blob = new Blob([JSON.stringify(wines, null, 2)], { type: "application/json" });
    const file = new File([blob], name, { type: "application/json" });
    // Su iPhone il foglio di condivisione permette "Salva su File" / iCloud Drive
    if (navigator.canShare?.({ files: [file] })) {
      try {
        await navigator.share({ files: [file], title: "Backup cantina" });
        return;
      } catch (err) {
        if (err?.name === "AbortError") return;
      }
    }
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  };

  const pickFile = (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const data = JSON.parse(reader.result);
        if (Array.isArray(data) && data.length > 0) setPending(data);
        else alert("Il file non contiene vini.");
      } catch {
        alert("File non valido.");
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="settings">
      <button className="backlink" onClick={onBack}>
        <Icon name="back" size={18} /> Indietro
      </button>
      <h2 className="section-title" style={{ margin: 0 }}>Impostazioni</h2>

      <div className="card">
        <div className="label">Account</div>
        {session ? (
          <>
            <p className="note" style={{ marginTop: 0 }}>
              Accesso effettuato come <strong>{session.user?.email}</strong>.
            </p>
            <button className="btn" onClick={() => supabase.auth.signOut()}>
              <Icon name="logout" size={18} /> Esci
            </button>
          </>
        ) : (
          <form onSubmit={login} style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            <p className="note" style={{ margin: 0 }}>
              Accedi con l'utente creato su Supabase per vedere e modificare la cantina.
            </p>
            <input className="input" type="email" autoComplete="username" placeholder="Email" value={email} onChange={(e) => setEmail(e.target.value)} required />
            <input className="input" type="password" autoComplete="current-password" placeholder="Password" value={password} onChange={(e) => setPassword(e.target.value)} required />
            {authMsg && <div className="searchbox searchbox--err">{authMsg}</div>}
            <button className="btn btn--primary" disabled={busy}>
              <Icon name="user" size={18} /> {busy ? "Accesso…" : "Accedi"}
            </button>
          </form>
        )}
      </div>

      <div className="card">
        <div className="label">Sincronizzazione</div>
        <p className="note" style={{ margin: 0 }}>
          <Icon name="cloud" size={16} /> {SYNC_TEXT[sync] || SYNC_TEXT.idle}
        </p>
      </div>

      <div className="card">
        <div className="label">Backup</div>
        <p className="note" style={{ marginTop: 0 }}>
          Esporta un file JSON da salvare su iCloud Drive, oppure reimporta un backup (anche quelli della versione precedente).
        </p>
        <div className="btn-row">
          <button className="btn" onClick={exportJson}>
            <Icon name="download" size={18} /> Esporta
          </button>
          <button className="btn" onClick={() => fileRef.current?.click()}>
            <Icon name="upload" size={18} /> Importa
          </button>
          <input ref={fileRef} type="file" accept=".json,application/json" onChange={pickFile} hidden />
        </div>
      </div>

      <div className="card" style={{ display: "flex", gap: 12, alignItems: "center" }}>
        <GrapeIcon size={40} />
        <p className="note" style={{ margin: 0 }}>
          Per installarla: apri l'app in Safari, tocca Condividi e poi “Aggiungi alla schermata Home”.
        </p>
      </div>

      {pending && (
        <ConfirmModal
          title="Importare il backup?"
          text={`La cantina attuale (${wines.length} voci) verrà sostituita con quella del file (${pending.length} voci).`}
          confirmLabel="Sostituisci"
          danger
          onClose={() => setPending(null)}
          onConfirm={() => { onImport(pending); setPending(null); }}
        />
      )}
    </div>
  );
}
