export const NAZIONI = {
  Italia: ["Piemonte", "Valle d'Aosta", "Lombardia", "Trentino-Alto Adige", "Veneto", "Friuli-Venezia Giulia", "Liguria", "Emilia-Romagna", "Toscana", "Umbria", "Marche", "Lazio", "Abruzzo", "Molise", "Campania", "Puglia", "Basilicata", "Calabria", "Sicilia", "Sardegna"],
  Francia: ["Bordeaux", "Borgogna", "Champagne", "Rodano", "Loira", "Alsazia", "Languedoc-Roussillon", "Provenza", "Beaujolais", "Jura", "Savoia"],
  Spagna: ["Rioja", "Ribera del Duero", "Priorat", "Rías Baixas", "Jerez", "Murcia", "Catalogna"],
  Portogallo: ["Douro", "Alentejo", "Dão", "Vinho Verde", "Madeira"],
  Germania: ["Mosella", "Rheingau", "Pfalz", "Rheinhessen", "Nahe"],
  Austria: ["Wachau", "Kamptal", "Burgenland", "Steiermark"],
  USA: ["California", "Oregon", "Washington"],
  Argentina: ["Mendoza", "Salta", "Patagonia"],
  Cile: ["Maipo", "Colchagua", "Casablanca"],
  "Sud Africa": ["Stellenbosch", "Swartland", "Constantia"],
  Australia: ["Barossa", "McLaren Vale", "Margaret River"],
  "Nuova Zelanda": ["Marlborough", "Central Otago"],
};

export const TIPI = ["Rosso", "Bianco", "Bollicine", "Rosato", "Dolce", "Passito"];

/** Campi della scheda compilati dalla ricerca automatica. */
export const CAMPI_RICERCA = [
  "tipo", "nazione", "regione", "denominazione", "uvaggio", "affinamento", "descrizione",
  "abbinamenti", "servizio", "finestraDa", "finestraA", "apiceDa", "apiceA", "motivazioneFinestra", "fonti",
];

export const emptyForm = () => ({
  nome: "", produttore: "", annata: new Date().getFullYear(), nazione: "Italia", regione: "", tipo: "Rosso",
  denominazione: "", uvaggio: "", affinamento: "", descrizione: "", abbinamenti: "", servizio: "",
  finestraDa: "", finestraA: "", apiceDa: "", apiceA: "", motivazioneFinestra: "", fonti: [],
  posizione: "", note: "", quantita: 1,
});

/** Quantità reale: 0 resta 0 (nella versione precedente 0 veniva letto come 1). */
export const qty = (w) => {
  const v = w?.quantita;
  if (v === undefined || v === null || v === "") return 1;
  const n = Number(v);
  return Number.isNaN(n) ? 1 : n;
};
export const qtyBevuta = (w) => {
  const n = Number(w?.quantitaBevuta);
  return Number.isFinite(n) && n > 0 ? n : 1;
};

export const isNV = (annata) => !annata || Number(annata) === 0;
export const annataLabel = (annata) => (isNV(annata) ? "NV" : String(annata));

export const toYear = (v) => {
  const n = parseInt(v, 10);
  return Number.isFinite(n) && n > 1800 ? n : null;
};

export const STATUS_COLOR = {
  scaduta: "var(--bad)", scadenza: "var(--warn)", apice: "var(--gold)",
  ottimale: "var(--ok)", presto: "var(--soon)", "": "var(--line)",
};
const STATUS_RANK = { scaduta: 0, scadenza: 1, apice: 2, ottimale: 3, presto: 4, "": 5 };

/** Stato della finestra di bevuta rispetto all'anno corrente. */
export function getWindowStatus(w, now = new Date().getFullYear()) {
  const da = toYear(w?.finestraDa);
  const a = toYear(w?.finestraA);
  const pDa = toYear(w?.apiceDa);
  const pA = toYear(w?.apiceA);
  if (!da && !a) return { key: "", label: "Finestra non indicata" };
  if (a && now > a) return { key: "scaduta", label: `Finestra chiusa nel ${a}` };
  if (da && now < da) return { key: "presto", label: `Da aprire dal ${da}` };
  if (a && now >= a - 1) return { key: "scadenza", label: now === a ? `Ultimo anno: entro il ${a}` : `In scadenza: entro il ${a}` };
  if (pDa && pA && now >= pDa && now <= pA) return { key: "apice", label: `All'apice fino al ${pA}` };
  return { key: "ottimale", label: a ? `Pronto, fino al ${a}` : "Pronto da bere" };
}

/** Ordine di urgenza: prima chi è fuori finestra o in scadenza, poi per anno di fine finestra. */
export function byUrgency(a, b) {
  const ra = STATUS_RANK[getWindowStatus(a).key];
  const rb = STATUS_RANK[getWindowStatus(b).key];
  if (ra !== rb) return ra - rb;
  return (toYear(a.finestraA) || 9999) - (toYear(b.finestraA) || 9999);
}

export const formatDate = (iso) => {
  if (!iso) return "";
  return new Date(iso).toLocaleDateString("it-IT", { day: "numeric", month: "long", year: "numeric" });
};

export const plural = (n, one, many) => `${n} ${n === 1 ? one : many}`;
