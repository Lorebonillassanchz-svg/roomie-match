import { useEffect, useRef, useState } from "react";
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, onSnapshot, orderBy, serverTimestamp,
  setDoc, updateDoc, limit, arrayUnion,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import ReportarPerfil from "./ReportarPerfil";
import Valoracion from "./Valoracion";
import { getAvatarDefault } from "../utils/avatarDefault";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

/* ── SVG Icons ── */
const IconPin = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconBack = () => (
  <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);
const IconSend = () => (
  <svg viewBox="0 0 24 24" width="18" height="18" fill="white">
    <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z"/>
  </svg>
);
const IconCheck = () => (
  <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"/>
  </svg>
);
const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

function EmptyMatchSVG() {
  return (
    <svg width="120" height="90" viewBox="0 0 140 100" fill="none" xmlns="http://www.w3.org/2000/svg">
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

function calcularCompatibilidad(mia, suya) {
  if (!mia || !suya) return null;
  let puntos = 0;
  if (mia.horario_acostarse && suya.horario_acostarse) {
    const orden = { temprano: 0, normal: 1, tarde: 2 };
    const diff = Math.abs((orden[mia.horario_acostarse] ?? 1) - (orden[suya.horario_acostarse] ?? 1));
    puntos += diff === 0 ? 20 : diff === 1 ? 12 : 4;
  }
  if (mia.limpieza_propio && suya.tolerancia_limpieza) {
    const tolOrden = { bajo: 1, medio: 2, alto: 4, muy_alto: 5 };
    const diff = mia.limpieza_propio - (tolOrden[suya.tolerancia_limpieza] ?? 2);
    puntos += diff >= 0 ? 20 : diff === -1 ? 12 : 4;
  }
  if (mia.nivel_ruido && suya.nivel_ruido) {
    const diff = Math.abs(mia.nivel_ruido - suya.nivel_ruido);
    puntos += diff === 0 ? 15 : diff === 1 ? 10 : diff === 2 ? 5 : 0;
  }
  if (mia.frecuencia_visitas && suya.tolerancia_visitas) {
    const compatible = { pocas: ["ok_siempre","ok_aviso","mal_laboral","mal_siempre"], moderado: ["ok_siempre","ok_aviso","mal_laboral"], muchas: ["ok_siempre"] };
    puntos += (compatible[mia.frecuencia_visitas] ?? []).includes(suya.tolerancia_visitas) ? 15 : 0;
  }
  if (mia.fumar && suya.fumar) {
    const tabaco = {
      no_fuma_no_tolera: { no_fuma_no_tolera:20, no_fuma_tolera:12, fuma_fuera:4,  fuma_dentro:0  },
      no_fuma_tolera:    { no_fuma_no_tolera:12, no_fuma_tolera:20, fuma_fuera:15, fuma_dentro:4  },
      fuma_fuera:        { no_fuma_no_tolera:4,  no_fuma_tolera:15, fuma_fuera:20, fuma_dentro:12 },
      fuma_dentro:       { no_fuma_no_tolera:0,  no_fuma_tolera:4,  fuma_fuera:12, fuma_dentro:20 },
    };
    puntos += tabaco[mia.fumar]?.[suya.fumar] ?? 0;
  }
  if (mia.gastos_comunes && suya.gastos_comunes) puntos += mia.gastos_comunes === suya.gastos_comunes ? 10 : 5;
  return Math.min(100, Math.round(puntos));
}

function fmtTime(ts) {
  if (!ts) return "";
  const date = ts.seconds ? new Date(ts.seconds * 1000) : new Date(ts);
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  if (diffDays === 0) return date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 1) return "Ayer";
  if (diffDays < 7) return date.toLocaleDateString([], { weekday: "short" });
  return date.toLocaleDateString([], { day: "2-digit", month: "2-digit" });
}

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatAbierto, setChatAbierto] = useState(null);
  const [menuMatchId, setMenuMatchId] = useState(null);
  const [confirmMatchId, setConfirmMatchId] = useState(null);
  const [swipingId, setSwipingId] = useState(null);
  const [swipeOffset, setSwipeOffset] = useState(0);
  const swipeStartX = useRef(null);

  useEffect(() => {
    const cargar = async () => {
      const uid = auth.currentUser.uid;
      const q = query(collection(db, "matches"), where("users", "array-contains", uid));
      const snap = await getDocs(q);

      const lista = (await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          if (data.borradoPor && data.borradoPor.includes(uid)) return null;
          const otroUid = data.users.find((u) => u !== uid);
          const [userSnap, lastMsgSnap] = await Promise.all([
            getDoc(doc(db, "users", otroUid)),
            getDocs(query(
              collection(db, "mensajes", d.id, "chats"),
              orderBy("timestamp", "desc"),
              limit(1)
            )),
          ]);
          const lastMsg = lastMsgSnap.docs[0]?.data() ?? null;
          return {
            matchId: d.id,
            otroUsuario: userSnap.exists()
              ? { uid: otroUid, ...userSnap.data() }
              : { uid: otroUid, nombre: "Usuario", ciudad: "" },
            timestamp: data.timestamp,
            tieneNoLeidos: !!data[`unread_${uid}`],
            lastMsg,
          };
        })
      )).filter(Boolean);

      setMatches(lista.sort((a, b) => {
        const ta = a.lastMsg?.timestamp?.seconds ?? 0;
        const tb = b.lastMsg?.timestamp?.seconds ?? 0;
        return tb - ta || (b.timestamp > a.timestamp ? 1 : -1);
      }));
      setLoading(false);
    };
    cargar();
  }, []);

  const eliminarConversacion = async (matchId) => {
    const uid = auth.currentUser.uid;
    await updateDoc(doc(db, "matches", matchId), { borradoPor: arrayUnion(uid) }).catch(() => {});
    setMatches((prev) => prev.filter((m) => m.matchId !== matchId));
    setConfirmMatchId(null);
    setMenuMatchId(null);
  };

  const abrirChat = async (matchId, otroUsuario) => {
    const uid = auth.currentUser.uid;
    await updateDoc(doc(db, "matches", matchId), { [`unread_${uid}`]: false }).catch(() => {});
    setMatches((prev) =>
      prev.map((m) => m.matchId === matchId ? { ...m, tieneNoLeidos: false } : m)
    );
    setChatAbierto({ matchId, otroUsuario });
  };

  if (loading) {
    return (
      <div style={{ minHeight: "100vh", background: "var(--app-bg)", display: "flex", alignItems: "center", justifyContent: "center", transition: "background 0.3s" }}>
        <div style={s.spinner} />
      </div>
    );
  }

  if (chatAbierto) {
    return (
      <Chat
        matchId={chatAbierto.matchId}
        otroUsuario={chatAbierto.otroUsuario}
        onVolver={() => setChatAbierto(null)}
      />
    );
  }

  const activas = matches.length;

  return (
    <div style={s.container}>
      <div style={s.header}>
        <h1 style={s.headerTitle}>Mensajes</h1>
        <p style={s.headerSub}>
          {activas === 0
            ? "Aún no tienes conexiones"
            : `${activas} conexión${activas !== 1 ? "es" : ""} activa${activas !== 1 ? "s" : ""}`}
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={s.emptyBox}>
          <div style={{ color: "var(--app-text-muted)" }}><EmptyMatchSVG /></div>
          <p style={s.emptyTitle}>Sin conexiones todavía</p>
          <p style={s.emptyText}>Sigue explorando para encontrar tu roomie ideal.</p>
        </div>
      ) : (
        <div style={s.lista} onClick={() => setMenuMatchId(null)}>
          {matches.map(({ matchId, otroUsuario, tieneNoLeidos, lastMsg }) => {
            const isSwipingThis = swipingId === matchId;
            const offset = isSwipingThis ? swipeOffset : 0;
            return (
              <div key={matchId} style={{ position: "relative", overflow: "hidden", borderRadius: "16px" }}>
                {/* Delete button revealed on swipe */}
                <div style={{
                  position: "absolute", right: 0, top: 0, bottom: 0, width: "80px",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  background: "#ef4444", borderRadius: "16px",
                }}>
                  <button
                    style={{ background: "none", border: "none", color: "#fff", fontWeight: "700", fontSize: "12px", cursor: "pointer" }}
                    onClick={(e) => { e.stopPropagation(); setConfirmMatchId(matchId); }}
                  >
                    Eliminar
                  </button>
                </div>

                {/* Match card */}
                <div style={{ position: "relative", display: "flex", alignItems: "center", transform: `translateX(${offset}px)`, transition: isSwipingThis ? "none" : "transform 0.3s ease" }}>
                  <button
                    style={{ ...s.matchCard, ...(tieneNoLeidos ? s.matchCardUnread : {}), flex: 1 }}
                    onClick={() => { if (Math.abs(offset) < 10) abrirChat(matchId, otroUsuario); }}
                    onTouchStart={(e) => { swipeStartX.current = e.touches[0].clientX; setSwipingId(matchId); setSwipeOffset(0); }}
                    onTouchMove={(e) => {
                      if (swipingId !== matchId) return;
                      const delta = e.touches[0].clientX - swipeStartX.current;
                      if (delta < 0) setSwipeOffset(Math.max(delta, -100));
                    }}
                    onTouchEnd={() => {
                      if (swipeOffset < -60) setConfirmMatchId(matchId);
                      setSwipingId(null);
                      setSwipeOffset(0);
                    }}
                  >
                    <div style={s.avatarRing}>
                      <div style={s.avatarInner}>
                        <img src={otroUsuario.photoURL || getAvatarDefault(otroUsuario.sexo)} alt={otroUsuario.nombre} style={s.avatarImg} referrerPolicy="no-referrer" />
                      </div>
                      {otroUsuario.online !== undefined && (
                        <div style={{
                          ...s.onlineDot,
                          background: otroUsuario.online ? "#22c55e" : "#94a3b8",
                          opacity: otroUsuario.online ? 1 : 0.45,
                        }} />
                      )}
                    </div>
                    <div style={s.matchInfo}>
                      <div style={s.matchInfoTop}>
                        <span style={{ ...s.matchNombre, fontWeight: tieneNoLeidos ? "800" : "600" }}>
                          {otroUsuario.nombre}
                        </span>
                        {lastMsg?.timestamp && (
                          <span style={s.matchTimestamp}>{fmtTime(lastMsg.timestamp)}</span>
                        )}
                      </div>
                      <div style={s.matchInfoBottom}>
                        <span style={{
                          ...s.matchPreview,
                          fontWeight: tieneNoLeidos ? "600" : "400",
                          color: tieneNoLeidos ? "var(--app-text)" : "var(--app-text-muted)",
                        }}>
                          {lastMsg
                            ? `${lastMsg.from === auth.currentUser.uid ? "Tú: " : ""}${lastMsg.texto}`
                            : <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}><IconPin /> {otroUsuario.ciudad}</span>
                          }
                        </span>
                        {tieneNoLeidos && <div style={s.unreadDot} />}
                      </div>
                    </div>
                  </button>

                  {/* Three-dots menu button (desktop) */}
                  <div style={{ position: "relative", flexShrink: 0 }}>
                    <button
                      style={s.dotsBtn}
                      onClick={(e) => { e.stopPropagation(); setMenuMatchId(menuMatchId === matchId ? null : matchId); }}
                      aria-label="Opciones"
                    >
                      ⋮
                    </button>
                    {menuMatchId === matchId && (
                      <div style={s.menuDropdown} onClick={(e) => e.stopPropagation()}>
                        <button style={s.menuItem} onClick={() => { setMenuMatchId(null); setConfirmMatchId(matchId); }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                          Eliminar conversación
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirm dialog */}
      {confirmMatchId && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 2000, padding: "20px" }}>
          <div style={{ background: "var(--app-surface)", borderRadius: "20px", padding: "28px 24px", maxWidth: "320px", width: "100%", boxShadow: "0 20px 60px rgba(0,0,0,0.4)", fontFamily: "'Inter','Segoe UI',sans-serif" }}>
            <h3 style={{ margin: "0 0 10px", fontSize: "17px", fontWeight: "800", color: "var(--app-text)" }}>¿Eliminar esta conversación?</h3>
            <p style={{ margin: "0 0 22px", fontSize: "14px", color: "var(--app-text-muted)", lineHeight: "1.5" }}>Los mensajes se borrarán solo para ti. Tu conexión con esta persona no se verá afectada.</p>
            <div style={{ display: "flex", gap: "10px" }}>
              <button
                style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "1.5px solid var(--app-border)", background: "transparent", color: "var(--app-text-muted)", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => setConfirmMatchId(null)}
              >
                Cancelar
              </button>
              <button
                style={{ flex: 1, padding: "12px", borderRadius: "12px", border: "none", background: "#ef4444", color: "#fff", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }}
                onClick={() => eliminarConversacion(confirmMatchId)}
              >
                Eliminar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function fmtPresencia(online, ultimaVez) {
  if (online) return { texto: "En línea", color: "#22c55e" };
  if (!ultimaVez) return null;
  const date = new Date(ultimaVez);
  if (isNaN(date)) return null;
  const now = new Date();
  const diffDays = Math.floor((now - date) / 86400000);
  const hora = date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  if (diffDays === 0) return { texto: `Última vez hoy a las ${hora}`, color: "var(--app-text-muted)" };
  const dd = String(date.getDate()).padStart(2, "0");
  const mm = String(date.getMonth() + 1).padStart(2, "0");
  return { texto: `Última vez el ${dd}/${mm}`, color: "var(--app-text-muted)" };
}

function Chat({ matchId, otroUsuario, onVolver }) {
  const [mensajes, setMensajes]             = useState([]);
  const [texto, setTexto]                   = useState("");
  const [enviando, setEnviando]             = useState(false);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  const [presenciaOtro, setPresenciaOtro]   = useState({ online: otroUsuario.online, ultimaVez: otroUsuario.ultimaVez });
  const [modalPerfil, setModalPerfil]       = useState(false);
  const [convivenciaOtro, setConvivenciaOtro] = useState(null);
  const [miConvivencia, setMiConvivencia]   = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [fotoAmpliada, setFotoAmpliada]     = useState(null);
  const [reportando, setReportando]         = useState(false);
  const [modalValorar, setModalValorar]     = useState(false);
  const [etiquetasOtro, setEtiquetasOtro]   = useState([]);
  const bottomRef       = useRef(null);
  const typingTimeoutRef = useRef(null);
  const miNombreRef     = useRef(null);
  const uid = auth.currentUser.uid;

  const abrirModalPerfil = async () => {
    setModalPerfil(true);
    if (convivenciaOtro !== null || miConvivencia !== null) return;
    setCargandoPerfil(true);
    const [convOtroSnap, miConvSnap, valSnap] = await Promise.all([
      getDoc(doc(db, "convivencia", otroUsuario.uid)),
      getDoc(doc(db, "convivencia", uid)),
      getDocs(query(collection(db, "valoraciones"), where("destinatarioUid", "==", otroUsuario.uid))),
    ]);
    setConvivenciaOtro(convOtroSnap.exists() ? convOtroSnap.data() : undefined);
    setMiConvivencia(miConvSnap.exists() ? miConvSnap.data() : undefined);
    const conteo = {};
    valSnap.docs.forEach((d) => (d.data().etiquetas || []).forEach((e) => { conteo[e] = (conteo[e] || 0) + 1; }));
    setEtiquetasOtro(Object.entries(conteo).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([e]) => e));
    setCargandoPerfil(false);
  };

  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) miNombreRef.current = snap.data().nombre;
    }).catch(() => {});
  }, [uid]);

  useEffect(() => {
    const q = query(collection(db, "mensajes", matchId, "chats"), orderBy("timestamp", "asc"));
    const unsub = onSnapshot(q, (snap) => {
      setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [matchId]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "typing", matchId), (snap) => {
      setOtroEscribiendo(snap.exists() ? !!snap.data()[otroUsuario.uid] : false);
    });
    return () => unsub();
  }, [matchId, otroUsuario.uid]);

  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      setDoc(doc(db, "typing", matchId), { [uid]: false }, { merge: true }).catch(() => {});
    };
  }, [matchId, uid]);

  useEffect(() => {
    const unsub = onSnapshot(doc(db, "users", otroUsuario.uid), (snap) => {
      if (snap.exists()) {
        const data = snap.data();
        setPresenciaOtro({ online: data.online, ultimaVez: data.ultimaVez });
      }
    });
    return () => unsub();
  }, [otroUsuario.uid]);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [mensajes, otroEscribiendo]);

  const handleTyping = (e) => {
    setTexto(e.target.value);
    setDoc(doc(db, "typing", matchId), { [uid]: true }, { merge: true }).catch(() => {});
    clearTimeout(typingTimeoutRef.current);
    typingTimeoutRef.current = setTimeout(() => {
      setDoc(doc(db, "typing", matchId), { [uid]: false }, { merge: true }).catch(() => {});
    }, 2000);
  };

  const enviar = async () => {
    const txt = texto.trim();
    if (!txt || enviando) return;
    setEnviando(true);
    setTexto("");
    clearTimeout(typingTimeoutRef.current);
    setDoc(doc(db, "typing", matchId), { [uid]: false }, { merge: true }).catch(() => {});
    try {
      await addDoc(collection(db, "mensajes", matchId, "chats"), {
        texto: txt, from: uid, leido: false, timestamp: serverTimestamp(),
      });
      await updateDoc(doc(db, "matches", matchId), { [`unread_${otroUsuario.uid}`]: true }).catch((err) => {
        console.error("[Matches] Error al actualizar unread:", err);
      });
      try {
        const destSnap = await getDoc(doc(db, "users", otroUsuario.uid));
        const fcmToken = destSnap.exists() ? destSnap.data().fcmToken : null;
        if (fcmToken) {
          const miNombre = miNombreRef.current || auth.currentUser.displayName || "Alguien";
          await addDoc(collection(db, "notificaciones"), {
            token: fcmToken,
            title: "Nuevo mensaje",
            body: `${miNombre} te ha enviado un mensaje`,
            uid: otroUsuario.uid,
            leida: false,
            fecha: serverTimestamp(),
          });
        }
      } catch (notifErr) {
        console.error("[Matches] Error guardando notificación:", notifErr);
      }
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  };

  return (
    <>
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .typing-dot {
          width: 7px; height: 7px; border-radius: 50%;
          background: var(--app-text-muted, #9ca3af);
          animation: typing-bounce 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
        .chat-action-btn:hover { border-color: #f97316 !important; color: #f97316 !important; }
      `}</style>

      <div style={s.chatWrapper}>
        {/* TopBar */}
        <div style={s.chatTopBar}>
          <button style={s.backBtn} onClick={onVolver} aria-label="Volver"><IconBack /></button>
          <button style={s.chatTopClickable} onClick={abrirModalPerfil}>
            <div style={s.chatTopAvatarRing}>
              <div style={s.chatTopAvatarInner}>
                <img src={otroUsuario.photoURL || getAvatarDefault(otroUsuario.sexo)} alt={otroUsuario.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
              </div>
            </div>
            <div style={s.chatTopInfo}>
              <span style={s.chatTopNombre}>{otroUsuario.nombre}</span>
              <span style={s.chatTopSub}>
                {otroEscribiendo ? (
                  <span style={{ color: "#f97316" }}>Escribiendo...</span>
                ) : (() => {
                  const p = fmtPresencia(presenciaOtro.online, presenciaOtro.ultimaVez);
                  if (p) return <span style={{ color: p.color }}>{p.texto}</span>;
                  if (otroUsuario.ciudad) return <span style={{ display: "inline-flex", alignItems: "center", gap: "3px" }}><IconPin />{otroUsuario.ciudad}</span>;
                  return null;
                })()}
              </span>
            </div>
          </button>
          <div style={{ display: "flex", gap: "6px", flexShrink: 0 }}>
            <button className="chat-action-btn" style={s.chatActionBtn} onClick={abrirModalPerfil}>Ver perfil</button>
            <button className="chat-action-btn" style={s.chatActionBtn} onClick={() => setModalValorar(true)}>Valorar</button>
          </div>
        </div>

        {/* Mensajes */}
        <div style={s.mensajesArea}>
          {mensajes.length === 0 && (
            <div style={s.chatVacio}>
              <p style={s.chatVacioText}>Tenéis conexión — rompe el hielo</p>
            </div>
          )}
          {mensajes.map((m) => {
            const esMio = m.from === uid;
            return (
              <div key={m.id} style={{ ...s.msgRow, justifyContent: esMio ? "flex-end" : "flex-start" }}>
                {!esMio && (
                  <div style={s.msgAvatar}>
                    <img src={otroUsuario.photoURL || getAvatarDefault(otroUsuario.sexo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                  </div>
                )}
                <div style={{ ...s.burbuja, ...(esMio ? s.burbujaPropia : s.burbujaAjena) }}>
                  <span style={{ ...s.burbujaTexto, color: esMio ? "#ffffff" : "var(--app-text)" }}>{m.texto}</span>
                  {m.timestamp && (
                    <span style={{ ...s.burbujaHora, color: esMio ? "rgba(255,255,255,0.55)" : "var(--app-text-muted)" }}>
                      {new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {otroEscribiendo && (
            <div style={{ ...s.msgRow, justifyContent: "flex-start" }}>
              <div style={s.msgAvatar}>
                <img src={otroUsuario.photoURL || getAvatarDefault(otroUsuario.sexo)} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
              </div>
              <div style={{ ...s.burbuja, ...s.burbujaAjena, flexDirection: "row", gap: "5px", alignItems: "center", padding: "12px 16px" }}>
                <div className="typing-dot" /><div className="typing-dot" /><div className="typing-dot" />
              </div>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        {/* Drawer perfil lateral */}
        {modalPerfil && (() => {
          const TRADUCCIONES = {
            horario_acostarse: {
              temprano: "Me acuesto antes de las 23h",
              normal: "Me acuesto entre las 23h y la 1h",
              tarde: "Me acuesto después de la 1h de la madrugada",
            },
            nivel_limpieza: {
              1: "El orden no es lo mío",
              2: "Soy bastante relajado con la limpieza",
              3: "Limpio cuando toca, ni más ni menos",
              4: "Me gusta tener la casa ordenada",
              5: "Soy muy limpio y me importa el orden",
            },
            tolerancia_limpieza_ajena: {
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
            relacion_tabaco: {
              no_fuma_tolera: "No fumo, pero no me importa que mi roomie fume fuera",
              no_fuma_no_tolera: "No fumo y prefiero que no se fume en casa ni cerca",
              fuma_dentro: "Fumo y lo hago dentro del piso",
              fuma_fuera: "Fumo pero siempre salgo fuera a hacerlo",
            },
            gestion_gastos: {
              turno: "Nos turnamos para pagar los gastos comunes",
              proporcional: "Cada uno paga lo que consume",
              conjunto: "Ponemos dinero en común y pagamos de ahí",
              app: "App de gastos compartidos",
              bote: "Bote común mensual",
              independiente: "Cada uno lo suyo, mínimo compartido",
            },
          };
          const ESTILO_ITEMS = [
            {
              dataKey: "horario_acostarse", tradKey: "horario_acostarse", label: "Horario acostarse",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/></svg>,
            },
            {
              dataKey: "limpieza_propio", tradKey: "nivel_limpieza", label: "Nivel de limpieza",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>,
            },
            {
              dataKey: "tolerancia_limpieza", tradKey: "tolerancia_limpieza_ajena", label: "Tolerancia limpieza ajena",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/></svg>,
            },
            {
              dataKey: "frecuencia_visitas", tradKey: "frecuencia_visitas", label: "Frecuencia visitas",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
            },
            {
              dataKey: "tolerancia_visitas", tradKey: "tolerancia_visitas", label: "Tolerancia visitas",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>,
            },
            {
              dataKey: "nivel_ruido", tradKey: "nivel_ruido", label: "Nivel de ruido",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="11 5 6 9 2 9 2 15 6 15 11 19 11 5"/><path d="M19.07 4.93a10 10 0 0 1 0 14.14"/><path d="M15.54 8.46a5 5 0 0 1 0 7.07"/></svg>,
            },
            {
              dataKey: "fumar", tradKey: "relacion_tabaco", label: "Tabaco",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="1" y1="1" x2="23" y2="23"/><path d="M21 16.5A2.5 2.5 0 0 0 18.5 14H17a4 4 0 0 0 0-8h-1M3 16.5h11.5"/></svg>,
            },
            {
              dataKey: "gastos_comunes", tradKey: "gestion_gastos", label: "Gastos comunes",
              Icon: () => <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="1" y="4" width="22" height="16" rx="2" ry="2"/><line x1="1" y1="10" x2="23" y2="10"/></svg>,
            },
          ];
          const pct = calcularCompatibilidad(miConvivencia, convivenciaOtro);
          return (
            <>
              <style>{`
                @keyframes slideInRight {
                  from { transform: translateX(100%); }
                  to { transform: translateX(0); }
                }
                .rm-drawer {
                  position: fixed; top: 0; right: 0; bottom: 0;
                  width: 380px; max-width: 100%;
                  background: var(--app-surface);
                  overflow-y: auto;
                  padding: 24px 20px 40px;
                  animation: slideInRight 300ms ease;
                  box-shadow: -8px 0 32px rgba(0,0,0,0.25);
                  border-left: 1px solid var(--app-border);
                  z-index: 1051;
                  box-sizing: border-box;
                }
                @media (max-width: 480px) { .rm-drawer { width: 100%; } }
              `}</style>
              <div style={s.drawerOverlay} onClick={() => setModalPerfil(false)}>
                <div className="rm-drawer" onClick={e => e.stopPropagation()}>
                  <button style={s.drawerClose} onClick={() => setModalPerfil(false)}><IconClose /></button>

                  {/* Banner + avatar */}
                  <div style={{
                    position: "relative", width: "100%", height: "220px", flexShrink: 0, overflow: "hidden",
                    background: otroUsuario.bannerURL ? undefined : "linear-gradient(135deg, #f97316, #7c3aed)",
                    borderRadius: "0 0 0 0",
                  }}>
                    {otroUsuario.bannerURL && (
                      <img src={otroUsuario.bannerURL} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} referrerPolicy="no-referrer" />
                    )}
                    <div style={{ position: "absolute", inset: 0, background: "linear-gradient(to top, rgba(0,0,0,0.6) 0%, transparent 60%)" }} />
                    <div style={{ position: "absolute", bottom: "16px", left: "20px", display: "flex", alignItems: "flex-end", gap: "12px" }}>
                      <div
                        style={{ width: "72px", height: "72px", borderRadius: "50%", border: "3px solid rgba(255,255,255,0.9)", overflow: "hidden", cursor: esFirebasePhoto(otroUsuario.photoURL) ? "pointer" : "default", flexShrink: 0 }}
                        onClick={() => esFirebasePhoto(otroUsuario.photoURL) && setFotoAmpliada(otroUsuario.photoURL)}
                      >
                        <img src={otroUsuario.photoURL || getAvatarDefault(otroUsuario.sexo)} alt={otroUsuario.nombre} style={{ width: "100%", height: "100%", objectFit: "cover" }} referrerPolicy="no-referrer" />
                      </div>
                    </div>
                  </div>

                  {/* Nombre + badge */}
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "8px", flexWrap: "wrap", marginBottom: "8px" }}>
                    <h2 style={s.drawerNombre}>{otroUsuario.nombre}</h2>
                    {otroUsuario.verificacionEstado === "verificado" && (
                      <span style={s.drawerVerifBadge}><IconCheck /> Verificado</span>
                    )}
                  </div>

                  {/* Chips */}
                  <div style={{ display: "flex", flexWrap: "wrap", gap: "8px", justifyContent: "center", marginBottom: "14px" }}>
                    {otroUsuario.ciudad && (
                      <span style={s.drawerChip}><IconPin /> {otroUsuario.ciudad}</span>
                    )}
                    {otroUsuario.edad && (
                      <span style={s.drawerChip}>{otroUsuario.edad} años</span>
                    )}
                    {otroUsuario.presupuesto && (
                      <span style={s.drawerChip}>{otroUsuario.presupuesto} €/mes</span>
                    )}
                  </div>

                  {/* Valoraciones */}
                  {otroUsuario.valoracionMedia > 0 && (
                    <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: "6px", marginBottom: "8px" }}>
                      <span style={{ fontSize: "16px", color: "#f59e0b" }}>
                        {"★".repeat(Math.round(otroUsuario.valoracionMedia))}
                        <span style={{ color: "var(--app-border)" }}>{"★".repeat(5 - Math.round(otroUsuario.valoracionMedia))}</span>
                      </span>
                      <span style={{ fontSize: "13px", fontWeight: "700", color: "var(--app-text)" }}>{otroUsuario.valoracionMedia}</span>
                      <span style={{ fontSize: "12px", color: "var(--app-text-muted)" }}>({otroUsuario.totalValoraciones})</span>
                    </div>
                  )}
                  {etiquetasOtro.length > 0 && (
                    <div style={{ display: "flex", flexWrap: "wrap", gap: "6px", justifyContent: "center", marginBottom: "10px" }}>
                      {etiquetasOtro.map(e => (
                        <span key={e} style={s.perfilEtiquetaPill}>{e}</span>
                      ))}
                    </div>
                  )}

                  {/* Galería de fotos adicionales */}
                  {[otroUsuario.foto1URL, otroUsuario.foto2URL, otroUsuario.foto3URL].filter(Boolean).length > 0 && (
                    <div style={{ marginBottom: "16px" }}>
                      <p style={{ margin: "0 0 8px", fontSize: "11px", fontWeight: "700", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.6px" }}>Fotos</p>
                      <div style={{ display: "flex", gap: "8px", overflowX: "auto", paddingBottom: "4px" }}>
                        {[otroUsuario.foto1URL, otroUsuario.foto2URL, otroUsuario.foto3URL].filter(Boolean).map((url, i) => (
                          <img
                            key={i}
                            src={url}
                            alt={`foto ${i + 1}`}
                            style={{ width: "100px", height: "100px", borderRadius: "10px", objectFit: "cover", flexShrink: 0, cursor: "pointer" }}
                            referrerPolicy="no-referrer"
                            onClick={() => setFotoAmpliada(url)}
                          />
                        ))}
                      </div>
                    </div>
                  )}

                  {otroUsuario.bio && (
                    <p style={{ fontSize: "13px", color: "var(--app-text-muted)", fontStyle: "italic", textAlign: "center", lineHeight: "1.6", margin: "0 0 16px" }}>"{otroUsuario.bio}"</p>
                  )}

                  {/* Barra compatibilidad */}
                  {cargandoPerfil ? (
                    <p style={{ fontSize: "13px", color: "var(--app-text-muted)", textAlign: "center", margin: "12px 0" }}>Calculando compatibilidad…</p>
                  ) : pct !== null && (
                    <div style={{ marginBottom: "20px" }}>
                      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "6px" }}>
                        <span style={{ fontSize: "12px", color: "var(--app-text-muted)", fontWeight: "600" }}>Compatibilidad</span>
                        <span style={{ fontSize: "13px", fontWeight: "800", background: "linear-gradient(135deg, #f97316, #7c3aed)", WebkitBackgroundClip: "text", WebkitTextFillColor: "transparent" }}>{pct}%</span>
                      </div>
                      <div style={{ width: "100%", height: "6px", background: "var(--app-border)", borderRadius: "99px", overflow: "hidden" }}>
                        <div style={{ width: `${pct}%`, height: "100%", borderRadius: "99px", background: "linear-gradient(90deg, #f97316, #7c3aed)", transition: "width 0.5s ease" }} />
                      </div>
                    </div>
                  )}

                  {/* Estilo de vida */}
                  {!cargandoPerfil && convivenciaOtro && (
                    <div style={{ borderTop: "1px solid var(--app-border)", paddingTop: "16px", marginBottom: "20px" }}>
                      <h3 style={{ margin: "0 0 12px 0", fontSize: "11px", fontWeight: "700", color: "var(--app-text-muted)", textTransform: "uppercase", letterSpacing: "0.8px" }}>Estilo de vida</h3>
                      <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                        {ESTILO_ITEMS.map(({ dataKey, tradKey, label, Icon }) => {
                          const val = convivenciaOtro[dataKey];
                          if (val === undefined) return null;
                          const traducido = TRADUCCIONES[tradKey]?.[val] ?? TRADUCCIONES[tradKey]?.[String(val)] ?? String(val);
                          return (
                            <div key={dataKey} style={{ display: "flex", alignItems: "center", gap: "10px", padding: "8px 12px", background: "var(--app-input-bg)", borderRadius: "10px", border: "1px solid var(--app-border)" }}>
                              <span style={{ color: "var(--app-text-muted)", flexShrink: 0 }}><Icon /></span>
                              <span style={{ fontSize: "12px", color: "var(--app-text-muted)", fontWeight: "500", flex: 1 }}>{label}</span>
                              <span style={{ fontSize: "12px", color: "var(--app-text)", fontWeight: "600", textAlign: "right" }}>{traducido}</span>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* Botón reportar */}
                  <button style={s.drawerReportBtn} onClick={() => { setModalPerfil(false); setReportando(true); }}>
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
                      <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
                    </svg>
                    Reportar perfil
                  </button>
                </div>
              </div>
            </>
          );
        })()}

        {fotoAmpliada && (
          <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.95)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "20px" }} onClick={() => setFotoAmpliada(null)}>
            <button style={{ position: "fixed", top: "20px", right: "24px", background: "rgba(255,255,255,0.15)", border: "none", color: "#ffffff", cursor: "pointer", borderRadius: "50%", width: "40px", height: "40px", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1101 }} onClick={() => setFotoAmpliada(null)}><IconClose /></button>
            <img src={fotoAmpliada} alt="" style={{ maxWidth: "100%", maxHeight: "90vh", objectFit: "contain", borderRadius: "12px" }} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {modalValorar && (
          <Valoracion destinatario={otroUsuario} matchId={matchId} onClose={() => setModalValorar(false)} />
        )}
        {reportando && (
          <ReportarPerfil usuario={otroUsuario} reportadorUid={uid} onCerrar={() => setReportando(false)} />
        )}

        {/* Input */}
        <div style={s.inputBar}>
          <textarea
            style={s.inputTexto}
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            style={{ ...s.sendBtn, opacity: texto.trim() && !enviando ? 1 : 0.4 }}
            onClick={enviar}
            disabled={!texto.trim() || enviando}
          >
            <IconSend />
          </button>
        </div>
      </div>
    </>
  );
}

const s = {
  spinner: {
    width: "44px", height: "44px",
    border: "4px solid var(--app-border, #e5e7eb)",
    borderTop: "4px solid #f97316",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  /* ── Lista ── */
  container: {
    minHeight: "100vh",
    background: "var(--app-bg)",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    paddingBottom: "80px",
    transition: "background 0.3s",
  },
  header: { padding: "52px 24px 20px" },
  headerTitle: {
    margin: "0 0 4px 0", fontSize: "28px", fontWeight: "800",
    color: "var(--app-text)", letterSpacing: "-0.5px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  headerSub: { margin: 0, fontSize: "14px", color: "var(--app-text-muted)" },
  emptyBox: {
    margin: "32px 24px",
    background: "var(--app-surface)",
    borderRadius: "24px",
    padding: "48px 24px",
    textAlign: "center",
    border: "1px solid var(--app-border)",
    display: "flex", flexDirection: "column", alignItems: "center", gap: "12px",
  },
  emptyTitle: { margin: 0, fontSize: "17px", fontWeight: "700", color: "var(--app-text)" },
  emptyText:  { margin: 0, fontSize: "14px", color: "var(--app-text-muted)", lineHeight: "1.5" },
  lista: { margin: "0 16px", display: "flex", flexDirection: "column", gap: "8px" },
  matchCard: {
    display: "flex", alignItems: "center", gap: "14px",
    background: "var(--app-surface)",
    border: "1px solid var(--app-border)",
    borderRadius: "16px", padding: "14px 16px",
    cursor: "pointer", textAlign: "left", width: "100%",
    boxSizing: "border-box", transition: "background 0.15s",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  matchCardUnread: { borderColor: "rgba(249,115,22,0.3)" },
  avatarRing: {
    position: "relative", flexShrink: 0,
    width: "54px", height: "54px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    padding: "2px", display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarInner: {
    width: "100%", height: "100%", borderRadius: "50%",
    background: "var(--app-surface)",
    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: "50px", height: "50px", borderRadius: "50%", objectFit: "cover" },
  avatarLetra: { fontSize: "20px", fontWeight: "800", color: "#ffffff" },
  onlineDot: {
    position: "absolute", bottom: "1px", right: "1px",
    width: "12px", height: "12px", borderRadius: "50%",
    background: "#22c55e", border: "2px solid var(--app-surface, #fff)",
  },
  matchInfo: { flex: 1, display: "flex", flexDirection: "column", gap: "4px", minWidth: 0 },
  matchInfoTop:    { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  matchInfoBottom: { display: "flex", justifyContent: "space-between", alignItems: "center", gap: "8px" },
  matchNombre: { fontSize: "15px", color: "var(--app-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  matchTimestamp: { fontSize: "11px", color: "var(--app-text-muted)", flexShrink: 0 },
  matchPreview: { fontSize: "13px", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", flex: 1 },
  unreadDot: { width: "8px", height: "8px", borderRadius: "50%", background: "#f97316", flexShrink: 0 },
  dotsBtn: {
    background: "none", border: "none", color: "var(--app-text-muted)", cursor: "pointer",
    padding: "8px 10px", fontSize: "18px", lineHeight: 1, fontWeight: "700",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  menuDropdown: {
    position: "absolute", right: 0, top: "36px",
    background: "var(--app-surface)", border: "1px solid var(--app-border)",
    borderRadius: "12px", boxShadow: "0 8px 24px rgba(0,0,0,0.2)",
    zIndex: 100, minWidth: "180px", overflow: "hidden",
  },
  menuItem: {
    display: "flex", alignItems: "center", gap: "8px",
    width: "100%", padding: "12px 16px",
    background: "none", border: "none", cursor: "pointer",
    fontSize: "13px", fontWeight: "600", color: "#ef4444",
    fontFamily: "'Inter','Segoe UI',sans-serif",
    textAlign: "left",
  },
  /* ── Chat ── */
  chatWrapper: {
    display: "flex", flexDirection: "column", height: "100vh",
    background: "var(--app-bg)", fontFamily: "'Inter', 'Segoe UI', sans-serif",
    transition: "background 0.3s",
  },
  chatTopBar: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 14px",
    background: "var(--app-surface)",
    borderBottom: "1px solid var(--app-border)",
    flexShrink: 0, transition: "background 0.3s, border-color 0.3s",
  },
  backBtn: {
    background: "none", border: "none", color: "var(--app-text)",
    cursor: "pointer", padding: "4px",
    display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  chatTopClickable: {
    display: "flex", alignItems: "center", gap: "10px",
    background: "none", border: "none", cursor: "pointer",
    padding: "4px 6px", borderRadius: "12px", flex: 1, textAlign: "left", minWidth: 0,
  },
  chatTopAvatarRing: {
    width: "40px", height: "40px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    padding: "2px", display: "flex", alignItems: "center", justifyContent: "center",
    flexShrink: 0,
  },
  chatTopAvatarInner: {
    width: "100%", height: "100%", borderRadius: "50%",
    background: "var(--app-surface)", overflow: "hidden",
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  chatTopAvatarLetra: { fontSize: "14px", fontWeight: "700", color: "#ffffff" },
  chatTopInfo: { display: "flex", flexDirection: "column", gap: "1px", minWidth: 0 },
  chatTopNombre: { fontSize: "15px", fontWeight: "700", color: "var(--app-text)", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" },
  chatTopSub: { fontSize: "12px", color: "var(--app-text-muted)", display: "flex", alignItems: "center", gap: "3px" },
  chatActionBtn: {
    padding: "6px 10px", borderRadius: "20px",
    border: "1.5px solid var(--app-border)",
    background: "transparent", color: "var(--app-text-muted)",
    fontSize: "11px", fontWeight: "600", cursor: "pointer",
    fontFamily: "inherit", whiteSpace: "nowrap", transition: "border-color 0.2s, color 0.2s",
  },
  mensajesArea: {
    flex: 1, overflowY: "auto", padding: "16px 12px",
    display: "flex", flexDirection: "column", gap: "6px",
  },
  chatVacio: { display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flex: 1, paddingTop: "80px" },
  chatVacioText: { fontSize: "14px", color: "var(--app-text-muted)", fontWeight: "500", margin: 0 },
  msgRow: { display: "flex", alignItems: "flex-end", gap: "8px" },
  msgAvatar: {
    width: "26px", height: "26px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    overflow: "hidden", flexShrink: 0,
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  msgAvatarLetra: { fontSize: "10px", fontWeight: "700", color: "#ffffff" },
  burbuja: { maxWidth: "72%", padding: "10px 14px", display: "flex", flexDirection: "column", gap: "4px", wordBreak: "break-word" },
  burbujaPropia: {
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    borderRadius: "20px 20px 4px 20px",
  },
  burbujaAjena: {
    background: "var(--app-surface)",
    borderRadius: "20px 20px 20px 4px",
    border: "1px solid var(--app-border)",
  },
  burbujaTexto: { fontSize: "15px", lineHeight: "1.4" },
  burbujaHora:  { fontSize: "10px", alignSelf: "flex-end" },
  inputBar: {
    display: "flex", alignItems: "center", gap: "10px",
    padding: "10px 12px 20px",
    background: "var(--app-surface)",
    borderTop: "1px solid var(--app-border)",
    flexShrink: 0, transition: "background 0.3s, border-color 0.3s",
  },
  inputTexto: {
    flex: 1, padding: "10px 16px",
    border: "1.5px solid var(--app-border)",
    borderRadius: "22px", fontSize: "15px", outline: "none",
    resize: "none", fontFamily: "inherit", lineHeight: "1.4",
    maxHeight: "100px", overflowY: "auto",
    color: "var(--app-text)", background: "var(--app-input-bg)",
    transition: "border-color 0.2s, background 0.3s",
  },
  sendBtn: {
    width: "44px", height: "44px", borderRadius: "50%", border: "none",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer", flexShrink: 0,
    boxShadow: "0 4px 12px rgba(249,115,22,0.35)",
  },
  /* ── Drawer perfil ── */
  drawerOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 1050,
  },
  drawerClose: {
    position: "absolute", top: "14px", left: "14px",
    background: "var(--app-input-bg)", border: "none", borderRadius: "50%",
    width: "32px", height: "32px", cursor: "pointer",
    display: "flex", alignItems: "center", justifyContent: "center",
    color: "var(--app-text-muted)",
  },
  drawerFotoRing: {
    width: "100px", height: "100px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    padding: "3px", cursor: "pointer", overflow: "hidden",
  },
  drawerFotoImg: {
    width: "100%", height: "100%", borderRadius: "50%", objectFit: "cover",
    display: "block",
  },
  drawerNombre: { margin: 0, fontSize: "22px", fontWeight: "800", color: "var(--app-text)" },
  drawerVerifBadge: {
    display: "inline-flex", alignItems: "center", gap: "4px",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    color: "#ffffff", fontSize: "11px", fontWeight: "700",
    padding: "3px 10px", borderRadius: "20px",
  },
  drawerChip: {
    background: "var(--app-input-bg)", color: "var(--app-text-muted)",
    fontSize: "12px", fontWeight: "600", padding: "5px 12px", borderRadius: "20px",
    border: "1px solid var(--app-border)",
    display: "inline-flex", alignItems: "center", gap: "4px",
  },
  drawerReportBtn: {
    width: "100%", padding: "12px", borderRadius: "14px",
    border: "1.5px solid #ef4444", background: "transparent",
    color: "#ef4444", fontSize: "13px", fontWeight: "600",
    cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", gap: "6px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  perfilEtiquetaPill: {
    padding: "4px 12px", borderRadius: "20px",
    background: "var(--app-input-bg)", color: "var(--app-text-muted)",
    fontSize: "12px", fontWeight: "600", border: "1px solid var(--app-border)",
  },
};
