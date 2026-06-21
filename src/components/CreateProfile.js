import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase";

async function comprimirImagen(file, maxPx = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxPx && h <= maxPx) { resolve(file); return; }
      const scale = maxPx / Math.max(w, h);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(w * scale);
      canvas.height = Math.round(h * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob((blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })), "image/jpeg", 0.85);
    };
    img.src = url;
  });
}

function LogoSVG({ size = 36 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <defs>
        <linearGradient id="cpLogoGrad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%"   stopColor="#fbbf24"/>
          <stop offset="35%"  stopColor="#f97316"/>
          <stop offset="70%"  stopColor="#ef4444"/>
          <stop offset="100%" stopColor="#7c3aed"/>
        </linearGradient>
      </defs>
      <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
      <path
        d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
        fill="none" stroke="url(#cpLogoGrad)" strokeWidth="7.5"
        strokeLinecap="round" strokeLinejoin="round"
      />
    </svg>
  );
}

function StickerKey() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <circle cx="8" cy="9" r="4" stroke="#f97316" strokeWidth="1.8"/>
      <path d="M11.5 9h7M16 9v3" stroke="#f97316" strokeWidth="1.8" strokeLinecap="round"/>
    </svg>
  );
}
function StickerHouse() {
  return (
    <svg width="60" height="60" viewBox="0 0 24 24" fill="none">
      <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z"
        stroke="#7c3aed" strokeWidth="1.6" fill="rgba(124,58,237,0.15)"/>
      <path d="M9 21V13h6v8" stroke="#7c3aed" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function StickerPeople() {
  return (
    <svg width="56" height="56" viewBox="0 0 24 24" fill="none">
      <circle cx="9" cy="7" r="3" stroke="#4ade80" strokeWidth="1.6"/>
      <path d="M3 20c0-3.3 2.7-6 6-6" stroke="#4ade80" strokeWidth="1.6" strokeLinecap="round"/>
      <circle cx="15" cy="7" r="3" stroke="#f97316" strokeWidth="1.6"/>
      <path d="M21 20c0-3.3-2.7-6-6-6" stroke="#f97316" strokeWidth="1.6" strokeLinecap="round"/>
    </svg>
  );
}
function StickerHeart() {
  return (
    <svg width="50" height="50" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 21S3 14.5 3 8.5a4.5 4.5 0 018-2.8A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z"
        stroke="#ef4444" strokeWidth="1.7" fill="rgba(239,68,68,0.15)"
      />
    </svg>
  );
}
function StickerStar() {
  return (
    <svg width="46" height="46" viewBox="0 0 24 24" fill="none">
      <path
        d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"
        stroke="#fbbf24" strokeWidth="1.6" fill="rgba(251,191,36,0.15)"
      />
    </svg>
  );
}
function StickerChat() {
  return (
    <svg width="52" height="52" viewBox="0 0 24 24" fill="none">
      <path
        d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z"
        stroke="#60a5fa" strokeWidth="1.6" fill="rgba(96,165,250,0.15)"
      />
      <circle cx="8.5" cy="11" r="1" fill="#60a5fa"/>
      <circle cx="12"  cy="11" r="1" fill="#60a5fa"/>
      <circle cx="15.5" cy="11" r="1" fill="#60a5fa"/>
    </svg>
  );
}

const STICKERS = [
  { id: "s1", top: "8%",  left: "10%",  rotate: -20, C: StickerKey    },
  { id: "s2", top: "16%", right: "8%",  rotate:  12, C: StickerHouse  },
  { id: "s3", top: "44%", left: "6%",   rotate:   6, C: StickerPeople },
  { id: "s4", bottom: "26%", right: "7%",  rotate: -10, C: StickerHeart  },
  { id: "s5", bottom: "12%", left: "14%",  rotate:  20, C: StickerStar   },
  { id: "s6", top: "64%", right: "11%", rotate:  -8, C: StickerChat   },
];

export default function CreateProfile({ onProfileSaved }) {
  const [form, setForm] = useState({
    nombre: "",
    edad: "",
    codigoPostal: "",
    ciudad: "",
    provincia: "",
    presupuesto: "",
    bio: "",
    sexo: "",
  });
  const [photoFile, setPhotoFile]     = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [bannerFile, setBannerFile]   = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [foto1File, setFoto1File]     = useState(null);
  const [foto1Preview, setFoto1Preview] = useState(null);
  const [foto2File, setFoto2File]     = useState(null);
  const [foto2Preview, setFoto2Preview] = useState(null);
  const [foto3File, setFoto3File]     = useState(null);
  const [foto3Preview, setFoto3Preview] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [error, setError]             = useState("");
  const [aceptaTerminos, setAceptaTerminos] = useState(false);
  const [cpCargando, setCpCargando]   = useState(false);
  const [cpError, setCpError]         = useState("");
  const [bannerPosition, setBannerPosition] = useState(50);
  const [cropModal, setCropModal]     = useState(false);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [cropTempFile, setCropTempFile] = useState(null);
  const [cropPos, setCropPos]         = useState(50);

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleCodigoPostal = async (e) => {
    const cp = e.target.value.replace(/\D/g, "").slice(0, 5);
    setForm((f) => ({ ...f, codigoPostal: cp, ciudad: "", provincia: "" }));
    setCpError("");
    if (cp.length === 5) {
      setCpCargando(true);
      try {
        const res = await fetch(`https://api.zippopotam.us/ES/${cp}`);
        if (!res.ok) throw new Error("not found");
        const data = await res.json();
        setForm((f) => ({
          ...f,
          ciudad:    data.places[0]["place name"],
          provincia: data.places[0]["state"],
        }));
      } catch {
        setCpError("Código postal no válido");
      } finally {
        setCpCargando(false);
      }
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await comprimirImagen(file, 800);
    setPhotoFile(compressed);
    setPhotoPreview(URL.createObjectURL(compressed));
  };

  const handleBanner = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await comprimirImagen(file, 1200);
    const url = URL.createObjectURL(compressed);
    setCropTempFile(compressed);
    setCropPreviewUrl(url);
    setCropPos(50);
    setCropModal(true);
  };

  const confirmCrop = () => {
    setBannerFile(cropTempFile);
    setBannerPreview(cropPreviewUrl);
    setBannerPosition(cropPos);
    setCropModal(false);
  };

  const makeFotoHandler = (setFile, setPreview) => async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await comprimirImagen(file, 800);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.nombre || !form.edad || !form.ciudad || !form.presupuesto) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }
    if (!form.sexo) {
      setError("Selecciona tu sexo para continuar.");
      return;
    }
    if (!aceptaTerminos) {
      setError("Debes aceptar los Términos y condiciones para continuar.");
      return;
    }
    setSaving(true);
    try {
      const user = auth.currentUser;
      let photoURL = user.photoURL || "";
      if (photoFile) {
        const storageRef = ref(storage, `fotos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      let bannerURL = "";
      if (bannerFile) {
        const r = ref(storage, `users/${user.uid}/banner`);
        await uploadBytes(r, bannerFile);
        bannerURL = await getDownloadURL(r);
      }

      const fotosData = {};
      const fotoSlots = [
        { file: foto1File, key: "foto1URL", path: `users/${user.uid}/fotos/foto1` },
        { file: foto2File, key: "foto2URL", path: `users/${user.uid}/fotos/foto2` },
        { file: foto3File, key: "foto3URL", path: `users/${user.uid}/fotos/foto3` },
      ];
      await Promise.all(
        fotoSlots.map(async ({ file, key, path }) => {
          if (file) {
            const r = ref(storage, path);
            await uploadBytes(r, file);
            fotosData[key] = await getDownloadURL(r);
          }
        })
      );

      await setDoc(doc(db, "users", user.uid), {
        uid:          user.uid,
        email:        user.email,
        nombre:       form.nombre,
        edad:         Number(form.edad),
        codigoPostal: form.codigoPostal,
        ciudad:       form.ciudad,
        provincia:    form.provincia,
        presupuesto:  Number(form.presupuesto),
        bio:          form.bio,
        sexo:         form.sexo,
        photoURL,
        bannerURL,
        bannerPosition,
        ...fotosData,
        creadoEn:     new Date().toISOString(),
      });
      if (onProfileSaved) onProfileSaved();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <>
      <style>{`
        @media (max-width: 900px) {
          .cp-left  { display: none !important; }
          .cp-right { width: 100% !important; padding: 40px 24px 80px !important; }
        }
        @media (min-width: 901px) {
          .cp-mobile-logo { display: none !important; }
        }
      `}</style>
      <div style={s.page}>
        {/* ── Left panel ── */}
        <div className="cp-left" style={s.left}>
          {STICKERS.map(({ id, C, rotate, ...pos }) => (
            <div key={id} style={{
              position: "absolute",
              ...pos,
              transform: `rotate(${rotate}deg)`,
              opacity: 0.8,
              filter: "drop-shadow(0 4px 16px rgba(0,0,0,0.35))",
              pointerEvents: "none",
            }}>
              <C />
            </div>
          ))}
          <div style={s.leftContent}>
            <div style={s.leftLogoRow}>
              <LogoSVG size={44} />
              <span style={s.leftWordmark}>
                Roomie<span style={s.leftMatchGrad}>Match</span>
              </span>
            </div>
            <h2 style={s.leftHeading}>Completa tu perfil</h2>
            <p style={s.leftSub}>Estás a un paso de conocer a tu compañero ideal.</p>
          </div>
        </div>

        {/* ── Right panel (form) ── */}
        <div className="cp-right" style={s.right}>
          {/* Close */}
          <button
            style={s.closeBtn}
            onClick={async () => { await signOut(auth); window.location.replace("/"); }}
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none"
              stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
              <line x1="18" y1="6" x2="6" y2="18"/>
              <line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>

          {/* Mobile-only logo */}
          <div className="cp-mobile-logo" style={s.mobileLogo}>
            <LogoSVG size={32} />
            <span style={s.mobileWordmark}>
              Roomie<span style={s.leftMatchGrad}>Match</span>
            </span>
          </div>

          <div style={s.formWrap}>
            <h1 style={s.formTitle}>Crea tu perfil</h1>
            <p style={s.formSub}>Cuéntanos un poco sobre ti</p>

            <form onSubmit={handleSubmit} style={s.form}>
              {/* Banner */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Banner (opcional)</label>
                <div
                  style={s.bannerSlot}
                  onClick={() => document.getElementById("bannerInput").click()}
                >
                  {bannerPreview ? (
                    <img src={bannerPreview} alt="banner" style={{ ...s.bannerImg, objectPosition: `center ${bannerPosition}%` }} />
                  ) : (
                    <div style={s.bannerPlaceholder}>
                      <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="#9ca3af" strokeWidth="1.8">
                        <rect x="3" y="3" width="18" height="18" rx="3"/>
                        <circle cx="8.5" cy="8.5" r="1.5"/>
                        <path d="M21 15l-5-5L5 21"/>
                      </svg>
                      <span style={{ fontSize: "12px", color: "#9ca3af", marginTop: "4px" }}>Añadir banner</span>
                    </div>
                  )}
                </div>
                <input id="bannerInput" type="file" accept="image/*" onChange={handleBanner} style={{ display: "none" }} />
              </div>

              {/* Foto */}
              <div style={s.photoSection}>
                <div
                  style={s.photoCircle}
                  onClick={() => document.getElementById("photoInput").click()}
                >
                  {photoPreview ? (
                    <img src={photoPreview} alt="preview" style={s.photoImg} />
                  ) : (
                    <div style={s.photoPlaceholder}>
                      <svg width="28" height="28" viewBox="0 0 24 24" fill="none"
                        stroke="#7c3aed" strokeWidth="1.8">
                        <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
                        <circle cx="12" cy="13" r="4"/>
                      </svg>
                      <span style={s.photoLabel}>Subir foto</span>
                    </div>
                  )}
                </div>
                <input
                  id="photoInput"
                  type="file"
                  accept="image/*"
                  onChange={handlePhoto}
                  style={{ display: "none" }}
                />
                {photoPreview && (
                  <button
                    type="button"
                    style={s.changePhotoBtn}
                    onClick={() => document.getElementById("photoInput").click()}
                  >
                    Cambiar foto
                  </button>
                )}
              </div>

              {/* Nombre */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Nombre <span style={s.req}>*</span></label>
                <input
                  name="nombre" type="text" placeholder="¿Cómo te llamas?"
                  value={form.nombre} onChange={handleChange} style={s.input}
                />
              </div>

              {/* Edad + CP */}
              <div style={s.row}>
                <div style={{ ...s.fieldGroup, flex: 1 }}>
                  <label style={s.label}>Edad <span style={s.req}>*</span></label>
                  <input
                    name="edad" type="number" placeholder="Ej: 24"
                    min="18" max="99" value={form.edad}
                    onChange={handleChange} style={s.input}
                  />
                </div>
                <div style={{ width: "14px" }} />
                <div style={{ ...s.fieldGroup, flex: 2 }}>
                  <label style={s.label}>Código postal <span style={s.req}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="codigoPostal" type="text" inputMode="numeric"
                      placeholder="Ej: 28001" maxLength={5}
                      value={form.codigoPostal} onChange={handleCodigoPostal}
                      style={s.input}
                    />
                    {cpCargando && <span style={s.cpSpinner}>⏳</span>}
                  </div>
                </div>
              </div>

              {/* Ciudad detectada */}
              {(form.ciudad || cpError) && (
                <div style={s.fieldGroup}>
                  {cpError ? (
                    <p style={s.cpError}>{cpError}</p>
                  ) : (
                    <div style={s.ciudadDetectada}>
                      <svg width="16" height="16" viewBox="0 0 24 24" fill="none"
                        stroke="#16a34a" strokeWidth="2" strokeLinecap="round">
                        <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z"/>
                        <circle cx="12" cy="9" r="2.5"/>
                      </svg>
                      <div>
                        <span style={s.ciudadNombre}>{form.ciudad}</span>
                        {form.provincia && (
                          <span style={s.provinciaNombre}> · {form.provincia}</span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Presupuesto */}
              <div style={s.fieldGroup}>
                <label style={s.label}>
                  Presupuesto mensual (€) <span style={s.req}>*</span>
                </label>
                <div style={{ position: "relative" }}>
                  <span style={s.inputPrefix}>€</span>
                  <input
                    name="presupuesto" type="number" placeholder="Ej: 500"
                    min="0" value={form.presupuesto}
                    onChange={handleChange}
                    style={{ ...s.input, paddingLeft: "32px" }}
                  />
                </div>
              </div>

              {/* Bio */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Bio</label>
                <textarea
                  name="bio"
                  placeholder="Cuéntanos algo sobre ti, tus hábitos, horarios..."
                  value={form.bio} onChange={handleChange}
                  rows={3} style={s.textarea}
                />
              </div>

              {/* Fotos adicionales */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Fotos adicionales (hasta 3, opcional)</label>
                <div style={s.fotosRow}>
                  {[
                    { id: "foto1Input", preview: foto1Preview, setFile: setFoto1File, setPreview: setFoto1Preview },
                    { id: "foto2Input", preview: foto2Preview, setFile: setFoto2File, setPreview: setFoto2Preview },
                    { id: "foto3Input", preview: foto3Preview, setFile: setFoto3File, setPreview: setFoto3Preview },
                  ].map(({ id, preview, setFile, setPreview }) => (
                    <div key={id} style={s.fotoSlot} onClick={() => document.getElementById(id).click()}>
                      {preview ? (
                        <img src={preview} alt="foto" style={s.fotoSlotImg} />
                      ) : (
                        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#c4b5fd" strokeWidth="2" strokeLinecap="round">
                          <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                        </svg>
                      )}
                      <input id={id} type="file" accept="image/*" onChange={makeFotoHandler(setFile, setPreview)} style={{ display: "none" }} />
                    </div>
                  ))}
                </div>
              </div>

              {/* Sexo */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Sexo <span style={s.req}>*</span></label>
                <div style={s.pillGroup}>
                  {[
                    { valor: "hombre",     etiqueta: "Hombre"    },
                    { valor: "mujer",      etiqueta: "Mujer"     },
                    { valor: "no_binario", etiqueta: "No binario" },
                  ].map(({ valor, etiqueta }) => (
                    <button
                      key={valor} type="button"
                      style={{ ...s.pill, ...(form.sexo === valor ? s.pillActivo : {}) }}
                      onClick={() => setForm({ ...form, sexo: valor })}
                    >
                      {etiqueta}
                    </button>
                  ))}
                </div>
              </div>

              {/* Términos */}
              <label style={s.checkboxLabel}>
                <input
                  type="checkbox" checked={aceptaTerminos}
                  onChange={(e) => setAceptaTerminos(e.target.checked)}
                  style={s.checkbox}
                />
                <span style={s.checkboxText}>
                  He leído y acepto los{" "}
                  <a href="/terminos" target="_blank" rel="noreferrer" style={s.checkboxLink}>
                    Términos y condiciones
                  </a>{" "}
                  y la{" "}
                  <a href="/privacidad" target="_blank" rel="noreferrer" style={s.checkboxLink}>
                    Política de privacidad
                  </a>
                </span>
              </label>

              {error && <p style={s.error}>{error}</p>}

              <button type="submit" style={s.submitBtn} disabled={saving}>
                {saving ? "Guardando..." : "Guardar perfil"}
              </button>
            </form>
          </div>
        </div>
      </div>

      {/* ── Crop modal banner ── */}
      {cropModal && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 1100, padding: "24px" }}>
          <div style={{ background: "#1a1a2e", borderRadius: "20px", padding: "24px", maxWidth: "380px", width: "100%", border: "1px solid #2a2a3e", display: "flex", flexDirection: "column", gap: "14px" }}>
            <h3 style={{ margin: 0, fontSize: "16px", fontWeight: "800", color: "#f8fafc", textAlign: "center" }}>Ajustar posición del banner</h3>
            <div style={{ width: "100%", height: "90px", borderRadius: "12px", overflow: "hidden", background: "#2a2a3e" }}>
              <img src={cropPreviewUrl} alt="banner" style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${cropPos}%` }} />
            </div>
            <label style={{ fontSize: "12px", fontWeight: "600", color: "#94a3b8", textAlign: "center" }}>Posición vertical</label>
            <input type="range" min="0" max="100" step="1" value={cropPos} onChange={(e) => setCropPos(Number(e.target.value))} style={{ width: "100%", accentColor: "#7c3aed", cursor: "pointer" }} />
            <div style={{ display: "flex", gap: "10px" }}>
              <button style={{ flex: 1, padding: "11px", borderRadius: "12px", border: "1.5px solid #2a2a3e", background: "transparent", color: "#94a3b8", fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit" }} onClick={() => setCropModal(false)}>Cancelar</button>
              <button style={{ flex: 2, padding: "11px", borderRadius: "12px", border: "none", background: "linear-gradient(135deg, #f97316, #7c3aed)", color: "#ffffff", fontSize: "14px", fontWeight: "700", cursor: "pointer", fontFamily: "inherit" }} onClick={confirmCrop}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

const s = {
  page: {
    display: "flex",
    minHeight: "100vh",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
  },
  left: {
    width: "55%",
    flexShrink: 0,
    background: "#0f0a1e",
    position: "relative",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  leftContent: {
    position: "relative",
    zIndex: 2,
    display: "flex",
    flexDirection: "column",
    gap: "16px",
    padding: "48px 44px",
    maxWidth: "400px",
  },
  leftLogoRow: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "8px",
  },
  leftWordmark: {
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.3px",
  },
  leftMatchGrad: {
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  leftHeading: {
    margin: 0,
    fontSize: "32px",
    fontWeight: "800",
    color: "#ffffff",
    lineHeight: "1.2",
    letterSpacing: "-0.5px",
  },
  leftSub: {
    margin: 0,
    fontSize: "15px",
    color: "rgba(255,255,255,0.6)",
    lineHeight: "1.6",
  },
  right: {
    flex: 1,
    background: "var(--bg, #ffffff)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "flex-start",
    padding: "40px 32px",
    paddingBottom: "40px",
    overflowY: "auto",
    maxHeight: "100vh",
    position: "relative",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "1.5px solid #e5e7eb",
    borderRadius: "10px",
    color: "#9ca3af",
    cursor: "pointer",
    padding: "6px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  mobileLogo: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    marginBottom: "24px",
    alignSelf: "flex-start",
  },
  mobileWordmark: {
    fontSize: "16px",
    fontWeight: "800",
    color: "var(--text, #0f0a1e)",
  },
  formWrap: {
    width: "100%",
    maxWidth: "380px",
  },
  formTitle: {
    margin: "0 0 6px",
    fontSize: "26px",
    fontWeight: "800",
    color: "var(--text, #1a1a2e)",
    letterSpacing: "-0.3px",
  },
  formSub: {
    margin: "0 0 28px",
    fontSize: "14px",
    color: "var(--text-muted, #6b7280)",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  photoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  photoCircle: {
    width: "90px",
    height: "90px",
    borderRadius: "50%",
    border: "2.5px dashed #c4b5fd",
    background: "#f5f3ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  photoLabel: {
    fontSize: "11px",
    color: "#7c3aed",
    fontWeight: "600",
  },
  changePhotoBtn: {
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "var(--label-color, #374151)",
  },
  req: { color: "#ef4444" },
  input: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid var(--border, #e5e7eb)",
    borderRadius: "12px",
    fontSize: "14px",
    color: "var(--text, #1a1a2e)",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    background: "var(--input-bg, #f9fafb)",
    fontFamily: "inherit",
  },
  textarea: {
    width: "100%",
    padding: "11px 14px",
    border: "1.5px solid var(--border, #e5e7eb)",
    borderRadius: "12px",
    fontSize: "14px",
    color: "var(--text, #1a1a2e)",
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    background: "var(--input-bg, #f9fafb)",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  inputPrefix: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    fontSize: "15px",
    pointerEvents: "none",
  },
  error: {
    margin: 0,
    fontSize: "13px",
    color: "#ef4444",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 14px",
  },
  submitBtn: {
    padding: "13px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
  },
  pillGroup: {
    display: "flex",
    gap: "8px",
  },
  pill: {
    flex: 1,
    padding: "10px 8px",
    borderRadius: "12px",
    border: "1.5px solid var(--border, #e5e7eb)",
    background: "var(--input-bg, #f9fafb)",
    color: "var(--text-muted, #6b7280)",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    fontFamily: "inherit",
  },
  pillActivo: {
    border: "1.5px solid #7c3aed",
    background: "#f5f3ff",
    color: "#7c3aed",
  },
  checkboxLabel: {
    display: "flex",
    alignItems: "flex-start",
    gap: "10px",
    cursor: "pointer",
  },
  checkbox: {
    marginTop: "2px",
    width: "16px",
    height: "16px",
    flexShrink: 0,
    accentColor: "#7c3aed",
    cursor: "pointer",
  },
  checkboxText: {
    fontSize: "13px",
    color: "var(--text, #374151)",
    lineHeight: "1.5",
  },
  checkboxLink: {
    color: "#7c3aed",
    fontWeight: "600",
    textDecoration: "underline",
  },
  cpSpinner: {
    position: "absolute",
    right: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    fontSize: "14px",
    pointerEvents: "none",
  },
  cpError: {
    margin: 0,
    fontSize: "12px",
    color: "#ef4444",
    fontWeight: "600",
  },
  ciudadDetectada: {
    display: "flex",
    alignItems: "center",
    gap: "8px",
    padding: "10px 14px",
    background: "#f0fdf4",
    border: "1.5px solid #86efac",
    borderRadius: "12px",
  },
  ciudadNombre:   { fontSize: "14px", fontWeight: "700", color: "#166534" },
  provinciaNombre: { fontSize: "13px", color: "#4ade80", fontWeight: "500" },
  bannerSlot: {
    width: "100%",
    height: "90px",
    borderRadius: "12px",
    border: "1.5px dashed #c4b5fd",
    background: "var(--input-bg, #f9fafb)",
    cursor: "pointer",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  bannerPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  fotosRow: {
    display: "flex",
    gap: "10px",
  },
  fotoSlot: {
    flex: 1,
    height: "82px",
    borderRadius: "12px",
    border: "1.5px dashed #c4b5fd",
    background: "var(--input-bg, #f9fafb)",
    cursor: "pointer",
    overflow: "hidden",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  fotoSlotImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
};
