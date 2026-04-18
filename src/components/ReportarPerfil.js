import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";

const MOTIVOS = [
  { id: "falso",          icono: "🧢", titulo: "Perfil falso",            desc: "Foto o información que no corresponde a la persona real" },
  { id: "ofensivo",       icono: "💬", titulo: "Comportamiento ofensivo", desc: "Mensajes irrespetuosos o acoso en el chat" },
  { id: "inapropiado",    icono: "🔞", titulo: "Contenido inapropiado",   desc: "Fotos o descripciones de carácter sexual o violento" },
  { id: "spam",           icono: "💰", titulo: "Spam o estafa",           desc: "Intento de obtener dinero o datos personales" },
  { id: "menor",          icono: "👶", titulo: "Menor de edad",           desc: "El perfil aparenta ser de una persona menor de 18 años" },
  { id: "discriminacion", icono: "🚫", titulo: "Discriminación",          desc: "Comentarios racistas, sexistas o de odio" },
];

export default function ReportarPerfil({ usuario, reportadorUid, onCerrar }) {
  const [paso, setPaso] = useState(0);
  const [motivoSeleccionado, setMotivoSeleccionado] = useState(null);
  const [imagenFile, setImagenFile] = useState(null);
  const [imagenPreview, setImagenPreview] = useState(null);
  const [imagenError, setImagenError] = useState("");
  const [descripcion, setDescripcion] = useState("");
  const [enviando, setEnviando] = useState(false);

  const handleImagen = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setImagenError("La imagen supera el límite de 5 MB.");
      return;
    }
    setImagenError("");
    setImagenFile(file);
    setImagenPreview(URL.createObjectURL(file));
  };

  const quitarImagen = () => {
    setImagenFile(null);
    setImagenPreview(null);
    setImagenError("");
  };

  const enviarReporte = async () => {
    setEnviando(true);
    try {
      const fingerprint = `${navigator.userAgent} | ${window.screen.width}x${window.screen.height}`;
      const reporteRef = await addDoc(collection(db, "reportes"), {
        reportadoUid: usuario.uid,
        reportadoNombre: usuario.nombre || "",
        reportadoEmail: usuario.email || "",
        reportadorUid,
        motivo: motivoSeleccionado,
        descripcion: descripcion.trim(),
        fechaReporte: serverTimestamp(),
        estado: "pendiente",
        fingerprint,
      });
      if (imagenFile) {
        const storageRef = ref(storage, `reportes/${reporteRef.id}/prueba`);
        await uploadBytes(storageRef, imagenFile);
        const url = await getDownloadURL(storageRef);
        await updateDoc(doc(db, "reportes", reporteRef.id), { pruebaURL: url });
      }
      setPaso(2);
    } catch (err) {
      console.error("[ReportarPerfil] Error al enviar reporte:", err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={st.overlay}>
      <div style={st.card}>
        {/* Botón cerrar */}
        <button style={st.closeBtn} onClick={onCerrar} aria-label="Cerrar">✕</button>

        {/* Puntos de progreso */}
        <div style={st.dots}>
          {[0, 1, 2].map((i) => (
            <div key={i} style={{ ...st.dot, ...(i <= paso ? st.dotActive : {}) }} />
          ))}
        </div>

        {/* PASO 0: Motivo */}
        {paso === 0 && (
          <>
            <h2 style={st.title}>Reportar perfil ⚠️</h2>
            <p style={st.subtitle}>Tu reporte es anónimo. Lo revisaremos en menos de 48h.</p>
            <div style={st.motivosGrid}>
              {MOTIVOS.map((m) => (
                <div
                  key={m.id}
                  style={{
                    ...st.motivoCard,
                    ...(motivoSeleccionado === m.id ? st.motivoCardActivo : {}),
                  }}
                  onClick={() => setMotivoSeleccionado(m.id)}
                >
                  <span style={st.motivoIcono}>{m.icono}</span>
                  <div>
                    <p style={st.motivoTitulo}>{m.titulo}</p>
                    <p style={st.motivoDesc}>{m.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button
              style={{ ...st.btnPrimary, opacity: motivoSeleccionado ? 1 : 0.4 }}
              disabled={!motivoSeleccionado}
              onClick={() => setPaso(1)}
            >
              Siguiente →
            </button>
          </>
        )}

        {/* PASO 1: Pruebas */}
        {paso === 1 && (
          <>
            <h2 style={st.title}>¿Tienes alguna prueba? (opcional)</h2>
            <p style={st.subtitle}>Esto nos ayuda a resolver el caso más rápido</p>

            {imagenPreview ? (
              <div style={st.previewWrap}>
                <img src={imagenPreview} alt="prueba" style={st.previewImg} />
                <button style={st.quitarBtn} onClick={quitarImagen}>✕</button>
              </div>
            ) : (
              <label style={st.uploadLabel}>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: "none" }}
                  onChange={handleImagen}
                />
                📎 Adjuntar imagen
              </label>
            )}
            {imagenError && <p style={st.errorText}>{imagenError}</p>}

            <textarea
              style={st.textarea}
              placeholder="Describe brevemente lo ocurrido (opcional)"
              maxLength={300}
              value={descripcion}
              onChange={(e) => setDescripcion(e.target.value)}
            />
            <p style={st.charCounter}>{descripcion.length}/300</p>

            <div style={st.botonesRow}>
              <button style={st.btnSecondary} onClick={() => setPaso(0)}>← Atrás</button>
              <button
                style={{ ...st.btnPrimary, opacity: enviando ? 0.5 : 1 }}
                disabled={enviando}
                onClick={enviarReporte}
              >
                {enviando ? "Enviando…" : "Enviar reporte"}
              </button>
            </div>
          </>
        )}

        {/* PASO 2: Confirmación */}
        {paso === 2 && (
          <div style={st.confirmacion}>
            <span style={{ fontSize: "56px" }}>✅</span>
            <h2 style={st.title}>Reporte enviado</h2>
            <p style={st.bodyText}>
              Gracias por ayudar a mantener la comunidad segura. Revisaremos el caso en menos de 48 horas.
            </p>
            <p style={st.smallText}>
              Si el usuario infringe nuestras normas, su cuenta será suspendida.
            </p>
            <button style={st.btnPrimary} onClick={onCerrar}>Cerrar</button>
          </div>
        )}
      </div>
    </div>
  );
}

const st = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.8)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1050,
    padding: "20px",
  },
  card: {
    background: "#ffffff",
    border: "1px solid #7c3aed",
    borderRadius: "24px",
    padding: "28px",
    maxWidth: "420px",
    width: "100%",
    maxHeight: "85vh",
    overflowY: "auto",
    position: "relative",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#9ca3af",
    fontSize: "18px",
    cursor: "pointer",
    lineHeight: 1,
  },
  dots: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px",
  },
  dot: {
    width: "8px",
    height: "8px",
    borderRadius: "50%",
    background: "#e5e7eb",
  },
  dotActive: {
    background: "#7c3aed",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "20px",
    fontWeight: "800",
    color: "#1a1a2e",
    textAlign: "center",
  },
  subtitle: {
    margin: "0 0 20px 0",
    fontSize: "13px",
    color: "#6b7280",
    textAlign: "center",
    lineHeight: "1.5",
  },
  motivosGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "20px",
  },
  motivoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "12px",
    padding: "12px 14px",
    background: "#f9fafb",
    border: "1.5px solid #e5e7eb",
    borderRadius: "12px",
    cursor: "pointer",
  },
  motivoCardActivo: {
    border: "1.5px solid #7c3aed",
    background: "#f5f3ff",
  },
  motivoIcono: {
    fontSize: "22px",
    flexShrink: 0,
    marginTop: "1px",
  },
  motivoTitulo: {
    margin: "0 0 2px 0",
    fontSize: "14px",
    fontWeight: "700",
    color: "#1a1a2e",
  },
  motivoDesc: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: "1.4",
  },
  btnPrimary: {
    width: "100%",
    padding: "13px",
    borderRadius: "14px",
    border: "none",
    background: "#7c3aed",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
  },
  btnSecondary: {
    flex: 1,
    padding: "13px",
    borderRadius: "14px",
    border: "1.5px solid #e5e7eb",
    background: "transparent",
    color: "#6b7280",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
  },
  botonesRow: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  uploadLabel: {
    display: "block",
    width: "100%",
    padding: "12px",
    borderRadius: "12px",
    border: "1.5px dashed #e5e7eb",
    background: "#f9fafb",
    color: "#6b7280",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    textAlign: "center",
    marginBottom: "8px",
    boxSizing: "border-box",
  },
  previewWrap: {
    position: "relative",
    marginBottom: "12px",
  },
  previewImg: {
    width: "100%",
    maxHeight: "180px",
    objectFit: "contain",
    borderRadius: "12px",
    border: "1px solid #e5e7eb",
    background: "#f9fafb",
  },
  quitarBtn: {
    position: "absolute",
    top: "6px",
    right: "6px",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    color: "#ffffff",
    width: "26px",
    height: "26px",
    borderRadius: "50%",
    cursor: "pointer",
    fontSize: "14px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    color: "#dc2626",
    fontWeight: "600",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "12px",
    borderRadius: "12px",
    border: "1.5px solid #e5e7eb",
    background: "#f9fafb",
    color: "#1a1a2e",
    fontSize: "14px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    marginTop: "12px",
  },
  charCounter: {
    margin: "4px 0 0 0",
    fontSize: "11px",
    color: "#9ca3af",
    textAlign: "right",
  },
  confirmacion: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
  },
  bodyText: {
    margin: 0,
    fontSize: "14px",
    color: "#1a1a2e",
    lineHeight: "1.6",
    maxWidth: "320px",
  },
  smallText: {
    margin: 0,
    fontSize: "12px",
    color: "#6b7280",
    lineHeight: "1.5",
    maxWidth: "300px",
  },
};
