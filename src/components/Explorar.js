import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp, query, where } from "firebase/firestore";
import { auth, db } from "../firebase";
import ReportarPerfil from "./ReportarPerfil";
import styles from "./Explorar.module.css";
import { getAvatarDefault } from "../utils/avatarDefault";


const PESOS = {
  ciudad:  35,
  horario: 15,
  limpieza: 15,
  ruido:   10,
  visitas: 10,
  tabaco:  10,
  gastos:   5,
};
const PESO_TOTAL = Object.values(PESOS).reduce((a, b) => a + b, 0);

function calcularCompatibilidad(mia, suya, perfilMio, perfilSuyo) {
  if (!mia || !suya) return 0;
  let puntos = 0;

  // Ciudad — 35 pts
  const ciudadMia  = perfilMio?.ciudad   ? sinAcentos(perfilMio.ciudad)   : null;
  const ciudadSuya = perfilSuyo?.ciudad  ? sinAcentos(perfilSuyo.ciudad)  : null;
  const provMia    = perfilMio?.provincia  ? sinAcentos(perfilMio.provincia)  : null;
  const provSuya   = perfilSuyo?.provincia ? sinAcentos(perfilSuyo.provincia) : null;
  if (ciudadMia && ciudadSuya) {
    if (ciudadMia === ciudadSuya) {
      puntos += PESOS.ciudad;
    } else if (provMia && provSuya && provMia === provSuya) {
      puntos += Math.round(PESOS.ciudad * 0.5);
    }
    // distinta provincia → 0 puntos ciudad
  }

  // Horario — 15 pts
  if (mia.horario_acostarse && suya.horario_acostarse) {
    const orden = { temprano: 0, normal: 1, tarde: 2 };
    const diff = Math.abs((orden[mia.horario_acostarse] ?? 1) - (orden[suya.horario_acostarse] ?? 1));
    puntos += diff === 0 ? PESOS.horario : diff === 1 ? Math.round(PESOS.horario * 0.6) : Math.round(PESOS.horario * 0.2);
  }

  // Limpieza — 15 pts
  if (mia.limpieza_propio && suya.tolerancia_limpieza) {
    const tolOrden = { bajo: 1, medio: 2, alto: 4, muy_alto: 5 };
    const tolMin = tolOrden[suya.tolerancia_limpieza] ?? 2;
    const diff = mia.limpieza_propio - tolMin;
    puntos += diff >= 0 ? PESOS.limpieza : diff === -1 ? Math.round(PESOS.limpieza * 0.6) : Math.round(PESOS.limpieza * 0.2);
  }

  // Ruido — 10 pts
  if (mia.nivel_ruido && suya.nivel_ruido) {
    const diff = Math.abs(mia.nivel_ruido - suya.nivel_ruido);
    puntos += diff === 0 ? PESOS.ruido : diff === 1 ? Math.round(PESOS.ruido * 0.6) : diff === 2 ? Math.round(PESOS.ruido * 0.3) : 0;
  }

  // Visitas — 10 pts
  if (mia.frecuencia_visitas && suya.tolerancia_visitas) {
    const compatible = {
      pocas:    ["ok_siempre", "ok_aviso", "mal_laboral", "mal_siempre"],
      moderado: ["ok_siempre", "ok_aviso", "mal_laboral"],
      muchas:   ["ok_siempre"],
    };
    puntos += (compatible[mia.frecuencia_visitas] ?? []).includes(suya.tolerancia_visitas) ? PESOS.visitas : 0;
  }

  // Tabaco — 10 pts
  if (mia.fumar && suya.fumar) {
    const tabaco = {
      no_fuma_no_tolera: { no_fuma_no_tolera: 10, no_fuma_tolera: 6, fuma_fuera: 2,  fuma_dentro: 0  },
      no_fuma_tolera:    { no_fuma_no_tolera: 6,  no_fuma_tolera: 10, fuma_fuera: 8, fuma_dentro: 2  },
      fuma_fuera:        { no_fuma_no_tolera: 2,  no_fuma_tolera: 8,  fuma_fuera: 10, fuma_dentro: 6 },
      fuma_dentro:       { no_fuma_no_tolera: 0,  no_fuma_tolera: 2,  fuma_fuera: 6, fuma_dentro: 10 },
    };
    puntos += tabaco[mia.fumar]?.[suya.fumar] ?? 0;
  }

  // Gastos — 5 pts
  if (mia.gastos_comunes && suya.gastos_comunes) {
    puntos += mia.gastos_comunes === suya.gastos_comunes ? PESOS.gastos : Math.round(PESOS.gastos * 0.4);
  }

  return Math.min(100, Math.round((puntos / PESO_TOTAL) * 100));
}


function matchId(uid1, uid2) { return [uid1, uid2].sort().join("_"); }

const PROVINCIAS_ESPAÑA = [
  "Álava","Albacete","Alicante","Almería","Asturias","Ávila","Badajoz","Barcelona",
  "Burgos","Cáceres","Cádiz","Cantabria","Castellón","Ciudad Real","Córdoba","Cuenca",
  "Girona","Granada","Guadalajara","Guipúzcoa","Huelva","Huesca","Islas Baleares",
  "Jaén","La Coruña","La Rioja","Las Palmas","León","Lleida","Lugo","Madrid","Málaga",
  "Murcia","Navarra","Ourense","Palencia","Pontevedra","Salamanca",
  "Santa Cruz de Tenerife","Segovia","Sevilla","Soria","Tarragona","Teruel","Toledo",
  "Valencia","Valladolid","Vizcaya","Zamora","Zaragoza","Ceuta","Melilla",
];

const sinAcentos = (str) => str.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase();
const FILTROS_VACIOS = { busquedaUbicacion: "", edadMin: "", edadMax: "", sexo: "todos" };
const LABELS_CONV = {
  horario_acostarse:   "Horario acostarse",
  limpieza_propio:     "Nivel de limpieza",
  tolerancia_limpieza: "Tolerancia limpieza ajena",
  frecuencia_visitas:  "Frecuencia de visitas",
  tolerancia_visitas:  "Tolerancia a visitas",
  nivel_ruido:         "Nivel de ruido",
  fumar:               "Relación con el tabaco",
  gastos_comunes:      "Gestión de gastos",
};

function getTheme() {
  try {
    const saved = localStorage.getItem("theme");
    if (saved === "light" || saved === "dark") return saved;
  } catch {}
  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
}

/* ── SVG icons ── */
const IconPin      = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/></svg>;
const IconEuro     = () => <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M4 10h12M4 14h12M19.5 6a7 7 0 1 0 0 12"/></svg>;
const IconCheck    = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="20 6 9 17 4 12"/></svg>;
const IconXSm      = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconHeart    = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="currentColor" stroke="none"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>;
const IconXCircle  = () => <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
const IconSliders  = () => <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round"><line x1="4" y1="21" x2="4" y2="14"/><line x1="4" y1="10" x2="4" y2="3"/><line x1="12" y1="21" x2="12" y2="12"/><line x1="12" y1="8" x2="12" y2="3"/><line x1="20" y1="21" x2="20" y2="16"/><line x1="20" y1="12" x2="20" y2="3"/><line x1="1" y1="14" x2="7" y2="14"/><line x1="9" y1="8" x2="15" y2="8"/><line x1="17" y1="16" x2="23" y2="16"/></svg>;
const IconSun      = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>;
const IconMoon     = () => <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>;
const IconWarning  = () => <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>;
const IconHome     = () => <svg width="26" height="26" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>;

const BadgeVerificado = () => (
  <svg width="20" height="20" viewBox="0 0 20 20"
    style={{ display: "inline-block", verticalAlign: "middle", marginLeft: "4px", flexShrink: 0 }}>
    <circle cx="10" cy="10" r="10" fill="#1d9bf0"/>
    <path d="M6 10l3 3 5-5" fill="none" stroke="white"
      strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
  </svg>
);

const CONV_LABELS_KEYS = {
  horario_acostarse:   "Horario",
  limpieza_propio:     "Limpieza propia",
  tolerancia_limpieza: "Tolera limpieza",
  frecuencia_visitas:  "Visitas",
  tolerancia_visitas:  "Tolera visitas",
  nivel_ruido:         "Nivel de ruido",
  fumar:               "Tabaco",
  gastos_comunes:      "Gastos",
};
const CONV_LABELS_VALS = {
  horario_acostarse: {
    temprano: "Me acuesto antes de las 23h",
    normal: "Me acuesto entre las 23h y la 1h",
    tarde: "Me acuesto después de la 1h de la madrugada",
  },
  limpieza_propio: {
    1: "El orden no es lo mío",
    2: "Soy bastante relajado con la limpieza",
    3: "Limpio cuando toca, ni más ni menos",
    4: "Me gusta tener la casa ordenada",
    5: "Soy muy limpio y me importa el orden",
  },
  tolerancia_limpieza: {
    bajo: "Me molesta si mi roomie no limpia igual que yo",
    medio: "Lo acepto si hay un mínimo de orden",
    alto: "No me importa demasiado cómo limpia mi roomie",
    muy_alto: "Me da igual cómo sea mi roomie con la limpieza",
  },
  frecuencia_visitas: {
    nunca: "Casi nunca traigo gente a casa",
    pocas: "Traigo amigos de vez en cuando",
    frecuente: "Suelo tener visitas con frecuencia",
    moderado: "Traigo visitas con moderación",
    muchas: "Suelo tener visitas casi a diario",
  },
  tolerancia_visitas: {
    no: "Prefiero que no haya visitas en casa",
    ok_aviso: "No me importan las visitas si avisan antes",
    ok: "Me parece bien que mi roomie traiga quien quiera",
    ok_siempre: "Sin problema, siempre bienvenido",
    mal_laboral: "En días laborables, mejor que no",
    mal_siempre: "Prefiero no tener visitas nocturnas",
  },
  nivel_ruido: {
    1: "Necesito silencio total en casa",
    2: "Prefiero un ambiente tranquilo",
    3: "Aguanto un nivel normal de ruido",
    4: "No me molesta el ruido ni la música",
    5: "Me gusta el ambiente animado en casa",
  },
  fumar: {
    no_fuma_tolera: "No fumo, pero no me importa que mi roomie fume fuera",
    no_fuma_no_tolera: "No fumo y prefiero que no se fume en casa ni cerca",
    fuma_dentro: "Fumo y lo hago dentro del piso",
    fuma_fuera: "Fumo pero siempre salgo fuera a hacerlo",
  },
  gastos_comunes: {
    turno: "Nos turnamos para pagar los gastos comunes",
    proporcional: "Cada uno paga lo que consume",
    conjunto: "Ponemos dinero en común y pagamos de ahí",
    app: "App de gastos compartidos",
    bote: "Bote común mensual",
    independiente: "Cada uno lo suyo, mínimo compartido",
    separados: "Cada uno paga lo suyo",
    mitad: "A partes iguales",
    comun: "Bote común",
  },
};

function LogoSVG({ size = 28 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="rmgExpl" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fbbf24"/>
          <stop offset="35%"  stopColor="#f97316"/>
          <stop offset="70%"  stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
      <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
        fill="none" stroke="url(#rmgExpl)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

function EmptyIllustration() {
  return (
    <svg width="140" height="100" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
      <ellipse cx="70" cy="90" rx="55" ry="8" fill="currentColor" opacity="0.07"/>
      <circle cx="45" cy="38" r="20" fill="currentColor" opacity="0.12"/>
      <circle cx="45" cy="30" r="10" fill="currentColor" opacity="0.2"/>
      <rect x="25" y="50" width="40" height="38" rx="8" fill="currentColor" opacity="0.12"/>
      <circle cx="95" cy="40" r="20" fill="currentColor" opacity="0.12"/>
      <circle cx="95" cy="32" r="10" fill="currentColor" opacity="0.2"/>
      <rect x="75" y="52" width="40" height="36" rx="8" fill="currentColor" opacity="0.12"/>
      <path d="M62 68 Q70 58 78 68" stroke="#f97316" strokeWidth="2.5" strokeLinecap="round" fill="none"/>
    </svg>
  );
}

export default function Explorar({ setPantalla }) {
  const [theme, setTheme]                       = useState(getTheme);
  const [usuarios, setUsuarios]                 = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [indice, setIndice]                     = useState(0);
  const [miConvivencia, setMiConvivencia]       = useState(null);
  const [miPerfil, setMiPerfil]                 = useState(null);
  const [loading, setLoading]                   = useState(true);
  const [animacion, setAnimacion]               = useState(null);
  const [match, setMatch]                       = useState(null);
  const [matchPct, setMatchPct]                 = useState(0);
  const [verCompatibilidad, setVerCompatibilidad] = useState(false);
  const [procesando, setProcesando]             = useState(false);
  const [panelFiltros, setPanelFiltros]         = useState(false);
  const [filtros, setFiltros]                   = useState(FILTROS_VACIOS);
  const [filtrosTmp, setFiltrosTmp]             = useState(FILTROS_VACIOS);
  const [mostrarSugerencias, setMostrarSugerencias] = useState(false);
  const [usuarioReportando, setUsuarioReportando] = useState(null);
  const [drawerUsuario, setDrawerUsuario]       = useState(null);
  const [drawerVals, setDrawerVals]             = useState([]);
  const [drawerLoading, setDrawerLoading]       = useState(false);
  const [lightboxFoto, setLightboxFoto]         = useState(null);

  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try { localStorage.setItem("theme", theme); } catch {}
  }, [theme]);

  useEffect(() => {
    const handleClickFuera = (e) => {
      if (!e.target.closest(".ubicacion-wrapper")) {
        setMostrarSugerencias(false);
      }
    };
    const handleKeyDown = (e) => {
      if (e.key === "Escape") setMostrarSugerencias(false);
    };
    document.addEventListener("mousedown", handleClickFuera);
    document.addEventListener("keydown", handleKeyDown);
    return () => {
      document.removeEventListener("mousedown", handleClickFuera);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, []);

  useEffect(() => {
    const cargar = async () => {
      const uid = auth.currentUser.uid;
      const [convSnap, miPerfilSnap, usersSnap, likesSnap, dislikesSnap] = await Promise.all([
        getDoc(doc(db, "convivencia", uid)),
        getDoc(doc(db, "users", uid)),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "likes")),
        getDocs(collection(db, "dislikes")),
      ]);
      setMiConvivencia(convSnap.exists() ? convSnap.data() : null);
      setMiPerfil(miPerfilSnap.exists() ? miPerfilSnap.data() : null);
      const yaValorados = new Set();
      likesSnap.docs.forEach((d) => { if (d.data().from === uid) yaValorados.add(d.data().to); });
      dislikesSnap.docs.forEach((d) => { if (d.data().from === uid) yaValorados.add(d.data().to); });
      const otrosUids = usersSnap.docs.filter((d) => d.id !== uid && !yaValorados.has(d.id)).map((d) => d.id);
      const convDocs = await Promise.all(otrosUids.map((id) => getDoc(doc(db, "convivencia", id))));
      const lista = usersSnap.docs
        .filter((d) => d.id !== uid && !yaValorados.has(d.id))
        .map((d, i) => ({ ...d.data(), convivencia: convDocs[i].exists() ? convDocs[i].data() : null }));
      setUsuarios(lista);
      setUsuariosFiltrados(lista);
      setLoading(false);
    };
    cargar();
  }, []);

  const aplicarFiltros = (f) => {
    setFiltros(f);
    setIndice(0);
    const resultado = usuarios.filter((u) => {
      if (f.edadMin && u.edad < Number(f.edadMin)) return false;
      if (f.edadMax && u.edad > Number(f.edadMax)) return false;
      if (f.sexo !== "todos" && u.sexo?.toLowerCase() !== f.sexo.toLowerCase()) return false;
      if (f.busquedaUbicacion.trim()) {
        const q = sinAcentos(f.busquedaUbicacion.trim());
        if (!((u.provincia && sinAcentos(u.provincia).includes(q)) || (u.ciudad && sinAcentos(u.ciudad).includes(q)))) return false;
      }
      return true;
    });
    setUsuariosFiltrados(resultado);
    setPanelFiltros(false);
  };

  const seleccionarUbicacion = (valor) => {
    setFiltrosTmp((prev) => ({ ...prev, busquedaUbicacion: valor }));
    setMostrarSugerencias(false);
  };

  const limpiarFiltros = () => {
    setFiltrosTmp(FILTROS_VACIOS);
    setFiltros(FILTROS_VACIOS);
    setUsuariosFiltrados(usuarios);
    setIndice(0);
    setMostrarSugerencias(false);
    setPanelFiltros(false);
  };

  const hayFiltrosActivos = filtros.busquedaUbicacion.trim() || filtros.edadMin || filtros.edadMax || filtros.sexo !== "todos";

  const abrirDrawer = async (u) => {
    setDrawerUsuario(u);
    setDrawerLoading(true);
    try {
      const snap = await getDocs(query(collection(db, "valoraciones"), where("destinatarioUid", "==", u.uid)));
      setDrawerVals(snap.docs.map((d) => d.data()));
    } catch { setDrawerVals([]); }
    setDrawerLoading(false);
  };
  const cerrarDrawer = () => { setDrawerUsuario(null); setDrawerVals([]); setLightboxFoto(null); };

  const handleLike = async () => {
    if (procesando) return;
    setProcesando(true);
    const uid = auth.currentUser.uid;
    const target = usuariosFiltrados[indice];
    const targetUid = target.uid;
    await setDoc(doc(db, "likes", `${uid}_${targetUid}`), { from: uid, to: targetUid, timestamp: new Date().toISOString() });
    const likeInverso = await getDoc(doc(db, "likes", `${targetUid}_${uid}`));
    if (likeInverso.exists()) {
      const mid = matchId(uid, targetUid);
      await setDoc(doc(db, "matches", mid), { users: [uid, targetUid].sort(), timestamp: new Date().toISOString() });
      try {
        const miSnap = await getDoc(doc(db, "users", uid));
        const miNombre = miSnap.exists() ? miSnap.data().nombre : "Alguien";
        const miFcmToken = miSnap.exists() ? miSnap.data().fcmToken : null;
        const notifs = [];
        if (miFcmToken) notifs.push(addDoc(collection(db, "notificaciones"), { token: miFcmToken, title: "¡Nuevo Match!", body: `Has hecho match con ${target.nombre}`, uid, leida: false, fecha: serverTimestamp() }));
        if (target.fcmToken) notifs.push(addDoc(collection(db, "notificaciones"), { token: target.fcmToken, title: "¡Nuevo Match!", body: `Has hecho match con ${miNombre}`, uid: targetUid, leida: false, fecha: serverTimestamp() }));
        await Promise.all(notifs);
      } catch (err) { console.error("[Explorar] Error guardando notificaciones de match:", err); }
      setMatchPct(calcularCompatibilidad(miConvivencia, target.convivencia, miPerfil, target));
      setVerCompatibilidad(false);
      setMatch(target);
      setProcesando(false);
      return;
    }
    animarYAvanzar("like");
  };

  const handleDislike = async () => {
    if (procesando) return;
    setProcesando(true);
    const uid = auth.currentUser.uid;
    const target = usuariosFiltrados[indice];
    await setDoc(doc(db, "dislikes", `${uid}_${target.uid}`), { from: uid, to: target.uid, timestamp: new Date().toISOString() });
    animarYAvanzar("dislike");
  };

  const animarYAvanzar = (tipo) => {
    setAnimacion(tipo);
    setTimeout(() => {
      setAnimacion(null);
      setIndice((prev) => prev + 1);
      setProcesando(false);
    }, 380);
  };

  const cerrarMatch = () => { setMatch(null); setVerCompatibilidad(false); setIndice((prev) => prev + 1); };

  if (loading) {
    return (
      <div className={styles.loadingPage}>
        <div className={styles.spinner} />
      </div>
    );
  }

  const sinPerfiles  = usuariosFiltrados.length === 0;
  const todosVistos  = !sinPerfiles && indice >= usuariosFiltrados.length;
  const usuario      = !sinPerfiles && !todosVistos ? usuariosFiltrados[indice] : null;
  const pct          = usuario ? calcularCompatibilidad(miConvivencia, usuario.convivencia, miPerfil, usuario) : 0;

  let cardClassName = styles.card;
  if (animacion === "like")    cardClassName = `${styles.card} ${styles.cardSwipeRight}`;
  if (animacion === "dislike") cardClassName = `${styles.card} ${styles.cardSwipeLeft}`;

  const sexoLabel = { hombre: "Hombre", mujer: "Mujer", no_binario: "No binario" };

  /* ── Computed drawer stats ── */
  const drawerRatingMedia = drawerVals.length > 0
    ? Math.round((drawerVals.reduce((a, d) => a + d.estrellas, 0) / drawerVals.length) * 10) / 10
    : 0;
  const drawerTopEtiquetas = (() => {
    const counts = {};
    drawerVals.forEach((d) => (d.etiquetas || []).forEach((e) => { counts[e] = (counts[e] || 0) + 1; }));
    return Object.entries(counts).sort((a, b) => b[1] - a[1]).slice(0, 3).map(([e]) => e);
  })();

  return (
    <div className={styles.page}>

      {/* ── Background stickers CAMBIO 4 ── */}
      <div style={{ position: "fixed", top: "8%",  left: "4%",  opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <circle cx="8" cy="9" r="4"/><path d="M11.5 9h7M16 9v3"/>
        </svg>
      </div>
      <div style={{ position: "fixed", top: "6%",  right: "4%", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        <svg width="60" height="60" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
        </svg>
      </div>
      <div style={{ position: "fixed", bottom: "10%", left: "3%", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        <svg width="70" height="70" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <path d="M12 21S3 14.5 3 8.5a4.5 4.5 0 018-2.8A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"/>
        </svg>
      </div>
      <div style={{ position: "fixed", bottom: "12%", right: "3%", opacity: 0.03, pointerEvents: "none", zIndex: 0 }}>
        <svg width="80" height="80" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
          <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z"/><path d="M9 22V12h6v10"/>
        </svg>
      </div>

      {/* ── Filter panel ── */}
      {panelFiltros && (
        <div className={styles.panelOverlay} onClick={() => setPanelFiltros(false)}>
          <div className={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div className={styles.panelHeader}>
              <h3 className={styles.panelTitle}>Filtros</h3>
              <button className={styles.panelCloseBtn} onClick={() => setPanelFiltros(false)}>
                <IconXSm />
              </button>
            </div>
            <div className={styles.panelBody}>
              <div className={styles.panelField}>
                <label className={styles.panelLabel}>Provincia o ciudad</label>
                <div className="ubicacion-wrapper" style={{ position: "relative" }}>
                  <input
                    className={styles.panelInput}
                    type="text"
                    placeholder="Escribe para buscar..."
                    value={filtrosTmp.busquedaUbicacion}
                    onChange={(e) => {
                      setFiltrosTmp((prev) => ({ ...prev, busquedaUbicacion: e.target.value }));
                      setMostrarSugerencias(true);
                    }}
                    onFocus={() => filtrosTmp.busquedaUbicacion.trim() && setMostrarSugerencias(true)}
                    onKeyDown={(e) => { if (e.key === "Escape") setMostrarSugerencias(false); }}
                    autoComplete="off"
                  />
                  {mostrarSugerencias && filtrosTmp.busquedaUbicacion.trim() && (() => {
                    const sugerencias = PROVINCIAS_ESPAÑA.filter((p) =>
                      sinAcentos(p).includes(sinAcentos(filtrosTmp.busquedaUbicacion.trim()))
                    ).slice(0, 6);
                    return sugerencias.length > 0 ? (
                      <div className={styles.sugerenciasBox}>
                        {sugerencias.map((p) => (
                          <div
                            key={p}
                            className={styles.sugerenciaItem}
                            onMouseDown={(e) => { e.preventDefault(); seleccionarUbicacion(p); }}
                          >
                            {p}
                          </div>
                        ))}
                      </div>
                    ) : null;
                  })()}
                </div>
              </div>

              <div className={styles.panelField}>
                <label className={styles.panelLabel}>Rango de edad</label>
                <div className={styles.rangoRow}>
                  <input className={styles.panelInput} style={{ width: "80px" }} placeholder="Mín" type="number" min="18" max="99"
                    value={filtrosTmp.edadMin} onChange={(e) => setFiltrosTmp({ ...filtrosTmp, edadMin: e.target.value })} />
                  <span className={styles.rangoDash}>—</span>
                  <input className={styles.panelInput} style={{ width: "80px" }} placeholder="Máx" type="number" min="18" max="99"
                    value={filtrosTmp.edadMax} onChange={(e) => setFiltrosTmp({ ...filtrosTmp, edadMax: e.target.value })} />
                </div>
              </div>

              <div className={styles.panelField}>
                <label className={styles.panelLabel}>Sexo</label>
                <div className={styles.sexoGrid}>
                  {[{ valor: "todos", etiqueta: "Todos" }, { valor: "hombre", etiqueta: "Hombre" }, { valor: "mujer", etiqueta: "Mujer" }, { valor: "no_binario", etiqueta: "No binario" }].map(({ valor, etiqueta }) => (
                    <button key={valor}
                      className={`${styles.sexoBtn} ${filtrosTmp.sexo === valor ? styles.sexoBtnActive : ""}`}
                      onClick={() => setFiltrosTmp({ ...filtrosTmp, sexo: valor })}>
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className={styles.panelFooter}>
              <button className={styles.btnLimpiar} onClick={limpiarFiltros}>Limpiar</button>
              <button className={styles.btnAplicar} onClick={() => aplicarFiltros(filtrosTmp)}>Aplicar filtros</button>
            </div>
          </div>
        </div>
      )}

      {/* ── Match overlay ── */}
      {match && (
        <div className={styles.matchOverlay}>
          {verCompatibilidad ? (
            <div className={`${styles.matchBox} ${styles.matchBoxScroll}`}>
              <button className={styles.matchCloseX} onClick={() => setVerCompatibilidad(false)}><IconXSm /></button>
              <h2 className={styles.matchTitle} style={{ fontSize: "18px", marginBottom: "4px" }}>Compatibilidad de convivencia</h2>
              <p style={{ margin: "0 0 16px", fontSize: "13px", color: "var(--app-text-muted)", textAlign: "center" }}>
                Tú vs. {match.nombre}
              </p>
              <div className={styles.compatDetalleBar}>
                <span className={styles.compatDetallePct} style={{ color: matchPct >= 70 ? "#4ade80" : matchPct >= 40 ? "#fbbf24" : "#f87171" }}>
                  {matchPct}% compatible
                </span>
                <div className={styles.compatDetalleTrack}>
                  <div className={styles.compatDetalleFill} style={{ width: `${matchPct}%`, background: matchPct >= 70 ? "#4ade80" : matchPct >= 40 ? "#fbbf24" : "#f87171" }} />
                </div>
              </div>
              <div className={styles.compatDetalleGrid}>
                {Object.entries(LABELS_CONV).map(([key, label]) => {
                  const valMia  = miConvivencia?.[key];
                  const valSuya = match.convivencia?.[key];
                  if (!valMia && !valSuya) return null;
                  const coincide = String(valMia) === String(valSuya);
                  return (
                    <div key={key} className={styles.compatDetalleRow}>
                      <span className={styles.compatDetalleLabel}>{label}</span>
                      <div className={styles.compatDetalleValores}>
                        <span className={styles.compatDetalleVal} style={{ background: "#ede9fe", color: "#5b21b6" }}>{valMia ?? "—"}</span>
                        <span style={{ display: "flex", alignItems: "center" }}>{coincide ? <IconCheck /> : <IconWarning />}</span>
                        <span className={styles.compatDetalleVal} style={{ background: "#fce7f3", color: "#9d174d" }}>{valSuya ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div className={styles.compatDetalleLeyenda}>
                <span className={styles.compatDetalleVal} style={{ background: "#ede9fe", color: "#5b21b6" }}>Tú</span>
                <span className={styles.compatDetalleVal} style={{ background: "#fce7f3", color: "#9d174d" }}>{match.nombre}</span>
              </div>
              <button className={styles.matchBtnBack} onClick={() => setVerCompatibilidad(false)}>← Volver</button>
            </div>
          ) : (
            <div className={styles.matchBox}>
              <h2 className={styles.matchTitle}>¡Hay interés mutuo!</h2>
              <div className={styles.matchAvatars}>
                <div className={styles.matchAvatarWrap}>
                  <img src={auth.currentUser?.photoURL || getAvatarDefault(null)} alt="yo" className={styles.matchAvatar} referrerPolicy="no-referrer" />
                </div>
                <div className={styles.matchIconCenter}><IconHome /></div>
                <div className={styles.matchAvatarWrap}>
                  <img src={match.photoURL || getAvatarDefault(match.sexo)} alt={match.nombre} className={styles.matchAvatar} referrerPolicy="no-referrer" />
                </div>
              </div>
              <p className={styles.matchSub}>
                Tú y <strong>{match.nombre}</strong> habéis mostrado interés en conoceros para compartir piso.
              </p>
              <p className={styles.matchCompatText}>
                Compatibilidad:{" "}
                <strong style={{ color: matchPct >= 70 ? "#4ade80" : matchPct >= 40 ? "#fbbf24" : "#f87171" }}>
                  {matchPct}%
                </strong>
              </p>
              <button className={styles.matchBtnPrimary} onClick={() => { cerrarMatch(); setPantalla?.("matches"); }}>
                Empezar chat
              </button>
              <button className={styles.matchBtnSecondary} onClick={() => setVerCompatibilidad(true)}>
                Ver compatibilidad
              </button>
              <button className={styles.matchBtnClose} onClick={cerrarMatch}>Cerrar</button>
            </div>
          )}
        </div>
      )}

      {/* ── Top bar ── */}
      <div className={styles.topBar}>
        <div className={styles.topBarLogo}>
          <LogoSVG size={28} />
          <span className={styles.topBarName}>
            Roomie{" "}
            <span style={{
              background: "linear-gradient(90deg, #f97316, #7c3aed)",
              WebkitBackgroundClip: "text",
              WebkitTextFillColor: "transparent",
            }}>Match</span>
          </span>
        </div>
        <div className={styles.topBarRight}>
          <button
            className={`${styles.filterPill} ${hayFiltrosActivos ? styles.filterPillActive : ""}`}
            onClick={() => { setFiltrosTmp(filtros); setMostrarSugerencias(false); setPanelFiltros(true); }}
          >
            <IconSliders />
            Filtros
            {hayFiltrosActivos && <span className={styles.filterDot} />}
          </button>
          <button className={styles.themeBtn} onClick={() => setTheme((t) => t === "dark" ? "light" : "dark")} aria-label="Cambiar tema">
            {theme === "dark" ? <IconSun /> : <IconMoon />}
          </button>
        </div>
      </div>

      {/* ── Empty / end states ── */}
      {(sinPerfiles || todosVistos) && (
        <div className={styles.emptyWrap} style={{ color: "var(--app-text-muted)" }}>
          <EmptyIllustration />
          <p className={styles.emptyTitle}>No hay más perfiles por ahora</p>
          <p className={styles.emptyText}>Vuelve pronto o amplía tus filtros</p>
          <button className={styles.emptyBtn} onClick={() => { setFiltrosTmp(filtros); setPanelFiltros(true); }}>
            Ajustar filtros
          </button>
        </div>
      )}

      {/* ── Card ── */}
      {usuario && (
        <div className={styles.cardArea}>
          <div className={cardClassName}>
            {/* Photo */}
            <div className={styles.photoWrap}>
              <img src={usuario.photoURL || getAvatarDefault(usuario.sexo)} alt={usuario.nombre} className={styles.photo} referrerPolicy="no-referrer" />
              <div className={styles.photoOverlay} />

              {/* Name / age / meta on photo */}
              <div className={styles.photoInfo}>
                <div className={styles.photoNameRow}>
                  <h2 className={styles.photoName}>{usuario.nombre}</h2>
                  <span className={styles.photoAge}>{usuario.edad}{sexoLabel[usuario.sexo] ? ` · ${sexoLabel[usuario.sexo]}` : ""}</span>
                  {usuario.verificacionEstado === "verificado" && <BadgeVerificado />}
                </div>
                <div className={styles.photoMeta}>
                  {usuario.ciudad && (
                    <span className={styles.photoMetaItem}><IconPin /> {usuario.ciudad}</span>
                  )}
                </div>
              </div>
            </div>

            {/* Card body */}
            <div className={styles.cardBody}>
              {usuario.bio && <p className={styles.bio}>{usuario.bio}</p>}
              <div className={styles.infoRow}>
                {usuario.presupuesto && (
                  <span className={styles.infoChip}><IconEuro /> {usuario.presupuesto} €/mes</span>
                )}
                {sexoLabel[usuario.sexo] && (
                  <span className={styles.infoChip}>{sexoLabel[usuario.sexo]}</span>
                )}
                {usuario.edad && (
                  <span className={styles.infoChip}>{usuario.edad} años</span>
                )}
              </div>
              {miConvivencia && usuario.convivencia && (
                <>
                  <div className={styles.compatRow}>
                    <span className={styles.compatLabel}>{pct}% compatible</span>
                  </div>
                  <div className={styles.compatTrack}>
                    <div className={styles.compatFill} style={{ width: `${pct}%` }} />
                  </div>
                </>
              )}
              <div className={styles.cardBtnRow}>
                <button className={styles.btnReport2} onClick={(e) => { e.stopPropagation(); setUsuarioReportando(usuario); }}>
                  <IconWarning /> Reportar
                </button>
                <button className={styles.btnVerPerfil} onClick={(e) => { e.stopPropagation(); abrirDrawer(usuario); }}>
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                  Ver perfil
                </button>
              </div>
            </div>
          </div>

          {/* Action buttons */}
          <div className={styles.actions}>
            <button className={styles.btnDislike} onClick={handleDislike} disabled={procesando} aria-label="No me interesa">
              <IconXCircle />
            </button>
            <button className={styles.btnLike} onClick={handleLike} disabled={procesando} aria-label="Me interesa para compartir piso">
              <IconHeart />
            </button>
          </div>
        </div>
      )}

      {usuarioReportando && (
        <ReportarPerfil
          usuario={usuarioReportando}
          reportadorUid={auth.currentUser?.uid}
          onCerrar={() => setUsuarioReportando(null)}
        />
      )}

      {/* ── Lightbox ── */}
      {lightboxFoto && (
        <div className={styles.lightboxOverlay} onClick={() => setLightboxFoto(null)}>
          <button className={styles.lightboxClose} onClick={() => setLightboxFoto(null)}>
            <IconXCircle />
          </button>
          <img src={lightboxFoto} alt="" className={styles.lightboxImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}

      {/* ── Drawer perfil completo ── */}
      {drawerUsuario && (
        <div className={styles.drawerOverlay} onClick={cerrarDrawer}>
          <div className={styles.drawerSheet} onClick={(e) => e.stopPropagation()}>

            {/* Photo / Banner header */}
            <div
              className={styles.drawerPhotoWrap}
              style={!drawerUsuario.bannerURL && !drawerUsuario.photoURL
                ? { background: "linear-gradient(135deg, #f97316, #7c3aed)" }
                : undefined}
            >
              <img
                src={drawerUsuario.bannerURL || drawerUsuario.photoURL || getAvatarDefault(drawerUsuario.sexo)}
                alt={drawerUsuario.nombre}
                className={styles.drawerPhoto}
                referrerPolicy="no-referrer"
              />
              <div className={styles.drawerPhotoOverlay} />
              <button className={styles.drawerCloseBtn} onClick={cerrarDrawer}><IconXCircle /></button>
              <div className={styles.drawerPhotoInfo}>
                {drawerUsuario.bannerURL && (
                  <div style={{ marginBottom: "10px" }}>
                    <img
                      src={drawerUsuario.photoURL || getAvatarDefault(drawerUsuario.sexo)}
                      alt={drawerUsuario.nombre}
                      style={{ width: "56px", height: "56px", borderRadius: "50%", border: "2.5px solid rgba(255,255,255,0.9)", objectFit: "cover" }}
                      referrerPolicy="no-referrer"
                    />
                  </div>
                )}
                <div className={styles.drawerNameRow}>
                  <h2 className={styles.drawerName}>{drawerUsuario.nombre}</h2>
                  {drawerUsuario.verificacionEstado === "verificado" && <BadgeVerificado />}
                </div>
                <span className={styles.drawerAge}>
                  {drawerUsuario.edad} años
                  {drawerUsuario.sexo === "hombre" ? " · Hombre" : drawerUsuario.sexo === "mujer" ? " · Mujer" : drawerUsuario.sexo === "no_binario" ? " · No binario" : ""}
                </span>
                {drawerUsuario.ciudad && (
                  <div className={styles.drawerCity}><IconPin /> {drawerUsuario.ciudad}{drawerUsuario.provincia ? `, ${drawerUsuario.provincia}` : ""}</div>
                )}
              </div>
            </div>

            <div className={styles.drawerBody}>

              {/* Galería fotos */}
              {[drawerUsuario.foto1URL, drawerUsuario.foto2URL, drawerUsuario.foto3URL].filter(Boolean).length > 0 && (
                <div className={styles.drawerSection}>
                  <p className={styles.drawerSectionTitle}>Fotos</p>
                  <div className={styles.drawerGaleria}>
                    {[drawerUsuario.foto1URL, drawerUsuario.foto2URL, drawerUsuario.foto3URL]
                      .filter(Boolean)
                      .map((url, i) => (
                        <img key={i} src={url} alt={`foto ${i + 1}`} className={styles.drawerGaleriaFoto}
                          referrerPolicy="no-referrer"
                          onClick={() => setLightboxFoto(url)}
                        />
                      ))}
                  </div>
                </div>
              )}

              {/* Bio */}
              {drawerUsuario.bio && (
                <div className={styles.drawerSection}>
                  <p className={styles.drawerSectionTitle}>Sobre mí</p>
                  <p className={styles.drawerBio}>"{drawerUsuario.bio}"</p>
                </div>
              )}

              {/* Presupuesto + compatibilidad */}
              {(drawerUsuario.presupuesto || miConvivencia) && (
                <div className={styles.drawerSection}>
                  {drawerUsuario.presupuesto && (
                    <div className={styles.drawerConvRow}>
                      <span className={styles.drawerConvKey}>Presupuesto mensual</span>
                      <span className={styles.drawerConvVal}>{drawerUsuario.presupuesto} €/mes</span>
                    </div>
                  )}
                  {miConvivencia && drawerUsuario.convivencia && (() => {
                    const pctD = calcularCompatibilidad(miConvivencia, drawerUsuario.convivencia, miPerfil, drawerUsuario);
                    return (
                      <div className={styles.drawerConvRow}>
                        <span className={styles.drawerConvKey}>Compatibilidad</span>
                        <span className={styles.drawerConvVal} style={{ color: pctD >= 70 ? "#4ade80" : pctD >= 40 ? "#fbbf24" : "#f87171", fontWeight: 800 }}>
                          {pctD}%
                        </span>
                      </div>
                    );
                  })()}
                </div>
              )}

              {/* Test de convivencia */}
              {drawerUsuario.convivencia && (
                <div className={styles.drawerSection}>
                  <p className={styles.drawerSectionTitle}>Hábitos de convivencia</p>
                  {Object.entries(CONV_LABELS_KEYS).map(([key, label]) => {
                    const val = drawerUsuario.convivencia[key];
                    if (!val) return null;
                    const valLabel = CONV_LABELS_VALS[key]?.[String(val)] || String(val);
                    return (
                      <div key={key} className={styles.drawerConvRow}>
                        <span className={styles.drawerConvKey}>{label}</span>
                        <span className={styles.drawerConvVal}>{valLabel}</span>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* Valoraciones */}
              {!drawerLoading && drawerVals.length > 0 && (
                <div className={styles.drawerSection}>
                  <p className={styles.drawerSectionTitle}>Valoraciones</p>
                  <div className={styles.drawerRatingRow}>
                    <span className={styles.drawerRatingStars}>
                      {"★".repeat(Math.round(drawerRatingMedia))}{"☆".repeat(5 - Math.round(drawerRatingMedia))}
                    </span>
                    <span className={styles.drawerRatingNum}>{drawerRatingMedia}</span>
                    <span className={styles.drawerRatingCount}>({drawerVals.length} valoración{drawerVals.length !== 1 ? "es" : ""})</span>
                  </div>
                  {drawerTopEtiquetas.length > 0 && (
                    <div className={styles.drawerEtiquetasPills}>
                      {drawerTopEtiquetas.map((e) => (
                        <span key={e} className={styles.drawerEtiqueta}>{e}</span>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Sticky bottom actions */}
            <div className={styles.drawerActions}>
              <button className={styles.drawerBtnDislike}
                disabled={procesando}
                onClick={async () => {
                  await handleDislike();
                  cerrarDrawer();
                }}>
                <IconXCircle /> Pasar
              </button>
              <button className={styles.drawerBtnLike}
                disabled={procesando}
                onClick={async () => {
                  await handleLike();
                  cerrarDrawer();
                }}>
                <IconHeart /> Me interesa
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
