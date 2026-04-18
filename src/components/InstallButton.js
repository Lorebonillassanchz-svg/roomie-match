import { useEffect, useState } from "react";

const isAndroid = /android/i.test(navigator.userAgent);

export default function InstallButton() {
  const [promptEvent, setPromptEvent] = useState(null);
  const [instalado, setInstalado]     = useState(false);

  useEffect(() => {
    if (!isAndroid) return;

    const handler = (e) => {
      e.preventDefault();
      setPromptEvent(e);
    };

    const instaladoHandler = () => setInstalado(true);

    window.addEventListener("beforeinstallprompt", handler);
    window.addEventListener("appinstalled", instaladoHandler);

    return () => {
      window.removeEventListener("beforeinstallprompt", handler);
      window.removeEventListener("appinstalled", instaladoHandler);
    };
  }, []);

  if (!isAndroid || instalado || !promptEvent) return null;

  const handleInstalar = async () => {
    promptEvent.prompt();
    const { outcome } = await promptEvent.userChoice;
    if (outcome === "accepted") setInstalado(true);
    setPromptEvent(null);
  };

  return (
    <div style={styles.banner}>
      <span style={styles.texto}>📲 Instala Roomie Match en tu móvil</span>
      <button style={styles.boton} onClick={handleInstalar}>
        Instalar
      </button>
    </div>
  );
}

const styles = {
  banner: {
    position: "fixed",
    bottom: "76px",           // justo encima de la Navbar (68px + 8px margen)
    left: "12px",
    right: "12px",
    background: "#1a1a1a",
    border: "1px solid #7c3aed",
    borderRadius: "16px",
    padding: "12px 16px",
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    gap: "12px",
    boxShadow: "0 4px 24px rgba(124,58,237,0.3)",
    zIndex: 99,
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  texto: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#ffffff",
    flex: 1,
    lineHeight: "1.4",
  },
  boton: {
    padding: "8px 18px",
    borderRadius: "10px",
    border: "none",
    background: "#7c3aed",
    color: "#ffffff",
    fontSize: "13px",
    fontWeight: "700",
    cursor: "pointer",
    whiteSpace: "nowrap",
    flexShrink: 0,
  },
};
