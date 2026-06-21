import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const IconStore = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/>
    <line x1="3" y1="6" x2="21" y2="6"/>
    <path d="M16 10a4 4 0 01-8 0"/>
  </svg>
);
const IconPin = () => (
  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconBell = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/>
    <path d="M13.73 21a2 2 0 01-3.46 0"/>
  </svg>
);
const IconCheck = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);

export default function Servicios() {
  const [guardando, setGuardando] = useState(false);
  const [avisado, setAvisado]     = useState(false);

  const handleAvisar = async () => {
    const user = auth.currentUser;
    if (!user || avisado) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, "servicios_espera", user.uid), {
        email:    user.email,
        uid:      user.uid,
        nombre:   user.displayName || "",
        servicio: "papeleria_cordoba",
        fecha:    new Date().toISOString(),
      });
      setAvisado(true);
    } catch (err) {
      console.error(err);
    } finally {
      setGuardando(false);
    }
  };

  return (
    <div style={s.page}>
      {/* Header */}
      <div style={s.header}>
        <div style={s.headerIcon}>
          <svg width="28" height="28" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="svGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient></defs>
            <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
            <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
              fill="none" stroke="url(#svGrad)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
        </div>
        <h1 style={s.titulo}>Servicios para estudiantes</h1>
        <p style={s.sub}>Conectamos estudiantes con negocios de confianza</p>
      </div>

      {/* Cards */}
      <div style={s.cardsArea}>
        <div style={s.card}>
          <div style={s.cardTop}>
            <div style={s.cardIconWrap}>
              <IconStore />
            </div>
            <div style={s.cardBadge}>Próximamente</div>
          </div>
          <h3 style={s.cardTitulo}>Papelería estudiantil</h3>
          <p style={s.cardDesc}>
            Material de papelería, libros y material de oficina para estudiantes con descuentos exclusivos.
          </p>
          <div style={s.cardMeta}>
            <span style={s.cardLocation}>
              <IconPin /> Córdoba
            </span>
          </div>
          <button
            style={avisado ? s.btnAvisado : s.btnAvisar}
            onClick={handleAvisar}
            disabled={avisado || guardando}
          >
            {avisado
              ? <><IconCheck /> Te avisaremos</>
              : guardando
              ? "Guardando..."
              : <><IconBell /> Avisarme cuando esté disponible</>
            }
          </button>
          {avisado && (
            <p style={s.avisadoNote}>
              Te notificaremos en cuanto esté disponible en tu zona.
            </p>
          )}
        </div>

        {/* Coming soon placeholder */}
        <div style={{ ...s.card, opacity: 0.45 }}>
          <div style={s.cardTop}>
            <div style={{ ...s.cardIconWrap, background: "var(--app-input-bg, #f9fafb)" }}>
              <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted, #9ca3af)" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                <rect x="2" y="3" width="20" height="14" rx="2"/>
                <path d="M8 21h8M12 17v4"/>
              </svg>
            </div>
            <div style={{ ...s.cardBadge, background: "var(--app-input-bg, #f3f4f6)", color: "var(--app-text-muted, #9ca3af)" }}>Próximamente</div>
          </div>
          <h3 style={s.cardTitulo}>Más servicios</h3>
          <p style={s.cardDesc}>Estamos trabajando para traer más servicios a tu ciudad.</p>
        </div>
      </div>
    </div>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "var(--app-bg, #f9fafb)",
    paddingBottom: "80px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    padding: "32px 24px 24px",
    gap: "8px",
  },
  headerIcon: {
    marginBottom: "8px",
  },
  titulo: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "var(--app-text, #0f0a1e)",
    letterSpacing: "-0.3px",
  },
  sub: {
    margin: 0,
    fontSize: "14px",
    color: "var(--app-text-muted, #6b7280)",
  },
  cardsArea: {
    padding: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: "14px",
    maxWidth: "480px",
    margin: "0 auto",
  },
  card: {
    background: "var(--app-surface, #ffffff)",
    borderRadius: "20px",
    padding: "20px",
    border: "1px solid var(--app-border, #e5e7eb)",
    boxShadow: "0 4px 16px rgba(0,0,0,0.06)",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  cardTop: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  },
  cardIconWrap: {
    width: "52px",
    height: "52px",
    borderRadius: "14px",
    background: "linear-gradient(135deg, rgba(249,115,22,0.12), rgba(124,58,237,0.12))",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#f97316",
  },
  cardBadge: {
    padding: "4px 12px",
    borderRadius: "20px",
    background: "rgba(249,115,22,0.1)",
    color: "#f97316",
    fontSize: "12px",
    fontWeight: "700",
    border: "1px solid rgba(249,115,22,0.2)",
  },
  cardTitulo: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "var(--app-text, #0f0a1e)",
  },
  cardDesc: {
    margin: 0,
    fontSize: "13px",
    color: "var(--app-text-muted, #6b7280)",
    lineHeight: "1.55",
  },
  cardMeta: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
  },
  cardLocation: {
    display: "inline-flex",
    alignItems: "center",
    gap: "4px",
    fontSize: "12px",
    color: "var(--app-text-muted, #9ca3af)",
    fontWeight: "600",
  },
  btnAvisar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "13px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
    boxShadow: "0 4px 14px rgba(249,115,22,0.3)",
  },
  btnAvisado: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    padding: "13px",
    borderRadius: "14px",
    border: "none",
    background: "var(--app-input-bg, #f3f4f6)",
    color: "#22c55e",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "default",
    fontFamily: "inherit",
  },
  avisadoNote: {
    margin: 0,
    fontSize: "12px",
    color: "var(--app-text-muted, #9ca3af)",
    textAlign: "center",
    lineHeight: "1.4",
  },
};
