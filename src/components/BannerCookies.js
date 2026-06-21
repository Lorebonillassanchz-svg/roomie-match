import { useState } from "react";

const STORAGE_KEY = "cookies_aceptadas";

export default function BannerCookies() {
  const [visible, setVisible] = useState(() => !localStorage.getItem(STORAGE_KEY));

  if (!visible) return null;

  const aceptar = () => {
    localStorage.setItem(STORAGE_KEY, "1");
    setVisible(false);
  };

  return (
    <div style={s.banner}>
      <p style={s.texto}>
        Usamos cookies técnicas necesarias para el funcionamiento de la app. No usamos cookies publicitarias.
      </p>
      <div style={s.botones}>
        <a href="/privacidad" style={s.btnInfo}>Más información</a>
        <button style={s.btnAceptar} onClick={aceptar}>Aceptar</button>
      </div>
    </div>
  );
}

const s = {
  banner: {
    position: "fixed",
    bottom: 0,
    left: 0,
    right: 0,
    background: "#1e293b",
    borderTop: "1px solid #334155",
    padding: "10px 20px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "16px",
    zIndex: 9999,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  texto: {
    margin: 0,
    fontSize: "13px",
    color: "#94a3b8",
    whiteSpace: "nowrap",
    overflow: "hidden",
    textOverflow: "ellipsis",
  },
  botones: {
    display: "flex",
    gap: "12px",
    alignItems: "center",
    flexShrink: 0,
  },
  btnInfo: {
    fontSize: "13px",
    color: "#94a3b8",
    textDecoration: "underline",
    background: "none",
    border: "none",
    cursor: "pointer",
    padding: 0,
    whiteSpace: "nowrap",
  },
  btnAceptar: {
    padding: "6px 16px",
    borderRadius: "8px",
    border: "none",
    background: "linear-gradient(135deg, #7c3aed, #5b21b6)",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
  },
};
