import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

/* ── Logo ── */
function LogoSVG({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="ctLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fbbf24"/>
          <stop offset="35%"  stopColor="#f97316"/>
          <stop offset="70%"  stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
      <path
        d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
        fill="none" stroke="url(#ctLogoGrad)" strokeWidth="7.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

/* ── Stickers para el panel izquierdo ── */
function StickerKey() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="9" r="4" stroke="#f97316" strokeWidth="1.8"/>
      <path d="M11.5 9h7M16 9v3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function StickerHouse() {
  return (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
        stroke="#7c3aed" strokeWidth="1.6" fill="rgba(124,58,237,0.15)"/>
      <path d="M9 21V13h6v8" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function StickerPeople() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke="#4ade80" strokeWidth="1.6"/>
      <path d="M3 20c0-3.3 2.7-6 6-6" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="15" cy="7" r="3" stroke="#f97316" strokeWidth="1.6"/>
      <path d="M21 20c0-3.3-2.7-6-6-6" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function StickerHeart() {
  return (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21S3 14.5 3 8.5a4.5 4.5 0 018-2.8A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke="#ef4444" strokeWidth="1.7" fill="rgba(239,68,68,0.15)"
      />
    </svg>
  );
}

const STICKERS = [
  { id: "sk1", top: "7%",  left: "10%",  rotate: -18, C: StickerKey    },
  { id: "sk2", top: "20%", right: "8%",  rotate:  14, C: StickerHouse  },
  { id: "sk3", top: "50%", left: "7%",   rotate:   5, C: StickerPeople },
  { id: "sk4", bottom: "14%", right: "10%", rotate: -9, C: StickerHeart  },
];

/* ── Iconos de preguntas ── */
function IconMoon() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}
function IconStar() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad2)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad2" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function IconBroom() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad3)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad3" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>
    </svg>
  );
}
function IconPeople() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad4)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad4" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
      <circle cx="9" cy="7" r="4"/>
      <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
      <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
    </svg>
  );
}
function IconSpeaker() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad5)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad5" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M11 5L6 9H2v6h4l5 4V5z"/>
      <path d="M19.07 4.93a10 10 0 0 1 0 14.14"/>
      <path d="M15.54 8.46a5 5 0 0 1 0 7.07"/>
    </svg>
  );
}
function IconLeaf() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad6)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad6" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path d="M2 22 L12 12"/>
      <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10c5.52 0 10-4.48 10-10C22 6.48 17.52 2 12 2z"/>
    </svg>
  );
}
function IconEuro() {
  return (
    <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
      stroke="url(#qiGrad7)" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <defs>
        <linearGradient id="qiGrad7" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <circle cx="12" cy="12" r="10"/>
      <path d="M14.5 8.5c-1.5-1.5-4-1-5 .5S8 13 9.5 14.5s4 1 5-.5"/>
      <path d="M7 10h6M7 14h6"/>
    </svg>
  );
}

/* ── Datos de preguntas ── */
const PREGUNTAS = [
  {
    id: "horario_acostarse",
    titulo: "¿A qué hora sueles acostarte?",
    Icono: IconMoon,
    opciones: [
      { valor: "temprano", etiqueta: "Antes de las 23h",        desc: "Me levanto temprano y madrugo" },
      { valor: "normal",   etiqueta: "Entre las 23h y la 1h",   desc: "Horario estándar" },
      { valor: "tarde",    etiqueta: "Después de la 1h",        desc: "Soy más de trasnochar" },
    ],
  },
  {
    id: "limpieza_propio",
    titulo: "¿Cómo de ordenado eres en casa?",
    Icono: IconStar,
    opciones: [
      { valor: 1, etiqueta: "Caos organizado",   desc: "Tengo mi propio sistema" },
      { valor: 2, etiqueta: "Bastante relajado",  desc: "Limpio cuando hace falta" },
      { valor: 3, etiqueta: "Equilibrado",         desc: "Ni muy ni muy poco" },
      { valor: 4, etiqueta: "Bastante ordenado",   desc: "Me gusta tener todo en su sitio" },
      { valor: 5, etiqueta: "Impecable",           desc: "El orden es fundamental para mí" },
    ],
  },
  {
    id: "tolerancia_limpieza",
    titulo: "¿Qué nivel de limpieza esperas de tu compañero?",
    Icono: IconBroom,
    opciones: [
      { valor: "muy_alto",  etiqueta: "Todo siempre limpio",          desc: "Estándares muy altos" },
      { valor: "alto",      etiqueta: "Bastante ordenado",            desc: "Me importa el orden" },
      { valor: "medio",     etiqueta: "Razonablemente limpio",        desc: "Soy flexible" },
      { valor: "bajo",      etiqueta: "Me adapto a cualquier estilo", desc: "Sin exigencias" },
    ],
  },
  {
    id: "frecuencia_visitas",
    titulo: "¿Con qué frecuencia recibes visitas en casa?",
    Icono: IconPeople,
    opciones: [
      { valor: "pocas",     etiqueta: "Raramente",              desc: "Mi casa es mi refugio" },
      { valor: "moderado",  etiqueta: "Alguna vez a la semana", desc: "Con moderación" },
      { valor: "muchas",    etiqueta: "Casi a diario",          desc: "Casa abierta" },
    ],
  },
  {
    id: "tolerancia_visitas",
    titulo: "Tu compañero avisa a las 23h de un martes que viene alguien...",
    Icono: IconPeople,
    opciones: [
      { valor: "ok_siempre",   etiqueta: "Sin problema, bienvenido",       desc: "Total apertura" },
      { valor: "ok_aviso",     etiqueta: "Bien si me avisa con tiempo",    desc: "Con aviso previo" },
      { valor: "mal_laboral",  etiqueta: "En días laborables, no",         desc: "Solo fines de semana" },
      { valor: "mal_siempre",  etiqueta: "Prefiero no visitas nocturnas",  desc: "Espacio propio" },
    ],
  },
  {
    id: "nivel_ruido",
    titulo: "¿Cuánto ruido toleras en casa?",
    Icono: IconSpeaker,
    opciones: [
      { valor: 1, etiqueta: "Silencio absoluto",  desc: "Necesito tranquilidad total" },
      { valor: 2, etiqueta: "Bastante tranquilo", desc: "Solo ruidos cotidianos suaves" },
      { valor: 3, etiqueta: "Nivel normal",        desc: "El ruido típico del hogar" },
      { valor: 4, etiqueta: "Bastante animado",    desc: "El ruido no me molesta" },
      { valor: 5, etiqueta: "Me da igual",         desc: "Tolero cualquier nivel de ruido" },
    ],
  },
  {
    id: "fumar",
    titulo: "¿Cuál es tu relación con el tabaco?",
    Icono: IconLeaf,
    opciones: [
      { valor: "no_fuma_no_tolera", etiqueta: "No fumo y prefiero piso sin fumadores", desc: "Sin humo" },
      { valor: "no_fuma_tolera",    etiqueta: "No fumo pero acepto si es en terraza",  desc: "Flexible" },
      { valor: "fuma_fuera",        etiqueta: "Fumo solo en terraza o habitación",     desc: "Fumo exterior" },
      { valor: "fuma_dentro",       etiqueta: "Fumo con normalidad en casa",           desc: "Fumador interior" },
    ],
  },
  {
    id: "gastos_comunes",
    titulo: "¿Cómo prefieres gestionar los gastos comunes?",
    Icono: IconEuro,
    opciones: [
      { valor: "app",          etiqueta: "App de gastos compartidos",          desc: "Splitwise o similar" },
      { valor: "bote",         etiqueta: "Bote común mensual",                 desc: "Fondo compartido" },
      { valor: "turno",        etiqueta: "Turnos y nos fiamos",                desc: "Confianza mutua" },
      { valor: "independiente",etiqueta: "Cada uno lo suyo, mínimo compartido", desc: "Independiente" },
    ],
  },
];

const MOTIVACION = [
  "Cuéntanos cómo eres",
  "Cuéntanos cómo eres",
  "Casi a la mitad",
  "Casi a la mitad",
  "Ya casi está",
  "Ya casi está",
  "Última recta",
  "Última recta",
];

export default function ConvivenciaTest({ onTestCompletado }) {
  const [paso, setPaso]           = useState(0);
  const [animDir, setAnimDir]     = useState("next");
  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError]         = useState("");

  const pregunta = PREGUNTAS[paso];
  const total    = PREGUNTAS.length;
  const esUltima = paso === total - 1;
  const respondida = respuestas[pregunta.id] !== undefined;

  const seleccionar = (valor) =>
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: valor }));

  const siguiente = async () => {
    if (!respondida) return;
    if (!esUltima) {
      setAnimDir("next");
      setPaso((p) => p + 1);
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "convivencia", uid), {
        uid,
        ...respuestas,
        actualizadoEn: new Date().toISOString(),
      });
      await setDoc(doc(db, "users", uid), { testCompletado: true }, { merge: true });
      if (onTestCompletado) onTestCompletado(respuestas);
    } catch (err) {
      console.error(err);
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const anterior = () => {
    if (paso > 0) {
      setAnimDir("prev");
      setPaso((p) => p - 1);
    }
  };

  const { Icono } = pregunta;
  const progresoPct = (paso / total) * 100;

  return (
    <>
      <style>{`
        @keyframes slideInFromRight {
          from { opacity: 0; transform: translateX(36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInFromLeft {
          from { opacity: 0; transform: translateX(-36px); }
          to   { opacity: 1; transform: translateX(0); }
        }
        .ct-question-area {
          animation-duration: 220ms;
          animation-timing-function: ease;
          animation-fill-mode: both;
        }
        .ct-anim-next { animation-name: slideInFromRight; }
        .ct-anim-prev { animation-name: slideInFromLeft; }

        .ct-option-btn {
          position: relative;
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          padding: 16px 20px;
          border-radius: 14px;
          cursor: pointer;
          text-align: left;
          outline: none;
          font-family: 'Inter','Segoe UI',sans-serif;
          transition: transform 0.14s ease, box-shadow 0.14s ease;
          width: 100%;
          box-sizing: border-box;

          border: 1.5px solid var(--app-border, #e5e7eb);
          background: var(--app-surface, #ffffff);
        }
        .ct-option-btn:hover:not(.ct-option-selected) {
          transform: scale(0.98);
          box-shadow: 0 2px 8px rgba(0,0,0,0.06);
        }
        .ct-option-selected {
          transform: scale(1.02);
          border: 2px solid transparent !important;
          background-image:
            linear-gradient(var(--app-surface, #ffffff), var(--app-surface, #ffffff)),
            linear-gradient(90deg, #f97316, #7c3aed) !important;
          background-origin: border-box !important;
          background-clip: padding-box, border-box !important;
          box-shadow: 0 4px 16px rgba(249,115,22,0.15);
        }
        [data-theme="dark"] .ct-option-selected {
          background-image:
            linear-gradient(#1e1b2e, #1e1b2e),
            linear-gradient(90deg, #f97316, #7c3aed) !important;
        }
        .ct-next-btn {
          width: 100%;
          padding: 15px;
          border-radius: 14px;
          border: none;
          font-size: 15px;
          font-weight: 600;
          cursor: pointer;
          font-family: 'Inter','Segoe UI',sans-serif;
          transition: opacity 0.2s, transform 0.15s;
        }
        .ct-next-btn:not(:disabled):hover { opacity: 0.88; transform: translateY(-1px); }
        .ct-next-btn:disabled { cursor: not-allowed; }

        @media (max-width: 900px) {
          .ct-left  { display: none !important; }
          .ct-right { width: 100% !important; padding: 32px 24px 72px !important; }
          .ct-mobile-logo { display: flex !important; }
        }
        @media (min-width: 901px) {
          .ct-mobile-logo { display: none !important; }
        }
      `}</style>

      <div style={s.page}>
        {/* ── Panel izquierdo ── */}
        <div className="ct-left" style={s.left}>
          {STICKERS.map(({ id, C, rotate, ...pos }) => (
            <div key={id} style={{
              position: "absolute", ...pos,
              transform: `rotate(${rotate}deg)`,
              opacity: 0.7,
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.3))",
              pointerEvents: "none",
            }}>
              <C />
            </div>
          ))}

          {/* Número grande de fondo */}
          <div style={s.bgNumber}>{paso + 1}</div>

          <div style={s.leftContent}>
            <div style={s.leftLogoRow}>
              <LogoSVG size={40} />
              <span style={s.leftWordmark}>
                Roomie<span style={s.gradText}>Match</span>
              </span>
            </div>
            <p style={s.leftMotivacion}>{MOTIVACION[paso]}</p>
            <div style={s.leftProgressRow}>
              <span style={s.leftProgressNum}>{paso + 1}</span>
              <span style={s.leftProgressOf}>/ {total}</span>
            </div>
          </div>
        </div>

        {/* ── Panel derecho ── */}
        <div className="ct-right" style={s.right}>
          {/* Mobile logo */}
          <div className="ct-mobile-logo" style={{ ...s.mobileLogo, display: "none" }}>
            <LogoSVG size={30} />
            <span style={s.mobileWordmark}>Roomie<span style={s.gradText}>Match</span></span>
          </div>

          {/* Barra de progreso */}
          <div style={s.progressSection}>
            <div style={s.progressTrack}>
              <div style={{ ...s.progressFill, width: `${progresoPct}%` }} />
            </div>
            <span style={s.progressLabel}>Pregunta {paso + 1} de {total}</span>
          </div>

          {/* Área animada */}
          <div
            key={paso}
            className={`ct-question-area ${animDir === "next" ? "ct-anim-next" : "ct-anim-prev"}`}
            style={s.questionArea}
          >
            {/* Icono + título */}
            <div style={s.questionHeader}>
              <div style={s.iconCircle}>
                <Icono />
              </div>
              <h2 style={s.questionTitle}>{pregunta.titulo}</h2>
            </div>

            {/* Opciones */}
            <div style={s.optionsList}>
              {pregunta.opciones.map((op) => {
                const sel = respuestas[pregunta.id] === op.valor;
                return (
                  <button
                    key={op.valor}
                    className={`ct-option-btn${sel ? " ct-option-selected" : ""}`}
                    onClick={() => seleccionar(op.valor)}
                  >
                    <span style={{ ...s.optionEtiqueta, color: sel ? "var(--app-accent, #7c3aed)" : "var(--app-text, #1a1a2e)" }}>
                      {op.etiqueta}
                    </span>
                    <span style={s.optionDesc}>{op.desc}</span>
                    {sel && (
                      <span style={s.checkCircle}>
                        <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                          <path d="M2 6l3 3 5-5" stroke="#fff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Error */}
          {error && <p style={s.error}>{error}</p>}

          {/* Navegación */}
          <div style={s.nav}>
            {paso > 0 && (
              <button style={s.backBtn} onClick={anterior}>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                  stroke="currentColor" strokeWidth="2.2" strokeLinecap="round">
                  <path d="M19 12H5M12 5l-7 7 7 7"/>
                </svg>
                Anterior
              </button>
            )}
            <button
              className="ct-next-btn"
              style={{
                background: respondida
                  ? "linear-gradient(90deg, #f97316, #7c3aed)"
                  : "var(--app-border, #e5e7eb)",
                color: respondida ? "#ffffff" : "var(--app-text-muted, #9ca3af)",
                boxShadow: respondida ? "0 4px 16px rgba(249,115,22,0.3)" : "none",
                marginLeft: paso > 0 ? "12px" : "0",
              }}
              onClick={siguiente}
              disabled={!respondida || guardando}
            >
              {guardando ? "Guardando..." : esUltima ? "Ver mis resultados" : "Siguiente"}
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

const s = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  /* ── Left ── */
  left: {
    width: "45%",
    flexShrink: 0,
    background: "#0f0a1e",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bgNumber: {
    position: "absolute",
    fontSize: "220px",
    fontWeight: "900",
    lineHeight: 1,
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    opacity: 0.12,
    userSelect: "none",
    pointerEvents: "none",
    right: "-20px",
    bottom: "60px",
    letterSpacing: "-10px",
  },
  leftContent: {
    position: "relative",
    zIndex: 2,
    padding: "48px 44px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    maxWidth: "380px",
  },
  leftLogoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
  },
  leftWordmark: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.3px",
  },
  gradText: {
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  leftMotivacion: {
    margin: 0,
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: "1.25",
    letterSpacing: "-0.4px",
  },
  leftProgressRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "6px",
  },
  leftProgressNum: {
    fontSize: "48px",
    fontWeight: "900",
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
    lineHeight: 1,
  },
  leftProgressOf: {
    fontSize: "20px",
    fontWeight: "600",
    color: "rgba(255,255,255,0.4)",
  },
  /* ── Right ── */
  right: {
    flex: 1,
    background: "var(--bg, #ffffff)",
    display: "flex",
    flexDirection: "column",
    padding: "40px 36px",
    overflowY: "auto",
    maxHeight: "100vh",
    position: "relative",
    gap: "0px",
  },
  mobileLogo: {
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
  },
  mobileWordmark: {
    fontSize: "16px",
    fontWeight: "800",
    color: "var(--text, #0f0a1e)",
  },
  progressSection: {
    marginBottom: "32px",
    flexShrink: 0,
  },
  progressTrack: {
    width: "100%",
    height: "3px",
    background: "var(--border, #e5e7eb)",
    borderRadius: "99px",
    overflow: "hidden",
    marginBottom: "10px",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    borderRadius: "99px",
    transition: "width 0.4s ease",
  },
  progressLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "var(--text-muted, #9ca3af)",
  },
  questionArea: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "24px",
  },
  questionHeader: {
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    gap: "14px",
  },
  iconCircle: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "linear-gradient(135deg, rgba(249,115,22,0.1), rgba(124,58,237,0.1))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  questionTitle: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "700",
    color: "var(--text, #1a1a2e)",
    lineHeight: "1.3",
    letterSpacing: "-0.2px",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  optionEtiqueta: {
    fontSize: "15px",
    fontWeight: "600",
    marginBottom: "3px",
    lineHeight: "1.3",
  },
  optionDesc: {
    fontSize: "13px",
    color: "var(--text-muted, #9ca3af)",
    fontWeight: "400",
  },
  checkCircle: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  error: {
    margin: "16px 0 0",
    fontSize: "13px",
    color: "#ef4444",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 14px",
    flexShrink: 0,
  },
  nav: {
    display: "flex",
    alignItems: "center",
    marginTop: "28px",
    flexShrink: 0,
  },
  backBtn: {
    display: "flex",
    alignItems: "center",
    gap: "6px",
    padding: "14px 18px",
    borderRadius: "14px",
    border: "1.5px solid var(--border, #e5e7eb)",
    background: "transparent",
    color: "var(--text-muted, #6b7280)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    fontFamily: "inherit",
    flexShrink: 0,
  },
};
