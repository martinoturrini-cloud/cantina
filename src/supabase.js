import { createClient } from "@supabase/supabase-js";

// Stesso progetto e stessa riga usati dalla versione web precedente (cantina.jsx)
export const SUPABASE_URL = "https://astlpisrzfyqcymbdcmh.supabase.co";
export const SUPABASE_KEY = "sb_publishable_WBqL9h13KCoMSmsj7qCgyw_ulwQ4v7w";
const ROW_ID = 1;

// Ricerca automatica sul web (Edge Function "cerca-vino" + chiave API Anthropic su Supabase).
// Per attivarla: aggiungi il secret ANTHROPIC_API_KEY su Supabase e metti true.
export const RICERCA_WEB_ATTIVA = false;

export const supabase = createClient(SUPABASE_URL, SUPABASE_KEY, {
  auth: { persistSession: true, autoRefreshToken: true },
});

/** Restituisce l'array dei vini, oppure null se la riga non esiste (o non è visibile senza login). */
export async function loadWines() {
  const { data, error } = await supabase.from("bottiglie").select("data").eq("id", ROW_ID).maybeSingle();
  if (error) throw error;
  return Array.isArray(data?.data) ? data.data : null;
}

export async function saveWines(wines) {
  const { data, error } = await supabase
    .from("bottiglie")
    .upsert({ id: ROW_ID, data: wines })
    .select("id");
  if (error) throw error;
  // Con la sicurezza attiva, una scrittura non autorizzata non dà errore ma non salva nulla
  if (!data || data.length === 0) {
    const e = new Error("Salvataggio non autorizzato: accedi nelle Impostazioni.");
    e.code = "not_authorized";
    throw e;
  }
}

/** Chiama la Edge Function che cerca il vino sul web con Claude. */
export async function cercaVino({ nome, produttore, annata }) {
  const { data, error } = await supabase.functions.invoke("cerca-vino", {
    body: { nome, produttore, annata },
  });
  if (error) {
    let msg = "La ricerca non è riuscita. Riprova tra poco.";
    try {
      const body = await error.context?.json();
      if (body?.error) msg = body.error;
    } catch {}
    throw new Error(msg);
  }
  if (data?.error) throw new Error(data.error);
  return data;
}
