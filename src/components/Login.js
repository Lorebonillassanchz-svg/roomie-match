import { useState } from "react";
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  sendEmailVerification,
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup,
} from "firebase/auth";

// NOTA PARA LORENA: Ve a Firebase Console → Authentication →
// Plantillas de email → Verificación de dirección de email
// y personaliza con:
//   Nombre del remitente: Roomie Match
//   Dirección de respuesta: roomiematch@hotmail.com
//   Asunto: Verifica tu cuenta de Roomie Match
// El enlace de verificación se incluye automáticamente.
import { auth } from "../firebase";
import ReglasComunitarias from "./ReglasComunitarias";
import styles from "./Login.module.css";

const provider = new GoogleAuthProvider();

const ERRORES = {
  "auth/user-not-found":       "No existe ninguna cuenta con este email",
  "auth/wrong-password":       "Contraseña incorrecta",
  "auth/invalid-credential":   "Email o contraseña incorrectos",
  "auth/email-already-in-use": "Ya existe una cuenta con este email",
  "auth/weak-password":        "La contraseña debe tener al menos 6 caracteres",
  "auth/invalid-email":        "El formato del email no es válido",
  "auth/too-many-requests":    "Demasiados intentos. Espera unos minutos",
};

function msgError(code) {
  return ERRORES[code] || "Ha ocurrido un error. Inténtalo de nuevo";
}

function fuerzaPassword(pwd) {
  if (!pwd || pwd.length < 6) return 1;
  if (pwd.length >= 8 && /[A-Z]/.test(pwd) && /[0-9!@#$%^&*]/.test(pwd)) return 3;
  return 2;
}

function getInitialTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved) return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* ── Iconos ── */
function OjoIcon({ visible }) {
  return visible ? (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/>
      <circle cx="12" cy="12" r="3"/>
    </svg>
  ) : (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94"/>
      <path d="M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19"/>
      <line x1="1" y1="1" x2="23" y2="23"/>
    </svg>
  );
}

function GoogleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 48 48" style={{ flexShrink: 0 }}>
      <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
      <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
      <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
      <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
    </svg>
  );
}

function LogoSVG({ size = 40, id = "rmgL" }) {
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

/* ── Separador ── */
function Separador() {
  return (
    <div className={styles.sep}>
      <div className={styles.sepLine}/>
      <span className={styles.sepText}>o</span>
      <div className={styles.sepLine}/>
    </div>
  );
}

/* ── Modo: login ── */
function ModoLogin({ onGoogle, onModo }) {
  const [email, setEmail]       = useState("");
  const [password, setPassword] = useState("");
  const [verPwd, setVerPwd]     = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError(msgError(err.code));
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email</label>
        <input type="email" autoComplete="email" placeholder="tu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={styles.input} required/>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Contraseña</label>
        <div className={styles.pwdWrap}>
          <input type={verPwd ? "text" : "password"} autoComplete="current-password"
            placeholder="Tu contraseña" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input} style={{ paddingRight: "44px" }} required/>
          <button type="button" className={styles.eyeBtn} onClick={() => setVerPwd(!verPwd)}>
            <OjoIcon visible={verPwd}/>
          </button>
        </div>
      </div>
      <button type="button" className={styles.linkBtn} onClick={() => onModo("recover")}>
        ¿Olvidaste tu contraseña?
      </button>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.btnPrimario} disabled={cargando}>
        {cargando ? "Entrando…" : "Entrar"}
      </button>
      <Separador/>
      <button type="button" className={styles.btnGoogle} onClick={onGoogle}>
        <GoogleIcon/> Continuar con Google
      </button>
      <p className={styles.switchText}>
        ¿No tienes cuenta?{" "}
        <button type="button" className={styles.switchBtn} onClick={() => onModo("register")}>
          Regístrate
        </button>
      </p>
    </form>
  );
}

/* ── Modo: registro ── */
function ModoRegistro({ onGoogle, onModo }) {
  const [nombre, setNombre]       = useState("");
  const [email, setEmail]         = useState("");
  const [password, setPassword]   = useState("");
  const [confirmar, setConfirmar] = useState("");
  const [verPwd, setVerPwd]       = useState(false);
  const [verConf, setVerConf]     = useState(false);
  const [cargando, setCargando]   = useState(false);
  const [error, setError]         = useState("");
  const fuerza = fuerzaPassword(password);

  const fuerzaLabels = ["", "Débil", "Media", "Fuerte"];
  const fuerzaColors = ["", "#ef4444", "#f59e0b", "#16a34a"];

  const handleRegistro = async (e) => {
    e.preventDefault();
    setError("");
    if (password !== confirmar) { setError("Las contraseñas no coinciden"); return; }
    if (password.length < 6)    { setError("La contraseña debe tener al menos 6 caracteres"); return; }
    setCargando(true);
    try {
      const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
      await updateProfile(cred.user, { displayName: nombre.trim() });
      await sendEmailVerification(cred.user, {
        url: 'https://roomie-match-4546c.web.app/login?modo=login',
        handleCodeInApp: false,
      });
    } catch (err) {
      setError(msgError(err.code));
    } finally {
      setCargando(false);
    }
  };

  return (
    <form onSubmit={handleRegistro} className={styles.form}>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Nombre</label>
        <input type="text" autoComplete="name" placeholder="¿Cómo te llamas?"
          value={nombre} onChange={(e) => setNombre(e.target.value)}
          className={styles.input} required/>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email</label>
        <input type="email" autoComplete="email" placeholder="tu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={styles.input} required/>
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Contraseña</label>
        <div className={styles.pwdWrap}>
          <input type={verPwd ? "text" : "password"} autoComplete="new-password"
            placeholder="Mínimo 6 caracteres" value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={styles.input} style={{ paddingRight: "44px" }} required/>
          <button type="button" className={styles.eyeBtn} onClick={() => setVerPwd(!verPwd)}>
            <OjoIcon visible={verPwd}/>
          </button>
        </div>
        {password && (
          <div className={styles.fuerzaWrap}>
            <div className={styles.fuerzaBars}>
              {[1, 2, 3].map((n) => (
                <div key={n} className={styles.fuerzaBar}
                  style={{ background: fuerza >= n ? fuerzaColors[fuerza] : "var(--border)" }}/>
              ))}
            </div>
            <span className={styles.fuerzaLabel} style={{ color: fuerzaColors[fuerza] }}>
              {fuerzaLabels[fuerza]}
            </span>
          </div>
        )}
      </div>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Confirmar contraseña</label>
        <div className={styles.pwdWrap}>
          <input type={verConf ? "text" : "password"} autoComplete="new-password"
            placeholder="Repite la contraseña" value={confirmar}
            onChange={(e) => setConfirmar(e.target.value)}
            className={`${styles.input} ${confirmar && confirmar !== password ? styles.inputError : ""}`}
            style={{ paddingRight: "44px" }} required/>
          <button type="button" className={styles.eyeBtn} onClick={() => setVerConf(!verConf)}>
            <OjoIcon visible={verConf}/>
          </button>
        </div>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.btnPrimario} disabled={cargando}>
        {cargando ? "Creando cuenta…" : "Crear cuenta"}
      </button>
      <Separador/>
      <button type="button" className={styles.btnGoogle} onClick={onGoogle}>
        <GoogleIcon/> Continuar con Google
      </button>
      <p className={styles.switchText}>
        ¿Ya tienes cuenta?{" "}
        <button type="button" className={styles.switchBtn} onClick={() => onModo("login")}>
          Inicia sesión
        </button>
      </p>
    </form>
  );
}

/* ── Modo: recuperación ── */
function ModoRecuperar({ onModo }) {
  const [email, setEmail]       = useState("");
  const [enviado, setEnviado]   = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError]       = useState("");

  const handleEnviar = async (e) => {
    e.preventDefault();
    setError("");
    setCargando(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setEnviado(true);
    } catch (err) {
      setError(msgError(err.code));
    } finally {
      setCargando(false);
    }
  };

  if (enviado) {
    return (
      <div className={styles.enviado}>
        <div className={styles.enviadoIcon}>
          <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#16a34a" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8a19.79 19.79 0 01-3.07-8.67A2 2 0 012 .9h3a2 2 0 012 1.72c.127.96.361 1.903.7 2.81a2 2 0 01-.45 2.11L6.09 8.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0122 16.92z"/>
          </svg>
        </div>
        <p className={styles.enviadoTexto}>
          Te hemos enviado un email con instrucciones para recuperar tu contraseña. Revisa también el spam.
        </p>
        <button type="button" className={styles.linkBtn} onClick={() => onModo("login")}>
          Volver al inicio de sesión
        </button>
      </div>
    );
  }

  return (
    <form onSubmit={handleEnviar} className={styles.form}>
      <p className={styles.recoverDesc}>
        Escribe tu email y te enviaremos un enlace para restablecer tu contraseña.
      </p>
      <div className={styles.fieldGroup}>
        <label className={styles.label}>Email</label>
        <input type="email" autoComplete="email" placeholder="tu@email.com"
          value={email} onChange={(e) => setEmail(e.target.value)}
          className={styles.input} required/>
      </div>
      {error && <p className={styles.error}>{error}</p>}
      <button type="submit" className={styles.btnPrimario} disabled={cargando}>
        {cargando ? "Enviando…" : "Enviar enlace de recuperación"}
      </button>
      <button type="button" className={styles.linkBtn} style={{ marginTop: "4px" }}
        onClick={() => onModo("login")}>
        Volver al inicio de sesión
      </button>
    </form>
  );
}

/* ── Componente principal ── */
export default function Login() {
  const modoInicial = new URLSearchParams(window.location.search).get("modo") === "registro"
    ? "register" : "login";
  const [modo, setModo]           = useState(modoInicial);
  const [verNormas, setVerNormas] = useState(false);
  const [theme]                   = useState(getInitialTheme);

  const handleGoogle = async () => {
    try { await signInWithPopup(auth, provider); }
    catch (err) { console.error(err); }
  };

  if (verNormas) return <ReglasComunitarias onCerrar={() => setVerNormas(false)} />;

  const titulos = {
    login:    "Bienvenido de nuevo",
    register: "Crear cuenta",
    recover:  "Recuperar contraseña",
  };
  const subtitulos = {
    login:    "Inicia sesión para continuar",
    register: "Únete a Roomie Match",
    recover:  "Te ayudamos a recuperar el acceso",
  };

  return (
    <div className={styles.page} data-theme={theme}>

      {/* ── Panel izquierdo: imagen ── */}
      <div className={styles.imageSide}>
        <img
          src="https://images.unsplash.com/photo-1529156069898-49953e39b3ac?w=800"
          alt=""
          className={styles.bgImage}
        />
        <div className={styles.overlay}/>

        {/* Logo esquina superior */}
        <div className={styles.logoTopLeft}>
          <LogoSVG size={40} id="rmgLP"/>
          <span className={styles.logoTopLeftText}>Roomie Match</span>
        </div>

        {/* Cards flotantes + eslogan */}
        <div className={styles.contentArea}>

          {/* Card 1 — Match de compatibilidad */}
          <div className={`${styles.glassCard} ${styles.card1}`}>
            <div className={styles.cardRow}>
              <div className={styles.cardAvatarInitials}>MG</div>
              <div style={{ flex: 1 }}>
                <div className={styles.cardName}>María, 22 · Granada</div>
                <div className={styles.compatBar}>
                  <div className={styles.compatFill}/>
                </div>
                <div className={styles.cardSub}>91% compatibilidad</div>
              </div>
              <div className={styles.matchPill}>Match</div>
            </div>
          </div>

          {/* Card 2 — Chat simulado */}
          <div className={`${styles.glassCard} ${styles.card2}`}>
            <div className={styles.cardRow} style={{ marginBottom: "8px" }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.7, flexShrink: 0 }}>
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
              </svg>
              <span style={{ fontSize: "11px", opacity: 0.7, fontWeight: 600 }}>Nuevo mensaje</span>
            </div>
            <p className={styles.chatMsg}>
              "Hola! También estudio en la UGR y busco piso cerca del campus"
            </p>
            <p className={styles.chatMsg} style={{ marginTop: "6px", opacity: 0.85 }}>
              "Yo también! Soy súper tranquila y no fumo"
            </p>
            <div className={styles.chatTime}>hace 2 min</div>
          </div>

          {/* Card 3 — Test completado */}
          <div className={`${styles.glassCard} ${styles.card3}`}>
            <div className={styles.cardRow}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0, opacity: 0.9 }}>
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

          {/* Card 4 — Valoración */}
          <div className={`${styles.glassCard} ${styles.card4}`}>
            <div className={styles.stars}>★★★★★</div>
            <p className={styles.quoteText}>
              "Encontré a mi roomie en menos de una semana. El test de compatibilidad fue clave."
            </p>
            <div className={styles.quoteName}>— Alba, Madrid</div>
          </div>

          {/* Eslogan */}
          <p className={styles.esloganText}>
            Tu próximo roomie está<br/>a un match de distancia.
          </p>
        </div>
      </div>

      {/* ── Panel derecho: formulario ── */}
      <div className={styles.formSide}>
        {/* Botón cerrar */}
        <button className={styles.closeBtn} onClick={() => window.location.replace("/")}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
            <line x1="18" y1="6" x2="6" y2="18"/>
            <line x1="6" y1="6" x2="18" y2="18"/>
          </svg>
        </button>

        <div className={styles.formInner}>
          {/* Logo solo en móvil */}
          <div className={styles.mobileLogo}>
            <LogoSVG size={36} id="rmgLM"/>
            <span className={styles.mobileLogoText}>Roomie Match</span>
          </div>

          <h1 className={styles.title}>{titulos[modo]}</h1>
          <p className={styles.subtitle}>{subtitulos[modo]}</p>

          <div className={styles.formBody}>
            {modo === "login"    && <ModoLogin    onGoogle={handleGoogle} onModo={setModo}/>}
            {modo === "register" && <ModoRegistro onGoogle={handleGoogle} onModo={setModo}/>}
            {modo === "recover"  && <ModoRecuperar onModo={setModo}/>}
          </div>

          <div className={styles.footer}>
            <a href="/terminos"   className={styles.footerLink}>Términos</a>
            <span className={styles.footerSep}>·</span>
            <a href="/privacidad" className={styles.footerLink}>Privacidad</a>
            <span className={styles.footerSep}>·</span>
            <button className={styles.footerBtn} onClick={() => setVerNormas(true)}>Normas</button>
          </div>
        </div>
      </div>
    </div>
  );
}
