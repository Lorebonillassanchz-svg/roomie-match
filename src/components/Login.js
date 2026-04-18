import React, { useState } from "react";
import { GoogleAuthProvider, signInWithPopup } from "firebase/auth";
import { auth } from "../firebase";
import ReglasComunitarias from "./ReglasComunitarias";

const provider = new GoogleAuthProvider();

export default function Login() {
  const [verNormas, setVerNormas] = useState(false);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, provider);
    } catch (error) {
      console.error("Error al iniciar sesión:", error);
    }
  };

  if (verNormas) {
    return <ReglasComunitarias onCerrar={() => setVerNormas(false)} />;
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Logo / Icono */}
        <div style={styles.logoWrapper}>
          <div style={styles.logoCircle}>
            <span style={styles.logoEmoji}>🏠</span>
          </div>
        </div>

        {/* Título */}
        <h1 style={styles.title}>Roomie Match</h1>
        <p style={styles.subtitle}>Encuentra tu compañero de piso ideal</p>

        {/* Separador */}
        <div style={styles.divider} />

        {/* Botón Google */}
        <button style={styles.googleButton} onClick={handleGoogleLogin}>
          <svg style={styles.googleIcon} viewBox="0 0 48 48">
            <path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/>
            <path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"/>
            <path fill="#FBBC05" d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"/>
            <path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.18 1.48-4.97 2.36-8.16 2.36-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/>
            <path fill="none" d="M0 0h48v48H0z"/>
          </svg>
          Continuar con Google
        </button>

        <p style={styles.terms}>
          Al continuar, aceptas nuestros{" "}
          <span style={styles.link}>Términos de servicio</span> y{" "}
          <span style={styles.link}>Política de privacidad</span>
        </p>
        <button style={styles.normasLink} onClick={() => setVerNormas(true)}>
          Normas de la comunidad
        </button>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: "24px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "28px",
    padding: "48px 36px",
    maxWidth: "380px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
  },
  logoWrapper: {
    marginBottom: "20px",
  },
  logoCircle: {
    width: "88px",
    height: "88px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    boxShadow: "0 8px 24px rgba(102,126,234,0.4)",
  },
  logoEmoji: {
    fontSize: "40px",
    lineHeight: 1,
  },
  title: {
    margin: "0 0 8px 0",
    fontSize: "30px",
    fontWeight: "800",
    color: "#1a1a2e",
    letterSpacing: "-0.5px",
  },
  subtitle: {
    margin: "0",
    fontSize: "15px",
    color: "#6b7280",
    lineHeight: "1.5",
    maxWidth: "260px",
  },
  divider: {
    width: "48px",
    height: "4px",
    background: "linear-gradient(90deg, #667eea, #764ba2)",
    borderRadius: "2px",
    margin: "28px 0",
  },
  googleButton: {
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    gap: "12px",
    width: "100%",
    padding: "14px 24px",
    border: "2px solid #e5e7eb",
    borderRadius: "14px",
    background: "#ffffff",
    color: "#374151",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    transition: "all 0.2s ease",
    boxShadow: "0 2px 8px rgba(0,0,0,0.06)",
    outline: "none",
  },
  googleIcon: {
    width: "22px",
    height: "22px",
    flexShrink: 0,
  },
  terms: {
    marginTop: "20px",
    fontSize: "12px",
    color: "#9ca3af",
    lineHeight: "1.6",
    maxWidth: "280px",
  },
  link: {
    color: "#667eea",
    cursor: "pointer",
    fontWeight: "500",
  },
  normasLink: {
    marginTop: "12px",
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "12px",
    fontWeight: "500",
    cursor: "pointer",
    padding: 0,
    textDecoration: "underline",
  },
};
