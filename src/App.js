import { useEffect, useRef, useState } from "react";
import { onAuthStateChanged, getIdTokenResult, signOut } from "firebase/auth";
import { doc, getDoc, getDocs, collection, query, where, onSnapshot } from "firebase/firestore";
import { auth, db } from "./firebase";
import Landing from "./pages/Landing";
import Privacidad from "./pages/Privacidad";
import Terminos from "./pages/Terminos";
import Login from "./components/Login";
import CreateProfile from "./components/CreateProfile";
import BannerCookies from "./components/BannerCookies";
import ConvivenciaTest from "./components/ConvivenciaTest";
import Explorar from "./components/Explorar";
import MiPerfil from "./components/MiPerfil";
import Matches from "./components/Matches";
import AdminPanel from "./components/AdminPanel";
import Servicios from "./components/Servicios";
import VerificarEmail from "./pages/VerificarEmail";
import Navbar from "./components/Navbar";
import InstallButton from "./components/InstallButton";
import { useNotifications } from "./hooks/useNotifications";
import { iniciarPresencia } from "./utils/presencia";

function App() {
  const presenciaCleanupRef = useRef(null);
  const [mostrarLogin, setMostrarLogin] = useState(false);
  const [user, setUser]               = useState(null);
  const [profile, setProfile]         = useState(null);
  const [loading, setLoading]         = useState(true);
  const [pantalla, setPantalla]       = useState("explorar");
  const [unreadCount, setUnreadCount] = useState(0);
  const [isAdmin, setIsAdmin]         = useState(false);
  const [vistaAdmin, setVistaAdmin]   = useState(false);
  const [suspendido, setSuspendido]   = useState(false);
  const [screenOpacity, setScreenOpacity] = useState(1);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      if (!currentUser && presenciaCleanupRef.current) {
        presenciaCleanupRef.current();
        presenciaCleanupRef.current = null;
      }
      setUser(currentUser);
      if (currentUser) {
        // Verificar suspensión por UID, email y fingerprint del dispositivo
        const fingerprint = `${navigator.userAgent}${window.screen.width}${window.screen.height}`;
        const [uidSnap, emailSnaps, fpSnaps] = await Promise.all([
          getDoc(doc(db, "usuarios", currentUser.uid)),
          getDocs(query(collection(db, "usuarios"), where("suspendidoEmail",        "==", currentUser.email))),
          getDocs(query(collection(db, "usuarios"), where("suspendidoFingerprint",  "==", fingerprint))),
        ]);

        const estaSuspendido =
          (uidSnap.exists() && uidSnap.data().suspendido === true) ||
          !emailSnaps.empty ||
          !fpSnaps.empty;

        if (estaSuspendido) {
          await signOut(auth);
          setSuspendido(true);
          setLoading(false);
          return;
        }

        const [profileSnap, tokenResult] = await Promise.all([
          getDoc(doc(db, "users", currentUser.uid)),
          getIdTokenResult(currentUser, true),
        ]);
        setProfile(profileSnap.exists() ? profileSnap.data() : null);
        setIsAdmin(tokenResult.claims.admin === true);
        if (!presenciaCleanupRef.current) {
          presenciaCleanupRef.current = iniciarPresencia(currentUser.uid);
        }
      } else {
        setProfile(null);
        setIsAdmin(false);
        setVistaAdmin(false);
        setMostrarLogin(false);
      }
      setLoading(false);
    });
    return () => unsubscribe();
  }, []);

  // Suscripción a mensajes no leídos
  useEffect(() => {
    if (!user) return;
    const uid = user.uid;
    const q = query(
      collection(db, "matches"),
      where(`unread_${uid}`, "==", true)
    );
    const unsub = onSnapshot(q, (snap) => {
      console.log(`[App] onSnapshot matches no leídos — ${snap.size} doc(s):`);
      snap.docs.forEach((d) => console.log("  →", d.id, d.data()));
      setUnreadCount(snap.size);
    });
    return () => unsub();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const { NotificationToast } = useNotifications(user);

  const navegarA = (nuevaPantalla) => {
    setScreenOpacity(0);
    setTimeout(() => {
      setPantalla(nuevaPantalla);
      setScreenOpacity(1);
    }, 150);
  };

  const recargarPerfil = async () => {
    const snap = await getDoc(doc(db, "users", user.uid));
    setProfile(snap.exists() ? snap.data() : null);
  };

  const handleTestCompletado = async () => {
    await recargarPerfil();
  };

  // Páginas legales públicas — accesibles sin autenticación
  const path = window.location.pathname;
  if (path === "/privacidad") return <Privacidad />;
  if (path === "/terminos")   return <Terminos />;

  // Ruta de verificación de email (antes del spinner para que no interfiera)
  if (path === "/verificar-email" && !loading && user &&
      !user.emailVerified && user.providerData[0]?.providerId === "password") {
    return <VerificarEmail user={user} />;
  }

  if (loading) {
    return (
      <div style={styles.loadingContainer}>
        <div style={styles.spinner} />
      </div>
    );
  }

  if (suspendido) {
    return (
      <div style={styles.suspendidoContainer}>
        <div style={styles.suspendidoCard}>
          <span style={{ fontSize: "64px" }}>🚫</span>
          <h2 style={styles.suspendidoTitle}>Cuenta suspendida</h2>
          <p style={styles.suspendidoTexto}>
            Tu cuenta ha sido suspendida por incumplimiento de las normas de la comunidad.
            Si crees que es un error contacta con soporte.
          </p>
        </div>
      </div>
    );
  }

  if (!user) {
    if (mostrarLogin) return <Login />;
    return (
      <>
        <Landing onEntrar={() => setMostrarLogin(true)} />
        <BannerCookies />
      </>
    );
  }

  // Usuarios de email/contraseña que aún no verificaron su cuenta
  if (!user.emailVerified && user.providerData[0]?.providerId === "password") {
    return <VerificarEmail user={user} />;
  }

  const perfilCompleto = (p) =>
    p && p.nombre && p.edad && p.sexo && p.ciudad && p.testCompletado === true;

  if (!profile || !profile.nombre || !profile.edad || !profile.sexo || !profile.ciudad) {
    return <CreateProfile onProfileSaved={recargarPerfil} />;
  }

  if (!perfilCompleto(profile)) {
    return <ConvivenciaTest onTestCompletado={handleTestCompletado} />;
  }

  if (vistaAdmin && isAdmin) {
    return <AdminPanel user={user} onClose={() => setVistaAdmin(false)} isAdmin={isAdmin} />;
  }

  const renderPantalla = () => {
    switch (pantalla) {
      case "perfil":     return <MiPerfil profile={profile} onProfileUpdated={recargarPerfil} />;
      case "matches":    return <Matches />;
      case "servicios":  return <Servicios />;
      default:           return <Explorar setPantalla={navegarA} />;
    }
  };

  return (
    <div style={styles.appWrapper}>
      <div style={{ ...styles.screen, opacity: screenOpacity, transition: "opacity 0.15s ease" }}>
        {renderPantalla()}
      </div>
      <Navbar
        pantalla={pantalla}
        setPantalla={navegarA}
        user={user}
        profile={profile}
        unreadCount={unreadCount}
      />
      <InstallButton />
      {NotificationToast}
    </div>
  );
}

const styles = {
  loadingContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
  },
  spinner: {
    width: "48px",
    height: "48px",
    border: "5px solid rgba(255,255,255,0.3)",
    borderTop: "5px solid #ffffff",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  appWrapper: {
    position: "relative",
    minHeight: "100vh",
  },
  screen: {
    paddingBottom: "68px",
  },
  suspendidoContainer: {
    minHeight: "100vh",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "#0f0f0f",
    padding: "24px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  suspendidoCard: {
    background: "#1a1a1a",
    border: "1px solid #ef4444",
    borderRadius: "24px",
    padding: "48px 36px",
    maxWidth: "380px",
    width: "100%",
    textAlign: "center",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "16px",
  },
  suspendidoTitle: {
    margin: 0,
    fontSize: "24px",
    fontWeight: "800",
    color: "#ef4444",
  },
  suspendidoTexto: {
    margin: 0,
    fontSize: "15px",
    color: "#9ca3af",
    lineHeight: "1.6",
  },
};

export default App;
