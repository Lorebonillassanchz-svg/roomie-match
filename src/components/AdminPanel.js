import { useEffect, useState } from "react";
import { collection, doc, getDoc, increment, onSnapshot, orderBy, query, updateDoc, where } from "firebase/firestore";
import { getDownloadURL, ref } from "firebase/storage";
import { db, storage } from "../firebase";
import { getAvatarDefault } from "../utils/avatarDefault";

const LABELS_CONVIVENCIA = {
  horario_acostarse:   "Horario acostarse",
  limpieza_propio:     "Nivel limpieza propio",
  tolerancia_limpieza: "Tolerancia limpieza ajena",
  frecuencia_visitas:  "Frecuencia visitas",
  tolerancia_visitas:  "Tolerancia visitas",
  nivel_ruido:         "Nivel ruido tolerable",
  fumar:               "Relación con tabaco",
  gastos_comunes:      "Gestión gastos comunes",
};

const MOTIVOS_MAP = {
  falso:          { icono: "🧢", titulo: "Perfil falso" },
  ofensivo:       { icono: "💬", titulo: "Comportamiento ofensivo" },
  inapropiado:    { icono: "🔞", titulo: "Contenido inapropiado" },
  spam:           { icono: "💰", titulo: "Spam o estafa" },
  menor:          { icono: "👶", titulo: "Menor de edad" },
  discriminacion: { icono: "🚫", titulo: "Discriminación" },
};

const CAMPOS_FECHA = ["creadoEn", "fechaRegistro", "createdAt", "timestamp", "fecha"];

function extraerFecha(data) {
  if (!data) return null;
  for (const campo of CAMPOS_FECHA) {
    if (data[campo]) {
      // Firestore Timestamp tiene .toDate()
      return data[campo]?.toDate?.() ?? new Date(data[campo]);
    }
  }
  return null;
}

function fmtFechaHora(fecha) {
  // Acepta Date, Firestore Timestamp, ISO string o número
  const d = fecha?.toDate?.() ?? (fecha ? new Date(fecha) : null);
  if (!d || isNaN(d)) return "—";
  const dd   = d.getDate().toString().padStart(2, "0");
  const mm   = (d.getMonth() + 1).toString().padStart(2, "0");
  const yyyy = d.getFullYear();
  const hh   = d.getHours().toString().padStart(2, "0");
  const min  = d.getMinutes().toString().padStart(2, "0");
  return `${dd}/${mm}/${yyyy} ${hh}:${min}`;
}

function nombrePorUid(uid, usuarios) {
  return usuarios.find((u) => u.uid === uid)?.nombre || uid;
}

export default function AdminPanel({ user, onClose, isAdmin }) {
  const [metrics, setMetrics]         = useState({ usuarios: 0, nuevos: 0, matches: 0, testCompletados: 0 });
  const [usuarios, setUsuarios]       = useState([]);
  const [matchesDocs, setMatchesDocs] = useState([]);
  const [convivDocs, setConvivDocs]   = useState([]);
  const [modalUsuario, setModalUsuario]   = useState(null);
  const [convivenciaModal, setConvivenciaModal] = useState(null);
  const [verificaciones, setVerificaciones]     = useState([]);
  const [metricModal, setMetricModal] = useState(null); // null | "usuarios" | "nuevos" | "matches" | "test"
  const [reportes, setReportes] = useState([]);
  const [fotoReporteAmpliada, setFotoReporteAmpliada] = useState(null);
  const [feedback, setFeedback] = useState([]);

  // Carga de usuarios — espera a que isAdmin esté confirmado
  useEffect(() => {
    if (!isAdmin) return;
    const unsubUsers = onSnapshot(collection(db, "usuarios"), (snap) => {
      console.log("[AdminPanel] usuarios — total docs:", snap.size);
      if (snap.size > 0) {
        console.log("[AdminPanel] campos del primer doc:", Object.keys(snap.docs[0].data()));
      }
      const lista = snap.docs.map((d) => ({ uid: d.id, ...d.data() }));
      setUsuarios(lista);
      const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
      const nuevos = lista.filter((u) => { const f = extraerFecha(u); return f && f >= weekAgo; }).length;
      setMetrics((prev) => ({ ...prev, usuarios: snap.size, nuevos }));
    });
    return () => unsubUsers();
  }, [isAdmin]);

  // Resto de suscripciones (solo si es admin)
  useEffect(() => {
    if (!isAdmin) return;

    const unsubMatches = onSnapshot(collection(db, "matches"), (snap) => {
      setMetrics((prev) => ({ ...prev, matches: snap.size }));
      setMatchesDocs(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });

    const unsubConvivencia = onSnapshot(collection(db, "convivencia"), (snap) => {
      setMetrics((prev) => ({ ...prev, testCompletados: snap.size }));
      setConvivDocs(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
    });

    const unsubVerif = onSnapshot(
      query(collection(db, "usuarios"), where("verificacionEstado", "==", "pendiente")),
      (snap) => {
        setVerificaciones(snap.docs.map((d) => ({ uid: d.id, ...d.data() })));
      }
    );

    const unsubReportes = onSnapshot(
      query(collection(db, "reportes"), where("estado", "==", "pendiente")),
      (snap) => {
        setReportes(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
      }
    );

    const unsubFeedback = onSnapshot(
      query(collection(db, "feedback"), orderBy("fecha", "desc")),
      (snap) => setFeedback(snap.docs.map((d) => ({ id: d.id, ...d.data() })))
    );

    return () => { unsubMatches(); unsubConvivencia(); unsubVerif(); unsubReportes(); unsubFeedback(); };
  }, [isAdmin]);

  const ignorarReporte = async (reporteId) => {
    await updateDoc(doc(db, "reportes", reporteId), { estado: "ignorado" });
  };

  const advertirUsuario = async (reporteId, reportadoUid) => {
    await Promise.all([
      updateDoc(doc(db, "reportes", reporteId), { estado: "advertido" }),
      updateDoc(doc(db, "usuarios", reportadoUid), { advertencias: increment(1) }),
    ]);
  };

  const suspenderCuenta = async (reporteId, reportadoUid, reportadoEmail, fingerprint) => {
    await Promise.all([
      updateDoc(doc(db, "reportes", reporteId), { estado: "resuelto" }),
      updateDoc(doc(db, "usuarios", reportadoUid), {
        suspendido: true,
        suspendidoEmail: reportadoEmail,
        suspendidoFingerprint: fingerprint || "",
      }),
    ]);
  };

  const abrirModal = async (u) => {
    setModalUsuario(u);
    const snap = await getDoc(doc(db, "convivencia", u.uid));  // convivencia sigue igual
    setConvivenciaModal(snap.exists() ? snap.data() : null);
  };
  const cerrarModal = () => { setModalUsuario(null); setConvivenciaModal(null); };

  // ── Acceso denegado ──
  if (!isAdmin) {
    return (
      <div style={s.fullCenter}>
        <div style={s.denegadoBox}>
          <span style={{ fontSize: "52px" }}>🚫</span>
          <h2 style={s.denegadoTitle}>Acceso denegado</h2>
          <p style={s.denegadoText}>No tienes permisos de administrador.</p>
          <button style={s.closeBtn} onClick={onClose}>Volver</button>
        </div>
      </div>
    );
  }

  // Datos para modales de métricas
  const weekAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const usuariosNuevos = usuarios.filter((u) => { const f = extraerFecha(u); return f && f >= weekAgo; });

  // ── Panel admin ──
  return (
    <div style={s.container}>
      {/* Header */}
      <div style={s.header}>
        <div>
          <h1 style={s.headerTitle}>⚙️ Panel de administración</h1>
          <p style={s.headerSub}>Bienvenido, {user.displayName || user.email}</p>
        </div>
        <button style={s.closeBtn} onClick={onClose}>✕ Cerrar panel</button>
      </div>

      {/* Métricas */}
      <div style={s.metricsGrid}>
        <MetricCard titulo="Total usuarios"    valor={metrics.usuarios}       icono="👥" color="#7c3aed" onClick={() => setMetricModal("usuarios")} />
        <MetricCard titulo="Nuevos esta semana" valor={metrics.nuevos}         icono="🆕" color="#2563eb" onClick={() => setMetricModal("nuevos")} />
        <MetricCard titulo="Conexiones totales" valor={metrics.matches}        icono="💚" color="#16a34a" onClick={() => setMetricModal("matches")} />
        <MetricCard titulo="Test completado"   valor={metrics.testCompletados} icono="✅" color="#ca8a04" onClick={() => setMetricModal("test")} />
      </div>

      {/* Tabla usuarios */}
      <div style={s.tableSection}>
        <h2 style={s.sectionTitle}>Usuarios registrados</h2>
        <div style={s.tableWrapper}>
          <table style={s.table}>
            <thead>
              <tr>
                {["Foto", "Nombre", "Email", "Ciudad", "Presupuesto", "Registro"].map((col) => (
                  <th key={col} style={s.th}>{col}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {usuarios.map((u) => (
                <tr key={u.uid} style={s.tr} onClick={() => abrirModal(u)}>
                  <td style={s.td}>
                    <div style={s.tableAvatar}>
                      <img src={u.photoURL || getAvatarDefault(u.sexo)} alt={u.nombre} style={s.tableAvatarImg} referrerPolicy="no-referrer" />
                    </div>
                  </td>
                  <td style={s.td}>{u.nombre || "—"}</td>
                  <td style={{ ...s.td, color: "#9ca3af", fontSize: "12px" }}>{u.email || "—"}</td>
                  <td style={s.td}>{u.ciudad || "—"}</td>
                  <td style={s.td}>{u.presupuesto ? `${u.presupuesto} €` : "—"}</td>
                  <td style={{ ...s.td, color: "#9ca3af", fontSize: "12px" }}>
                    {fmtFechaHora(extraerFecha(u))}
                  </td>
                </tr>
              ))}
              {usuarios.length === 0 && (
                <tr><td colSpan={6} style={{ ...s.td, textAlign: "center", color: "#6b7280" }}>Sin usuarios</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Verificaciones pendientes */}
      <div style={s.tableSection}>
        <h2 style={s.sectionTitle}>
          Verificaciones pendientes 🔍
          {verificaciones.length > 0 && (
            <span style={s.verifContador}>{verificaciones.length}</span>
          )}
        </h2>
        {verificaciones.length === 0 ? (
          <p style={s.verifVacia}>No hay verificaciones pendientes ✅</p>
        ) : (
          <div style={s.verifGrid}>
            {verificaciones.map((u) => (
              <VerifCard key={u.uid} usuario={u} />
            ))}
          </div>
        )}
      </div>

      {/* Reportes recibidos */}
      <div style={s.tableSection}>
        <h2 style={s.sectionTitle}>
          Reportes recibidos 🚨
          {reportes.length > 0 && (
            <span style={s.verifContador}>{reportes.length}</span>
          )}
        </h2>
        {reportes.length === 0 ? (
          <p style={s.verifVacia}>No hay reportes pendientes ✅</p>
        ) : (
          <div style={s.verifGrid}>
            {reportes.map((r) => {
              const motivo = MOTIVOS_MAP[r.motivo] || { icono: "⚠️", titulo: r.motivo };
              return (
                <div key={r.id} style={s.reporteCard}>
                  {/* Usuarios involucrados */}
                  <div style={s.reporteUsuarios}>
                    <div style={s.reporteUserCol}>
                      <div style={s.verifCardAvatar}>
                        <span style={{ fontSize: "18px" }}>👤</span>
                      </div>
                      <div>
                        <p style={{ ...s.verifCardNombre, fontSize: "13px" }}>{r.reportadoNombre || r.reportadoUid}</p>
                        <p style={s.verifCardEmail}>{r.reportadoEmail}</p>
                        <span style={s.reporteEtiqueta}>Reportado</span>
                      </div>
                    </div>
                    <span style={{ color: "#6b7280", fontSize: "18px" }}>→</span>
                    <div style={s.reporteUserCol}>
                      <div style={s.verifCardAvatar}>
                        <span style={{ fontSize: "18px" }}>👤</span>
                      </div>
                      <div>
                        <p style={{ ...s.verifCardNombre, fontSize: "13px" }}>{nombrePorUid(r.reportadorUid, usuarios)}</p>
                        <span style={s.reporteEtiquetaReportador}>Reportador</span>
                      </div>
                    </div>
                  </div>

                  {/* Motivo */}
                  <div style={s.reporteMotivo}>
                    <span style={{ fontSize: "20px" }}>{motivo.icono}</span>
                    <span style={s.reporteMotivoTexto}>{motivo.titulo}</span>
                  </div>

                  {/* Descripción */}
                  {r.descripcion && (
                    <p style={s.reporteDescripcion}>"{r.descripcion}"</p>
                  )}

                  {/* Prueba */}
                  {r.pruebaURL && (
                    <img
                      src={r.pruebaURL}
                      alt="prueba"
                      style={s.reportePrueba}
                      onClick={() => setFotoReporteAmpliada(r.pruebaURL)}
                    />
                  )}

                  {/* Fecha */}
                  <p style={s.reporteFecha}>
                    {r.fechaReporte
                      ? fmtFechaHora(r.fechaReporte)
                      : "—"}
                  </p>

                  {/* Acciones */}
                  <div style={s.verifBotones}>
                    <button style={s.reporteBtnIgnorar} onClick={() => ignorarReporte(r.id)}>
                      👁️ Ignorar
                    </button>
                    <button style={s.reporteBtnAdvertir} onClick={() => advertirUsuario(r.id, r.reportadoUid)}>
                      ⚠️ Advertir
                    </button>
                    <button style={s.reporteBtnSuspender} onClick={() => suspenderCuenta(r.id, r.reportadoUid, r.reportadoEmail, r.fingerprint)}>
                      🚫 Suspender
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Feedback recibido */}
      <div style={s.tableSection}>
        <h2 style={s.sectionTitle}>Feedback recibido ⭐</h2>
        {feedback.length === 0 ? (
          <p style={s.verifVacia}>No hay feedback todavía</p>
        ) : (
          <div style={s.tableWrapper}>
            <table style={s.table}>
              <thead>
                <tr>
                  {["Valoración", "Comentario", "Email", "Origen", "Fecha"].map((col) => (
                    <th key={col} style={s.th}>{col}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {feedback.map((fb) => (
                  <tr key={fb.id} style={s.tr}>
                    <td style={s.td}>
                      <span style={{ fontSize: "16px" }}>
                        {"⭐".repeat(Math.min(fb.estrellas || 0, 5))}
                      </span>
                    </td>
                    <td style={{ ...s.td, maxWidth: "260px", whiteSpace: "normal", lineHeight: "1.4" }}>
                      {fb.comentario || "—"}
                    </td>
                    <td style={{ ...s.td, color: "#9ca3af", fontSize: "12px" }}>{fb.email || "—"}</td>
                    <td style={{ ...s.td, fontSize: "12px" }}>
                      <span style={{
                        background: fb.origen === "landing" ? "#eff6ff" : "#f5f3ff",
                        color: fb.origen === "landing" ? "#1d4ed8" : "#7c3aed",
                        padding: "2px 8px", borderRadius: "10px", fontWeight: "600", fontSize: "11px",
                      }}>
                        {fb.origen || "—"}
                      </span>
                    </td>
                    <td style={{ ...s.td, color: "#9ca3af", fontSize: "12px" }}>
                      {fmtFechaHora(fb.fecha)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Modal detalle usuario */}
      {modalUsuario && (
        <div style={s.modalOverlay} onClick={cerrarModal}>
          <div style={s.modal} onClick={(e) => e.stopPropagation()}>
            <button style={s.modalClose} onClick={cerrarModal}>✕</button>
            <div style={s.modalAvatarWrap}>
              <img src={modalUsuario.photoURL || getAvatarDefault(modalUsuario.sexo)} alt={modalUsuario.nombre} style={s.modalAvatar} referrerPolicy="no-referrer" />
            </div>
            <h2 style={s.modalNombre}>{modalUsuario.nombre}</h2>
            <p style={s.modalEmail}>{modalUsuario.email}</p>
            <div style={s.modalChips}>
              {[
                ["🎂", `${modalUsuario.edad} años`],
                ["📍", modalUsuario.ciudad],
                ["💶", `${modalUsuario.presupuesto} €/mes`],
                modalUsuario.sexo && ["⚧", modalUsuario.sexo],
              ].filter(Boolean).map(([ico, val]) => (
                <span key={val} style={s.modalChip}>{ico} {val}</span>
              ))}
            </div>
            {modalUsuario.bio && <p style={s.modalBio}>"{modalUsuario.bio}"</p>}
            <p style={s.modalFecha}>
              Registrado el {extraerFecha(modalUsuario)
                ? extraerFecha(modalUsuario).toLocaleDateString("es-ES", { day: "numeric", month: "long", year: "numeric" })
                : "—"}
            </p>
            <div style={s.testSection}>
              <h3 style={s.testTitle}>Test de convivencia</h3>
              {convivenciaModal ? (
                <div style={s.testGrid}>
                  {Object.entries(LABELS_CONVIVENCIA).map(([key, label]) => (
                    convivenciaModal[key] !== undefined && (
                      <div key={key} style={s.testRow}>
                        <span style={s.testLabel}>{label}</span>
                        <span style={s.testValor}>{String(convivenciaModal[key])}</span>
                      </div>
                    )
                  ))}
                </div>
              ) : (
                <p style={{ color: "#6b7280", fontSize: "13px" }}>No ha completado el test.</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal métricas */}
      {metricModal && (
        <div style={s.modalOverlay} onClick={() => setMetricModal(null)}>
          <div style={{ ...s.modal, maxWidth: "520px" }} onClick={(e) => e.stopPropagation()}>
            <button style={s.modalClose} onClick={() => setMetricModal(null)}>✕</button>

            {metricModal === "usuarios" && (
              <>
                <h2 style={s.modalNombre}>👥 Total usuarios</h2>
                <p style={s.metricModalSub}>{usuarios.length} usuarios registrados</p>
                <div style={s.metricList}>
                  {usuarios.map((u) => (
                    <div key={u.uid} style={s.metricRow}>
                      <div style={s.metricAvatar}>
                        <img src={u.photoURL || getAvatarDefault(u.sexo)} alt={u.nombre} style={s.metricAvatarImg} referrerPolicy="no-referrer" />
                      </div>
                      <div style={s.metricRowInfo}>
                        <span style={s.metricRowNombre}>{u.nombre || "—"}</span>
                        <span style={s.metricRowSub}>{u.email || "—"} · {u.ciudad || "—"}</span>
                      </div>
                      <span style={s.metricRowFecha}>{fmtFechaHora(extraerFecha(u))}</span>
                    </div>
                  ))}
                  {usuarios.length === 0 && <p style={s.metricVacio}>Sin datos</p>}
                </div>
              </>
            )}

            {metricModal === "nuevos" && (
              <>
                <h2 style={s.modalNombre}>🆕 Nuevos esta semana</h2>
                <p style={s.metricModalSub}>{usuariosNuevos.length} usuarios en los últimos 7 días</p>
                <div style={s.metricList}>
                  {usuariosNuevos.map((u) => (
                    <div key={u.uid} style={s.metricRow}>
                      <div style={s.metricAvatar}>
                        <img src={u.photoURL || getAvatarDefault(u.sexo)} alt={u.nombre} style={s.metricAvatarImg} referrerPolicy="no-referrer" />
                      </div>
                      <div style={s.metricRowInfo}>
                        <span style={s.metricRowNombre}>{u.nombre || "—"}</span>
                        <span style={s.metricRowSub}>{u.email || "—"}</span>
                      </div>
                      <span style={s.metricRowFecha}>{fmtFechaHora(extraerFecha(u))}</span>
                    </div>
                  ))}
                  {usuariosNuevos.length === 0 && <p style={s.metricVacio}>Ningún usuario nuevo esta semana</p>}
                </div>
              </>
            )}

            {metricModal === "matches" && (
              <>
                <h2 style={s.modalNombre}>💚 Conexiones totales</h2>
                <p style={s.metricModalSub}>{matchesDocs.length} matches</p>
                <div style={s.metricList}>
                  {matchesDocs.map((m) => {
                    // Soporta tanto { user1, user2 } como { users: [uid1, uid2] }
                    const uid1 = m.user1 ?? m.users?.[0];
                    const uid2 = m.user2 ?? m.users?.[1];
                    return (
                      <div key={m.id} style={s.metricRow}>
                        <span style={{ fontSize: "20px" }}>💚</span>
                        <div style={s.metricRowInfo}>
                          <span style={s.metricRowNombre}>
                            {nombrePorUid(uid1, usuarios)} &amp; {nombrePorUid(uid2, usuarios)}
                          </span>
                        </div>
                        <span style={s.metricRowFecha}>{fmtFechaHora(m.timestamp)}</span>
                      </div>
                    );
                  })}
                  {matchesDocs.length === 0 && <p style={s.metricVacio}>Sin matches todavía</p>}
                </div>
              </>
            )}

            {metricModal === "test" && (
              <>
                <h2 style={s.modalNombre}>✅ Test completado</h2>
                <p style={s.metricModalSub}>{convivDocs.length} usuarios con test</p>
                <div style={s.metricList}>
                  {convivDocs.map((c) => {
                    const u = usuarios.find((u) => u.uid === c.uid) || {};
                    return (
                      <div key={c.uid} style={s.metricRow}>
                        <div style={s.metricAvatar}>
                          <img src={u.photoURL || getAvatarDefault(u.sexo)} alt={u.nombre} style={s.metricAvatarImg} referrerPolicy="no-referrer" />
                        </div>
                        <div style={s.metricRowInfo}>
                          <span style={s.metricRowNombre}>{u.nombre || c.uid}</span>
                        </div>
                        <span style={s.metricRowFecha}>{fmtFechaHora(c.completadoEn)}</span>
                      </div>
                    );
                  })}
                  {convivDocs.length === 0 && <p style={s.metricVacio}>Nadie ha completado el test todavía</p>}
                </div>
              </>
            )}
          </div>
        </div>
      )}
      {fotoReporteAmpliada && (
        <div style={s.fotoModalOverlay} onClick={() => setFotoReporteAmpliada(null)}>
          <button style={s.fotoModalClose} onClick={() => setFotoReporteAmpliada(null)}>✕</button>
          <img src={fotoReporteAmpliada} alt="prueba ampliada" style={s.fotoModalImg} onClick={(e) => e.stopPropagation()} />
        </div>
      )}
    </div>
  );
}

function VerifCard({ usuario }) {
  const [fotos, setFotos]             = useState([null, null, null]);
  const [accionando, setAccionando]   = useState(false);
  const [fotoAmpliada, setFotoAmpliada] = useState(null);

  useEffect(() => {
    const cargarFotos = async () => {
      const urls = await Promise.all(
        [1, 2, 3].map(async (i) => {
          try {
            return await getDownloadURL(ref(storage, `verificaciones/${usuario.uid}/foto${i}`));
          } catch {
            return null;
          }
        })
      );
      setFotos(urls);
    };
    cargarFotos();
  }, [usuario.uid]);

  const actualizar = async (estado) => {
    setAccionando(true);
    try {
      await updateDoc(doc(db, "usuarios", usuario.uid), { verificacionEstado: estado });
    } finally {
      setAccionando(false);
    }
  };

  return (
    <div style={s.verifCard}>
      <div style={s.verifCardHeader}>
        <div style={s.verifCardAvatar}>
          <img src={usuario.photoURL || getAvatarDefault(usuario.sexo)} alt={usuario.nombre} style={s.verifCardAvatarImg} referrerPolicy="no-referrer" />
        </div>
        <div>
          <p style={s.verifCardNombre}>{usuario.nombre || "—"}</p>
          <p style={s.verifCardEmail}>{usuario.email || "—"}</p>
          {usuario.verificacionFecha && (
            <p style={s.verifCardFecha}>
              Solicitado el {new Date(usuario.verificacionFecha.seconds * 1000).toLocaleDateString("es-ES", { day: "numeric", month: "short", year: "numeric" })}
            </p>
          )}
        </div>
      </div>

      <div style={s.verifFotosRow}>
        {fotos.map((url, i) => (
          url
            ? (
              <img
                key={i}
                src={url}
                alt={`foto ${i + 1}`}
                style={s.verifFoto}
                onClick={() => setFotoAmpliada(url)}
              />
            )
            : <div key={i} style={s.verifFotoPlaceholder}><span style={{ fontSize: "20px", color: "#6b7280" }}>📷</span></div>
        ))}
      </div>

      <div style={s.verifBotones}>
        <button
          style={{ ...s.verifBtnAprobar, opacity: accionando ? 0.5 : 1 }}
          onClick={() => actualizar("verificado")}
          disabled={accionando}
        >
          ✅ Aprobar
        </button>
        <button
          style={{ ...s.verifBtnRechazar, opacity: accionando ? 0.5 : 1 }}
          onClick={() => actualizar("rechazado")}
          disabled={accionando}
        >
          ❌ Rechazar
        </button>
      </div>

      {/* Modal foto ampliada */}
      {fotoAmpliada && (
        <div style={s.fotoModalOverlay} onClick={() => setFotoAmpliada(null)}>
          <button style={s.fotoModalClose} onClick={() => setFotoAmpliada(null)}>✕</button>
          <img
            src={fotoAmpliada}
            alt="foto ampliada"
            style={s.fotoModalImg}
            onClick={(e) => e.stopPropagation()}
          />
        </div>
      )}
    </div>
  );
}

function MetricCard({ titulo, valor, icono, color, onClick }) {
  return (
    <div style={{ ...s.metricCard, borderColor: color, cursor: "pointer" }} onClick={onClick}>
      <span style={{ fontSize: "28px" }}>{icono}</span>
      <span style={{ ...s.metricValor, color }}>{valor}</span>
      <span style={s.metricTitulo}>{titulo}</span>
      <span style={{ fontSize: "10px", color: "#6b7280", marginTop: "2px" }}>Ver detalle →</span>
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#ffffff",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "0 0 40px 0",
  },
  fullCenter: {
    minHeight: "100vh",
    background: "#0f0f0f",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "5px solid rgba(124,58,237,0.3)",
    borderTop: "5px solid #7c3aed",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  denegadoBox: {
    background: "#1a1a1a",
    border: "1px solid #7c3aed",
    borderRadius: "24px",
    padding: "48px 36px",
    textAlign: "center",
    maxWidth: "320px",
  },
  denegadoTitle: {
    margin: "12px 0 8px",
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
  },
  denegadoText: {
    margin: "0 0 24px",
    fontSize: "14px",
    color: "#9ca3af",
  },
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "28px 28px 20px",
    borderBottom: "1px solid #2a2a2a",
  },
  headerTitle: {
    margin: "0 0 4px 0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
  },
  headerSub: {
    margin: 0,
    fontSize: "13px",
    color: "#9ca3af",
  },
  closeBtn: {
    padding: "10px 20px",
    borderRadius: "12px",
    border: "1px solid #7c3aed",
    background: "transparent",
    color: "#7c3aed",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
  },
  metricsGrid: {
    display: "grid",
    gridTemplateColumns: "repeat(2, 1fr)",
    gap: "14px",
    padding: "24px 20px 8px",
  },
  metricCard: {
    background: "#1a1a1a",
    borderRadius: "16px",
    border: "1px solid",
    padding: "20px 16px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    transition: "background 0.15s",
  },
  metricValor: {
    fontSize: "36px",
    fontWeight: "800",
    lineHeight: 1,
  },
  metricTitulo: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: "600",
    textAlign: "center",
  },
  tableSection: {
    padding: "24px 20px 0",
  },
  sectionTitle: {
    margin: "0 0 14px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff",
  },
  tableWrapper: {
    overflowX: "auto",
    borderRadius: "16px",
    border: "1px solid #2a2a2a",
  },
  table: {
    width: "100%",
    borderCollapse: "collapse",
    background: "#1a1a1a",
  },
  th: {
    padding: "12px 14px",
    textAlign: "left",
    fontSize: "11px",
    fontWeight: "700",
    color: "#7c3aed",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    borderBottom: "1px solid #2a2a2a",
    whiteSpace: "nowrap",
  },
  tr: {
    cursor: "pointer",
    transition: "background 0.15s",
  },
  td: {
    padding: "12px 14px",
    fontSize: "13px",
    color: "#e5e7eb",
    borderBottom: "1px solid #2a2a2a",
    whiteSpace: "nowrap",
  },
  tableAvatar: {
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  tableAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  tableAvatarLetra: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#ffffff",
  },
  // Modales base
  modalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 999,
    padding: "20px",
  },
  modal: {
    background: "#1a1a1a",
    border: "1px solid #7c3aed",
    borderRadius: "24px",
    padding: "32px 28px",
    maxWidth: "420px",
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
    position: "relative",
  },
  modalClose: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "18px",
    cursor: "pointer",
  },
  modalAvatarWrap: {
    display: "flex",
    justifyContent: "center",
    marginBottom: "16px",
  },
  modalAvatar: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    objectFit: "cover",
    border: "3px solid #7c3aed",
  },
  modalAvatarFallback: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    background: "#2a2a2a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "3px solid #7c3aed",
  },
  modalNombre: {
    margin: "0 0 4px 0",
    fontSize: "22px",
    fontWeight: "800",
    textAlign: "center",
    color: "#ffffff",
  },
  modalEmail: {
    margin: "0 0 16px 0",
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "center",
  },
  modalChips: {
    display: "flex",
    flexWrap: "wrap",
    gap: "8px",
    justifyContent: "center",
    marginBottom: "14px",
  },
  modalChip: {
    background: "#2a2a2a",
    border: "1px solid #3a3a3a",
    color: "#c4b5fd",
    fontSize: "12px",
    fontWeight: "600",
    padding: "4px 12px",
    borderRadius: "20px",
  },
  modalBio: {
    fontSize: "13px",
    color: "#9ca3af",
    fontStyle: "italic",
    textAlign: "center",
    lineHeight: "1.6",
    marginBottom: "10px",
  },
  modalFecha: {
    fontSize: "12px",
    color: "#6b7280",
    textAlign: "center",
    marginBottom: "20px",
  },
  testSection: {
    borderTop: "1px solid #2a2a2a",
    paddingTop: "16px",
  },
  testTitle: {
    margin: "0 0 12px 0",
    fontSize: "14px",
    fontWeight: "700",
    color: "#7c3aed",
  },
  testGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  testRow: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    padding: "8px 12px",
    background: "#0f0f0f",
    borderRadius: "10px",
  },
  testLabel: {
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: "500",
  },
  testValor: {
    fontSize: "12px",
    color: "#e5e7eb",
    fontWeight: "600",
    maxWidth: "55%",
    textAlign: "right",
  },
  // Modal métricas
  metricModalSub: {
    margin: "0 0 16px 0",
    fontSize: "13px",
    color: "#9ca3af",
    textAlign: "center",
  },
  metricList: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
  },
  metricRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    padding: "10px 12px",
    background: "#0f0f0f",
    borderRadius: "12px",
  },
  metricAvatar: {
    width: "36px",
    height: "36px",
    borderRadius: "50%",
    background: "#2a2a2a",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  metricAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  metricRowInfo: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    gap: "2px",
    minWidth: 0,
  },
  metricRowNombre: {
    fontSize: "13px",
    fontWeight: "700",
    color: "#ffffff",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metricRowSub: {
    fontSize: "11px",
    color: "#9ca3af",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  metricRowFecha: {
    fontSize: "11px",
    color: "#6b7280",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
  metricVacio: {
    color: "#6b7280",
    fontSize: "13px",
    textAlign: "center",
    padding: "16px 0",
  },
  // Verificaciones pendientes
  verifContador: {
    display: "inline-flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#ef4444",
    color: "#ffffff",
    fontSize: "11px",
    fontWeight: "800",
    borderRadius: "99px",
    padding: "1px 8px",
    marginLeft: "10px",
    verticalAlign: "middle",
  },
  verifVacia: {
    color: "#6b7280",
    fontSize: "14px",
    padding: "16px 0",
  },
  verifGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "16px",
  },
  verifCard: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "20px",
    position: "relative",
  },
  verifCardHeader: {
    display: "flex",
    alignItems: "center",
    gap: "14px",
    marginBottom: "16px",
  },
  verifCardAvatar: {
    width: "48px",
    height: "48px",
    borderRadius: "50%",
    background: "#2a2a2a",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    flexShrink: 0,
  },
  verifCardAvatarImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  verifCardNombre: {
    margin: "0 0 2px 0",
    fontSize: "15px",
    fontWeight: "700",
    color: "#ffffff",
  },
  verifCardEmail: {
    margin: "0 0 2px 0",
    fontSize: "12px",
    color: "#9ca3af",
  },
  verifCardFecha: {
    margin: 0,
    fontSize: "11px",
    color: "#6b7280",
  },
  verifFotosRow: {
    display: "flex",
    gap: "10px",
    marginBottom: "16px",
  },
  verifFoto: {
    flex: 1,
    height: "100px",
    objectFit: "contain",
    borderRadius: "10px",
    border: "1px solid #3a3a3a",
    background: "#0f0f0f",
    cursor: "zoom-in",
  },
  verifFotoPlaceholder: {
    flex: 1,
    height: "100px",
    background: "#2a2a2a",
    borderRadius: "10px",
    border: "1px solid #3a3a3a",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  verifBotones: {
    display: "flex",
    gap: "10px",
  },
  verifBtnAprobar: {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "none",
    background: "#16a34a",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  verifBtnRechazar: {
    flex: 1,
    padding: "10px",
    borderRadius: "12px",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
  },
  // Reportes
  reporteCard: {
    background: "#1a1a1a",
    border: "1px solid #3a1a1a",
    borderRadius: "16px",
    padding: "20px",
  },
  reporteUsuarios: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "14px",
  },
  reporteUserCol: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    flex: 1,
  },
  reporteEtiqueta: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#ef4444",
    background: "#3a1a1a",
    padding: "2px 8px",
    borderRadius: "20px",
    display: "inline-block",
    marginTop: "2px",
  },
  reporteEtiquetaReportador: {
    fontSize: "10px",
    fontWeight: "700",
    color: "#9ca3af",
    background: "#2a2a2a",
    padding: "2px 8px",
    borderRadius: "20px",
    display: "inline-block",
    marginTop: "2px",
  },
  reporteMotivo: {
    display: "flex",
    alignItems: "center",
    gap: "10px",
    padding: "10px 14px",
    background: "#2a1a1a",
    borderRadius: "12px",
    marginBottom: "12px",
  },
  reporteMotivoTexto: {
    fontSize: "14px",
    fontWeight: "700",
    color: "#fca5a5",
  },
  reporteDescripcion: {
    fontSize: "13px",
    color: "#9ca3af",
    fontStyle: "italic",
    margin: "0 0 12px 0",
    lineHeight: "1.5",
  },
  reportePrueba: {
    width: "100%",
    maxHeight: "160px",
    objectFit: "contain",
    borderRadius: "10px",
    border: "1px solid #3a3a3a",
    background: "#0f0f0f",
    cursor: "zoom-in",
    marginBottom: "10px",
  },
  reporteFecha: {
    fontSize: "11px",
    color: "#6b7280",
    margin: "0 0 14px 0",
  },
  reporteBtnIgnorar: {
    flex: 1,
    padding: "9px 6px",
    borderRadius: "10px",
    border: "1px solid #3a3a3a",
    background: "#2a2a2a",
    color: "#9ca3af",
    fontSize: "12px",
    fontWeight: "600",
    cursor: "pointer",
  },
  reporteBtnAdvertir: {
    flex: 1,
    padding: "9px 6px",
    borderRadius: "10px",
    border: "none",
    background: "#92400e",
    color: "#fde68a",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  reporteBtnSuspender: {
    flex: 1,
    padding: "9px 6px",
    borderRadius: "10px",
    border: "none",
    background: "#dc2626",
    color: "#ffffff",
    fontSize: "12px",
    fontWeight: "700",
    cursor: "pointer",
  },
  // Modal foto ampliada
  fotoModalOverlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.92)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1100,
    padding: "20px",
  },
  fotoModalClose: {
    position: "fixed",
    top: "20px",
    right: "24px",
    background: "rgba(255,255,255,0.15)",
    border: "none",
    color: "#ffffff",
    fontSize: "22px",
    cursor: "pointer",
    borderRadius: "50%",
    width: "40px",
    height: "40px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1101,
  },
  fotoModalImg: {
    maxWidth: "100%",
    maxHeight: "90vh",
    objectFit: "contain",
    borderRadius: "12px",
    boxShadow: "0 8px 40px rgba(0,0,0,0.6)",
  },
};
