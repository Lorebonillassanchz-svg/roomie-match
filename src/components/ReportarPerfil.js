import { useState } from "react";
import { addDoc, collection, doc, serverTimestamp, updateDoc } from "firebase/firestore";
import { getDownloadURL, ref, uploadBytes } from "firebase/storage";
import { db, storage } from "../firebase";

const IconClose = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
  </svg>
);

const IconChevronRight = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="9 18 15 12 9 6"/>
  </svg>
);

const IconChevronLeft = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="15 18 9 12 15 6"/>
  </svg>
);

const IconCamera = () => (
  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);

const IconShield = () => (
  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
    <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
  </svg>
);

const IconCheckCircle = () => (
  <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="url(#cgGrad)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <defs>
      <linearGradient id="cgGrad" x1="0" y1="0" x2="1" y2="1">
        <stop offset="0%" stopColor="#f97316"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient>
    </defs>
    <path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);

const MOTIVOS = [
  {
    id: "falso",
    titulo: "Perfil falso",
    desc: "Foto o información que no corresponde a la persona real",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 12c2.7 0 4-1.3 4-4s-1.3-4-4-4-4 1.3-4 4 1.3 4 4 4zm0 2c-4 0-8 2-8 4v2h16v-2c0-2-4-4-8-4z"/>
        <line x1="18" y1="6" x2="22" y2="10"/><line x1="22" y1="6" x2="18" y2="10"/>
      </svg>
    ),
  },
  {
    id: "ofensivo",
    titulo: "Comportamiento ofensivo",
    desc: "Mensajes irrespetuosos o acoso en el chat",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>
        <line x1="12" y1="8" x2="12" y2="12"/><line x1="12" y1="16" x2="12.01" y2="16"/>
      </svg>
    ),
  },
  {
    id: "inapropiado",
    titulo: "Contenido inapropiado",
    desc: "Fotos o descripciones de carácter sexual o violento",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ),
  },
  {
    id: "spam",
    titulo: "Spam o estafa",
    desc: "Intento de obtener dinero o datos personales",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/>
        <line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/>
      </svg>
    ),
  },
  {
    id: "menor",
    titulo: "Menor de edad",
    desc: "El perfil aparenta ser de una persona menor de 18 años",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
        <circle cx="9" cy="7" r="4"/>
        <polyline points="23 11 19 15 17 13"/>
      </svg>
    ),
  },
  {
    id: "discriminacion",
    titulo: "Discriminación",
    desc: "Comentarios racistas, sexistas o de odio",
    Icon: () => (
      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z"/>
        <line x1="1" y1="1" x2="23" y2="23"/>
      </svg>
    ),
  },
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
        <button style={st.closeBtn} onClick={onCerrar} aria-label="Cerrar">
          <IconClose />
        </button>

        {/* PASO 0: Motivo */}
        {paso === 0 && (
          <>
            <div style={st.header}>
              <div style={st.shieldWrap}><IconShield /></div>
              <h2 style={st.title}>Reportar perfil</h2>
              <p style={st.subtitle}>Tu reporte es anónimo. Lo revisamos en menos de 48h.</p>
            </div>
            <div style={st.motivosGrid}>
              {MOTIVOS.map((m) => {
                const activo = motivoSeleccionado === m.id;
                return (
                  <div
                    key={m.id}
                    style={{
                      ...st.motivoCard,
                      ...(activo ? st.motivoCardActivo : {}),
                    }}
                    onClick={() => setMotivoSeleccionado(m.id)}
                  >
                    <span style={{ ...st.motivoIconoWrap, color: activo ? "#f97316" : "var(--app-text-muted, #6b7280)" }}>
                      <m.Icon />
                    </span>
                    <div>
                      <p style={{ ...st.motivoTitulo, color: activo ? "var(--app-text, #1a1a2e)" : "var(--app-text, #1a1a2e)" }}>{m.titulo}</p>
                      <p style={st.motivoDesc}>{m.desc}</p>
                    </div>
                  </div>
                );
              })}
            </div>
            <button
              style={{
                ...st.btnPrimary,
                background: motivoSeleccionado
                  ? "linear-gradient(135deg, #f97316, #7c3aed)"
                  : "var(--app-border, #e5e7eb)",
                color: motivoSeleccionado ? "#ffffff" : "var(--app-text-muted, #9ca3af)",
                cursor: motivoSeleccionado ? "pointer" : "default",
                boxShadow: motivoSeleccionado ? "0 4px 14px rgba(249,115,22,0.35)" : "none",
              }}
              disabled={!motivoSeleccionado}
              onClick={() => setPaso(1)}
            >
              Siguiente
              <IconChevronRight />
            </button>
          </>
        )}

        {/* PASO 1: Pruebas + descripción */}
        {paso === 1 && (
          <>
            <div style={st.header}>
              <div style={st.shieldWrap}><IconShield /></div>
              <h2 style={st.title}>Añade contexto</h2>
              <p style={st.subtitle}>Esto nos ayuda a resolver el caso más rápido (opcional)</p>
            </div>

            {imagenPreview ? (
              <div style={st.previewWrap}>
                <img src={imagenPreview} alt="prueba" style={st.previewImg} />
                <button style={st.quitarBtn} onClick={quitarImagen}>
                  <IconClose />
                </button>
              </div>
            ) : (
              <label style={st.uploadLabel}>
                <input
                  type="file"
                  accept="image/jpeg,image/png"
                  style={{ display: "none" }}
                  onChange={handleImagen}
                />
                <IconCamera />
                <span>Adjuntar captura de pantalla</span>
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
              <button style={st.btnSecondary} onClick={() => setPaso(0)}>
                <IconChevronLeft /> Atrás
              </button>
              <button
                style={{
                  ...st.btnPrimary,
                  flex: 2,
                  background: enviando
                    ? "var(--app-border, #e5e7eb)"
                    : "linear-gradient(135deg, #f97316, #7c3aed)",
                  color: enviando ? "var(--app-text-muted, #9ca3af)" : "#ffffff",
                  boxShadow: enviando ? "none" : "0 4px 14px rgba(249,115,22,0.35)",
                  opacity: enviando ? 0.7 : 1,
                }}
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
            <IconCheckCircle />
            <h2 style={st.title}>Reporte enviado</h2>
            <p style={st.bodyText}>
              Gracias por ayudar a mantener la comunidad segura. Revisaremos el caso en menos de 48 horas.
            </p>
            <p style={st.smallText}>
              Si el usuario infringe nuestras normas, su cuenta será suspendida.
            </p>
            <button
              style={{
                ...st.btnPrimary,
                background: "linear-gradient(135deg, #f97316, #7c3aed)",
                color: "#ffffff",
                boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
              }}
              onClick={onCerrar}
            >
              Cerrar
            </button>
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
    background: "rgba(0,0,0,0.75)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    zIndex: 1060,
    padding: "20px",
  },
  card: {
    background: "var(--app-surface, #ffffff)",
    border: "1px solid var(--app-border, #e5e7eb)",
    borderRadius: "24px",
    padding: "28px 24px 32px",
    maxWidth: "420px",
    width: "100%",
    maxHeight: "88vh",
    overflowY: "auto",
    position: "relative",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
    transition: "background 0.3s",
  },
  closeBtn: {
    position: "absolute",
    top: "14px",
    right: "14px",
    background: "var(--app-input-bg, #f9fafb)",
    border: "none",
    color: "var(--app-text-muted, #9ca3af)",
    width: "32px",
    height: "32px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "22px",
    gap: "6px",
  },
  shieldWrap: {
    width: "56px",
    height: "56px",
    borderRadius: "16px",
    background: "rgba(249,115,22,0.1)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "4px",
  },
  title: {
    margin: 0,
    fontSize: "22px",
    fontWeight: "800",
    color: "var(--app-text, #1a1a2e)",
    letterSpacing: "-0.3px",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "var(--app-text-muted, #6b7280)",
    lineHeight: "1.5",
  },
  motivosGrid: {
    display: "flex",
    flexDirection: "column",
    gap: "8px",
    marginBottom: "20px",
  },
  motivoCard: {
    display: "flex",
    alignItems: "flex-start",
    gap: "14px",
    padding: "14px 16px",
    background: "var(--app-input-bg, #f9fafb)",
    border: "1px solid var(--app-border, #e5e7eb)",
    borderRadius: "14px",
    cursor: "pointer",
    transition: "border-color 0.15s, background 0.15s",
  },
  motivoCardActivo: {
    border: "1.5px solid #f97316",
    background: "rgba(249,115,22,0.05)",
  },
  motivoIconoWrap: {
    flexShrink: 0,
    marginTop: "1px",
    transition: "color 0.15s",
  },
  motivoTitulo: {
    margin: "0 0 2px 0",
    fontSize: "14px",
    fontWeight: "700",
    color: "var(--app-text, #1a1a2e)",
  },
  motivoDesc: {
    margin: 0,
    fontSize: "12px",
    color: "var(--app-text-muted, #6b7280)",
    lineHeight: "1.4",
  },
  btnPrimary: {
    width: "100%",
    padding: "14px 16px",
    borderRadius: "14px",
    border: "none",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    marginTop: "4px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "6px",
    fontFamily: "inherit",
    transition: "opacity 0.2s",
  },
  btnSecondary: {
    flex: 1,
    padding: "14px 12px",
    borderRadius: "14px",
    border: "1.5px solid var(--app-border, #e5e7eb)",
    background: "transparent",
    color: "var(--app-text-muted, #6b7280)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "4px",
    fontFamily: "inherit",
  },
  botonesRow: {
    display: "flex",
    gap: "10px",
    marginTop: "4px",
  },
  uploadLabel: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "8px",
    width: "100%",
    padding: "13px",
    borderRadius: "14px",
    border: "1.5px dashed var(--app-border, #e5e7eb)",
    background: "var(--app-input-bg, #f9fafb)",
    color: "var(--app-text-muted, #6b7280)",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
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
    border: "1px solid var(--app-border, #e5e7eb)",
    background: "var(--app-input-bg, #f9fafb)",
  },
  quitarBtn: {
    position: "absolute",
    top: "6px",
    right: "6px",
    background: "rgba(0,0,0,0.5)",
    border: "none",
    color: "#ffffff",
    width: "28px",
    height: "28px",
    borderRadius: "50%",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  errorText: {
    margin: "0 0 8px 0",
    fontSize: "12px",
    color: "#ef4444",
    fontWeight: "600",
  },
  textarea: {
    width: "100%",
    minHeight: "90px",
    padding: "12px 14px",
    borderRadius: "14px",
    border: "1.5px solid var(--app-border, #e5e7eb)",
    background: "var(--app-surface, #ffffff)",
    color: "var(--app-text, #1a1a2e)",
    fontSize: "14px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    resize: "vertical",
    outline: "none",
    boxSizing: "border-box",
    marginTop: "4px",
    lineHeight: "1.5",
    transition: "border-color 0.2s",
  },
  charCounter: {
    margin: "4px 0 12px 0",
    fontSize: "11px",
    color: "var(--app-text-muted, #9ca3af)",
    textAlign: "right",
  },
  confirmacion: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    gap: "12px",
    paddingTop: "8px",
  },
  bodyText: {
    margin: 0,
    fontSize: "14px",
    color: "var(--app-text, #1a1a2e)",
    lineHeight: "1.6",
    maxWidth: "320px",
  },
  smallText: {
    margin: 0,
    fontSize: "12px",
    color: "var(--app-text-muted, #6b7280)",
    lineHeight: "1.5",
    maxWidth: "300px",
  },
};
