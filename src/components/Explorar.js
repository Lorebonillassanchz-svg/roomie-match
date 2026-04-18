import { useEffect, useState } from "react";
import { collection, getDocs, doc, getDoc, setDoc, addDoc, serverTimestamp } from "firebase/firestore";
import { auth, db } from "../firebase";
import ReportarPerfil from "./ReportarPerfil";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

function calcularCompatibilidad(mia, suya) {
  if (!mia || !suya) return 0;

  let puntos = 0;

  // Horario acostarse (20%)
  if (mia.horario_acostarse && suya.horario_acostarse) {
    const orden = { temprano: 0, normal: 1, tarde: 2 };
    const diff = Math.abs((orden[mia.horario_acostarse] ?? 1) - (orden[suya.horario_acostarse] ?? 1));
    puntos += diff === 0 ? 20 : diff === 1 ? 12 : 4;
  }

  // Limpieza (20%)
  if (mia.limpieza_propio && suya.tolerancia_limpieza) {
    const tolOrden = { bajo: 1, medio: 2, alto: 4, muy_alto: 5 };
    const tolMin = tolOrden[suya.tolerancia_limpieza] ?? 2;
    const diff = mia.limpieza_propio - tolMin;
    puntos += diff >= 0 ? 20 : diff === -1 ? 12 : 4;
  }

  // Ruido (15%)
  if (mia.nivel_ruido && suya.nivel_ruido) {
    const diff = Math.abs(mia.nivel_ruido - suya.nivel_ruido);
    puntos += diff === 0 ? 15 : diff === 1 ? 10 : diff === 2 ? 5 : 0;
  }

  // Visitas (15%)
  if (mia.frecuencia_visitas && suya.tolerancia_visitas) {
    const compatible = {
      pocas:    ["ok_siempre", "ok_aviso", "mal_laboral", "mal_siempre"],
      moderado: ["ok_siempre", "ok_aviso", "mal_laboral"],
      muchas:   ["ok_siempre"],
    };
    puntos += (compatible[mia.frecuencia_visitas] ?? []).includes(suya.tolerancia_visitas) ? 15 : 0;
  }

  // Tabaco (20%)
  if (mia.fumar && suya.fumar) {
    const tabaco = {
      no_fuma_no_tolera: { no_fuma_no_tolera: 20, no_fuma_tolera: 12, fuma_fuera: 4,  fuma_dentro: 0  },
      no_fuma_tolera:    { no_fuma_no_tolera: 12, no_fuma_tolera: 20, fuma_fuera: 15, fuma_dentro: 4  },
      fuma_fuera:        { no_fuma_no_tolera: 4,  no_fuma_tolera: 15, fuma_fuera: 20, fuma_dentro: 12 },
      fuma_dentro:       { no_fuma_no_tolera: 0,  no_fuma_tolera: 4,  fuma_fuera: 12, fuma_dentro: 20 },
    };
    puntos += tabaco[mia.fumar]?.[suya.fumar] ?? 0;
  }

  // Gastos (10%)
  if (mia.gastos_comunes && suya.gastos_comunes) {
    puntos += mia.gastos_comunes === suya.gastos_comunes ? 10 : 5;
  }

  return Math.min(100, Math.round(puntos));
}

function colorCompatibilidad(pct) {
  if (pct >= 70) return { bg: "#f0fdf4", text: "#16a34a", border: "#bbf7d0" };
  if (pct >= 40) return { bg: "#fefce8", text: "#ca8a04", border: "#fde68a" };
  return { bg: "#fef2f2", text: "#dc2626", border: "#fecaca" };
}

function matchId(uid1, uid2) {
  return [uid1, uid2].sort().join("_");
}

const FILTROS_VACIOS = { localidad: "", edadMin: "", edadMax: "", sexo: "todos" };

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

export default function Explorar({ setPantalla }) {
  const [usuarios, setUsuarios] = useState([]);
  const [usuariosFiltrados, setUsuariosFiltrados] = useState([]);
  const [indice, setIndice] = useState(0);
  const [miConvivencia, setMiConvivencia] = useState(null);
  const [loading, setLoading] = useState(true);
  const [animacion, setAnimacion] = useState(null);
  const [match, setMatch] = useState(null);
  const [matchPct, setMatchPct] = useState(0);
  const [verCompatibilidad, setVerCompatibilidad] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [panelFiltros, setPanelFiltros] = useState(false);
  const [filtros, setFiltros] = useState(FILTROS_VACIOS);
  const [filtrosTmp, setFiltrosTmp] = useState(FILTROS_VACIOS);
  const [usuarioReportando, setUsuarioReportando] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      const uid = auth.currentUser.uid;

      const [convSnap, usersSnap, likesSnap, dislikesSnap] = await Promise.all([
        getDoc(doc(db, "convivencia", uid)),
        getDocs(collection(db, "users")),
        getDocs(collection(db, "likes")),
        getDocs(collection(db, "dislikes")),
      ]);

      setMiConvivencia(convSnap.exists() ? convSnap.data() : null);

      // UIDs ya valorados
      const yaValorados = new Set();
      likesSnap.docs.forEach((d) => {
        if (d.data().from === uid) yaValorados.add(d.data().to);
      });
      dislikesSnap.docs.forEach((d) => {
        if (d.data().from === uid) yaValorados.add(d.data().to);
      });

      const otrosUids = usersSnap.docs
        .filter((d) => d.id !== uid && !yaValorados.has(d.id))
        .map((d) => d.id);

      const convDocs = await Promise.all(
        otrosUids.map((id) => getDoc(doc(db, "convivencia", id)))
      );

      const lista = usersSnap.docs
        .filter((d) => d.id !== uid && !yaValorados.has(d.id))
        .map((d, i) => ({
          ...d.data(),
          convivencia: convDocs[i].exists() ? convDocs[i].data() : null,
        }));

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
      if (f.localidad && !u.ciudad?.toLowerCase().includes(f.localidad.toLowerCase())) return false;
      if (f.edadMin && u.edad < Number(f.edadMin)) return false;
      if (f.edadMax && u.edad > Number(f.edadMax)) return false;
      if (f.sexo !== "todos" && u.sexo?.toLowerCase() !== f.sexo.toLowerCase()) return false;
      return true;
    });
    setUsuariosFiltrados(resultado);
    setPanelFiltros(false);
  };

  const limpiarFiltros = () => {
    setFiltrosTmp(FILTROS_VACIOS);
    setFiltros(FILTROS_VACIOS);
    setUsuariosFiltrados(usuarios);
    setIndice(0);
    setPanelFiltros(false);
  };

  const hayFiltrosActivos = filtros.localidad || filtros.edadMin || filtros.edadMax || filtros.sexo !== "todos";

  const handleLike = async () => {
    if (procesando) return;
    setProcesando(true);

    const uid = auth.currentUser.uid;
    const target = usuariosFiltrados[indice];
    const targetUid = target.uid;
    const likeDocId = `${uid}_${targetUid}`;

    await setDoc(doc(db, "likes", likeDocId), {
      from: uid,
      to: targetUid,
      timestamp: new Date().toISOString(),
    });

    // Comprobar like mutuo
    const likeInverso = await getDoc(doc(db, "likes", `${targetUid}_${uid}`));
    if (likeInverso.exists()) {
      const mid = matchId(uid, targetUid);
      await setDoc(doc(db, "matches", mid), {
        users: [uid, targetUid].sort(),
        timestamp: new Date().toISOString(),
      });

      // Guardar notificaciones de match para ambos usuarios
      try {
        const miSnap = await getDoc(doc(db, "users", uid));
        const miNombre = miSnap.exists() ? miSnap.data().nombre : "Alguien";
        const miFcmToken = miSnap.exists() ? miSnap.data().fcmToken : null;

        const notifs = [];
        if (miFcmToken) {
          notifs.push(addDoc(collection(db, "notificaciones"), {
            token: miFcmToken,
            title: "🎉 ¡Nuevo Match!",
            body: `Has hecho match con ${target.nombre}`,
            uid,
            leida: false,
            fecha: serverTimestamp(),
          }));
        }
        if (target.fcmToken) {
          notifs.push(addDoc(collection(db, "notificaciones"), {
            token: target.fcmToken,
            title: "🎉 ¡Nuevo Match!",
            body: `Has hecho match con ${miNombre}`,
            uid: targetUid,
            leida: false,
            fecha: serverTimestamp(),
          }));
        }
        await Promise.all(notifs);
      } catch (err) {
        console.error("[Explorar] Error guardando notificaciones de match:", err);
      }

      setMatchPct(calcularCompatibilidad(miConvivencia, target.convivencia));
      setVerCompatibilidad(false);
      setMatch(target);
      setProcesando(false);
      return;
    }

    animarYAvanzar("like");
    setProcesando(false);
  };

  const handleDislike = async () => {
    if (procesando) return;
    setProcesando(true);

    const uid = auth.currentUser.uid;
    const target = usuariosFiltrados[indice];
    const dislikeDocId = `${uid}_${target.uid}`;

    await setDoc(doc(db, "dislikes", dislikeDocId), {
      from: uid,
      to: target.uid,
      timestamp: new Date().toISOString(),
    });

    animarYAvanzar("dislike");
    setProcesando(false);
  };

  const animarYAvanzar = (tipo) => {
    setAnimacion(tipo);
    setTimeout(() => {
      setAnimacion(null);
      setIndice((prev) => prev + 1);
    }, 350);
  };

  const cerrarMatch = () => {
    setMatch(null);
    setVerCompatibilidad(false);
    setIndice((prev) => prev + 1);
  };

  if (loading) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
      </div>
    );
  }

  const sinPerfiles = usuariosFiltrados.length === 0;
  const todosVistos = !sinPerfiles && indice >= usuariosFiltrados.length;
  const usuario = !sinPerfiles && !todosVistos ? usuariosFiltrados[indice] : null;
  const pct = usuario ? calcularCompatibilidad(miConvivencia, usuario.convivencia) : 0;
  const color = colorCompatibilidad(pct);
  const cardStyle = {
    ...styles.card,
    ...(animacion === "like"    ? styles.swipeRight : {}),
    ...(animacion === "dislike" ? styles.swipeLeft  : {}),
  };

  return (
    <div style={styles.container}>
      {/* Panel de filtros */}
      {panelFiltros && (
        <div style={styles.panelOverlay} onClick={() => setPanelFiltros(false)}>
          <div style={styles.panel} onClick={(e) => e.stopPropagation()}>
            <div style={styles.panelHeader}>
              <h3 style={styles.panelTitle}>Filtros 🔍</h3>
              <button style={styles.panelClose} onClick={() => setPanelFiltros(false)}>✕</button>
            </div>

            <div style={styles.panelBody}>
              <div style={styles.panelField}>
                <label style={styles.panelLabel}>Localidad</label>
                <input
                  style={styles.panelInput}
                  placeholder="Ej: Madrid"
                  value={filtrosTmp.localidad}
                  onChange={(e) => setFiltrosTmp({ ...filtrosTmp, localidad: e.target.value })}
                />
              </div>

              <div style={styles.panelField}>
                <label style={styles.panelLabel}>Rango de edad</label>
                <div style={styles.rangoRow}>
                  <input
                    style={{ ...styles.panelInput, width: "80px" }}
                    placeholder="Mín"
                    type="number"
                    min="18"
                    max="99"
                    value={filtrosTmp.edadMin}
                    onChange={(e) => setFiltrosTmp({ ...filtrosTmp, edadMin: e.target.value })}
                  />
                  <span style={styles.rangoDash}>—</span>
                  <input
                    style={{ ...styles.panelInput, width: "80px" }}
                    placeholder="Máx"
                    type="number"
                    min="18"
                    max="99"
                    value={filtrosTmp.edadMax}
                    onChange={(e) => setFiltrosTmp({ ...filtrosTmp, edadMax: e.target.value })}
                  />
                </div>
              </div>

              <div style={styles.panelField}>
                <label style={styles.panelLabel}>Sexo</label>
                <div style={styles.sexoGrid}>
                  {["todos", "hombre", "mujer", "no binario"].map((op) => (
                    <button
                      key={op}
                      style={{
                        ...styles.sexoBtn,
                        ...(filtrosTmp.sexo === op ? styles.sexoBtnActivo : {}),
                      }}
                      onClick={() => setFiltrosTmp({ ...filtrosTmp, sexo: op })}
                    >
                      {op.charAt(0).toUpperCase() + op.slice(1)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div style={styles.panelFooter}>
              <button style={styles.btnLimpiar} onClick={limpiarFiltros}>Limpiar</button>
              <button style={styles.btnAplicar} onClick={() => aplicarFiltros(filtrosTmp)}>
                Aplicar filtros
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Overlay de interés mutuo */}
      {match && (
        <div style={styles.matchOverlay}>
          {verCompatibilidad ? (
            <div style={{ ...styles.matchBox, maxHeight: "80vh", overflowY: "auto" }}>
              <button style={styles.matchCloseBtn} onClick={() => setVerCompatibilidad(false)}>✕</button>
              <h2 style={{ ...styles.matchTitle, fontSize: "18px", marginBottom: "4px" }}>📊 Compatibilidad de convivencia</h2>
              <p style={{ margin: "0 0 16px 0", fontSize: "13px", color: "#6b7280", textAlign: "center" }}>
                Tú vs. {match.nombre}
              </p>
              <div style={styles.compatDetalleBar}>
                <span style={{ ...styles.compatDetallePct, color: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#ca8a04" : "#dc2626" }}>
                  {matchPct}% compatible
                </span>
                <div style={styles.compatDetalleTrack}>
                  <div style={{ ...styles.compatDetalleFill, width: `${matchPct}%`, background: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#ca8a04" : "#dc2626" }} />
                </div>
              </div>
              <div style={styles.compatDetalleGrid}>
                {Object.entries(LABELS_CONV).map(([key, label]) => {
                  const valMia  = miConvivencia?.[key];
                  const valSuya = match.convivencia?.[key];
                  if (!valMia && !valSuya) return null;
                  const coincide = String(valMia) === String(valSuya);
                  return (
                    <div key={key} style={styles.compatDetalleRow}>
                      <span style={styles.compatDetalleLabel}>{label}</span>
                      <div style={styles.compatDetalleValores}>
                        <span style={{ ...styles.compatDetalleVal, background: "#ede9fe", color: "#5b21b6" }}>{valMia ?? "—"}</span>
                        <span style={{ fontSize: "14px" }}>{coincide ? "✅" : "⚠️"}</span>
                        <span style={{ ...styles.compatDetalleVal, background: "#fce7f3", color: "#9d174d" }}>{valSuya ?? "—"}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
              <div style={styles.compatDetalleLeyenda}>
                <span style={{ ...styles.compatDetalleVal, background: "#ede9fe", color: "#5b21b6" }}>Tú</span>
                <span style={{ ...styles.compatDetalleVal, background: "#fce7f3", color: "#9d174d" }}>{match.nombre}</span>
              </div>
              <button style={styles.matchButtonSecundario} onClick={() => setVerCompatibilidad(false)}>
                ← Volver
              </button>
            </div>
          ) : (
            <div style={styles.matchBox}>
              <h2 style={styles.matchTitle}>¡Hay interés mutuo! 🏠</h2>
              <div style={styles.matchAvatars}>
                {esFirebasePhoto(auth.currentUser?.photoURL)
                  ? <img src={auth.currentUser.photoURL} alt="yo" style={styles.matchAvatar} referrerPolicy="no-referrer" />
                  : <div style={styles.matchAvatarFallback}><span style={styles.matchAvatarFallbackLetra}>{auth.currentUser?.displayName?.[0]?.toUpperCase() || "?"}</span></div>
                }
                <span style={{ fontSize: "30px" }}>🏠</span>
                {esFirebasePhoto(match.photoURL)
                  ? <img src={match.photoURL} alt={match.nombre} style={styles.matchAvatar} referrerPolicy="no-referrer" />
                  : <div style={styles.matchAvatarFallback}><span style={styles.matchAvatarFallbackLetra}>{match.nombre?.[0]?.toUpperCase() || "?"}</span></div>
                }
              </div>
              <p style={styles.matchSub}>
                Tú y <strong>{match.nombre}</strong> habéis mostrado interés en conoceros para compartir piso.
              </p>
              <p style={styles.matchCompatText}>
                Compatibilidad: <strong style={{ color: matchPct >= 70 ? "#16a34a" : matchPct >= 40 ? "#ca8a04" : "#dc2626" }}>{matchPct}%</strong>
              </p>
              <button style={styles.matchButton} onClick={() => { cerrarMatch(); setPantalla?.("matches"); }}>
                💬 Empezar chat
              </button>
              <button style={styles.matchButtonCompatibilidad} onClick={() => setVerCompatibilidad(true)}>
                📊 Ver compatibilidad
              </button>
              <button style={styles.matchButtonCerrar} onClick={cerrarMatch}>
                Cerrar
              </button>
            </div>
          )}
        </div>
      )}

      {/* Barra superior */}
      <div style={styles.topBar}>
        <button
          style={{ ...styles.filtrosBtn, ...(hayFiltrosActivos ? styles.filtrosBtnActivo : {}) }}
          onClick={() => { setFiltrosTmp(filtros); setPanelFiltros(true); }}
        >
          Filtros {hayFiltrosActivos ? "●" : "🔍"}
        </button>
        <div style={styles.counter}>
          {indice + 1} / {usuariosFiltrados.length}
        </div>
        <div style={{ width: "80px" }} />
      </div>

      {sinPerfiles && (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: "48px" }}>{hayFiltrosActivos ? "🔍" : "🏠"}</span>
          <p style={styles.emptyText}>
            {hayFiltrosActivos
              ? "Ningún perfil coincide con los filtros."
              : "No hay más perfiles disponibles por ahora."}
          </p>
          {hayFiltrosActivos && (
            <button style={styles.resetButton} onClick={limpiarFiltros}>Quitar filtros</button>
          )}
        </div>
      )}

      {todosVistos && (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: "48px" }}>🎉</span>
          <p style={styles.emptyText}>Has visto todos los perfiles disponibles.</p>
          <button style={styles.resetButton} onClick={() => setIndice(0)}>
            Volver a empezar
          </button>
        </div>
      )}

      {usuario && (
        <>
          <div style={cardStyle}>
            {/* Foto */}
            <div style={styles.photoWrapper}>
              {esFirebasePhoto(usuario.photoURL) ? (
                <img
                  src={usuario.photoURL}
                  alt={usuario.nombre}
                  style={styles.photo}
                  referrerPolicy="no-referrer"
                />
              ) : (
                <div style={styles.photoFallback}>
                  <span style={styles.photoFallbackLetra}>{usuario.nombre?.[0]?.toUpperCase() || "?"}</span>
                </div>
              )}
              <div style={{ ...styles.compatBadge, background: color.bg, color: color.text, borderColor: color.border }}>
                {pct}% compatible
              </div>
            </div>

            {/* Info */}
            <div style={styles.info}>
              <div style={styles.nameRow}>
                <h2 style={styles.nombre}>{usuario.nombre}</h2>
                {usuario.verificacionEstado === "verificado" && (
                  <span style={styles.verifBadge}>✅</span>
                )}
                <span style={styles.edad}>{usuario.edad} años</span>
              </div>
              <div style={styles.chipsRow}>
                <span style={styles.chip}>📍 {usuario.ciudad}</span>
                <span style={styles.chip}>💶 {usuario.presupuesto} €/mes</span>
              </div>
              {usuario.bio && <p style={styles.bio}>"{usuario.bio}"</p>}
              <div style={styles.compatSection}>
                <div style={styles.compatHeader}>
                  <span style={styles.compatLabel}>Compatibilidad de convivencia</span>
                  <span style={{ ...styles.compatPct, color: color.text }}>{pct}%</span>
                </div>
                <div style={styles.barTrack}>
                  <div style={{
                    ...styles.barFill,
                    width: `${pct}%`,
                    background: pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626",
                  }} />
                </div>
              </div>
              <button
                style={styles.reportarBtn}
                onClick={(e) => { e.stopPropagation(); setUsuarioReportando(usuario); }}
                aria-label="Reportar perfil"
              >
                ⚠️ Reportar
              </button>
            </div>
          </div>

          <div style={styles.buttons}>
            <button
              style={{ ...styles.dislikeButton, opacity: procesando ? 0.5 : 1 }}
              onClick={handleDislike}
              disabled={procesando}
              aria-label="No me interesa"
            >
              ❌
            </button>
            <button
              style={{ ...styles.likeButton, opacity: procesando ? 0.5 : 1 }}
              onClick={handleLike}
              disabled={procesando}
              aria-label="Me interesa para compartir piso"
            >
              💚
            </button>
          </div>
          <p style={styles.hint}>❌ Pasar &nbsp;·&nbsp; 💚 Me interesa para compartir piso</p>
        </>
      )}

      {usuarioReportando && (
        <ReportarPerfil
          usuario={usuarioReportando}
          reportadorUid={auth.currentUser?.uid}
          onCerrar={() => setUsuarioReportando(null)}
        />
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px 16px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  fullCenter: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "5px solid rgba(255,255,255,0.3)",
    borderTop: "5px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  emptyBox: {
    background: "#fff",
    borderRadius: "28px",
    padding: "48px 36px",
    textAlign: "center",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    maxWidth: "320px",
    width: "100%",
  },
  emptyText: {
    color: "#6b7280",
    fontSize: "15px",
    marginTop: "12px",
  },
  resetButton: {
    marginTop: "20px",
    padding: "12px 28px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#fff",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  counter: {
    color: "rgba(255,255,255,0.8)",
    fontSize: "13px",
    fontWeight: "600",
    marginBottom: "14px",
    letterSpacing: "0.5px",
  },
  card: {
    background: "#ffffff",
    borderRadius: "28px",
    maxWidth: "380px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.25)",
    overflow: "hidden",
    transition: "transform 0.35s ease, opacity 0.35s ease",
  },
  swipeRight: {
    transform: "translateX(120%) rotate(15deg)",
    opacity: 0,
  },
  swipeLeft: {
    transform: "translateX(-120%) rotate(-15deg)",
    opacity: 0,
  },
  photoWrapper: {
    position: "relative",
    width: "100%",
    height: "260px",
    background: "#f3f4f6",
  },
  photo: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoFallback: {
    width: "100%",
    height: "100%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
  },
  photoFallbackLetra: {
    fontSize: "72px",
    fontWeight: "800",
    color: "#ffffff",
  },
  compatBadge: {
    position: "absolute",
    top: "14px",
    right: "14px",
    padding: "5px 12px",
    borderRadius: "20px",
    border: "1.5px solid",
    fontSize: "12px",
    fontWeight: "700",
  },
  info: {
    padding: "20px 22px 24px",
  },
  nameRow: {
    display: "flex",
    alignItems: "baseline",
    gap: "10px",
    marginBottom: "10px",
  },
  nombre: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#1a1a2e",
  },
  edad: {
    fontSize: "16px",
    color: "#6b7280",
    fontWeight: "500",
  },
  verifBadge: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#eff6ff",
    border: "1.5px solid #93c5fd",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: "700",
    padding: "2px 7px",
    borderRadius: "20px",
    lineHeight: 1,
  },
  chipsRow: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    marginBottom: "12px",
  },
  chip: {
    background: "#f5f3ff",
    color: "#5b21b6",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 12px",
    borderRadius: "20px",
  },
  bio: {
    fontSize: "13px",
    color: "#6b7280",
    fontStyle: "italic",
    lineHeight: "1.6",
    margin: "0 0 16px 0",
  },
  compatSection: {
    marginTop: "4px",
  },
  compatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  compatLabel: {
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: "600",
  },
  compatPct: {
    fontSize: "13px",
    fontWeight: "700",
  },
  barTrack: {
    width: "100%",
    height: "6px",
    background: "#e5e7eb",
    borderRadius: "99px",
    overflow: "hidden",
  },
  barFill: {
    height: "100%",
    borderRadius: "99px",
    transition: "width 0.6s ease",
  },
  buttons: {
    display: "flex",
    gap: "32px",
    marginTop: "28px",
  },
  dislikeButton: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "2px solid #fecaca",
    background: "#fff",
    fontSize: "26px",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(220,38,38,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  likeButton: {
    width: "64px",
    height: "64px",
    borderRadius: "50%",
    border: "2px solid #bbf7d0",
    background: "#fff",
    fontSize: "26px",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(22,163,74,0.15)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  hint: {
    marginTop: "14px",
    fontSize: "12px",
    color: "rgba(255,255,255,0.6)",
    fontWeight: "500",
  },
  // Match overlay
  matchOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.7)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "24px",
  },
  matchBox: {
    background: "#ffffff",
    borderRadius: "28px",
    padding: "40px 32px 28px",
    maxWidth: "360px",
    width: "100%",
    textAlign: "center",
    boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
    position: "relative",
  },
  matchTitle: {
    margin: "0 0 10px 0",
    fontSize: "28px",
    fontWeight: "800",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
  },
  matchSub: {
    margin: "0 0 24px 0",
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.5",
  },
  matchAvatars: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "16px",
    marginBottom: "28px",
  },
  matchAvatar: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #667eea",
    boxShadow: "0 4px 14px rgba(102,126,234,0.3)",
  },
  matchCloseBtn: {
    position: "absolute",
    top: "14px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px",
  },
  matchCompatText: {
    margin: "0 0 20px 0",
    fontSize: "15px",
    color: "#374151",
  },
  matchAvatarFallback: {
    width: "72px",
    height: "72px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid #667eea",
  },
  matchAvatarFallbackLetra: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#ffffff",
  },
  matchButton: {
    width: "100%",
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
    marginBottom: "10px",
  },
  matchButtonCompatibilidad: {
    width: "100%",
    padding: "13px",
    borderRadius: "14px",
    border: "2px solid #7c3aed",
    background: "#ffffff",
    color: "#7c3aed",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    marginBottom: "10px",
  },
  matchButtonSecundario: {
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    border: "2px solid #7c3aed",
    background: "#ffffff",
    color: "#7c3aed",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "8px",
  },
  matchButtonCerrar: {
    width: "100%",
    padding: "10px",
    borderRadius: "14px",
    border: "none",
    background: "none",
    color: "#9ca3af",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  // Desglose compatibilidad
  compatDetalleBar: {
    marginBottom: "16px",
    width: "100%",
  },
  compatDetallePct: {
    fontSize: "16px",
    fontWeight: "800",
    display: "block",
    textAlign: "center",
    marginBottom: "8px",
  },
  compatDetalleTrack: {
    width: "100%",
    height: "8px",
    background: "#e5e7eb",
    borderRadius: "99px",
    overflow: "hidden",
  },
  compatDetalleFill: {
    height: "100%",
    borderRadius: "99px",
    transition: "width 0.5s ease",
  },
  compatDetalleGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    width: "100%",
    marginBottom: "12px",
  },
  compatDetalleRow: {
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    padding: "10px 12px",
    background: "#f9fafb",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
  },
  compatDetalleLabel: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#6b7280",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
  },
  compatDetalleValores: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    flexWrap: "wrap",
  },
  compatDetalleVal: {
    fontSize: "12px",
    fontWeight: "600",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  compatDetalleLeyenda: {
    display: "flex",
    gap: "10px",
    justifyContent: "center",
    marginBottom: "12px",
  },
  topBar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    maxWidth: "380px",
    marginBottom: "14px",
  },
  filtrosBtn: {
    padding: "6px 14px",
    borderRadius: "20px",
    border: "1.5px solid rgba(255,255,255,0.5)",
    background: "rgba(255,255,255,0.15)",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
    backdropFilter: "blur(4px)",
  },
  filtrosBtnActivo: {
    background: "rgba(255,255,255,0.9)",
    color: "#7c3aed",
    border: "1.5px solid #ffffff",
  },
  // Panel de filtros
  panelOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.5)",
    zIndex: 998,
    display: "flex",
    alignItems: "stretch",
    justifyContent: "flex-start",
  },
  panel: {
    width: "280px",
    maxWidth: "85vw",
    background: "#ffffff",
    height: "100%",
    display: "flex",
    flexDirection: "column",
    boxShadow: "4px 0 24px rgba(0,0,0,0.2)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  panelHeader: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "20px 20px 16px",
    borderBottom: "1px solid #e5e7eb",
  },
  panelTitle: {
    margin: 0,
    fontSize: "18px",
    fontWeight: "800",
    color: "#1a1a2e",
  },
  panelClose: {
    background: "none",
    border: "none",
    fontSize: "18px",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "4px",
  },
  panelBody: {
    flex: 1,
    padding: "20px",
    display: "flex",
    flexDirection: "column",
    gap: "20px",
    overflowY: "auto",
  },
  panelField: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  panelLabel: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#374151",
  },
  panelInput: {
    padding: "10px 12px",
    border: "2px solid #e5e7eb",
    borderRadius: "10px",
    fontSize: "14px",
    color: "#1a1a2e",
    outline: "none",
    background: "#fafafa",
    boxSizing: "border-box",
    width: "100%",
  },
  rangoRow: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
  },
  rangoDash: {
    color: "#9ca3af",
    fontSize: "16px",
  },
  sexoGrid: {
    display: "grid",
    gridTemplateColumns: "1fr 1fr",
    gap: "8px",
  },
  sexoBtn: {
    padding: "9px 4px",
    borderRadius: "10px",
    border: "2px solid #e5e7eb",
    background: "#fafafa",
    color: "#374151",
    fontSize: "13px",
    fontWeight: "500",
    cursor: "pointer",
  },
  sexoBtnActivo: {
    border: "2px solid #7c3aed",
    background: "#f5f3ff",
    color: "#7c3aed",
    fontWeight: "700",
  },
  panelFooter: {
    display: "flex",
    gap: "10px",
    padding: "16px 20px 24px",
    borderTop: "1px solid #e5e7eb",
  },
  btnLimpiar: {
    flex: 1,
    padding: "12px",
    borderRadius: "12px",
    border: "2px solid #e5e7eb",
    background: "#ffffff",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  btnAplicar: {
    flex: 2,
    padding: "12px",
    borderRadius: "12px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(102,126,234,0.35)",
  },
  reportarBtn: {
    marginTop: "12px",
    padding: "6px 12px",
    borderRadius: "20px",
    border: "1px solid #e5e7eb",
    background: "transparent",
    color: "#9ca3af",
    fontSize: "11px",
    fontWeight: "600",
    cursor: "pointer",
    alignSelf: "flex-end",
  },
};
