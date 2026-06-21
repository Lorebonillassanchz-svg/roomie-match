import { useEffect, useRef, useState } from "react";
import { sendEmailVerification, signOut } from "firebase/auth";
import { auth } from "../firebase";
import styles from "../components/Login.module.css";

function LogoSVG({ size = 40, id = "veL" }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id={id} x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#fbbf24"/>
        <stop offset="35%"  stopColor="#f97316"/>
        <stop offset="70%"  stopColor="#ef4444"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient></defs>
      <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
      <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
        fill="none" stroke={`url(#${id})`} strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EmailIcon() {
  return (
    <svg width="64" height="64" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="emailIconGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#f97316"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <path
        d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"
        stroke="url(#emailIconGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
      <polyline
        points="22,6 12,13 2,6"
        stroke="url(#emailIconGrad)" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function VerificarEmail({ user }) {
  const [theme]            = useState(getInitialTheme);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");
  const [cooldown, setCooldown] = useState(0);
  const cooldownRef = useRef(null);

  useEffect(() => () => clearInterval(cooldownRef.current), []);

  const iniciarCooldown = () => {
    setCooldown(60);
    cooldownRef.current = setInterval(() => {
      setCooldown((c) => {
        if (c <= 1) { clearInterval(cooldownRef.current); return 0; }
        return c - 1;
      });
    }, 1000);
  };

  const handleVerificado = async () => {
    setCargando(true);
    setError("");
    try {
      await auth.currentUser.reload();
      if (auth.currentUser.emailVerified) {
        window.location.reload();
      } else {
        setError("Aún no hemos recibido la verificación. Espera unos segundos e inténtalo de nuevo.");
      }
    } catch {
      setError("Error al comprobar. Inténtalo de nuevo.");
    } finally {
      setCargando(false);
    }
  };

  const handleReenviar = async () => {
    if (cooldown > 0) return;
    setError("");
    try {
      await sendEmailVerification(auth.currentUser, {
        url: 'https://roomie-match-4546c.web.app/login?modo=login',
        handleCodeInApp: false,
      });
      iniciarCooldown();
    } catch {
      setError("No se pudo reenviar el email. Inténtalo más tarde.");
    }
  };

  const handleVolver = async () => {
    await signOut(auth).catch(() => {});
    window.location.replace("/");
  };

  const email = user?.email || "";

  return (
    <div className={styles.page} data-theme={theme}>

      {/* ── Panel izquierdo ── */}
      <div className={styles.imageSide}>
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800"
          alt=""
          className={styles.bgImage}
        />
        <div className={styles.overlay}/>

        <div className={styles.logoTopLeft}>
          <LogoSVG size={40} id="veLP"/>
          <span className={styles.logoTopLeftText}>Roomie Match</span>
        </div>

        <div className={styles.contentArea}>
          <div className={`${styles.glassCard} ${styles.card1}`}>
            <div className={styles.cardRow}>
              <div className={styles.cardAvatarInitials}>MG</div>
              <div style={{ flex: 1 }}>
                <div className={styles.cardName}>María, 22 · Granada</div>
                <div className={styles.compatBar}><div className={styles.compatFill}/></div>
                <div className={styles.cardSub}>91% compatibilidad</div>
              </div>
              <div className={styles.matchPill}>Match</div>
            </div>
          </div>

          <div className={`${styles.glassCard} ${styles.card2}`}>
            <div className={styles.cardRow} style={{ marginBottom: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 600 }}>Nuevo mensaje</span>
            </div>
            <p className={styles.chatMsg}>"Hola! También estudio en la UGR y busco piso cerca del campus"</p>
            <p className={styles.chatMsg} style={{ marginTop: "6px", opacity: 0.85 }}>"Yo también! Soy súper tranquila y no fumo"</p>
            <div className={styles.chatTime}>hace 2 min</div>
          </div>

          <div className={`${styles.glassCard} ${styles.card3}`}>
            <div className={styles.cardRow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ flexShrink: 0, opacity: 0.9 }}>
                <path d="M9 11l3 3L22 4"/>
                <path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11"/>
              </svg>
              <div>
                <div className={styles.cardName}>Test de convivencia completado</div>
                <div className={styles.cardSub}>8 preguntas · 2 min</div>
              </div>
              <div className={styles.verifiedPill}>Verificado</div>
            </div>
          </div>

          <div className={`${styles.glassCard} ${styles.card4}`}>
            <div className={styles.stars}>★★★★★</div>
            <p className={styles.quoteText}>"Encontré a mi roomie en menos de una semana. El test de compatibilidad fue clave."</p>
            <div className={styles.quoteName}>— Alba, Madrid</div>
          </div>

          <p className={styles.esloganText}>
            Tu próximo roomie está<br/>a un match de distancia.
          </p>
        </div>
      </div>

      {/* ── Panel derecho ── */}
      <div className={styles.formSide}>
        <button className={styles.closeBtn} onClick={handleVolver} aria-label="Volver">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className={styles.formInner}>
          <div className={styles.mobileLogo}>
            <LogoSVG size={36} id="veLM"/>
            <span className={styles.mobileLogoText}>Roomie Match</span>
          </div>

          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "20px", padding: "8px 0 4px" }}>
            <div style={{ padding: "20px", borderRadius: "50%", background: "rgba(249,115,22,0.08)", border: "1px solid rgba(249,115,22,0.15)" }}>
              <EmailIcon />
            </div>

            <div style={{ textAlign: "center" }}>
              <h1 className={styles.title} style={{ marginBottom: "10px" }}>Revisa tu correo</h1>
              <p style={{ margin: 0, fontSize: "15px", color: "var(--text-muted, #9ca3af)", lineHeight: "1.6" }}>
                Te hemos enviado un enlace de verificación a:
              </p>
            </div>

            <div style={{
              padding: "8px 20px", borderRadius: "999px",
              background: "var(--input-bg, rgba(255,255,255,0.06))",
              border: "1px solid var(--border, rgba(255,255,255,0.12))",
              fontSize: "14px", fontWeight: "600",
              color: "var(--text, #f1f5f9)",
              fontFamily: "'Courier New', monospace",
              wordBreak: "break-all", textAlign: "center",
            }}>
              {email}
            </div>

            <p style={{ margin: 0, fontSize: "13px", color: "var(--text-muted, #9ca3af)", textAlign: "center", lineHeight: "1.7" }}>
              Haz clic en el enlace del email para activar tu cuenta.<br/>
              Revisa también la carpeta de <strong>spam</strong>.
            </p>

            {error && (
              <p className={styles.error} style={{ textAlign: "center", width: "100%" }}>{error}</p>
            )}

            <button
              className={styles.btnPrimario}
              style={{ width: "100%" }}
              onClick={handleVerificado}
              disabled={cargando}
            >
              {cargando ? "Comprobando…" : "Ya lo he verificado ✓"}
            </button>

            <button
              onClick={handleReenviar}
              disabled={cooldown > 0}
              style={{
                width: "100%", padding: "13px 20px", borderRadius: "12px",
                border: "1.5px solid var(--border, rgba(255,255,255,0.15))",
                background: "transparent",
                color: cooldown > 0 ? "var(--text-muted, #9ca3af)" : "var(--text, #f1f5f9)",
                fontSize: "15px", fontWeight: "600",
                cursor: cooldown > 0 ? "default" : "pointer",
                fontFamily: "inherit", transition: "opacity 0.2s",
                opacity: cooldown > 0 ? 0.6 : 1,
              }}
            >
              {cooldown > 0 ? `Reenviar en ${cooldown}s` : "Reenviar email"}
            </button>

            <button
              onClick={handleVolver}
              className={styles.linkBtn}
              style={{ fontSize: "13px" }}
            >
              Cambiar email o volver al inicio
            </button>
          </div>

          <div className={styles.footer}>
            <a href="/terminos"   className={styles.footerLink}>Términos</a>
            <span className={styles.footerSep}>·</span>
            <a href="/privacidad" className={styles.footerLink}>Privacidad</a>
          </div>
        </div>
      </div>
    </div>
  );
}
