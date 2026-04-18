import { useEffect, useRef, useState } from "react";
import {
  collection, query, where, getDocs, doc, getDoc,
  addDoc, onSnapshot, orderBy, serverTimestamp,
  setDoc, updateDoc,
} from "firebase/firestore";
import { auth, db } from "../firebase";
import ReportarPerfil from "./ReportarPerfil";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

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

export default function Matches() {
  const [matches, setMatches] = useState([]);
  const [loading, setLoading] = useState(true);
  const [chatAbierto, setChatAbierto] = useState(null);

  useEffect(() => {
    const cargar = async () => {
      const uid = auth.currentUser.uid;
      const q = query(collection(db, "matches"), where("users", "array-contains", uid));
      const snap = await getDocs(q);

      const lista = await Promise.all(
        snap.docs.map(async (d) => {
          const data = d.data();
          const otroUid = data.users.find((u) => u !== uid);
          const userSnap = await getDoc(doc(db, "users", otroUid));
          return {
            matchId: d.id,
            otroUsuario: userSnap.exists()
              ? { uid: otroUid, ...userSnap.data() }
              : { uid: otroUid, nombre: "Usuario", ciudad: "" },
            timestamp: data.timestamp,
            tieneNoLeidos: !!data[`unread_${uid}`],
          };
        })
      );

      setMatches(lista.sort((a, b) => (b.timestamp > a.timestamp ? 1 : -1)));
      setLoading(false);
    };
    cargar();
  }, []);

  const abrirChat = async (matchId, otroUsuario) => {
    const uid = auth.currentUser.uid;
    // Marcar como leído al abrir
    await updateDoc(doc(db, "matches", matchId), { [`unread_${uid}`]: false }).catch(() => {});
    setMatches((prev) =>
      prev.map((m) => m.matchId === matchId ? { ...m, tieneNoLeidos: false } : m)
    );
    setChatAbierto({ matchId, otroUsuario });
  };

  if (loading) {
    return (
      <div style={styles.fullCenter}>
        <div style={styles.spinner} />
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

  return (
    <div style={styles.container}>
      <div style={styles.header}>
        <h1 style={styles.headerTitle}>Conexiones 💬</h1>
        <p style={styles.headerSub}>
          {matches.length === 0
            ? "Aún no tienes conexiones"
            : (() => {
                const sinLeer = matches.filter((m) => m.tieneNoLeidos).length;
                return sinLeer > 0 ? `${sinLeer} sin leer` : "Todo al día ✓";
              })()}
        </p>
      </div>

      {matches.length === 0 ? (
        <div style={styles.emptyBox}>
          <span style={{ fontSize: "52px" }}>🏠</span>
          <p style={styles.emptyText}>Sigue explorando para encontrar tu roomie ideal.</p>
        </div>
      ) : (
        <div style={styles.lista}>
          {matches.map(({ matchId, otroUsuario, tieneNoLeidos }) => (
            <button
              key={matchId}
              style={{ ...styles.matchCard, ...(tieneNoLeidos ? styles.matchCardUnread : {}) }}
              onClick={() => abrirChat(matchId, otroUsuario)}
            >
              <div style={styles.matchAvatar}>
                {esFirebasePhoto(otroUsuario.photoURL) ? (
                  <img src={otroUsuario.photoURL} alt={otroUsuario.nombre} style={styles.matchAvatarImg} referrerPolicy="no-referrer" />
                ) : (
                  <span style={styles.matchAvatarLetra}>
                    {otroUsuario.nombre?.[0]?.toUpperCase() || "?"}
                  </span>
                )}
                <div style={styles.onlineDot} />
              </div>
              <div style={styles.matchInfo}>
                <span style={{ ...styles.matchNombre, fontWeight: tieneNoLeidos ? "800" : "700" }}>
                  {otroUsuario.nombre}
                </span>
                <span style={styles.matchCiudad}>📍 {otroUsuario.ciudad}</span>
              </div>
              {tieneNoLeidos && <div style={styles.unreadBadge} />}
              <span style={styles.matchArrow}>›</span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function Chat({ matchId, otroUsuario, onVolver }) {
  const [mensajes, setMensajes] = useState([]);
  const [texto, setTexto] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [otroEscribiendo, setOtroEscribiendo] = useState(false);
  // Modal perfil
  const [modalPerfil, setModalPerfil]       = useState(false);
  const [convivenciaOtro, setConvivenciaOtro] = useState(null);
  const [miConvivencia, setMiConvivencia]   = useState(null);
  const [cargandoPerfil, setCargandoPerfil] = useState(false);
  const [fotoAmpliada, setFotoAmpliada]     = useState(false);
  const [reportando, setReportando]         = useState(false);
  const bottomRef = useRef(null);
  const typingTimeoutRef = useRef(null);
  const miNombreRef = useRef(null);
  const uid = auth.currentUser.uid;

  const abrirModalPerfil = async () => {
    setModalPerfil(true);
    if (convivenciaOtro !== null || miConvivencia !== null) return; // ya cargado
    setCargandoPerfil(true);
    const [convOtroSnap, miConvSnap] = await Promise.all([
      getDoc(doc(db, "convivencia", otroUsuario.uid)),
      getDoc(doc(db, "convivencia", uid)),
    ]);
    setConvivenciaOtro(convOtroSnap.exists() ? convOtroSnap.data() : undefined);
    setMiConvivencia(miConvSnap.exists() ? miConvSnap.data() : undefined);
    setCargandoPerfil(false);
  };

  // Cachea el nombre del usuario actual para las notificaciones
  useEffect(() => {
    getDoc(doc(db, "users", uid)).then((snap) => {
      if (snap.exists()) miNombreRef.current = snap.data().nombre;
    }).catch(() => {});
  }, [uid]);

  // Suscripción a mensajes en tiempo real
  useEffect(() => {
    const q = query(
      collection(db, "mensajes", matchId, "chats"),
      orderBy("timestamp", "asc")
    );
    const unsub = onSnapshot(q, (snap) => {
      setMensajes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
    return () => unsub();
  }, [matchId]);

  // Suscripción al estado "está escribiendo"
  useEffect(() => {
    const unsub = onSnapshot(doc(db, "typing", matchId), (snap) => {
      if (snap.exists()) {
        setOtroEscribiendo(!!snap.data()[otroUsuario.uid]);
      } else {
        setOtroEscribiendo(false);
      }
    });
    return () => unsub();
  }, [matchId, otroUsuario.uid]);

  // Limpiar indicador de escritura al salir
  useEffect(() => {
    return () => {
      clearTimeout(typingTimeoutRef.current);
      setDoc(doc(db, "typing", matchId), { [uid]: false }, { merge: true }).catch(() => {});
    };
  }, [matchId, uid]);

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
        texto: txt,
        from: uid,
        leido: false,
        timestamp: serverTimestamp(),
      });
      // Marcar como no leído para el destinatario
      const unreadPayload = { [`unread_${otroUsuario.uid}`]: true };
      console.log("[Matches] Enviando mensaje:", {
        matchId,
        destinatario: otroUsuario.uid,
        campoFirestore: unreadPayload,
      });
      await updateDoc(doc(db, "matches", matchId), unreadPayload).catch((err) => {
        console.error("[Matches] Error al actualizar unread en matches:", err);
      });

      // Guardar notificación push para el destinatario
      try {
        const destinatarioSnap = await getDoc(doc(db, "users", otroUsuario.uid));
        const fcmToken = destinatarioSnap.exists() ? destinatarioSnap.data().fcmToken : null;
        if (fcmToken) {
          const miNombre = miNombreRef.current || auth.currentUser.displayName || "Alguien";
          await addDoc(collection(db, "notificaciones"), {
            token: fcmToken,
            title: "💬 Nuevo mensaje",
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
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      enviar();
    }
  };

  return (
    <>
      <style>{`
        @keyframes typing-bounce {
          0%, 60%, 100% { transform: translateY(0); opacity: 0.4; }
          30% { transform: translateY(-6px); opacity: 1; }
        }
        .typing-dot {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: #9ca3af;
          animation: typing-bounce 1.2s infinite;
        }
        .typing-dot:nth-child(2) { animation-delay: 0.2s; }
        .typing-dot:nth-child(3) { animation-delay: 0.4s; }
      `}</style>

      <div style={styles.chatWrapper}>
        {/* TopBar */}
        <div style={styles.chatTopBar}>
          <button style={styles.backBtn} onClick={onVolver}>‹</button>
          <button style={styles.chatTopClickable} onClick={abrirModalPerfil}>
            <div style={styles.chatTopAvatar}>
              {esFirebasePhoto(otroUsuario.photoURL) ? (
                <img src={otroUsuario.photoURL} alt={otroUsuario.nombre} style={styles.chatTopAvatarImg} referrerPolicy="no-referrer" />
              ) : (
                <span style={styles.chatTopAvatarLetra}>
                  {otroUsuario.nombre?.[0]?.toUpperCase() || "?"}
                </span>
              )}
            </div>
            <div style={styles.chatTopInfo}>
              <span style={styles.chatTopNombre}>{otroUsuario.nombre}</span>
              <span style={styles.chatTopCiudad}>
                {otroEscribiendo ? "✍️ Escribiendo..." : `📍 ${otroUsuario.ciudad}`}
              </span>
            </div>
          </button>
        </div>

        {/* Mensajes */}
        <div style={styles.mensajesArea}>
          {mensajes.length === 0 && (
            <div style={styles.chatVacio}>
              <span style={{ fontSize: "36px" }}>👋</span>
              <p style={styles.chatVacioText}>¡Tenéis conexión! Rompe el hielo.</p>
            </div>
          )}
          {mensajes.map((m) => {
            const esMio = m.from === uid;
            return (
              <div key={m.id} style={{ ...styles.msgRow, justifyContent: esMio ? "flex-end" : "flex-start" }}>
                {!esMio && (
                  <div style={styles.msgAvatar}>
                    {esFirebasePhoto(otroUsuario.photoURL) ? (
                      <img src={otroUsuario.photoURL} alt="" style={styles.msgAvatarImg} referrerPolicy="no-referrer" />
                    ) : (
                      <span style={styles.msgAvatarLetra}>{otroUsuario.nombre?.[0]?.toUpperCase() || "?"}</span>
                    )}
                  </div>
                )}
                <div style={{ ...styles.burbuja, ...(esMio ? styles.burbujaPropia : styles.burbujaAjena) }}>
                  <span style={{ ...styles.burbujaTexto, color: esMio ? "#ffffff" : "#1a1a2e" }}>{m.texto}</span>
                  {m.timestamp && (
                    <span style={{ ...styles.burbujaHora, color: esMio ? "rgba(255,255,255,0.6)" : "#9ca3af" }}>
                      {new Date(m.timestamp.seconds * 1000).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}

          {/* Indicador "está escribiendo" */}
          {otroEscribiendo && (
            <div style={{ ...styles.msgRow, justifyContent: "flex-start" }}>
              <div style={styles.msgAvatar}>
                {esFirebasePhoto(otroUsuario.photoURL) ? (
                  <img src={otroUsuario.photoURL} alt="" style={styles.msgAvatarImg} referrerPolicy="no-referrer" />
                ) : (
                  <span style={styles.msgAvatarLetra}>{otroUsuario.nombre?.[0]?.toUpperCase() || "?"}</span>
                )}
              </div>
              <div style={{ ...styles.burbuja, ...styles.burbujaAjena, ...styles.burbujaTyping }}>
                <div className="typing-dot" />
                <div className="typing-dot" />
                <div className="typing-dot" />
              </div>
            </div>
          )}

          <div ref={bottomRef} />
        </div>

        {/* Modal perfil completo */}
        {modalPerfil && (
          <div style={styles.perfilOverlay} onClick={() => setModalPerfil(false)}>
            <div style={styles.perfilModal} onClick={(e) => e.stopPropagation()}>
              <button style={styles.perfilClose} onClick={() => setModalPerfil(false)}>✕</button>

              {/* Foto grande */}
              <div style={styles.perfilFotoWrap} onClick={() => esFirebasePhoto(otroUsuario.photoURL) && setFotoAmpliada(true)}>
                {esFirebasePhoto(otroUsuario.photoURL)
                  ? <img src={otroUsuario.photoURL} alt={otroUsuario.nombre} style={styles.perfilFoto} referrerPolicy="no-referrer" />
                  : <div style={styles.perfilFotoFallback}><span style={styles.perfilFotoFallbackLetra}>{otroUsuario.nombre?.[0]?.toUpperCase() || "?"}</span></div>
                }
                {esFirebasePhoto(otroUsuario.photoURL) && <div style={styles.perfilFotoOverlay}><span style={{ fontSize: "20px" }}>🔍</span></div>}
              </div>

              {/* Nombre + verificado */}
              <div style={styles.perfilNombreRow}>
                <h2 style={styles.perfilNombre}>{otroUsuario.nombre}</h2>
                {otroUsuario.verificacionEstado === "verificado" && (
                  <span style={styles.perfilVerifBadge}>✅ Verificado</span>
                )}
              </div>

              {/* Chips */}
              <div style={styles.perfilChips}>
                {otroUsuario.edad      && <span style={styles.perfilChip}>🎂 {otroUsuario.edad} años</span>}
                {otroUsuario.ciudad    && <span style={styles.perfilChip}>📍 {otroUsuario.ciudad}</span>}
                {otroUsuario.presupuesto && <span style={styles.perfilChip}>💶 {otroUsuario.presupuesto} €/mes</span>}
              </div>

              {/* Bio */}
              {otroUsuario.bio && <p style={styles.perfilBio}>"{otroUsuario.bio}"</p>}

              {/* Compatibilidad */}
              {(() => {
                const pct = calcularCompatibilidad(miConvivencia, convivenciaOtro);
                if (cargandoPerfil) return <p style={styles.perfilCargando}>Calculando compatibilidad…</p>;
                if (pct === null) return null;
                const color = pct >= 70 ? "#16a34a" : pct >= 40 ? "#ca8a04" : "#dc2626";
                return (
                  <div style={styles.perfilCompatWrap}>
                    <div style={styles.perfilCompatHeader}>
                      <span style={styles.perfilCompatLabel}>Compatibilidad de convivencia</span>
                      <span style={{ ...styles.perfilCompatPct, color }}>{pct}%</span>
                    </div>
                    <div style={styles.perfilCompatTrack}>
                      <div style={{ ...styles.perfilCompatFill, width: `${pct}%`, background: color }} />
                    </div>
                  </div>
                );
              })()}

              {/* Test de convivencia */}
              {!cargandoPerfil && convivenciaOtro && (
                <div style={styles.perfilTestSection}>
                  <h3 style={styles.perfilTestTitle}>Test de convivencia</h3>
                  <div style={styles.perfilTestGrid}>
                    {Object.entries(LABELS_CONV).map(([key, label]) =>
                      convivenciaOtro[key] !== undefined ? (
                        <div key={key} style={styles.perfilTestRow}>
                          <span style={styles.perfilTestLabel}>{label}</span>
                          <span style={styles.perfilTestVal}>{String(convivenciaOtro[key])}</span>
                        </div>
                      ) : null
                    )}
                  </div>
                </div>
              )}

              {/* Botón reportar */}
              <button style={styles.perfilReportarBtn} onClick={() => { setModalPerfil(false); setReportando(true); }}>
                ⚠️ Reportar perfil
              </button>
            </div>
          </div>
        )}

        {/* Foto ampliada */}
        {fotoAmpliada && esFirebasePhoto(otroUsuario.photoURL) && (
          <div style={styles.fotoFullOverlay} onClick={() => setFotoAmpliada(false)}>
            <button style={styles.fotoFullClose} onClick={() => setFotoAmpliada(false)}>✕</button>
            <img src={otroUsuario.photoURL} alt={otroUsuario.nombre} style={styles.fotoFullImg} referrerPolicy="no-referrer" onClick={(e) => e.stopPropagation()} />
          </div>
        )}

        {/* Reportar perfil */}
        {reportando && (
          <ReportarPerfil
            usuario={otroUsuario}
            reportadorUid={uid}
            onCerrar={() => setReportando(false)}
          />
        )}

        {/* Input */}
        <div style={styles.inputBar}>
          <textarea
            style={styles.inputTexto}
            placeholder="Escribe un mensaje..."
            value={texto}
            onChange={handleTyping}
            onKeyDown={handleKeyDown}
            rows={1}
          />
          <button
            style={{ ...styles.sendBtn, opacity: texto.trim() && !enviando ? 1 : 0.4 }}
            onClick={enviar}
            disabled={!texto.trim() || enviando}
          >
            <svg viewBox="0 0 24 24" width="20" height="20" fill="white">
              <path d="M2.01 21L23 12 2.01 3 2 10l15 2-15 2z" />
            </svg>
          </button>
        </div>
      </div>
    </>
  );
}

const styles = {
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
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    paddingBottom: "80px",
  },
  header: {
    padding: "52px 24px 24px",
    textAlign: "center",
  },
  headerTitle: {
    margin: "0 0 6px 0",
    fontSize: "26px",
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSub: {
    margin: 0,
    fontSize: "14px",
    color: "rgba(255,255,255,0.7)",
  },
  emptyBox: {
    margin: "0 24px",
    background: "#ffffff",
    borderRadius: "24px",
    padding: "48px 24px",
    textAlign: "center",
    boxShadow: "0 8px 32px rgba(0,0,0,0.15)",
  },
  emptyText: {
    marginTop: "12px",
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.5",
  },
  lista: {
    margin: "0 16px",
    display: "flex",
    flexDirection: "column",
    gap: "10px",
  },
  matchCard: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    background: "#ffffff",
    border: "none",
    borderRadius: "20px",
    padding: "14px 16px",
    cursor: "pointer",
    boxShadow: "0 4px 16px rgba(0,0,0,0.1)",
    textAlign: "left",
    width: "100%",
  },
  matchCardUnread: {
    background: "#f5f3ff",
    boxShadow: "0 4px 16px rgba(102,126,234,0.2)",
  },
  matchAvatar: {
    position: "relative",
    flexShrink: 0,
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    overflow: "visible",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  matchAvatarImg: {
    width: "54px",
    height: "54px",
    borderRadius: "50%",
    objectFit: "cover",
  },
  matchAvatarLetra: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
  },
  onlineDot: {
    position: "absolute",
    bottom: "2px",
    right: "2px",
    width: "12px",
    height: "12px",
    borderRadius: "50%",
    background: "#22c55e",
    border: "2px solid #ffffff",
  },
  unreadBadge: {
    width: "10px",
    height: "10px",
    borderRadius: "50%",
    background: "#7c3aed",
    flexShrink: 0,
  },
  matchInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "3px",
  },
  matchNombre: {
    fontSize: "16px",
    color: "#1a1a2e",
  },
  matchCiudad: {
    fontSize: "13px",
    color: "#6b7280",
  },
  matchArrow: {
    fontSize: "24px",
    color: "#c4b5fd",
    fontWeight: "300",
    lineHeight: 1,
  },
  chatWrapper: {
    display: "flex",
    flexDirection: "column",
    height: "100vh",
    background: "#f3f4f6",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  chatTopBar: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "12px 16px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    boxShadow: "0 2px 12px rgba(0,0,0,0.15)",
    flexShrink: 0,
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#ffffff",
    fontSize: "32px",
    lineHeight: 1,
    cursor: "pointer",
    padding: "0 4px",
    fontWeight: "300",
  },
  chatTopAvatar: {
    width: "40px",
    height: "40px",
    borderRadius: "50%",
    background: "rgba(255,255,255,0.3)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  chatTopAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  chatTopAvatarLetra: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff",
  },
  chatTopInfo: {
    display: "flex",
    flexDirection: "column",
    gap: "1px",
  },
  chatTopNombre: {
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff",
  },
  chatTopCiudad: {
    fontSize: "12px",
    color: "rgba(255,255,255,0.75)",
  },
  mensajesArea: {
    flex: 1,
    overflowY: "auto",
    padding: "16px 12px",
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  chatVacio: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    flex: 1,
    gap: "10px",
    paddingTop: "60px",
  },
  chatVacioText: {
    fontSize: "15px",
    color: "#9ca3af",
    fontWeight: "500",
  },
  msgRow: {
    display: "flex",
    alignItems: "flex-end",
    gap: "8px",
  },
  msgAvatar: {
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    overflow: "hidden",
    flexShrink: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  msgAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  msgAvatarLetra: {
    fontSize: "11px",
    fontWeight: "700",
    color: "#ffffff",
  },
  burbuja: {
    maxWidth: "72%",
    padding: "10px 14px",
    borderRadius: "18px",
    display: "flex",
    flexDirection: "column",
    gap: "4px",
    wordBreak: "break-word",
  },
  burbujaPropia: {
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    borderBottomRightRadius: "4px",
  },
  burbujaAjena: {
    background: "#ffffff",
    borderBottomLeftRadius: "4px",
    boxShadow: "0 1px 4px rgba(0,0,0,0.08)",
  },
  burbujaTyping: {
    flexDirection: "row",
    gap: "5px",
    alignItems: "center",
    padding: "12px 16px",
  },
  burbujaTexto: {
    fontSize: "15px",
    lineHeight: "1.4",
  },
  burbujaHora: {
    fontSize: "10px",
    alignSelf: "flex-end",
  },
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 12px 20px",
    background: "#ffffff",
    borderTop: "1px solid #e5e7eb",
    flexShrink: 0,
  },
  inputTexto: {
    flex: 1,
    padding: "10px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: "22px",
    fontSize: "15px",
    outline: "none",
    resize: "none",
    fontFamily: "inherit",
    lineHeight: "1.4",
    maxHeight: "100px",
    overflowY: "auto",
    color: "#1a1a2e",
    background: "#f9fafb",
  },
  sendBtn: {
    width: "44px",
    height: "44px",
    borderRadius: "50%",
    border: "none",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    flexShrink: 0,
    boxShadow: "0 4px 12px rgba(102,126,234,0.4)",
  },
  // Cabecera clickable
  chatTopClickable: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: "4px 8px",
    borderRadius: "12px",
    flex: 1,
    textAlign: "left",
  },
  // Modal perfil completo
  perfilOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
    zIndex: 1050,
    padding: "0",
  },
  perfilModal: {
    background: "#ffffff",
    borderRadius: "24px 24px 0 0",
    padding: "28px 24px 36px",
    width: "100%",
    maxWidth: "480px",
    maxHeight: "92vh",
    overflowY: "auto",
    position: "relative",
  },
  perfilClose: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "#f3f4f6",
    border: "none",
    borderRadius: "50%",
    width: "32px",
    height: "32px",
    fontSize: "16px",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    color: "#6b7280",
  },
  perfilFotoWrap: {
    position: "relative",
    width: "110px",
    height: "110px",
    borderRadius: "50%",
    margin: "0 auto 16px",
    cursor: "pointer",
    overflow: "hidden",
  },
  perfilFoto: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    borderRadius: "50%",
    border: "3px solid #667eea",
  },
  perfilFotoFallback: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid #667eea",
  },
  perfilFotoFallbackLetra: {
    fontSize: "40px",
    fontWeight: "800",
    color: "#ffffff",
  },
  perfilFotoOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    borderRadius: "50%",
    opacity: 0,
    transition: "opacity 0.2s",
  },
  perfilNombreRow: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    flexWrap: "wrap",
    marginBottom: "10px",
  },
  perfilNombre: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "#1a1a2e",
  },
  perfilVerifBadge: {
    background: "#eff6ff",
    border: "1.5px solid #93c5fd",
    color: "#1d4ed8",
    fontSize: "11px",
    fontWeight: "700",
    padding: "3px 10px",
    borderRadius: "20px",
  },
  perfilChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "12px",
  },
  perfilChip: {
    background: "#f5f3ff",
    color: "#5b21b6",
    fontSize: "12px",
    fontWeight: "600",
    padding: "5px 12px",
    borderRadius: "20px",
  },
  perfilBio: {
    fontSize: "13px",
    color: "#6b7280",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: "1.6",
    margin: "0 0 16px 0",
  },
  perfilCargando: {
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "center",
    margin: "12px 0",
  },
  perfilCompatWrap: {
    margin: "0 0 20px 0",
  },
  perfilCompatHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: "6px",
  },
  perfilCompatLabel: {
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: "600",
  },
  perfilCompatPct: {
    fontSize: "14px",
    fontWeight: "800",
  },
  perfilCompatTrack: {
    width: "100%",
    height: "7px",
    background: "#e5e7eb",
    borderRadius: "99px",
    overflow: "hidden",
  },
  perfilCompatFill: {
    height: "100%",
    borderRadius: "99px",
    transition: "width 0.5s ease",
  },
  perfilTestSection: {
    borderTop: "1px solid #e5e7eb",
    paddingTop: "16px",
    marginBottom: "20px",
  },
  perfilTestTitle: {
    margin: "0 0 10px 0",
    fontSize: "13px",
    fontWeight: "700",
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
  },
  perfilTestGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  perfilTestRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "7px 12px",
    background: "#f9fafb",
    borderRadius: "10px",
  },
  perfilTestLabel: {
    fontSize: "12px",
    color: "#6b7280",
    fontWeight: "500",
  },
  perfilTestVal: {
    fontSize: "12px",
    color: "#1a1a2e",
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  perfilReportarBtn: {
    width: "100%",
    padding: "12px",
    borderRadius: "14px",
    border: "1.5px solid #fca5a5",
    background: "#fff5f5",
    color: "#dc2626",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  // Foto a pantalla completa
  fotoFullOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.95)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "20px",
  },
  fotoFullClose: {
    position: "fixed",
    top: "20px",
    right: "24px",
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "#ffffff",
    fontSize: "20px",
    cursor: "pointer",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1101,
  },
  fotoFullImg: {
    maxWidth: "100%",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: "12px",
  },
};
