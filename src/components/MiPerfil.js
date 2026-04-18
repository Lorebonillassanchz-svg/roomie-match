import { useRef, useState } from "react";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const INSTRUCCIONES_VERIF = [
  { texto: "Mira al frente y sonríe",      emoji: "😊" },
  { texto: "Gira la cabeza a la derecha",  emoji: "➡️" },
  { texto: "Ahora mira hacia arriba",       emoji: "⬆️" },
];

export default function MiPerfil({ profile, onProfileUpdated }) {
  // ─── Estado perfil ────────────────────────────────────────────
  const [editando, setEditando]       = useState(false);
  const [form, setForm]               = useState({
    nombre:      profile.nombre      || "",
    edad:        profile.edad        || "",
    ciudad:      profile.ciudad      || "",
    presupuesto: profile.presupuesto || "",
    bio:         profile.bio         || "",
  });
  const [photoFile, setPhotoFile]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");

  // ─── Estado verificación ─────────────────────────────────────
  const [modalVerif, setModalVerif]     = useState(false);
  const [pasoModal, setPasoModal]       = useState(0); // 0=aviso 1=camara 2=confirmar 3=exito
  const [instruccion, setInstruccion]   = useState(0);
  const [countdown, setCountdown]       = useState(2);
  const [fotosBlob, setFotosBlob]       = useState([]);
  const [fotosPrev, setFotosPrev]       = useState([]);
  const [enviandoVerif, setEnviandoVerif] = useState(false);
  const [camaraError, setCamaraError]   = useState(false);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const canceladoRef = useRef(false);

  // ─── Perfil handlers ──────────────────────────────────────────
  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleGuardar = async () => {
    if (!form.nombre || !form.edad || !form.ciudad || !form.presupuesto) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      const user = auth.currentUser;
      let photoURL = profile.photoURL || "";
      if (photoFile) {
        const storageRef = ref(storage, `fotos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }
      await setDoc(doc(db, "users", user.uid), {
        ...profile,
        nombre:      form.nombre,
        edad:        Number(form.edad),
        ciudad:      form.ciudad,
        presupuesto: Number(form.presupuesto),
        bio:         form.bio,
        photoURL,
      });
      if (onProfileUpdated) await onProfileUpdated();
      setEditando(false);
      setPhotoFile(null);
      setPhotoPreview(null);
    } catch (err) {
      console.error(err);
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  const handleCancelar = () => {
    setForm({
      nombre: profile.nombre || "", edad: profile.edad || "",
      ciudad: profile.ciudad || "", presupuesto: profile.presupuesto || "",
      bio: profile.bio || "",
    });
    setPhotoFile(null);
    setPhotoPreview(null);
    setError("");
    setEditando(false);
  };

  // ─── Verificación handlers ────────────────────────────────────
  const abrirModalVerif = () => {
    canceladoRef.current = false;
    setPasoModal(0);
    setFotosBlob([]);
    setFotosPrev([]);
    setCamaraError(false);
    setInstruccion(0);
    setCountdown(2);
    setModalVerif(true);
  };

  const cerrarModalVerif = () => {
    canceladoRef.current = true;
    detenerCamara();
    setModalVerif(false);
  };

  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "user" },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      return true;
    } catch (err) {
      console.error("[Verif] Error cámara:", err);
      setCamaraError(true);
      return false;
    }
  };

  const detenerCamara = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  const capturarFoto = () => {
    const video = videoRef.current;
    if (!video) return Promise.resolve(null);
    const canvas = document.createElement("canvas");
    canvas.width  = video.videoWidth  || 640;
    canvas.height = video.videoHeight || 480;
    canvas.getContext("2d").drawImage(video, 0, 0, canvas.width, canvas.height);
    return new Promise((r) => canvas.toBlob(r, "image/jpeg", 0.85));
  };

  const ejecutarFlujoFotos = async () => {
    const blobs = [];
    const prevs = [];

    for (let i = 0; i < INSTRUCCIONES_VERIF.length; i++) {
      if (canceladoRef.current) return;
      setInstruccion(i);
      setCountdown(2);
      await sleep(1000);
      if (canceladoRef.current) return;
      setCountdown(1);
      await sleep(1000);
      if (canceladoRef.current) return;

      const blob = await capturarFoto();
      if (!blob || canceladoRef.current) return;
      blobs.push(blob);
      prevs.push(URL.createObjectURL(blob));
    }

    detenerCamara();
    setFotosBlob(blobs);
    setFotosPrev(prevs);
    setPasoModal(2);
  };

  const entrarPaso1 = async () => {
    canceladoRef.current = false;
    detenerCamara();
    setCamaraError(false);
    setFotosBlob([]);
    setFotosPrev([]);
    setPasoModal(1);
    setInstruccion(0);
    setCountdown(2);
    const ok = await iniciarCamara();
    if (!ok || canceladoRef.current) return;
    await sleep(800);
    if (canceladoRef.current) return;
    await ejecutarFlujoFotos();
  };

  const enviarVerificacion = async () => {
    if (fotosBlob.length < 3) return;
    setEnviandoVerif(true);
    try {
      const uid = auth.currentUser.uid;
      await Promise.all(
        fotosBlob.map((blob, i) =>
          uploadBytes(ref(storage, `verificaciones/${uid}/foto${i + 1}`), blob)
        )
      );
      await updateDoc(doc(db, "users", uid), {
        verificacionEstado: "pendiente",
        verificacionFecha:  serverTimestamp(),
      });
      if (onProfileUpdated) await onProfileUpdated();
      setPasoModal(3);
    } catch (err) {
      console.error("[Verif] Error enviando:", err);
    } finally {
      setEnviandoVerif(false);
    }
  };

  const fotoActual  = photoPreview || (esFirebasePhoto(profile.photoURL) ? profile.photoURL : null);
  const estadoVerif = profile.verificacionEstado;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Cabecera */}
        <div style={styles.headerBg} />
        <div style={styles.avatarArea}>
          <div
            style={styles.avatarCircle}
            onClick={editando ? () => document.getElementById("fotoEditInput").click() : undefined}
          >
            {fotoActual ? (
              <img src={fotoActual} alt="perfil" style={styles.avatarImg} referrerPolicy="no-referrer" />
            ) : (
              <span style={styles.avatarLetra}>{profile.nombre?.[0]?.toUpperCase() || "?"}</span>
            )}
            {editando && (
              <div style={styles.avatarOverlay}><span style={{ fontSize: "20px" }}>📷</span></div>
            )}
          </div>
          {editando && (
            <input id="fotoEditInput" type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
          )}
        </div>

        <div style={styles.body}>
          {!editando ? (
            <>
              <h2 style={styles.nombre}>{profile.nombre}</h2>
              <p style={styles.email}>{auth.currentUser?.email}</p>

              <div style={styles.chipsRow}>
                <span style={styles.chip}>📍 {profile.ciudad}</span>
                <span style={styles.chip}>🎂 {profile.edad} años</span>
                <span style={styles.chip}>💶 {profile.presupuesto} €/mes</span>
              </div>

              {profile.bio && <p style={styles.bio}>"{profile.bio}"</p>}

              {/* Verificación de identidad */}
              <div style={styles.verifSection}>
                {estadoVerif === "verificado" && (
                  <div style={styles.verifBadgeVerificado}>✅ Identidad verificada</div>
                )}
                {estadoVerif === "pendiente" && (
                  <div style={styles.verifBadgePendiente}>⏳ Verificación en revisión — 24h</div>
                )}
                {estadoVerif === "rechazado" && (
                  <>
                    <div style={styles.verifBadgeRechazado}>❌ Verificación rechazada — inténtalo de nuevo</div>
                    <button style={styles.verifBtn} onClick={abrirModalVerif}>
                      Intentar de nuevo
                    </button>
                  </>
                )}
                {!estadoVerif && (
                  <>
                    <button style={styles.verifBtn} onClick={abrirModalVerif}>
                      Verificar mi identidad (opcional)
                    </button>
                    <p style={styles.verifDisclaimer}>
                      🔒 Proceso privado — tus imágenes nunca serán públicas
                    </p>
                  </>
                )}
              </div>

              <button style={styles.editBtn} onClick={() => setEditando(true)}>✏️ Editar perfil</button>
              <button style={styles.logoutBtn} onClick={() => signOut(auth)}>Cerrar sesión</button>
            </>
          ) : (
            <div style={styles.form}>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Nombre <span style={styles.req}>*</span></label>
                <input name="nombre" value={form.nombre} onChange={handleChange} style={styles.input} />
              </div>
              <div style={styles.row}>
                <div style={{ ...styles.fieldGroup, flex: 1 }}>
                  <label style={styles.label}>Edad <span style={styles.req}>*</span></label>
                  <input name="edad" type="number" min="18" max="99" value={form.edad} onChange={handleChange} style={styles.input} />
                </div>
                <div style={{ width: "12px" }} />
                <div style={{ ...styles.fieldGroup, flex: 2 }}>
                  <label style={styles.label}>Ciudad <span style={styles.req}>*</span></label>
                  <input name="ciudad" value={form.ciudad} onChange={handleChange} style={styles.input} />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Presupuesto (€/mes) <span style={styles.req}>*</span></label>
                <div style={{ position: "relative" }}>
                  <span style={styles.prefix}>€</span>
                  <input name="presupuesto" type="number" min="0" value={form.presupuesto} onChange={handleChange} style={{ ...styles.input, paddingLeft: "32px" }} />
                </div>
              </div>
              <div style={styles.fieldGroup}>
                <label style={styles.label}>Bio</label>
                <textarea name="bio" rows={3} value={form.bio} onChange={handleChange} style={styles.textarea} />
              </div>
              {error && <p style={styles.error}>{error}</p>}
              <button style={styles.saveBtn} onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button style={styles.cancelBtn} onClick={handleCancelar} disabled={saving}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {/* ─── Modal verificación ─── */}
      {modalVerif && (
        <div style={styles.modalOverlay}>
          <div style={styles.modal}>
            {/* Barra de progreso (pasos 0-2) */}
            {pasoModal < 3 && (
              <div style={styles.progresoBarra}>
                {[0, 1, 2].map((i) => (
                  <div
                    key={i}
                    style={{
                      ...styles.progresoPunto,
                      background: pasoModal >= i ? "#7c3aed" : "#e5e7eb",
                      transform: pasoModal === i ? "scale(1.3)" : "scale(1)",
                    }}
                  />
                ))}
              </div>
            )}

            {/* Paso 0 — Aviso de privacidad */}
            {pasoModal === 0 && (
              <div style={styles.pasoContainer}>
                <div style={{ fontSize: "52px", marginBottom: "12px" }}>🔒</div>
                <h3 style={styles.pasoTitle}>Tu privacidad es lo primero</h3>
                <p style={styles.pasoTexto}>
                  Las imágenes capturadas se usan exclusivamente para verificar que eres una persona real.
                  No serán visibles para otros usuarios ni compartidas con terceros.
                  Serán eliminadas tras la revisión.
                </p>
                <button style={styles.btnPrimario} onClick={entrarPaso1}>Entendido, continuar</button>
                <button style={styles.btnCancelarModal} onClick={cerrarModalVerif}>Cancelar</button>
              </div>
            )}

            {/* Paso 1 — Cámara */}
            {pasoModal === 1 && (
              <div style={styles.pasoContainer}>
                <h3 style={styles.pasoTitle}>
                  {INSTRUCCIONES_VERIF[instruccion]?.emoji} Paso {instruccion + 1} de 3
                </h3>

                {camaraError ? (
                  <div style={styles.camaraErrorBox}>
                    <span style={{ fontSize: "40px" }}>📵</span>
                    <p style={{ color: "#ef4444", margin: "10px 0 0", fontSize: "14px", textAlign: "center" }}>
                      No se pudo acceder a la cámara.<br />Comprueba los permisos del navegador.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={styles.videoWrap}>
                      <video ref={videoRef} style={styles.video} autoPlay playsInline muted />
                    </div>
                    <p style={styles.instruccionTexto}>
                      {INSTRUCCIONES_VERIF[instruccion]?.texto}
                    </p>
                    <div style={styles.countdownRow}>
                      {[2, 1].map((n) => (
                        <div
                          key={n}
                          style={{
                            ...styles.countdownDot,
                            background: countdown <= n ? "#7c3aed" : "#e5e7eb",
                          }}
                        />
                      ))}
                    </div>
                    <p style={{ fontSize: "12px", color: "#9ca3af", margin: "6px 0 0" }}>
                      Capturando en {countdown}s…
                    </p>
                  </>
                )}

                <button style={{ ...styles.btnCancelarModal, marginTop: "16px" }} onClick={cerrarModalVerif}>Cancelar</button>
              </div>
            )}

            {/* Paso 2 — Confirmación */}
            {pasoModal === 2 && (
              <div style={styles.pasoContainer}>
                <div style={{ fontSize: "40px", marginBottom: "8px" }}>✅</div>
                <h3 style={styles.pasoTitle}>Fotos capturadas correctamente</h3>
                <div style={styles.fotosRow}>
                  {fotosPrev.map((url, i) => (
                    <img key={i} src={url} alt={`foto ${i + 1}`} style={styles.fotoMiniatura} />
                  ))}
                </div>
                <button
                  style={{ ...styles.btnPrimario, opacity: enviandoVerif ? 0.6 : 1 }}
                  onClick={enviarVerificacion}
                  disabled={enviandoVerif}
                >
                  {enviandoVerif ? "Enviando…" : "Enviar para verificación"}
                </button>
                <button style={styles.btnSecundario} onClick={entrarPaso1} disabled={enviandoVerif}>
                  Repetir fotos
                </button>
                <button style={styles.btnCancelarModal} onClick={cerrarModalVerif} disabled={enviandoVerif}>Cancelar</button>
              </div>
            )}

            {/* Paso 3 — Éxito */}
            {pasoModal === 3 && (
              <div style={styles.pasoContainer}>
                <div style={{ fontSize: "56px", marginBottom: "12px" }}>🎉</div>
                <h3 style={styles.pasoTitle}>¡Solicitud enviada!</h3>
                <p style={styles.pasoTexto}>
                  Revisaremos tu identidad en menos de 24 horas.
                  Te notificaremos cuando esté lista.
                </p>
                <button style={styles.btnPrimario} onClick={cerrarModalVerif}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "0 0 80px 0",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "0 0 28px 28px",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    overflow: "hidden",
    position: "relative",
  },
  headerBg: {
    height: "110px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  avatarArea: {
    display: "flex",
    justifyContent: "center",
    marginTop: "-52px",
    marginBottom: "12px",
  },
  avatarCircle: {
    width: "104px",
    height: "104px",
    borderRadius: "50%",
    border: "4px solid #ffffff",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: "inherit",
    position: "relative",
    boxShadow: "0 8px 24px rgba(0,0,0,0.15)",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarLetra: { fontSize: "40px", fontWeight: "800", color: "#ffffff" },
  avatarOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex", alignItems: "center", justifyContent: "center",
    cursor: "pointer",
  },
  body: {
    padding: "0 28px 32px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  nombre: { margin: "0 0 4px 0", fontSize: "24px", fontWeight: "800", color: "#1a1a2e" },
  email:  { margin: "0 0 16px 0", fontSize: "13px", color: "#9ca3af" },
  chipsRow: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    justifyContent: "center", marginBottom: "14px",
  },
  chip: {
    background: "#f5f3ff", color: "#5b21b6",
    fontSize: "12px", fontWeight: "600",
    padding: "5px 12px", borderRadius: "20px",
  },
  bio: {
    fontSize: "13px", color: "#6b7280",
    fontStyle: "italic", lineHeight: "1.6",
    marginBottom: "20px", maxWidth: "300px",
  },
  // Verificación
  verifSection: {
    width: "100%",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "8px",
    marginBottom: "20px",
  },
  verifBadgeVerificado: {
    background: "#eff6ff",
    border: "1.5px solid #93c5fd",
    color: "#1d4ed8",
    padding: "8px 18px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "700",
  },
  verifBadgePendiente: {
    background: "#fffbeb",
    border: "1.5px solid #fcd34d",
    color: "#92400e",
    padding: "8px 18px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  verifBadgeRechazado: {
    background: "#fef2f2",
    border: "1.5px solid #fca5a5",
    color: "#991b1b",
    padding: "8px 18px",
    borderRadius: "20px",
    fontSize: "13px",
    fontWeight: "600",
  },
  verifBtn: {
    padding: "11px 22px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    color: "#ffffff",
    fontSize: "14px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
  },
  verifDisclaimer: {
    margin: 0,
    fontSize: "11px",
    color: "#9ca3af",
    lineHeight: "1.4",
  },
  // Botones perfil
  editBtn: {
    width: "100%", padding: "13px", borderRadius: "14px",
    border: "2px solid #667eea", background: "#ffffff",
    color: "#667eea", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
  },
  logoutBtn: {
    width: "100%", padding: "13px", borderRadius: "14px",
    border: "none", background: "#f3f4f6",
    color: "#6b7280", fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  // Formulario
  form: {
    width: "100%", display: "flex", flexDirection: "column",
    gap: "14px", textAlign: "left", marginTop: "8px",
  },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  row: { display: "flex", flexDirection: "row", alignItems: "flex-start" },
  label: { fontSize: "13px", fontWeight: "600", color: "#374151" },
  req: { color: "#ef4444" },
  prefix: {
    position: "absolute", left: "12px", top: "50%",
    transform: "translateY(-50%)", color: "#9ca3af",
    fontSize: "14px", pointerEvents: "none",
  },
  input: {
    width: "100%", padding: "11px 13px",
    border: "2px solid #e5e7eb", borderRadius: "12px",
    fontSize: "14px", color: "#1a1a2e", outline: "none",
    boxSizing: "border-box", background: "#fafafa",
  },
  textarea: {
    width: "100%", padding: "11px 13px",
    border: "2px solid #e5e7eb", borderRadius: "12px",
    fontSize: "14px", color: "#1a1a2e", outline: "none",
    boxSizing: "border-box", resize: "none",
    background: "#fafafa", fontFamily: "inherit", lineHeight: "1.5",
  },
  error: {
    margin: 0, fontSize: "13px", color: "#ef4444",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "10px 14px",
  },
  saveBtn: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(102,126,234,0.35)",
  },
  cancelBtn: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "#f3f4f6", color: "#6b7280",
    fontSize: "14px", fontWeight: "600", cursor: "pointer",
  },
  // Modal verificación
  modalOverlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "20px",
  },
  modal: {
    background: "#ffffff", borderRadius: "24px",
    padding: "28px 24px", maxWidth: "380px", width: "100%",
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
  },
  progresoBarra: {
    display: "flex", justifyContent: "center",
    gap: "10px", marginBottom: "24px",
  },
  progresoPunto: {
    width: "10px", height: "10px", borderRadius: "50%",
    transition: "background 0.3s, transform 0.3s",
  },
  pasoContainer: {
    display: "flex", flexDirection: "column",
    alignItems: "center", textAlign: "center",
  },
  pasoTitle: {
    margin: "0 0 12px 0", fontSize: "18px",
    fontWeight: "800", color: "#1a1a2e",
  },
  pasoTexto: {
    fontSize: "14px", color: "#6b7280",
    lineHeight: "1.6", margin: "0 0 24px 0",
  },
  // Cámara
  videoWrap: {
    width: "100%", maxWidth: "320px",
    borderRadius: "16px", overflow: "hidden",
    background: "#000", marginBottom: "14px",
    boxShadow: "0 4px 16px rgba(0,0,0,0.2)",
  },
  video: {
    width: "100%", display: "block",
    transform: "scaleX(-1)", // efecto espejo
  },
  instruccionTexto: {
    fontSize: "15px", fontWeight: "700",
    color: "#1a1a2e", margin: "0 0 12px 0",
  },
  countdownRow: {
    display: "flex", gap: "8px",
  },
  countdownDot: {
    width: "12px", height: "12px",
    borderRadius: "50%",
    transition: "background 0.3s",
  },
  camaraErrorBox: {
    display: "flex", flexDirection: "column",
    alignItems: "center", padding: "24px",
    background: "#fef2f2", borderRadius: "14px",
    marginBottom: "16px",
  },
  // Fotos capturadas
  fotosRow: {
    display: "flex", gap: "10px",
    justifyContent: "center",
    margin: "16px 0 20px",
  },
  fotoMiniatura: {
    width: "80px", height: "80px",
    objectFit: "cover", borderRadius: "12px",
    border: "2px solid #7c3aed",
    boxShadow: "0 2px 8px rgba(124,58,237,0.2)",
  },
  // Botones modal
  btnPrimario: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
    boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
  },
  btnSecundario: {
    width: "100%", padding: "12px", borderRadius: "14px",
    border: "2px solid #7c3aed", background: "#ffffff",
    color: "#7c3aed", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
  },
  btnCancelarModal: {
    background: "none", border: "none",
    color: "#9ca3af", fontSize: "13px",
    cursor: "pointer", padding: "6px",
  },
};
