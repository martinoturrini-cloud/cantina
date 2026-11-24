// Supabase Edge Function "cerca-vino"
// Riceve { nome, produttore, annata } e usa Claude con la ricerca web per compilare la scheda del vino,
// con particolare attenzione alla finestra ottimale di bevuta.
//
// Secret richiesti (Supabase → Edge Functions → Secrets):
//   ANTHROPIC_API_KEY   la tua chiave API Anthropic
//   ALLOWED_EMAILS      (facoltativo) email autorizzate, separate da virgola
// SUPABASE_URL e SUPABASE_ANON_KEY sono già disponibili in automatico.

import Anthropic from "npm:@anthropic-ai/sdk";
import { createClient } from "npm:@supabase/supabase-js@2";

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

const SYSTEM = `Sei un sommelier esperto e un ricercatore meticoloso. Compili la scheda di un vino per la cantina personale di un appassionato italiano.

Metodo:
- Cerca sul web la scheda tecnica del produttore, poi recensioni e valutazioni di critici e guide (es. Vinous, Wine Spectator, Jancis Robinson, Decanter, Gambero Rosso, Bibenda, Falstaff, James Suckling), e le note sull'annata nella zona.
- La FINESTRA DI BEVUTA è l'informazione più importante. Se un critico o il produttore indica una "drinking window", usala e citala. Altrimenti stimala tu in base a denominazione, stile, affinamento, annata e formato, e dichiara che è una stima.
- Per vini senza annata (NV), in particolare le bollicine, ragiona sulla data di sboccatura o sulla base dell'assemblaggio se compaiono nel nome; altrimenti considera l'anno corrente come riferimento di acquisto.
- Distingui il vino esatto da altre etichette dello stesso produttore. Se non trovi il vino preciso, dillo nella motivazione e abbassa l'affidabilità.
- Scrivi tutto in italiano, in modo conciso e concreto. Non inventare punteggi o dati che non hai trovato.

Alla fine rispondi SOLO con un oggetto JSON (nessun testo prima o dopo, nessun blocco di codice) con queste chiavi:
{
  "produttore": string,            // nome corretto del produttore
  "tipo": "Rosso" | "Bianco" | "Bollicine" | "Rosato" | "Dolce" | "Passito",
  "nazione": string,               // in italiano, es. "Italia", "Francia"
  "regione": string,               // in italiano, es. "Piemonte", "Champagne"
  "denominazione": string,         // es. "Barolo DOCG"
  "uvaggio": string,               // es. "100% Nebbiolo"
  "affinamento": string,           // vinificazione e affinamento, 1-2 frasi
  "descrizione": string,           // 3-5 frasi: stile, profilo organolettico, zona, cosa lo rende particolare, eventuali punteggi trovati
  "abbinamenti": string,
  "servizio": string,              // temperatura e decantazione consigliate
  "finestraDa": number,            // primo anno consigliato di apertura
  "finestraA": number,             // ultimo anno della finestra ottimale
  "apiceDa": number | null,        // inizio del periodo di massima espressione
  "apiceA": number | null,
  "motivazioneFinestra": string,   // 1-3 frasi: da dove viene la finestra (fonte o stima) e perché
  "affidabilita": "alta" | "media" | "bassa",
  "fonti": [{ "titolo": string, "url": string }]   // massimo 5, solo URL realmente consultati
}`;

function extractJson(text: string) {
  const fenced = text.match(/```(?:json)?\s*([\s\S]*?)```/);
  const raw = fenced ? fenced[1] : text;
  const start = raw.indexOf("{");
  const end = raw.lastIndexOf("}");
  if (start < 0 || end <= start) throw new Error("Risposta senza JSON");
  return JSON.parse(raw.slice(start, end + 1));
}

const yearOrNull = (v: unknown) => {
  const n = parseInt(String(v), 10);
  return Number.isFinite(n) && n > 1900 && n < 2200 ? n : null;
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "Metodo non consentito" }, 405);

  // 1. Solo utenti che hanno fatto login nell'app (così nessun altro consuma i tuoi crediti API)
  const token = (req.headers.get("Authorization") || "").replace(/^Bearer\s+/i, "");
  const sb = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_ANON_KEY")!);
  const { data: auth } = await sb.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "Accedi nelle Impostazioni dell'app per usare la ricerca." }, 401);
  const allowed = (Deno.env.get("ALLOWED_EMAILS") || "")
    .split(",")
    .map((s) => s.trim().toLowerCase())
    .filter(Boolean);
  if (allowed.length && !allowed.includes((user.email || "").toLowerCase())) {
    return json({ error: "Questo account non è autorizzato alla ricerca." }, 403);
  }

  // 2. Input
  let body: { nome?: string; produttore?: string; annata?: number };
  try {
    body = await req.json();
  } catch {
    return json({ error: "Richiesta non valida" }, 400);
  }
  const nome = String(body.nome || "").trim().slice(0, 200);
  const produttore = String(body.produttore || "").trim().slice(0, 200);
  const annata = Number(body.annata) || 0;
  if (!nome) return json({ error: "Manca il nome del vino." }, 400);

  const anno = new Date().getFullYear();
  const prompt = `Vino da cercare:
- Nome: ${nome}
- Produttore: ${produttore || "(non indicato)"}
- Annata: ${annata ? annata : "senza annata (NV)"}

Oggi siamo nel ${anno}. Compila la scheda come indicato.`;

  // 3. Claude + ricerca web
  const apiKey = Deno.env.get("ANTHROPIC_API_KEY");
  if (!apiKey) return json({ error: "Sul server manca il secret ANTHROPIC_API_KEY." }, 500);
  const client = new Anthropic({ apiKey });

  try {
    // deno-lint-ignore no-explicit-any
    const messages: any[] = [{ role: "user", content: prompt }];
    // deno-lint-ignore no-explicit-any
    let response: any;
    // La ricerca web può mettere in pausa il turno (pause_turn): in quel caso si riprende
    for (let i = 0; i < 4; i++) {
      response = await client.beta.messages
        .stream({
          model: "claude-opus-5-5",
          max_tokens: 16000,
          betas: ["server-side-fallback-2026-07-01"],
          fallbacks: "default",
          output_config: { effort: "medium" },
          system: SYSTEM,
          tools: [{ type: "web_search_20260209", name: "web_search", max_uses: 6 }],
          messages,
          // deno-lint-ignore no-explicit-any
        } as any)
        .finalMessage();
      if (response.stop_reason !== "pause_turn") break;
      messages.push({ role: "assistant", content: response.content });
    }

    if (response.stop_reason === "refusal") {
      return json({ error: "La ricerca è stata rifiutata. Prova a riformulare il nome del vino." }, 422);
    }

    const text = response.content
      // deno-lint-ignore no-explicit-any
      .filter((b: any) => b.type === "text")
      // deno-lint-ignore no-explicit-any
      .map((b: any) => b.text)
      .join("\n");
    const r = extractJson(text);

    const fonti = Array.isArray(r.fonti)
      ? r.fonti
          // deno-lint-ignore no-explicit-any
          .filter((f: any) => f && typeof f.url === "string" && /^https:\/\//i.test(f.url))
          .slice(0, 5)
          // deno-lint-ignore no-explicit-any
          .map((f: any) => ({ titolo: String(f.titolo || f.url).slice(0, 160), url: f.url }))
      : [];

    const str = (v: unknown) => (typeof v === "string" ? v.trim() : "");
    return json({
      produttore: str(r.produttore),
      tipo: str(r.tipo),
      nazione: str(r.nazione),
      regione: str(r.regione),
      denominazione: str(r.denominazione),
      uvaggio: str(r.uvaggio),
      affinamento: str(r.affinamento),
      descrizione: str(r.descrizione),
      abbinamenti: str(r.abbinamenti),
      servizio: str(r.servizio),
      finestraDa: yearOrNull(r.finestraDa),
      finestraA: yearOrNull(r.finestraA),
      apiceDa: yearOrNull(r.apiceDa),
      apiceA: yearOrNull(r.apiceA),
      motivazioneFinestra: str(r.motivazioneFinestra),
      affidabilita: ["alta", "media", "bassa"].includes(r.affidabilita) ? r.affidabilita : "media",
      fonti,
    });
  } catch (e) {
    console.error(e);
    if (e instanceof Anthropic.RateLimitError) return json({ error: "Troppe richieste: riprova tra un minuto." }, 429);
    if (e instanceof Anthropic.AuthenticationError) return json({ error: "Chiave API Anthropic non valida." }, 500);
    if (e instanceof Anthropic.APIError) return json({ error: "Il servizio di ricerca non risponde. Riprova tra poco." }, 502);
    return json({ error: "Non sono riuscito a leggere il risultato della ricerca. Riprova." }, 500);
  }
});
