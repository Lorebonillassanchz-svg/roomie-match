import { useRef, useState } from "react";
import { doc, setDoc, updateDoc, serverTimestamp } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { signOut } from "firebase/auth";
import { auth, db, storage } from "../firebase";
import BorrarCuenta from "./BorrarCuenta";
import { getAvatarDefault } from "../utils/avatarDefault";

const esFirebasePhoto = (url) =>
  typeof url === "string" && url.startsWith("https://firebasestorage.googleapis.com");

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function comprimirImagen(file, maxPx = 800) {
  return new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      URL.revokeObjectURL(url);
      const { naturalWidth: w, naturalHeight: h } = img;
      if (w <= maxPx && h <= maxPx) { resolve(file); return; }
      const ratio = Math.min(maxPx / w, maxPx / h);
      const canvas = document.createElement("canvas");
      canvas.width  = Math.round(w * ratio);
      canvas.height = Math.round(h * ratio);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => resolve(new File([blob], file.name, { type: "image/jpeg" })),
        "image/jpeg", 0.85
      );
    };
    img.src = url;
  });
}

const INSTRUCCIONES_VERIF = [
  { texto: "Mira al frente y sonríe" },
  { texto: "Gira la cabeza a la derecha" },
  { texto: "Ahora mira hacia arriba" },
];

/* ── SVG Icons ── */
const IconPin = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
  </svg>
);
const IconCalendar = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="4" width="18" height="18" rx="2" ry="2"/>
    <line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/>
  </svg>
);
const IconEuro = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M4 10h12M4 14h12M19.5 6a7 7 0 1 0 0 12"/>
  </svg>
);

const IconPencil = () => (
  <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M11 4H4a2 2 0 00-2 2v14a2 2 0 002 2h14a2 2 0 002-2v-7"/>
    <path d="M18.5 2.5a2.121 2.121 0 013 3L12 15l-4 1 1-4 9.5-9.5z"/>
  </svg>
);
const IconLock = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ opacity: 0.6 }}>
    <rect x="3" y="11" width="18" height="11" rx="2" ry="2"/>
    <path d="M7 11V7a5 5 0 0110 0v4"/>
  </svg>
);
const IconCheckCircle = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" stroke="#22c55e" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <path d="M22 11.08V12a10 10 0 11-5.93-9.14"/>
    <polyline points="22 4 12 14.01 9 11.01"/>
  </svg>
);
const IconStarDone = () => (
  <svg width="44" height="44" viewBox="0 0 24 24" fill="none" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
    <defs><linearGradient id="starGrad" x1="0" y1="0" x2="1" y2="1"><stop offset="0%" stopColor="#f97316"/><stop offset="100%" stopColor="#7c3aed"/></linearGradient></defs>
    <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2" stroke="url(#starGrad)" fill="url(#starGrad)" opacity="0.9"/>
  </svg>
);
const IconCameraOff = () => (
  <svg width="38" height="38" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: "#ef4444" }}>
    <line x1="1" y1="1" x2="23" y2="23"/>
    <path d="M21 21H3a2 2 0 01-2-2V8a2 2 0 012-2h3m3-3h6l2 3h4a2 2 0 012 2v9.34m-7.72-2.06A4 4 0 118.82 8.72"/>
  </svg>
);
const IconClock = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
  </svg>
);
const IconXCircle = () => (
  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <circle cx="12" cy="12" r="10"/>
    <line x1="15" y1="9" x2="9" y2="15"/><line x1="9" y1="9" x2="15" y2="15"/>
  </svg>
);
const IconCamera = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z"/>
    <circle cx="12" cy="13" r="4"/>
  </svg>
);
const IconImage = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
    <circle cx="8.5" cy="8.5" r="1.5"/>
    <polyline points="21 15 16 10 5 21"/>
  </svg>
);

function LogoSVG({ size = 44 }) {
  return (
    <svg width={size} height={size} viewBox="0 0 90 90" xmlns="http://www.w3.org/2000/svg">
      <defs><linearGradient id="mpLogoG" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%"   stopColor="#fbbf24"/>
        <stop offset="35%"  stopColor="#f97316"/>
        <stop offset="70%"  stopColor="#ef4444"/>
        <stop offset="100%" stopColor="#7c3aed"/>
      </linearGradient></defs>
      <rect width="90" height="90" rx="22" fill="#0f0a1e"/>
      <path d="M12 64 L12 26 Q12 19 19 19 Q23 19 25 23 L45 50 L65 23 Q67 19 71 19 Q78 19 78 26 L78 64"
        fill="none" stroke="url(#mpLogoG)" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── Background sticker shapes ── */
const BgKey = () => (
  <svg width="160" height="160" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="1">
    <circle cx="8" cy="9" r="4"/><path d="M11.5 9h7M16 9v3"/>
  </svg>
);
const BgHouse = () => (
  <svg width="180" height="180" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.8">
    <path d="M3 10.5L12 3l9 7.5V21a1 1 0 01-1 1H4a1 1 0 01-1-1V10.5z" fill="white" fillOpacity="0.05"/>
    <path d="M9 21V13h6v8"/>
  </svg>
);
const BgHeart = () => (
  <svg width="140" height="140" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.9">
    <path d="M12 21S3 14.5 3 8.5a4.5 4.5 0 018-2.8A4.5 4.5 0 0121 8.5C21 14.5 12 21 12 21z" fill="white" fillOpacity="0.05"/>
  </svg>
);
const BgPeople = () => (
  <svg width="170" height="170" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.8">
    <circle cx="9" cy="7" r="3"/><path d="M3 20c0-3.3 2.7-6 6-6"/>
    <circle cx="15" cy="7" r="3"/><path d="M21 20c0-3.3-2.7-6-6-6"/>
  </svg>
);
const BgStar = () => (
  <svg width="130" height="130" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.9">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z" fill="white" fillOpacity="0.05"/>
  </svg>
);
const BgChat = () => (
  <svg width="150" height="150" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="0.9">
    <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" fill="white" fillOpacity="0.05"/>
  </svg>
);

const BG_STICKERS = [
  { id: "b1", top: "5%",  left: "3%",   rotate: -18, C: BgKey    },
  { id: "b2", top: "12%", right: "2%",  rotate:  14, C: BgHouse  },
  { id: "b3", top: "40%", left: "0%",   rotate:   6, C: BgPeople },
  { id: "b4", bottom: "25%", right: "3%", rotate: -9, C: BgHeart  },
  { id: "b5", bottom: "10%", left: "5%",  rotate:  22, C: BgStar  },
  { id: "b6", top: "62%", right: "1%",  rotate: -12, C: BgChat   },
];

export default function MiPerfil({ profile, onProfileUpdated }) {
  /* ─── Estado perfil ─── */
  const [editando, setEditando] = useState(false);
  const [form, setForm] = useState({
    nombre:       profile.nombre       || "",
    edad:         profile.edad         || "",
    codigoPostal: profile.codigoPostal || "",
    ciudad:       profile.ciudad       || "",
    provincia:    profile.provincia    || "",
    presupuesto:  profile.presupuesto  || "",
    bio:          profile.bio          || "",
    sexo:         profile.sexo         || "",
  });
  const [photoFile, setPhotoFile]         = useState(null);
  const [photoPreview, setPhotoPreview]   = useState(null);
  const [bannerFile, setBannerFile]       = useState(null);
  const [bannerPreview, setBannerPreview] = useState(null);
  const [foto1File, setFoto1File]         = useState(null);
  const [foto1Preview, setFoto1Preview]   = useState(null);
  const [foto2File, setFoto2File]         = useState(null);
  const [foto2Preview, setFoto2Preview]   = useState(null);
  const [foto3File, setFoto3File]         = useState(null);
  const [foto3Preview, setFoto3Preview]   = useState(null);
  const [saving, setSaving]               = useState(false);
  const [error, setError]                 = useState("");
  const [cpCargando, setCpCargando]       = useState(false);
  const [cpError, setCpError]             = useState("");
  const [bannerPosition, setBannerPosition] = useState(profile.bannerPosition ?? 50);
  const [cropModal, setCropModal]         = useState(false);
  const [cropPreviewUrl, setCropPreviewUrl] = useState(null);
  const [cropTempFile, setCropTempFile]   = useState(null);
  const [cropPos, setCropPos]             = useState(50);

  /* ─── Estado verificación ─── */
  const [modalBorrar, setModalBorrar]         = useState(false);
  const [modalVerif, setModalVerif]           = useState(false);
  const [pasoModal, setPasoModal]             = useState(0);
  const [instruccion, setInstruccion]         = useState(0);
  const [countdown, setCountdown]             = useState(2);
  const [fotosBlob, setFotosBlob]             = useState([]);
  const [fotosPrev, setFotosPrev]             = useState([]);
  const [enviandoVerif, setEnviandoVerif]     = useState(false);
  const [camaraError, setCamaraError]         = useState(false);

  const videoRef     = useRef(null);
  const streamRef    = useRef(null);
  const canceladoRef = useRef(false);

  /* ─── Handlers perfil ─── */
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
        setForm((f) => ({ ...f, ciudad: data.places[0]["place name"], provincia: data.places[0]["state"] }));
      } catch { setCpError("Código postal no válido"); }
      finally { setCpCargando(false); }
    }
  };

  const handlePhoto = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const compressed = await comprimirImagen(file);
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
    const compressed = await comprimirImagen(file);
    setFile(compressed);
    setPreview(URL.createObjectURL(compressed));
  };

  const handleGuardar = async () => {
    if (!form.nombre || !form.edad || !form.ciudad || !form.presupuesto) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }
    setError(""); setSaving(true);
    try {
      const user = auth.currentUser;
      let photoURL   = profile.photoURL   || "";
      let bannerURL  = profile.bannerURL  || "";
      let foto1URL   = profile.foto1URL   || "";
      let foto2URL   = profile.foto2URL   || "";
      let foto3URL   = profile.foto3URL   || "";

      if (photoFile) {
        const r = ref(storage, `fotos/${user.uid}`);
        await uploadBytes(r, photoFile);
        photoURL = await getDownloadURL(r);
      }
      if (bannerFile) {
        const r = ref(storage, `users/${user.uid}/banner`);
        await uploadBytes(r, bannerFile);
        bannerURL = await getDownloadURL(r);
      }
      if (foto1File) {
        const r = ref(storage, `users/${user.uid}/fotos/foto1`);
        await uploadBytes(r, foto1File);
        foto1URL = await getDownloadURL(r);
      }
      if (foto2File) {
        const r = ref(storage, `users/${user.uid}/fotos/foto2`);
        await uploadBytes(r, foto2File);
        foto2URL = await getDownloadURL(r);
      }
      if (foto3File) {
        const r = ref(storage, `users/${user.uid}/fotos/foto3`);
        await uploadBytes(r, foto3File);
        foto3URL = await getDownloadURL(r);
      }

      await setDoc(doc(db, "users", user.uid), {
        ...profile,
        nombre:       form.nombre,
        edad:         Number(form.edad),
        codigoPostal: form.codigoPostal,
        ciudad:       form.ciudad,
        provincia:    form.provincia,
        presupuesto:  Number(form.presupuesto),
        bio:          form.bio,
        sexo:         form.sexo,
        photoURL, bannerURL, foto1URL, foto2URL, foto3URL, bannerPosition,
      });
      if (onProfileUpdated) await onProfileUpdated();
      setEditando(false);
      setPhotoFile(null); setPhotoPreview(null);
      setBannerFile(null); setBannerPreview(null);
      setFoto1File(null); setFoto1Preview(null);
      setFoto2File(null); setFoto2Preview(null);
      setFoto3File(null); setFoto3Preview(null);
    } catch (err) {
      console.error(err);
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally { setSaving(false); }
  };

  const handleCancelar = () => {
    setForm({
      nombre: profile.nombre || "", edad: profile.edad || "",
      codigoPostal: profile.codigoPostal || "", ciudad: profile.ciudad || "",
      provincia: profile.provincia || "", presupuesto: profile.presupuesto || "",
      bio: profile.bio || "", sexo: profile.sexo || "",
    });
    setCpError(""); setError("");
    setPhotoFile(null); setPhotoPreview(null);
    setBannerFile(null); setBannerPreview(null);
    setFoto1File(null); setFoto1Preview(null);
    setFoto2File(null); setFoto2Preview(null);
    setFoto3File(null); setFoto3Preview(null);
    setEditando(false);
  };

  /* ─── Handlers verificación ─── */
  const abrirModalVerif = () => {
    canceladoRef.current = false;
    setPasoModal(0); setFotosBlob([]); setFotosPrev([]);
    setCamaraError(false); setInstruccion(0); setCountdown(2);
    setModalVerif(true);
  };
  const cerrarModalVerif = () => {
    canceladoRef.current = true;
    detenerCamara();
    setModalVerif(false);
  };
  const iniciarCamara = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: "user" }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play().catch(() => {});
      }
      return true;
    } catch (err) { console.error("[Verif] Error cámara:", err); setCamaraError(true); return false; }
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
    const blobs = []; const prevs = [];
    for (let i = 0; i < INSTRUCCIONES_VERIF.length; i++) {
      if (canceladoRef.current) return;
      setInstruccion(i); setCountdown(2);
      await sleep(1000);
      if (canceladoRef.current) return;
      setCountdown(1);
      await sleep(1000);
      if (canceladoRef.current) return;
      const blob = await capturarFoto();
      if (!blob || canceladoRef.current) return;
      blobs.push(blob); prevs.push(URL.createObjectURL(blob));
    }
    detenerCamara(); setFotosBlob(blobs); setFotosPrev(prevs); setPasoModal(2);
  };
  const entrarPaso1 = async () => {
    canceladoRef.current = false;
    detenerCamara(); setCamaraError(false);
    setFotosBlob([]); setFotosPrev([]);
    setPasoModal(1); setInstruccion(0); setCountdown(2);
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
        fotosBlob.map((blob, i) => uploadBytes(ref(storage, `verificaciones/${uid}/foto${i + 1}`), blob))
      );
      await updateDoc(doc(db, "users", uid), {
        verificacionEstado: "pendiente",
        verificacionFecha:  serverTimestamp(),
      });
      if (onProfileUpdated) await onProfileUpdated();
      setPasoModal(3);
    } catch (err) { console.error("[Verif] Error enviando:", err); }
    finally { setEnviandoVerif(false); }
  };

  const fotoActual  = photoPreview  || (esFirebasePhoto(profile.photoURL)  ? profile.photoURL  : null);
  const bannerShown = bannerPreview || (esFirebasePhoto(profile.bannerURL) ? profile.bannerURL : null);
  const estadoVerif = profile.verificacionEstado;

  const fotosGaleria = [
    foto1Preview || (esFirebasePhoto(profile.foto1URL) ? profile.foto1URL : null),
    foto2Preview || (esFirebasePhoto(profile.foto2URL) ? profile.foto2URL : null),
    foto3Preview || (esFirebasePhoto(profile.foto3URL) ? profile.foto3URL : null),
  ].filter(Boolean);

  return (
    <div style={s.container}>
      {/* Background stickers */}
      {BG_STICKERS.map(({ id, C, rotate, ...pos }) => (
        <div key={id} style={{ position: "absolute", ...pos, transform: `rotate(${rotate}deg)`, opacity: 0.05, pointerEvents: "none", zIndex: 0 }}>
          <C />
        </div>
      ))}

      {/* Logo + wordmark */}
      <div style={s.logoArea}>
        <LogoSVG size={44} />
        <span style={s.wordmark}>
          Roomie<span style={s.gradText}>Match</span>
        </span>
      </div>

      {/* Card */}
      <div style={s.card}>
        {/* Banner */}
        <div
          style={{ ...s.banner, cursor: editando ? "pointer" : "default" }}
          onClick={editando ? () => document.getElementById("bannerInput").click() : undefined}
        >
          {bannerShown
            ? <img src={bannerShown} alt="banner" style={{ ...s.bannerImg, objectPosition: `center ${bannerPosition}%` }} />
            : <div style={s.bannerGrad} />
          }
          {editando && (
            <div style={s.bannerOverlay}>
              <IconImage />
              <span style={{ fontSize: "12px", fontWeight: "600", marginTop: "4px" }}>Cambiar banner</span>
            </div>
          )}
          {editando && (
            <input id="bannerInput" type="file" accept="image/*" onChange={handleBanner} style={{ display: "none" }} />
          )}
        </div>

        {/* Avatar */}
        <div style={s.avatarArea}>
          <div
            style={s.avatarRing}
            onClick={editando ? () => document.getElementById("fotoEditInput").click() : undefined}
          >
            <div style={{ ...s.avatarInner, cursor: editando ? "pointer" : "default", position: "relative" }}>
              <img
                src={fotoActual || getAvatarDefault(form.sexo || profile.sexo)}
                alt="perfil" style={s.avatarImg} referrerPolicy="no-referrer"
              />
              {editando && (
                <div style={s.avatarOverlay}>
                  <IconCamera />
                  <span style={{ fontSize: "11px", fontWeight: "600", marginTop: "4px" }}>Cambiar</span>
                </div>
              )}
            </div>
          </div>
          {editando && (
            <input id="fotoEditInput" type="file" accept="image/*" onChange={handlePhoto} style={{ display: "none" }} />
          )}
        </div>

        <div style={s.body}>
          {!editando ? (
            /* ─── Vista ─── */
            <>
              <h2 style={s.nombre}>{profile.nombre}</h2>

              {/* Email privado */}
              <p style={s.emailText}>{auth.currentUser?.email}</p>
              <p style={s.emailPrivado}>Tu email es privado y no lo ven otros usuarios</p>

              <div style={s.chipsRow}>
                {profile.ciudad      && <span style={s.chip}><IconPin /> {profile.ciudad}</span>}
                {profile.edad        && <span style={s.chip}><IconCalendar /> {profile.edad} años</span>}
                {profile.presupuesto && <span style={s.chip}><IconEuro /> {profile.presupuesto} €/mes</span>}
              </div>

              {profile.bio && <p style={s.bio}>"{profile.bio}"</p>}

              {/* Galería de fotos */}
              {fotosGaleria.length > 0 && (
                <div style={s.galeria}>
                  {fotosGaleria.map((url, i) => (
                    <img key={i} src={url} alt={`foto ${i + 1}`} style={s.galeriaImg} referrerPolicy="no-referrer" />
                  ))}
                </div>
              )}

              {/* Verificación */}
              <div style={s.verifSection}>
                {estadoVerif === "verificado" && (
                  <div style={s.verifBadgeVerificado}>
                    <svg width="18" height="18" viewBox="0 0 20 20" style={{ display: "inline-block", verticalAlign: "middle" }}>
                      <circle cx="10" cy="10" r="10" fill="#1d9bf0"/>
                      <path d="M6 10l3 3 5-5" fill="none" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                    </svg>
                    Identidad verificada
                  </div>
                )}
                {estadoVerif === "pendiente" && (
                  <div style={s.verifBadgePendiente}><IconClock /> Verificación en revisión — 24h</div>
                )}
                {estadoVerif === "rechazado" && (
                  <>
                    <div style={s.verifBadgeRechazado}><IconXCircle /> Verificación rechazada</div>
                    <button style={s.verifBtn} onClick={abrirModalVerif}>Intentar de nuevo</button>
                  </>
                )}
                {!estadoVerif && (
                  <>
                    <button style={s.verifBtn} onClick={abrirModalVerif}>Verificar mi identidad (opcional)</button>
                    <p style={s.verifDisclaimer}>Proceso privado — tus imágenes nunca serán públicas</p>
                  </>
                )}
              </div>

              <button style={s.editBtn} onClick={() => setEditando(true)}>
                <IconPencil /> Editar perfil
              </button>
              <button style={s.logoutBtn} onClick={() => signOut(auth)}>Cerrar sesión</button>
              <button style={s.deleteAccountLink} onClick={() => setModalBorrar(true)}>
                Eliminar mi cuenta
              </button>
            </>
          ) : (
            /* ─── Edición ─── */
            <div style={s.form}>
              {profile.ciudad && !profile.codigoPostal && (
                <div style={s.bannerCP}>
                  Actualiza tu perfil añadiendo tu código postal para mejorar las búsquedas.
                </div>
              )}

              <div style={s.fieldGroup}>
                <label style={s.label}>Nombre <span style={s.req}>*</span></label>
                <input name="nombre" value={form.nombre} onChange={handleChange} style={s.input} />
              </div>

              <div style={s.row}>
                <div style={{ ...s.fieldGroup, flex: 1 }}>
                  <label style={s.label}>Edad <span style={s.req}>*</span></label>
                  <input name="edad" type="number" min="18" max="99" value={form.edad} onChange={handleChange} style={s.input} />
                </div>
                <div style={{ width: "12px" }} />
                <div style={{ ...s.fieldGroup, flex: 2 }}>
                  <label style={s.label}>Código postal <span style={s.req}>*</span></label>
                  <div style={{ position: "relative" }}>
                    <input
                      name="codigoPostal" type="text" inputMode="numeric"
                      placeholder="Ej: 28001" maxLength={5}
                      value={form.codigoPostal} onChange={handleCodigoPostal} style={s.input}
                    />
                    {cpCargando && <span style={s.cpSpinner} />}
                  </div>
                </div>
              </div>

              {(form.ciudad || cpError) && (
                <div style={s.fieldGroup}>
                  {cpError ? (
                    <p style={s.cpError}>{cpError}</p>
                  ) : (
                    <div style={s.ciudadDetectada}>
                      <IconPin />
                      <span style={{ fontSize: "14px", fontWeight: "700", color: "#166534" }}>
                        {form.ciudad}{form.provincia ? ` · ${form.provincia}` : ""}
                      </span>
                    </div>
                  )}
                </div>
              )}

              <div style={s.fieldGroup}>
                <label style={s.label}>Presupuesto (€/mes) <span style={s.req}>*</span></label>
                <div style={{ position: "relative" }}>
                  <span style={s.prefix}>€</span>
                  <input name="presupuesto" type="number" min="0" value={form.presupuesto} onChange={handleChange} style={{ ...s.input, paddingLeft: "32px" }} />
                </div>
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Bio</label>
                <textarea name="bio" rows={3} value={form.bio} onChange={handleChange} style={s.textarea} />
              </div>

              <div style={s.fieldGroup}>
                <label style={s.label}>Sexo</label>
                <div style={{ display: "flex", gap: "8px" }}>
                  {[
                    { valor: "hombre",     etiqueta: "Hombre" },
                    { valor: "mujer",      etiqueta: "Mujer" },
                    { valor: "no_binario", etiqueta: "No binario" },
                  ].map(({ valor, etiqueta }) => (
                    <button
                      key={valor} type="button"
                      style={{
                        flex: 1, padding: "10px 4px", borderRadius: "12px",
                        border: form.sexo === valor ? "2px solid #7c3aed" : "2px solid var(--app-border, #e5e7eb)",
                        background: form.sexo === valor ? "rgba(124,58,237,0.08)" : "var(--app-input-bg, #fafafa)",
                        color: form.sexo === valor ? "#7c3aed" : "var(--app-text-muted, #6b7280)",
                        fontSize: "13px", fontWeight: "600", cursor: "pointer",
                        fontFamily: "inherit", transition: "border-color 0.2s",
                      }}
                      onClick={() => setForm({ ...form, sexo: valor })}
                    >{etiqueta}</button>
                  ))}
                </div>
              </div>

              {/* Mis fotos */}
              <div style={s.fieldGroup}>
                <label style={s.label}>Mis fotos (hasta 3)</label>
                <div style={s.photosRow}>
                  {[
                    { id: "fotoExtra1", file: foto1File, preview: foto1Preview, existing: profile.foto1URL, setter: makeFotoHandler(setFoto1File, setFoto1Preview) },
                    { id: "fotoExtra2", file: foto2File, preview: foto2Preview, existing: profile.foto2URL, setter: makeFotoHandler(setFoto2File, setFoto2Preview) },
                    { id: "fotoExtra3", file: foto3File, preview: foto3Preview, existing: profile.foto3URL, setter: makeFotoHandler(setFoto3File, setFoto3Preview) },
                  ].map(({ id, preview, existing, setter }) => {
                    const shown = preview || (esFirebasePhoto(existing) ? existing : null);
                    return (
                      <div key={id} style={s.photoSlot} onClick={() => document.getElementById(id).click()}>
                        {shown ? (
                          <img src={shown} alt="foto" style={s.photoSlotImg} referrerPolicy="no-referrer" />
                        ) : (
                          <div style={s.photoSlotPlus}>
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--app-text-muted, #9ca3af)" strokeWidth="2.5" strokeLinecap="round">
                              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
                            </svg>
                          </div>
                        )}
                        <input id={id} type="file" accept="image/*" onChange={setter} style={{ display: "none" }} />
                      </div>
                    );
                  })}
                </div>
              </div>

              {error && <p style={s.error}>{error}</p>}

              <button style={s.saveBtn} onClick={handleGuardar} disabled={saving}>
                {saving ? "Guardando..." : "Guardar cambios"}
              </button>
              <button style={s.cancelBtn} onClick={handleCancelar} disabled={saving}>Cancelar</button>
            </div>
          )}
        </div>
      </div>

      {modalBorrar && <BorrarCuenta onClose={() => setModalBorrar(false)} />}

      {/* ── Modal verificación ── */}
      {modalVerif && (
        <div style={s.modalOverlay}>
          <div style={s.modal}>
            {pasoModal < 3 && (
              <div style={{ display: "flex", justifyContent: "center", gap: "10px", marginBottom: "24px" }}>
                {[0, 1, 2].map((i) => (
                  <div key={i} style={{
                    width: "10px", height: "10px", borderRadius: "50%",
                    background: pasoModal >= i ? "#7c3aed" : "var(--app-border, #e5e7eb)",
                    transform: pasoModal === i ? "scale(1.3)" : "scale(1)",
                    transition: "background 0.3s, transform 0.3s",
                  }} />
                ))}
              </div>
            )}

            {pasoModal === 0 && (
              <div style={s.pasoContainer}>
                <div style={{ color: "var(--app-text-muted)", marginBottom: "12px" }}><IconLock /></div>
                <h3 style={s.pasoTitle}>Tu privacidad es lo primero</h3>
                <p style={s.pasoTexto}>
                  Las imágenes capturadas se usan exclusivamente para verificar que eres una persona real.
                  No serán visibles para otros usuarios ni compartidas con terceros.
                  Serán eliminadas tras la revisión.
                </p>
                <button style={s.btnPrimario} onClick={entrarPaso1}>Entendido, continuar</button>
                <button style={s.btnCancelarModal} onClick={cerrarModalVerif}>Cancelar</button>
              </div>
            )}

            {pasoModal === 1 && (
              <div style={s.pasoContainer}>
                <h3 style={s.pasoTitle}>Paso {instruccion + 1} de 3</h3>
                {camaraError ? (
                  <div style={{ display: "flex", flexDirection: "column", alignItems: "center", padding: "24px", background: "var(--app-input-bg)", borderRadius: "14px", marginBottom: "16px" }}>
                    <IconCameraOff />
                    <p style={{ color: "#ef4444", margin: "10px 0 0", fontSize: "14px", textAlign: "center" }}>
                      No se pudo acceder a la cámara.<br />Comprueba los permisos del navegador.
                    </p>
                  </div>
                ) : (
                  <>
                    <div style={{ width: "100%", maxWidth: "320px", borderRadius: "16px", overflow: "hidden", background: "#000", marginBottom: "14px", boxShadow: "0 4px 16px rgba(0,0,0,0.2)" }}>
                      <video ref={videoRef} style={{ width: "100%", display: "block", transform: "scaleX(-1)" }} autoPlay playsInline muted />
                    </div>
                    <p style={{ fontSize: "15px", fontWeight: "700", color: "var(--app-text)", margin: "0 0 12px 0" }}>
                      {INSTRUCCIONES_VERIF[instruccion]?.texto}
                    </p>
                    <div style={{ display: "flex", gap: "8px" }}>
                      {[2, 1].map((n) => (
                        <div key={n} style={{ width: "12px", height: "12px", borderRadius: "50%", background: countdown <= n ? "#7c3aed" : "var(--app-border, #e5e7eb)", transition: "background 0.3s" }} />
                      ))}
                    </div>
                    <p style={{ fontSize: "12px", color: "var(--app-text-muted)", margin: "6px 0 0" }}>Capturando en {countdown}s…</p>
                  </>
                )}
                <button style={{ ...s.btnCancelarModal, marginTop: "16px" }} onClick={cerrarModalVerif}>Cancelar</button>
              </div>
            )}

            {pasoModal === 2 && (
              <div style={s.pasoContainer}>
                <div style={{ marginBottom: "8px" }}><IconCheckCircle /></div>
                <h3 style={s.pasoTitle}>Fotos capturadas correctamente</h3>
                <div style={{ display: "flex", gap: "10px", justifyContent: "center", margin: "16px 0 20px" }}>
                  {fotosPrev.map((url, i) => (
                    <img key={i} src={url} alt={`foto ${i + 1}`} style={{ width: "80px", height: "80px", objectFit: "cover", borderRadius: "12px", border: "2px solid #7c3aed" }} />
                  ))}
                </div>
                <button style={{ ...s.btnPrimario, opacity: enviandoVerif ? 0.6 : 1 }} onClick={enviarVerificacion} disabled={enviandoVerif}>
                  {enviandoVerif ? "Enviando…" : "Enviar para verificación"}
                </button>
                <button style={s.btnSecundario} onClick={entrarPaso1} disabled={enviandoVerif}>Repetir fotos</button>
                <button style={s.btnCancelarModal} onClick={cerrarModalVerif} disabled={enviandoVerif}>Cancelar</button>
              </div>
            )}

            {pasoModal === 3 && (
              <div style={s.pasoContainer}>
                <div style={{ marginBottom: "12px" }}><IconStarDone /></div>
                <h3 style={s.pasoTitle}>¡Solicitud enviada!</h3>
                <p style={s.pasoTexto}>Revisaremos tu identidad en menos de 24 horas.</p>
                <button style={s.btnPrimario} onClick={cerrarModalVerif}>Cerrar</button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Crop modal banner ── */}
      {cropModal && (
        <div style={s.cropOverlay}>
          <div style={s.cropModal}>
            <h3 style={s.cropTitle}>Ajustar posición del banner</h3>
            <div style={s.cropPreviewWrap}>
              <img
                src={cropPreviewUrl}
                alt="banner preview"
                style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `center ${cropPos}%` }}
              />
            </div>
            <label style={s.cropLabel}>Posición vertical</label>
            <input
              type="range" min="0" max="100" step="1"
              value={cropPos}
              onChange={(e) => setCropPos(Number(e.target.value))}
              style={s.cropSlider}
            />
            <div style={s.cropBtns}>
              <button style={s.cropBtnCancel} onClick={() => setCropModal(false)}>Cancelar</button>
              <button style={s.cropBtnConfirm} onClick={confirmCrop}>Confirmar</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

const s = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(160deg, #0f0a1e 0%, #1a0f2e 100%)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    paddingBottom: "80px",
    paddingTop: "28px",
    fontFamily: "'Inter', 'Segoe UI', sans-serif",
    position: "relative",
    overflow: "hidden",
  },
  logoArea: {
    display: "flex",
    alignItems: "center",
    gap: "12px",
    marginBottom: "24px",
    position: "relative",
    zIndex: 2,
  },
  wordmark: {
    fontSize: "20px",
    fontWeight: "800",
    color: "#ffffff",
    letterSpacing: "-0.3px",
  },
  gradText: {
    background: "linear-gradient(90deg, #f97316, #7c3aed)",
    WebkitBackgroundClip: "text",
    WebkitTextFillColor: "transparent",
    backgroundClip: "text",
  },
  card: {
    background: "var(--app-surface, #ffffff)",
    borderRadius: "28px",
    maxWidth: "420px",
    width: "90%",
    boxShadow: "0 24px 80px rgba(0,0,0,0.4)",
    overflow: "hidden",
    position: "relative",
    zIndex: 2,
    transition: "background 0.3s",
  },
  /* Banner */
  banner: {
    height: "120px",
    position: "relative",
    overflow: "hidden",
    flexShrink: 0,
  },
  bannerGrad: {
    width: "100%",
    height: "100%",
    background: "linear-gradient(135deg, #f97316 0%, #7c3aed 100%)",
  },
  bannerImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
    display: "block",
  },
  bannerOverlay: {
    position: "absolute",
    inset: 0,
    background: "rgba(0,0,0,0.4)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    color: "#ffffff",
  },
  /* Avatar */
  avatarArea: {
    display: "flex",
    justifyContent: "center",
    marginTop: "-54px",
    marginBottom: "10px",
  },
  avatarRing: {
    width: "108px", height: "108px", borderRadius: "50%",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    padding: "3px", display: "flex", alignItems: "center", justifyContent: "center",
    boxShadow: "0 8px 24px rgba(0,0,0,0.3)",
  },
  avatarInner: {
    width: "100%", height: "100%", borderRadius: "50%",
    background: "var(--app-surface, #ffffff)",
    overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center",
  },
  avatarImg: { width: "100%", height: "100%", objectFit: "cover" },
  avatarOverlay: {
    position: "absolute", inset: 0,
    background: "rgba(0,0,0,0.45)",
    display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
    cursor: "pointer", color: "#ffffff",
  },
  body: {
    padding: "0 24px 28px",
    display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center",
  },
  nombre: {
    margin: "0 0 4px 0", fontSize: "22px", fontWeight: "800",
    color: "var(--app-text, #1a1a2e)", letterSpacing: "-0.3px",
  },
  emailText: {
    margin: "0 0 2px 0", fontSize: "13px", color: "var(--app-text-muted, #6b7280)", fontWeight: "500",
  },
  emailPrivado: {
    margin: "0 0 14px 0", fontSize: "11px", color: "var(--app-text-muted, #9ca3af)",
    background: "var(--app-input-bg, #f9fafb)",
    border: "1px solid var(--app-border, #e5e7eb)",
    borderRadius: "8px", padding: "4px 10px", lineHeight: "1.5",
  },
  chipsRow: {
    display: "flex", flexWrap: "wrap", gap: "8px",
    justifyContent: "center", marginBottom: "12px",
  },
  chip: {
    background: "var(--app-input-bg, #f9fafb)", color: "var(--app-text-muted, #6b7280)",
    fontSize: "12px", fontWeight: "600", padding: "5px 12px", borderRadius: "20px",
    border: "1px solid var(--app-border, #e5e7eb)",
    display: "inline-flex", alignItems: "center", gap: "5px",
  },
  bio: {
    fontSize: "13px", color: "var(--app-text-muted, #6b7280)",
    fontStyle: "italic", lineHeight: "1.6",
    marginBottom: "14px", maxWidth: "300px",
  },
  /* Galería */
  galeria: {
    display: "flex",
    gap: "8px",
    marginBottom: "16px",
    justifyContent: "center",
  },
  galeriaImg: {
    width: "90px",
    height: "90px",
    borderRadius: "12px",
    objectFit: "cover",
    border: "1.5px solid var(--app-border, #e5e7eb)",
  },
  verifSection: {
    width: "100%", display: "flex", flexDirection: "column",
    alignItems: "center", gap: "8px", marginBottom: "16px",
  },
  verifBadgeVerificado: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    color: "#ffffff", padding: "8px 18px", borderRadius: "20px",
    fontSize: "13px", fontWeight: "700",
  },
  verifBadgePendiente: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "var(--app-input-bg, #f9fafb)",
    border: "1.5px solid #fcd34d", color: "#92400e",
    padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
  },
  verifBadgeRechazado: {
    display: "inline-flex", alignItems: "center", gap: "6px",
    background: "var(--app-input-bg, #f9fafb)",
    border: "1.5px solid #fca5a5", color: "#991b1b",
    padding: "8px 18px", borderRadius: "20px", fontSize: "13px", fontWeight: "600",
  },
  verifBtn: {
    padding: "11px 22px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    color: "#ffffff", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 4px 12px rgba(124,58,237,0.35)",
    fontFamily: "inherit",
  },
  verifDisclaimer: { margin: 0, fontSize: "11px", color: "var(--app-text-muted, #9ca3af)", lineHeight: "1.4" },
  editBtn: {
    width: "100%", padding: "13px", borderRadius: "14px",
    border: "2px solid #7c3aed", background: "transparent",
    color: "#7c3aed", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
    display: "flex", alignItems: "center", justifyContent: "center", gap: "7px",
    fontFamily: "inherit",
  },
  logoutBtn: {
    width: "100%", padding: "13px", borderRadius: "14px",
    border: "none", background: "var(--app-input-bg, #f3f4f6)",
    color: "var(--app-text-muted, #6b7280)", fontSize: "14px", fontWeight: "600",
    cursor: "pointer", fontFamily: "inherit",
  },
  deleteAccountLink: {
    background: "none", border: "none", color: "#dc2626",
    fontSize: "12px", fontWeight: "500", cursor: "pointer",
    marginTop: "8px", padding: "4px", textDecoration: "underline", opacity: 0.75,
  },
  /* Formulario */
  form: { width: "100%", display: "flex", flexDirection: "column", gap: "14px", textAlign: "left", marginTop: "8px" },
  fieldGroup: { display: "flex", flexDirection: "column", gap: "5px" },
  row: { display: "flex", flexDirection: "row", alignItems: "flex-start" },
  label: { fontSize: "13px", fontWeight: "600", color: "var(--app-text, #374151)" },
  req: { color: "#ef4444" },
  prefix: {
    position: "absolute", left: "12px", top: "50%",
    transform: "translateY(-50%)", color: "var(--app-text-muted, #9ca3af)",
    fontSize: "14px", pointerEvents: "none",
  },
  input: {
    width: "100%", padding: "11px 13px",
    border: "1.5px solid var(--app-border, #e5e7eb)", borderRadius: "12px",
    fontSize: "14px", color: "var(--app-text, #1a1a2e)", outline: "none",
    boxSizing: "border-box", background: "var(--app-input-bg, #fafafa)",
    fontFamily: "inherit", transition: "border-color 0.2s",
  },
  textarea: {
    width: "100%", padding: "11px 13px",
    border: "1.5px solid var(--app-border, #e5e7eb)", borderRadius: "12px",
    fontSize: "14px", color: "var(--app-text, #1a1a2e)", outline: "none",
    boxSizing: "border-box", resize: "none",
    background: "var(--app-input-bg, #fafafa)", fontFamily: "inherit", lineHeight: "1.5",
    transition: "border-color 0.2s",
  },
  /* Photo slots */
  photosRow: {
    display: "flex",
    gap: "10px",
  },
  photoSlot: {
    flex: 1,
    aspectRatio: "1",
    borderRadius: "12px",
    border: "1.5px dashed var(--app-border, #c4b5fd)",
    background: "var(--app-input-bg, #f5f3ff)",
    overflow: "hidden",
    cursor: "pointer",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  photoSlotImg: {
    width: "100%", height: "100%", objectFit: "cover",
  },
  photoSlotPlus: {
    display: "flex", alignItems: "center", justifyContent: "center",
  },
  error: {
    margin: 0, fontSize: "13px", color: "#ef4444",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "10px", padding: "10px 14px",
  },
  saveBtn: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", boxShadow: "0 4px 14px rgba(249,115,22,0.35)",
    fontFamily: "inherit",
  },
  bannerCP: {
    padding: "10px 14px", background: "var(--app-input-bg, #fffbeb)",
    border: "1.5px solid #fcd34d", borderRadius: "12px",
    fontSize: "12px", color: "#92400e", fontWeight: "600",
    lineHeight: "1.4", textAlign: "center",
  },
  cpSpinner: {
    position: "absolute", right: "12px", top: "50%", transform: "translateY(-50%)",
    width: "14px", height: "14px",
    border: "2px solid var(--app-border, #e5e7eb)", borderTop: "2px solid #7c3aed",
    borderRadius: "50%", animation: "spin 0.7s linear infinite",
    display: "inline-block",
  },
  cpError: { margin: 0, fontSize: "12px", color: "#ef4444", fontWeight: "600" },
  ciudadDetectada: {
    display: "flex", alignItems: "center", gap: "8px",
    padding: "10px 14px",
    background: "#f0fdf4", border: "1.5px solid #86efac", borderRadius: "12px",
    color: "#166534",
  },
  cancelBtn: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "var(--app-input-bg, #f3f4f6)", color: "var(--app-text-muted, #6b7280)",
    fontSize: "14px", fontWeight: "600", cursor: "pointer", fontFamily: "inherit",
  },
  /* Modal verificación */
  modalOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.6)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1000, padding: "20px",
  },
  modal: {
    background: "var(--app-surface, #ffffff)", borderRadius: "24px",
    padding: "28px 24px", maxWidth: "380px", width: "100%",
    maxHeight: "90vh", overflowY: "auto",
    boxShadow: "0 24px 80px rgba(0,0,0,0.3)",
    border: "1px solid var(--app-border, #e5e7eb)",
    transition: "background 0.3s",
  },
  pasoContainer: { display: "flex", flexDirection: "column", alignItems: "center", textAlign: "center" },
  pasoTitle: { margin: "0 0 12px 0", fontSize: "18px", fontWeight: "800", color: "var(--app-text, #1a1a2e)" },
  pasoTexto: { fontSize: "14px", color: "var(--app-text-muted, #6b7280)", lineHeight: "1.6", margin: "0 0 24px 0" },
  btnPrimario: {
    width: "100%", padding: "13px", borderRadius: "14px", border: "none",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
    boxShadow: "0 4px 12px rgba(249,115,22,0.3)",
    fontFamily: "inherit",
  },
  btnSecundario: {
    width: "100%", padding: "12px", borderRadius: "14px",
    border: "2px solid #7c3aed", background: "transparent",
    color: "#7c3aed", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px", fontFamily: "inherit",
  },
  btnCancelarModal: {
    background: "none", border: "none", color: "var(--app-text-muted, #6b7280)",
    fontSize: "13px", cursor: "pointer", padding: "6px", fontFamily: "inherit",
  },
  /* Crop modal */
  cropOverlay: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,0.82)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 1100, padding: "24px",
  },
  cropModal: {
    background: "var(--app-surface, #1a1a2e)", borderRadius: "20px",
    padding: "24px", maxWidth: "380px", width: "100%",
    border: "1px solid var(--app-border, #2a2a3e)",
    display: "flex", flexDirection: "column", gap: "14px",
  },
  cropTitle: {
    margin: 0, fontSize: "16px", fontWeight: "800",
    color: "var(--app-text, #f8fafc)", textAlign: "center",
  },
  cropPreviewWrap: {
    width: "100%", height: "90px", borderRadius: "12px",
    overflow: "hidden", background: "var(--app-border, #2a2a3e)",
  },
  cropLabel: {
    fontSize: "12px", fontWeight: "600",
    color: "var(--app-text-muted, #94a3b8)", textAlign: "center",
  },
  cropSlider: { width: "100%", accentColor: "#7c3aed", cursor: "pointer" },
  cropBtns: { display: "flex", gap: "10px", marginTop: "4px" },
  cropBtnCancel: {
    flex: 1, padding: "11px", borderRadius: "12px",
    border: "1.5px solid var(--app-border, #2a2a3e)", background: "transparent",
    color: "var(--app-text-muted, #94a3b8)", fontSize: "14px", fontWeight: "600",
    cursor: "pointer", fontFamily: "inherit",
  },
  cropBtnConfirm: {
    flex: 2, padding: "11px", borderRadius: "12px", border: "none",
    background: "linear-gradient(135deg, #f97316, #7c3aed)",
    color: "#ffffff", fontSize: "14px", fontWeight: "700",
    cursor: "pointer", fontFamily: "inherit",
  },
};
