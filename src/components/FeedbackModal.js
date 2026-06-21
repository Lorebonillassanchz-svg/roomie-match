import { useState } from "react";
import { collection, addDoc } from "firebase/firestore";
import { db } from "../firebase";

export default function FeedbackModal({ onClose }) {
  const [estrellas, setEstrellas] = useState(0);
  const [hoverEstrella, setHoverEstrella] = useState(0);
  const [comentario, setComentario] = useState("");
  const [emailFb, setEmailFb] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [enviado, setEnviado] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!estrellas) return;
    setEnviando(true);
    try {
      await addDoc(collection(db, "feedback"), {
        estrellas,
        comentario,
        email: emailFb,
        fecha: new Date().toISOString(),
        origen: "app",
        publico: false,
      });
      setEnviado(true);
    } catch (err) {
      console.error(err);
    } finally {
      setEnviando(false);
    }
  };

  return (
    <div style={s.overlay} onClick={onClose}>
      <div style={s.modal} onClick={(e) => e.stopPropagation()}>
        <button style={s.closeBtn} onClick={onClose}>✕</button>
        <h3 style={s.title}>Sugerir mejora</h3>
        <p style={s.sub}>Tu opinión nos ayuda a mejorar la app</p>

        {enviado ? (
          <div style={s.exito}>¡Gracias! Tu opinión nos ayuda mucho 🙏</div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div style={s.stars}>
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  style={{
                    ...s.star,
                    color: (hoverEstrella || estrellas) >= n ? "#f59e0b" : "#334155",
                    transform: (hoverEstrella || estrellas) >= n ? "scale(1.15)" : "scale(1)",
                  }}
                  onMouseEnter={() => setHoverEstrella(n)}
                  onMouseLeave={() => setHoverEstrella(0)}
                  onClick={() => setEstrellas(n)}
                >
                  ★
                </button>
              ))}
            </div>
            <textarea
              style={s.textarea}
              placeholder="Cuéntanos qué mejorarías..."
              rows={4}
              value={comentario}
              onChange={(e) => setComentario(e.target.value)}
            />
            <input
              style={s.input}
              type="email"
              placeholder="Tu email (opcional)"
              value={emailFb}
              onChange={(e) => setEmailFb(e.target.value)}
            />
            <button
              type="submit"
              style={{
                ...s.btn,
                opacity: !estrellas || enviando ? 0.45 : 1,
                cursor: !estrellas || enviando ? "not-allowed" : "pointer",
              }}
              disabled={!estrellas || enviando}
            >
              {enviando ? "Enviando..." : "Enviar opinión"}
            </button>
          </form>
        )}
      </div>
    </div>
  );
}

const s = {
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.6)",
    zIndex: 200,
    display: "flex",
    alignItems: "flex-end",
    justifyContent: "center",
  },
  modal: {
    background: "#1e293b",
    borderRadius: "24px 24px 0 0",
    padding: "28px 24px 40px",
    width: "100%",
    maxWidth: "480px",
    position: "relative",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  closeBtn: {
    position: "absolute",
    top: "16px",
    right: "16px",
    background: "none",
    border: "none",
    color: "#94a3b8",
    fontSize: "18px",
    cursor: "pointer",
    padding: "4px",
  },
  title: {
    margin: "0 0 4px 0",
    fontSize: "18px",
    fontWeight: "700",
    color: "#f1f5f9",
  },
  sub: {
    margin: "0 0 20px 0",
    fontSize: "13px",
    color: "#64748b",
  },
  stars: {
    display: "flex",
    justifyContent: "center",
    gap: "8px",
    marginBottom: "20px",
  },
  star: {
    background: "none",
    border: "none",
    fontSize: "34px",
    cursor: "pointer",
    padding: 0,
    lineHeight: 1,
    transition: "color 0.1s, transform 0.1s",
  },
  textarea: {
    width: "100%",
    background: "#0f172a",
    border: "1.5px solid #334155",
    borderRadius: "12px",
    padding: "12px 14px",
    fontSize: "14px",
    color: "#f1f5f9",
    resize: "none",
    outline: "none",
    fontFamily: "inherit",
    lineHeight: "1.5",
    boxSizing: "border-box",
    marginBottom: "10px",
  },
  input: {
    width: "100%",
    background: "#0f172a",
    border: "1.5px solid #334155",
    borderRadius: "12px",
    padding: "11px 14px",
    fontSize: "14px",
    color: "#f1f5f9",
    outline: "none",
    fontFamily: "inherit",
    boxSizing: "border-box",
    marginBottom: "14px",
  },
  btn: {
    width: "100%",
    background: "linear-gradient(135deg, #7c3aed, #a78bfa)",
    color: "#ffffff",
    border: "none",
    borderRadius: "14px",
    padding: "14px",
    fontSize: "15px",
    fontWeight: "700",
    transition: "opacity 0.2s",
  },
  exito: {
    background: "rgba(74, 222, 128, 0.1)",
    border: "1.5px solid #4ade80",
    borderRadius: "14px",
    padding: "22px",
    color: "#4ade80",
    fontSize: "15px",
    fontWeight: "600",
    textAlign: "center",
    marginTop: "8px",
  },
};
