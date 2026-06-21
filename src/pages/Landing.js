import { useState, useEffect, useRef } from "react";
import { collection, onSnapshot, addDoc } from "firebase/firestore";
import { db } from "../firebase";
import styles from "./Landing.module.css";

const FAQS = [
  { pregunta: "¿Es gratis?", respuesta: "Sí, crear perfil y hacer matches es completamente gratis." },
  { pregunta: "¿Solo para universitarios?", respuesta: "No, es para cualquier estudiante en España: universidad, FP, máster, Erasmus..." },
  { pregunta: "¿Cómo sé que los perfiles son reales?", respuesta: "Todos los usuarios pasan por verificación de identidad con selfie en tiempo real." },
  { pregunta: "¿Roomie Match busca pisos?", respuesta: "No, somos una plataforma para que los estudiantes os encontréis entre vosotros. El piso lo buscáis juntos." },
];

const IMAGES = [
  "https://images.unsplash.com/photo-1555854877-bab0e564b8d5?w=400",
  "https://images.unsplash.com/photo-1522708323590-d24dbb6b0267?w=400",
  "https://images.unsplash.com/photo-1502672260266-1c1ef2d93688?w=400",
  "https://images.unsplash.com/photo-1484154218962-a197022b5858?w=400",
  "https://images.unsplash.com/photo-1493809842364-78817add7ffb?w=400",
  "https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?w=400",
];

const IconGroup = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
    <circle cx="9" cy="7" r="4"/>
    <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
    <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
  </svg>
);
const IconBadgeX = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/>
    <line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconFrown = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <path d="M16 16s-1.5-2-4-2-4 2-4 2"/>
    <line x1="9" y1="9" x2="9.01" y2="9"/>
    <line x1="15" y1="9" x2="15.01" y2="9"/>
  </svg>
);
const IconShield = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
  </svg>
);
const IconStar = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
  </svg>
);
const IconLock = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0 1 10 0v4"/>
  </svg>
);
const IconSearch = () => (
  <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="11" cy="11" r="8"/>
    <line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);
const IconSun = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="5"/>
    <line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/>
    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
    <line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/>
    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
  </svg>
);
const IconMoon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
  </svg>
);
const IconPlus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);
const IconMinus = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="5" y1="12" x2="19" y2="12"/>
  </svg>
);

const VALOR_CARDS = [
  { Icon: IconShield, title: "Verificación de identidad", des: "Selfie en tiempo real para confirmar quién eres" },
  { Icon: IconStar,   title: "Algoritmo de compatibilidad", des: "Matches basados en hábitos y estilo de vida" },
  { Icon: IconLock,   title: "Chat privado", des: "Solo puedes chatear con tus matches mutuos" },
  { Icon: IconSearch, title: "Filtros por ciudad y edad", des: "Encuentra exactamente lo que buscas" },
];

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

export default function Landing({ onEntrar }) {
  const [theme, setTheme]                   = useState(getInitialTheme);
  const [userCount, setUserCount]           = useState(null);
  const [faqAbierto, setFaqAbierto]         = useState(null);
  const [estrellas, setEstrellas]           = useState(0);
  const [hoverEstrella, setHoverEstrella]   = useState(0);
  const [comentario, setComentario]         = useState("");
  const [emailFb, setEmailFb]               = useState("");
  const [enviando, setEnviando]             = useState(false);
  const [enviado, setEnviado]               = useState(false);
  const [navScrolled, setNavScrolled]       = useState(false);
  const [showContacto, setShowContacto]     = useState(false);
  const [contactForm, setContactForm]       = useState({ nombre: "", email: "", mensaje: "" });
  const [enviandoCont, setEnviandoCont]     = useState(false);
  const [enviadoCont, setEnviadoCont]       = useState(false);
  const comoFuncionaRef = useRef(null);

  const toggleTheme = () => {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    try { localStorage.setItem("theme", next); } catch {}
  };

  useEffect(() => {
    const unsub = onSnapshot(collection(db, "users"), (snap) => setUserCount(snap.size));
    return () => unsub();
  }, []);

  useEffect(() => {
    const onScroll = () => setNavScrolled(window.scrollY > 20);
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => entries.forEach((e) => {
        if (e.isIntersecting) { e.target.classList.add(styles.visible); observer.unobserve(e.target); }
      }),
      { threshold: 0.1 }
    );
    document.querySelectorAll(`.${styles.fadeIn}`).forEach((el) => observer.observe(el));
    return () => observer.disconnect();
  }, [userCount]);

  const handleContacto = async (e) => {
    e.preventDefault();
    if (!contactForm.nombre || !contactForm.email || !contactForm.mensaje) return;
    setEnviandoCont(true);
    try {
      await addDoc(collection(db, "contactos"), {
        nombre:  contactForm.nombre,
        email:   contactForm.email,
        mensaje: contactForm.mensaje,
        fecha:   new Date().toISOString(),
        leido:   false,
      });
      setEnviadoCont(true);
    } catch (err) { console.error(err); }
    finally { setEnviandoCont(false); }
  };

  const handleFeedback = async (e) => {
    e.preventDefault();
    if (!estrellas) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, "feedback"), {
        estrellas, comentario, email: emailFb,
        fecha: new Date().toISOString(), origen: "landing", publico: false,
      });
      setEnviado(true);
    } catch (err) { console.error(err); }
    finally { setEnviando(false); }
  };

  const col1 = [IMAGES[0], IMAGES[3], IMAGES[0], IMAGES[3]];
  const col2 = [IMAGES[1], IMAGES[4], IMAGES[1], IMAGES[4]];
  const col3 = [IMAGES[2], IMAGES[5], IMAGES[2], IMAGES[5]];

  return (
    <div className={styles.landing} data-theme={theme}>

      {/* ── Navbar ── */}
      <header className={`${styles.navbar} ${navScrolled ? styles.navbarScrolled : ""}`}>
        <div className={styles.logoWrap}>
          <svg width="36" height="36" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="rmgN" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24"/>
              <stop offset="35%" stopColor="#f97316"/>
              <stop offset="70%" stopColor="#ef4444"/>
              <stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient></defs>
            <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
            <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
              fill="none" stroke="url(#rmgN)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span className={styles.logoText}>
            Roomie{" "}
            <span style={{ background: "linear-gradient(90deg, #f97316, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent", backgroundClip: "text" }}>Match</span>
          </span>
        </div>
        <div className={styles.navBtns}>
          <button className={styles.themeToggle} onClick={toggleTheme} aria-label="Cambiar tema">
            {theme === "light" ? <IconMoon /> : <IconSun />}
          </button>
          <a href="/login?modo=login"    className={styles.btnLogin}>Iniciar sesión</a>
          <a href="/login?modo=registro" className={styles.btnRegistro}>Registrarse</a>
        </div>
      </header>

      {/* ── Hero ── */}
      <section className={styles.hero}>
        <div className={`${styles.heroContent} ${styles.fadeIn}`}>
          <span className={styles.heroBadge}>Para estudiantes en España</span>
          <h1 className={styles.heroTitle}>
            Encuentra tu<br/>
            <span className={styles.heroGradient}>compañero ideal</span>
          </h1>
          <p className={styles.heroSub}>
            Sin grupos de WhatsApp. Solo perfiles verificados de estudiantes con tu mismo estilo de vida.
          </p>
          <div className={styles.heroBtns}>
            <button className={styles.ctaBtn} onClick={onEntrar}>Crear mi perfil</button>
            <button className={styles.ctaBtnOutline}
              onClick={() => comoFuncionaRef.current?.scrollIntoView({ behavior: "smooth" })}>
              Ver cómo funciona
            </button>
          </div>
          <div className={styles.heroStats}>
            <span className={styles.heroStat}>100% gratis</span>
            <span className={styles.heroStatDot}/>
            <span className={styles.heroStat}>Verificado</span>
            <span className={styles.heroStatDot}/>
            <span className={styles.heroStat}>Solo estudiantes</span>
          </div>
          <div className={styles.heroMobileImages} aria-hidden="true">
            <img
              src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=400&q=80"
              alt=""
              loading="lazy"
            />
            <img
              src="https://images.unsplash.com/photo-1523240795612-9a054b0db644?w=400&q=80"
              alt=""
              loading="lazy"
            />
          </div>
        </div>

        <div className={styles.heroMosaic} aria-hidden="true">
          <div className={`${styles.mosaicCol} ${styles.mosaicCol1}`}>
            {col1.map((src, i) => <img key={i} src={src} alt="" className={styles.mosaicImg} loading="lazy"/>)}
          </div>
          <div className={`${styles.mosaicCol} ${styles.mosaicCol2}`}>
            {col2.map((src, i) => <img key={i} src={src} alt="" className={styles.mosaicImg} loading="lazy"/>)}
          </div>
          <div className={`${styles.mosaicCol} ${styles.mosaicCol3}`}>
            {col3.map((src, i) => <img key={i} src={src} alt="" className={styles.mosaicImg} loading="lazy"/>)}
          </div>
        </div>
      </section>

      {/* ── Problema ── */}
      <section className={`${styles.problemaSection} ${styles.fadeIn}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Encontrar un buen compañero de piso es más difícil de lo que parece</h2>
          <p className={styles.sectionSub}>No se trata solo de compartir gastos. Se trata de compatibilidad, confianza y convivencia. Roomie Match te ayuda a encontrar a esa persona.</p>
          <div className={styles.problemaCards}>
            {[
              { Icon: IconGroup,   text: "Desconocidos sin ningún filtro de compatibilidad" },
              { Icon: IconBadgeX, text: "Sin saber si la persona es real o de fiar" },
              { Icon: IconFrown,   text: "Acabas conviviendo con alguien totalmente diferente a ti" },
            ].map(({ Icon, text }) => (
              <div key={text} className={styles.problemaCard}>
                <div className={styles.problemaIconWrap}><Icon /></div>
                <p className={styles.problemaText}>{text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Cómo funciona ── */}
      <section className={`${styles.section} ${styles.fadeIn}`} ref={comoFuncionaRef}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>En 3 pasos tienes matches reales</h2>
          <div className={styles.pasos}>
            {[
              { n: 1, title: "Crea tu perfil", des: "Foto, ciudad y lo que buscas en un compañero de piso." },
              { n: 2, title: "Haz el test", des: "8 preguntas sobre tus hábitos y estilo de convivencia." },
              { n: 3, title: "Conecta", des: "Match mutuo + % de compatibilidad + chat directo." },
            ].map(({ n, title, des }, i) => (
              <div key={n} className={styles.paso}>
                {i > 0 && <div className={styles.pasoConector}/>}
                <div className={styles.pasoNum}>{n}</div>
                <div className={styles.pasoTexto}>
                  <p className={styles.pasoTitle}>{title}</p>
                  <p className={styles.pasoDes}>{des}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Propuesta de valor ── */}
      <section className={`${styles.valorSection} ${styles.fadeIn}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Hecho para estudiantes en España</h2>
          <div className={styles.valorGrid}>
            {VALOR_CARDS.map(({ Icon, title, des }) => (
              <div key={title} className={styles.valorCard}>
                <div className={styles.valorIconWrap}><Icon /></div>
                <p className={styles.valorTitle}>{title}</p>
                <p className={styles.valorDes}>{des}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Contador ── */}
      {userCount !== null && userCount > 0 && (
        <div className={`${styles.contador} ${styles.fadeIn}`}>
          <p className={styles.contadorNum}>{userCount.toLocaleString("es-ES")}</p>
          <p className={styles.contadorText}>estudiantes ya en Roomie Match</p>
        </div>
      )}

      {/* ── FAQ ── */}
      <section className={`${styles.section} ${styles.fadeIn}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>Preguntas frecuentes</h2>
          <div className={styles.faqList}>
            {FAQS.map((faq, i) => (
              <div key={i} className={styles.faqItem}>
                <button className={styles.faqBtn}
                  onClick={() => setFaqAbierto(faqAbierto === i ? null : i)}>
                  <span className={styles.faqPregunta}>{faq.pregunta}</span>
                  <span className={styles.faqIcon}>
                    {faqAbierto === i ? <IconMinus /> : <IconPlus />}
                  </span>
                </button>
                {faqAbierto === i && <p className={styles.faqRespuesta}>{faq.respuesta}</p>}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── Feedback ── */}
      <section className={`${styles.feedbackSection} ${styles.fadeIn}`}>
        <div className={styles.sectionInner}>
          <h2 className={styles.sectionTitle}>¿Qué te parece Roomie Match?</h2>
          <p className={styles.sectionSub}>Tu opinión nos ayuda a mejorar</p>
          {enviado ? (
            <div className={styles.feedbackExito}>¡Gracias! Tu opinión nos ayuda mucho</div>
          ) : (
            <form onSubmit={handleFeedback}>
              <div className={styles.stars}>
                {[1, 2, 3, 4, 5].map((n) => (
                  <button key={n} type="button"
                    className={`${styles.star} ${(hoverEstrella || estrellas) >= n ? styles.starActive : ""}`}
                    onMouseEnter={() => setHoverEstrella(n)}
                    onMouseLeave={() => setHoverEstrella(0)}
                    onClick={() => setEstrellas(n)}>★</button>
                ))}
              </div>
              <textarea className={styles.feedbackTextarea}
                placeholder="Cuéntanos qué mejorarías..." rows={4}
                value={comentario} onChange={(e) => setComentario(e.target.value)}/>
              <input className={styles.feedbackEmail} type="email"
                placeholder="Tu email si quieres que te respondamos"
                value={emailFb} onChange={(e) => setEmailFb(e.target.value)}/>
              <button type="submit" className={styles.feedbackBtn}
                disabled={!estrellas || enviando}>
                {enviando ? "Enviando..." : "Enviar opinión"}
              </button>
            </form>
          )}
        </div>
      </section>

      {/* ── CTA Final ── */}
      <div className={`${styles.ctaFinal} ${styles.fadeIn}`}>
        <h2 className={styles.ctaFinalTitle}>Tu próximo compañero de piso está aquí</h2>
        <p className={styles.ctaFinalSub}>Gratis. Sin anuncios. Solo estudiantes.</p>
        <button className={styles.ctaBtnSecondary} onClick={onEntrar}>Empezar ahora</button>
      </div>

      {/* ── Footer ── */}
      <footer className={styles.footer}>
        <div className={styles.footerLogo}>
          <svg width="22" height="22" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
            <defs><linearGradient id="rmgF" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#fbbf24"/><stop offset="100%" stopColor="#7c3aed"/>
            </linearGradient></defs>
            <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
            <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
              fill="none" stroke="url(#rmgF)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          <span>© 2025 Roomie Match</span>
        </div>
        <div className={styles.footerLinks}>
          <a href="/privacidad" className={styles.footerLink}>Privacidad</a>
          <span className={styles.footerSep}>·</span>
          <a href="/terminos" className={styles.footerLink}>Términos</a>
          <span className={styles.footerSep}>·</span>
          <button
            className={styles.footerLink}
            style={{ background: "none", border: "none", cursor: "pointer", padding: 0, fontFamily: "inherit" }}
            onClick={() => { setShowContacto(true); setEnviadoCont(false); setContactForm({ nombre: "", email: "", mensaje: "" }); }}
          >Contacto</button>
        </div>
      </footer>

      {/* ── Modal Contacto ── */}
      {showContacto && (
        <div
          style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", zIndex: 3000, display: "flex", alignItems: "center", justifyContent: "center", padding: "20px" }}
          onClick={(e) => { if (e.target === e.currentTarget) setShowContacto(false); }}
        >
          <div style={{ background: theme === "dark" ? "#1e1b2e" : "#ffffff", borderRadius: "24px", padding: "32px 28px", maxWidth: "420px", width: "100%", maxHeight: "90vh", overflowY: "auto", boxShadow: "0 24px 80px rgba(0,0,0,0.35)", border: "1px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), position: "relative", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            {/* Close */}
            <button
              onClick={() => setShowContacto(false)}
              style={{ position: "absolute", top: "16px", right: "16px", background: "none", border: "1.5px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), borderRadius: "10px", color: theme === "dark" ? "#94a3b8" : "#9ca3af", cursor: "pointer", padding: "6px", display: "flex", alignItems: "center", justifyContent: "center" }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
            </button>

            {/* Logo */}
            <div style={{ textAlign: "center", marginBottom: "20px" }}>
              <svg width="44" height="44" viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
                <defs><linearGradient id="cmoGrad" x1="0%" y1="0%" x2="100%" y2="100%"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
                <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
                <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64" fill="none" stroke="url(#cmoGrad)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
            </div>
            <h2 style={{ margin: "0 0 20px", fontSize: "22px", fontWeight: "800", color: theme === "dark" ? "#f8fafc" : "#0f0a1e", textAlign: "center", letterSpacing: "-0.3px" }}>Contacto</h2>

            {/* Datos empresa */}
            <div style={{ background: theme === "dark" ? "#0f0a1e" : "#f9fafb", border: "1px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), borderRadius: "14px", padding: "16px 18px", marginBottom: "20px", display: "flex", flexDirection: "column", gap: "8px" }}>
              <div style={{ fontSize: "14px", fontWeight: "700", color: theme === "dark" ? "#f8fafc" : "#0f0a1e" }}>Roomie Match</div>
              <a href="mailto:roomiematch@hotmail.com" style={{ fontSize: "13px", color: "#7c3aed", fontWeight: "600", textDecoration: "none" }}>roomiematch@hotmail.com</a>
              <div style={{ fontSize: "13px", color: theme === "dark" ? "#94a3b8" : "#6b7280" }}>Córdoba, España · CP 14006</div>
            </div>

            {!enviadoCont ? (
              <form onSubmit={handleContacto} style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: theme === "dark" ? "#94a3b8" : "#374151", display: "block", marginBottom: "5px" }}>Nombre</label>
                  <input
                    type="text" required placeholder="Tu nombre"
                    value={contactForm.nombre}
                    onChange={(e) => setContactForm({ ...contactForm, nombre: e.target.value })}
                    style={{ width: "100%", padding: "11px 14px", border: "1.5px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), borderRadius: "12px", fontSize: "14px", color: theme === "dark" ? "#f8fafc" : "#0f0a1e", background: theme === "dark" ? "#1e1b2e" : "#ffffff", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: theme === "dark" ? "#94a3b8" : "#374151", display: "block", marginBottom: "5px" }}>Email</label>
                  <input
                    type="email" required placeholder="tu@email.com"
                    value={contactForm.email}
                    onChange={(e) => setContactForm({ ...contactForm, email: e.target.value })}
                    style={{ width: "100%", padding: "11px 14px", border: "1.5px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), borderRadius: "12px", fontSize: "14px", color: theme === "dark" ? "#f8fafc" : "#0f0a1e", background: theme === "dark" ? "#1e1b2e" : "#ffffff", outline: "none", boxSizing: "border-box", fontFamily: "inherit" }}
                  />
                </div>
                <div>
                  <label style={{ fontSize: "13px", fontWeight: "600", color: theme === "dark" ? "#94a3b8" : "#374151", display: "block", marginBottom: "5px" }}>Mensaje</label>
                  <textarea
                    required placeholder="¿En qué podemos ayudarte?"
                    rows={4}
                    value={contactForm.mensaje}
                    onChange={(e) => setContactForm({ ...contactForm, mensaje: e.target.value })}
                    style={{ width: "100%", padding: "11px 14px", border: "1.5px solid " + (theme === "dark" ? "#2d2a45" : "#e5e7eb"), borderRadius: "12px", fontSize: "14px", color: theme === "dark" ? "#f8fafc" : "#0f0a1e", background: theme === "dark" ? "#1e1b2e" : "#ffffff", outline: "none", boxSizing: "border-box", resize: "none", fontFamily: "inherit", lineHeight: "1.5" }}
                  />
                </div>
                <button
                  type="submit" disabled={enviandoCont}
                  style={{ padding: "13px", borderRadius: "14px", border: "none", background: "linear-gradient(90deg, #f97316, #7c3aed)", color: "#ffffff", fontSize: "15px", fontWeight: "700", cursor: enviandoCont ? "not-allowed" : "pointer", opacity: enviandoCont ? 0.7 : 1, fontFamily: "inherit", boxShadow: "0 4px 14px rgba(249,115,22,0.3)" }}
                >
                  {enviandoCont ? "Enviando..." : "Enviar mensaje"}
                </button>
              </form>
            ) : (
              <div style={{ textAlign: "center", padding: "20px 0", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
                <div style={{ width: "56px", height: "56px", borderRadius: "50%", background: "#f0fdf4", border: "2px solid #86efac", display: "flex", alignItems: "center", justifyContent: "center" }}>
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
                </div>
                <p style={{ margin: 0, fontSize: "15px", fontWeight: "700", color: theme === "dark" ? "#f8fafc" : "#0f0a1e" }}>Mensaje recibido</p>
                <p style={{ margin: 0, fontSize: "13px", color: theme === "dark" ? "#94a3b8" : "#6b7280", lineHeight: "1.6" }}>
                  Te respondemos en menos de 48h.
                </p>
                <button onClick={() => setShowContacto(false)} style={{ marginTop: "8px", padding: "11px 28px", borderRadius: "14px", border: "none", background: "linear-gradient(90deg, #f97316, #7c3aed)", color: "#ffffff", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
