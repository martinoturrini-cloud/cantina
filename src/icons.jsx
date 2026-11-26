// Icone disegnate a mano in SVG: bottiglie per tipo, bicchiere, grappolo e icone d'interfaccia a tratto.

const BOTTLE_COLORS = {
  Rosso: { glass: "#6E1A33", shade: "#4E1024" },
  Bianco: { glass: "#D9C27A", shade: "#B9A05A" },
  Bollicine: { glass: "#3E5A3A", shade: "#2C4229" },
  Rosato: { glass: "#E08C9A", shade: "#C46D7C" },
  Dolce: { glass: "#B9782A", shade: "#93591A" },
  Passito: { glass: "#9C5A1E", shade: "#774212" },
};

const BOTTLE_BODY =
  "M10.4 6.2V3h3.2v3.2c0 1.1.6 2 1.5 2.8 1.4 1.2 2.1 2.6 2.1 4.3v7.2c0 .9-.7 1.5-1.5 1.5H8.3c-.8 0-1.5-.6-1.5-1.5v-7.2c0-1.7.7-3.1 2.1-4.3.9-.8 1.5-1.7 1.5-2.8z";

/** Bottiglia colorata in base al tipo di vino. Bollicine: bottiglia con capsula dorata e bollicine. */
export function WineBottle({ tipo = "Rosso", size = 28, className = "" }) {
  const c = BOTTLE_COLORS[tipo] || BOTTLE_COLORS.Rosso;
  const sparkling = tipo === "Bollicine";
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d={BOTTLE_BODY} fill={c.glass} />
      <path d="M15.1 9c1.4 1.2 2.1 2.6 2.1 4.3v7.2c0 .9-.7 1.5-1.5 1.5h-1.3V9.4z" fill={c.shade} opacity=".55" />
      {sparkling ? (
        <path d="M10.1 2.2h3.8v5.2c0 .5-.4.9-.9.9h-2c-.5 0-.9-.4-.9-.9z" fill="#C9A24B" />
      ) : (
        <rect x="10.2" y="2.2" width="3.6" height="2.4" rx=".5" fill={tipo === "Bianco" ? "#8C7A3E" : "#3A1520"} />
      )}
      <rect x="8.4" y="14" width="7.2" height="4.6" rx=".7" fill="#FFFDF8" />
      <rect x="9.6" y="15.4" width="4.8" height=".8" rx=".4" fill={c.glass} opacity=".7" />
      <rect x="10.4" y="16.9" width="3.2" height=".6" rx=".3" fill={c.glass} opacity=".45" />
      <path d="M8.6 12.2c.2-1 .7-1.8 1.4-2.4" stroke="#fff" strokeOpacity=".45" strokeWidth=".8" fill="none" strokeLinecap="round" />
      {sparkling && (
        <g fill="#C9A24B">
          <circle cx="18.6" cy="4.2" r="1" />
          <circle cx="20.2" cy="7" r=".7" />
          <circle cx="18.3" cy="8.3" r=".55" />
        </g>
      )}
    </svg>
  );
}

/** Calice con vino: usato per la sezione "Bevute". */
export function WineGlass({ size = 24, color = "#6E1A33", className = "", outline = "currentColor" }) {
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.6 8.6h8.8c-.3 2.6-1.9 4.4-4.4 4.4s-4.1-1.8-4.4-4.4z" fill={color} />
      <path
        d="M7 2.8h10c.2 1.6.2 3 0 4.4-.5 3.6-2.4 5.8-5 5.8s-4.5-2.2-5-5.8c-.2-1.4-.2-2.8 0-4.4zM12 13v7.4M8.4 21.2h7.2"
        fill="none"
        stroke={outline}
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

/** Grappolo d'uva: logo dell'app. */
export function GrapeIcon({ size = 32, className = "", color = "#6E1A33", leaf = "#5E7F3A" }) {
  // Grappolo a triangolo rovesciato: 3 + 2 + 1 acini, più uno in punta
  const grapes = [
    [7.6, 9.4], [12, 9.4], [16.4, 9.4],
    [9.8, 13.2], [14.2, 13.2],
    [12, 17], [12, 20.6],
  ];
  return (
    <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 7.2V4.4c0-1 .5-1.9 1.4-2.4" stroke={leaf} strokeWidth="1.3" fill="none" strokeLinecap="round" />
      <path d="M13 4.6c1.2-2.2 3.8-3 6.4-2.4-.6 2.6-2.9 4.2-5.6 3.8z" fill={leaf} />
      {grapes.map(([x, y]) => (
        <g key={`${x}-${y}`}>
          <circle cx={x} cy={y} r={y > 20 ? 1.7 : 2.25} fill={color} />
          <circle cx={x - 0.7} cy={y - 0.7} r=".55" fill="#fff" opacity=".35" />
        </g>
      ))}
    </svg>
  );
}

// Icone d'interfaccia a tratto (stile lineare)
const PATHS = {
  plus: "M12 5v14M5 12h14",
  back: "M15 18l-6-6 6-6",
  next: "M9 18l6-6-6-6",
  close: "M18 6L6 18M6 6l12 12",
  edit: "M16.5 3.5a2.1 2.1 0 013 3L7.5 18.5 3 20l1.5-4.5zM14.5 5.5l3 3",
  trash: "M3 6h18M19 6v14a2 2 0 01-2 2H7a2 2 0 01-2-2V6M8 6V4a2 2 0 012-2h4a2 2 0 012 2v2M10 11v6M14 11v6",
  search: "M11 19a8 8 0 100-16 8 8 0 000 16zM21 21l-4.3-4.3",
  sparkle: "M12 3l1.9 5.1L19 10l-5.1 1.9L12 17l-1.9-5.1L5 10l5.1-1.9zM19 15l.8 2.2L22 18l-2.2.8L19 21l-.8-2.2L16 18l2.2-.8z",
  pin: "M20 10c0 6-8 12-8 12S4 16 4 10a8 8 0 0116 0zM12 13a3 3 0 100-6 3 3 0 000 6z",
  calendar: "M5 4h14a2 2 0 012 2v14a2 2 0 01-2 2H5a2 2 0 01-2-2V6a2 2 0 012-2zM16 2v4M8 2v4M3 10h18",
  globe: "M12 22a10 10 0 100-20 10 10 0 000 20zM2 12h20M12 2a15.3 15.3 0 014 10 15.3 15.3 0 01-4 10 15.3 15.3 0 01-4-10 15.3 15.3 0 014-10z",
  check: "M20 6L9 17l-5-5",
  alert: "M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L13.7 3.9a2 2 0 00-3.4 0zM12 9v4M12 17h.01",
  bell: "M6 8a6 6 0 0112 0c0 7 3 9 3 9H3s3-2 3-9M10.3 21a1.9 1.9 0 003.4 0",
  download: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M7 10l5 5 5-5M12 15V3",
  upload: "M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4M17 8l-5-5-5 5M12 3v12",
  user: "M12 12a4 4 0 100-8 4 4 0 000 8zM20 21a8 8 0 00-16 0",
  settings: "M21 4h-7M10 4H3M21 12h-9M8 12H3M21 20h-5M12 20H3M14 2v4M8 10v4M16 18v4",
  clock: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 6v6l4 2",
  link: "M15 3h6v6M10 14L21 3M18 13v6a2 2 0 01-2 2H5a2 2 0 01-2-2V8a2 2 0 012-2h6",
  cloud: "M17.5 19H9a7 7 0 116.7-9h1.8a4.5 4.5 0 010 9z",
  undo: "M9 14L4 9l5-5M4 9h10.5a5.5 5.5 0 010 11H11",
  thermo: "M14 4v10.5a4 4 0 11-4 0V4a2 2 0 014 0z",
  fork: "M3 2v7a2 2 0 002 2h4a2 2 0 002-2V2M7 2v20M21 15V2a5 5 0 00-5 5v6a2 2 0 002 2h3zm0 0v7",
  chart: "M3 3v18h18M18 17V9M13 17V5M8 17v-3",
  logout: "M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4M16 17l5-5-5-5M21 12H9",
  shelf: "M3 4h18M3 12h18M3 20h18M6 4v16M18 4v16",
  barrel: "M7 3h10c1.5 3 1.5 15 0 18H7C5.5 18 5.5 6 7 3zM5.7 8h12.6M5.7 16h12.6",
  info: "M12 22a10 10 0 100-20 10 10 0 000 20zM12 16v-4M12 8h.01",
  tag: "M12.6 2.6A2 2 0 0011.2 2H4a2 2 0 00-2 2v7.2a2 2 0 00.6 1.4l8.7 8.7a2.4 2.4 0 003.4 0l6.6-6.6a2.4 2.4 0 000-3.4zM7.5 8a.5.5 0 100-1 .5.5 0 000 1z",
  euro: "M17 6.5A7 7 0 1017 17.5M4 10h9M4 14h9",
};

export function Icon({ name, size = 20, className = "", strokeWidth = 1.8 }) {
  if (name === "star" || name === "starFill") {
    return (
      <svg className={className} width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
        <path
          d="M12 2.5l2.9 6 6.6.9-4.8 4.6 1.2 6.5L12 17.4l-5.9 3.1 1.2-6.5-4.8-4.6 6.6-.9z"
          fill={name === "starFill" ? "currentColor" : "none"}
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinejoin="round"
        />
      </svg>
    );
  }
  return (
    <svg
      className={className}
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={strokeWidth}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden="true"
    >
      <path d={PATHS[name] || ""} />
    </svg>
  );
}
