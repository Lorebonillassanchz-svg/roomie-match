import { useEffect, useState } from "react";
import {
  collection, doc, getDocs, getDoc, query, setDoc, where,
} from "firebase/firestore";
import { auth, db } from "../firebase";

const ETIQUETAS = [
  "Muy comunicativo", "Responsable", "Ordenado", "Puntual",
  "Respetuoso", "Flexible", "Buen ambiente", "Recomendable",
];

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

export default function Valoracion({ destinatario, matchId, onClose }) {
  const uid    = auth.currentUser.uid;
  const docId  = `${uid}_${destinatario.uid}`;

  const [estrellas, setEstrellas]               = useState(0);
  const [hover, setHover]                       = useState(0);
  const [etiquetas, setEtiquetas]               = useState([]);
  const [guardando, setGuardando]               = useState(false);
  const [guardado, setGuardado]                 = useState(false);
  const [cargando, setCargando]                 = useState(true);
  const [valoracionExistente, setValoracionExistente] = useState(null);
  const [modoEditar, setModoEditar]             = useState(false);

  useEffect(() => {
    getDoc(doc(db, "valoraciones", docId)).then((snap) => {
      if (snap.exists()) {
        const d = snap.data();
        setValoracionExistente(d);
        setEstrellas(d.estrellas);
        setEtiquetas(d.etiquetas || []);
      }
      setCargando(false);
    });
  }, [docId]);

  const toggleEtiqueta = (e) =>
    setEtiquetas((prev) =>
      prev.includes(e) ? prev.filter((x) => x !== e) : [...prev, e]
    );

  const guardar = async () => {
    if (!estrellas) return;
    setGuardando(true);
    try {
      await setDoc(doc(db, "valoraciones", docId), {
        autorUid:        uid,
        destinatarioUid: destinatario.uid,
        estrellas,
        etiquetas,
        fecha:           new Date().toISOString(),
        conversacionId:  matchId,
      });

      // Recalcular media en users/{destinatario.uid}
      const snap = await getDocs(
        query(collection(db, "valoraciones"), where("destinatarioUid", "==", destinatario.uid))
      );
      const media = snap.docs.reduce((acc, d) => acc + d.data().estrellas, 0) / snap.size;
      await setDoc(doc(db, "users", destinatario.uid), {
        valoracionMedia:    Math.round(media * 10) / 10,
        totalValoraciones:  snap.size,
      }, { merge: true });

      setGuardado(true);
      setValoracionExistente({ estrellas, etiquetas });
      setModoEditar(false);
    } catch (err) {
      console.error("[Valoracion]", err);
    } finally {
      setGuardando(false);
    }
  };

  const mostrarFormulario = !valoracionExistente || modoEditar;

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <button style={s.closeBtn} onClick={onClose}>✕</button>

        {/* Cabecera */}
        <div style={s.header}>
          <div style={s.avatar}>
            {esFirebasePhoto(destinatario.photoURL)
              ? <img src={destinatario.photoURL} alt={destinatario.nombre} style={s.avatarImg} referrerPolicy="no-referrer" />
              : <span style={s.avatarLetra}>{destinatario.nombre?.[0]?.toUpperCase() || "?"}</span>
            }
          </div>
          <h3 style={s.titulo}>
            ¿Cómo fue tu experiencia<br />con <strong>{destinatario.nombre}</strong>?
          </h3>
        </div>

        {cargando ? (
          <p style={s.cargando}>Cargando…</p>
        ) : guardado ? (
          <div style={s.exito}>
            <span style={{ fontSize: "40px" }}>🎉</span>
            <p style={s.exitoTexto}>¡Valoración enviada! Gracias por tu opinión.</p>
            <button style={s.btnPrimario} onClick={onClose}>Cerrar</button>
          </div>
        ) : !mostrarFormulario ? (
          /* Modo lectura */
          <div style={s.lecturaWrap}>
            <div style={s.estrellasFijas}>
              {"★".repeat(valoracionExistente.estrellas)}
              <span style={s.estrellasVacias}>{"★".repeat(5 - valoracionExistente.estrellas)}</span>
            </div>
            {valoracionExistente.etiquetas?.length > 0 && (
              <div style={s.etiquetasWrap}>
                {valoracionExistente.etiquetas.map((e) => (
                  <span key={e} style={s.etiquetaActiva}>{e}</span>
                ))}
              </div>
            )}
            <p style={s.yaValorado}>Ya has valorado a {destinatario.nombre}.</p>
            <button style={s.btnEditar} onClick={() => setModoEditar(true)}>
              ✏️ Editar valoración
            </button>
          </div>
        ) : (
          /* Formulario */
          <>
            {/* Estrellas */}
            <div style={s.estrellas}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  style={{
                    ...s.estrella,
                    color: (hover || estrellas) >= n ? "#f59e0b" : "#334155",
                    transform: (hover || estrellas) >= n ? "scale(1.2)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHover(n)}
                  onMouseLeave={() => setHover(0)}
                  onClick={() => setEstrellas(n)}
                >
                  ★
                </button>
              ))}
            </div>
            {estrellas > 0 && (
              <p style={s.estrellasLabel}>
                {["", "Muy malo", "Malo", "Regular", "Bueno", "Excelente"][estrellas]}
              </p>
            )}

            {/* Etiquetas */}
            <div style={s.etiquetasWrap}>
              {ETIQUETAS.map((e) => (
                <button
                  key={e}
                  type="button"
                  style={{
                    ...s.etiqueta,
                    ...(etiquetas.includes(e) ? s.etiquetaActiva : {}),
                  }}
                  onClick={() => toggleEtiqueta(e)}
                >
                  {e}
                </button>
              ))}
            </div>

            <button
              style={{
                ...s.btnPrimario,
                opacity: !estrellas || guardando ? 0.45 : 1,
                cursor:  !estrellas || guardando ? "not-allowed" : "pointer",
              }}
              disabled={!estrellas || guardando}
              onClick={guardar}
            >
              {guardando ? "Enviando…" : "Enviar valoración"}
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "flex-end", justifyContent: "center",
    zIndex: 500,
  },
  modal: {
    background: "#1e293b",
    borderRadius: "24px 24px 0 0",
    padding: "28px 24px 40px",
    width: "100%", maxWidth: "480px",
    position: "relative",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  closeBtn: {
    position: "absolute", top: "16px", right: "16px",
    background: "none", border: "none",
    color: "#64748b", fontSize: "18px", cursor: "pointer",
  },
  header: {
    display: "flex", alignItems: "center",
    gap: "14px", marginBottom: "22px",
  },
  avatar: {
    width: "48px", height: "48px", borderRadius: "50%",
    background: "rgba(255,255,255,0.1)",
    overflow: "hidden", display: "flex",
    alignItems: "center", justifyContent: "center", flexShrink: 0,
  },
  avatarImg:   { width: "100%", height: "100%", objectFit: "cover" },
  avatarLetra: { fontSize: "20px", fontWeight: "700", color: "#ffffff" },
  titulo: {
    margin: 0, fontSize: "16px", fontWeight: "700",
    color: "#f1f5f9", lineHeight: "1.4",
  },
  cargando: { color: "#64748b", textAlign: "center", padding: "20px 0" },
  estrellas: {
    display: "flex", justifyContent: "center",
    gap: "6px", marginBottom: "8px",
  },
  estrella: {
    background: "none", border: "none",
    fontSize: "40px", cursor: "pointer", padding: 0,
    lineHeight: 1, transition: "color 0.1s, transform 0.15s",
  },
  estrellasLabel: {
    textAlign: "center", margin: "0 0 18px",
    fontSize: "13px", fontWeight: "600", color: "#94a3b8",
  },
  etiquetasWrap: {
    display: "flex", flexWrap: "wrap",
    gap: "8px", marginBottom: "22px",
  },
  etiqueta: {
    padding: "7px 14px", borderRadius: "20px",
    border: "1.5px solid #334155", background: "transparent",
    color: "#94a3b8", fontSize: "13px", fontWeight: "500",
    cursor: "pointer", transition: "all 0.15s",
  },
  etiquetaActiva: {
    border: "1.5px solid #7c3aed",
    background: "rgba(124,58,237,0.15)",
    color: "#c4b5fd", fontWeight: "600",
    // When used as standalone span (lectura)
    padding: "5px 12px", borderRadius: "20px",
    fontSize: "12px", display: "inline-block",
  },
  btnPrimario: {
    width: "100%", padding: "14px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    transition: "opacity 0.2s",
  },
  btnEditar: {
    width: "100%", padding: "12px", borderRadius: "14px",
    border: "1.5px solid #334155", background: "transparent",
    color: "#94a3b8", fontSize: "14px", fontWeight: "600",
    cursor: "pointer",
  },
  lecturaWrap: {
    display: "flex", flexDirection: "column", gap: "14px",
  },
  estrellasFijas: {
    fontSize: "32px", color: "#f59e0b",
    textAlign: "center", letterSpacing: "2px",
  },
  estrellasVacias: { color: "#334155" },
  yaValorado: {
    textAlign: "center", margin: 0,
    fontSize: "13px", color: "#64748b",
  },
  exito: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "12px", paddingTop: "8px",
  },
  exitoTexto: {
    margin: 0, fontSize: "15px", fontWeight: "600",
    color: "#f1f5f9", textAlign: "center",
  },
};
