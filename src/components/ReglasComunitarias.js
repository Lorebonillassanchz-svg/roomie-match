export default function ReglasComunitarias({ onCerrar }) {
  const reglas = [
    {
      icono: "🧢",
      titulo: "Sé tú mismo",
      desc: "Usa fotos reales y proporciona información veraz sobre ti. Los perfiles falsos serán eliminados.",
    },
    {
      icono: "💬",
      titulo: "Respeto ante todo",
      desc: "Comunícate con educación y respeto. El acoso, las amenazas o los mensajes ofensivos no están permitidos.",
    },
    {
      icono: "🔞",
      titulo: "Contenido apropiado",
      desc: "Está prohibido publicar fotos o descripciones de carácter sexual o violento.",
    },
    {
      icono: "💰",
      titulo: "Sin spam ni estafas",
      desc: "No uses la plataforma para solicitar dinero, datos bancarios ni información personal.",
    },
    {
      icono: "👶",
      titulo: "Solo mayores de 18 años",
      desc: "Debes ser mayor de edad para usar Roomie Match. Los perfiles de menores serán eliminados de inmediato.",
    },
    {
      icono: "🚫",
      titulo: "Cero discriminación",
      desc: "No toleramos comentarios racistas, sexistas, homófobos ni de ningún tipo de odio.",
    },
  ];

  return (
    <div style={st.page}>
      {/* Header */}
      <div style={st.header}>
        <button style={st.backBtn} onClick={onCerrar}>← Volver</button>
        <div style={st.headerCenter}>
          <h1 style={st.title}>Normas de la comunidad 🏠</h1>
          <p style={st.subtitle}>Para que todos estén seguros y cómodos</p>
        </div>
        <div style={{ width: "80px" }} />
      </div>

      {/* Reglas */}
      <div style={st.grid}>
        {reglas.map((r) => (
          <div key={r.titulo} style={st.card}>
            <span style={st.cardIcono}>{r.icono}</span>
            <h2 style={st.cardTitulo}>{r.titulo}</h2>
            <p style={st.cardDesc}>{r.desc}</p>
          </div>
        ))}
      </div>

      {/* Footer */}
      <p style={st.footer}>
        ¿Ves algo que infringe estas normas? Usa el botón ⚠️ Reportar en cualquier perfil.
      </p>
    </div>
  );
}

const st = {
  page: {
    minHeight: "100vh",
    background: "#0f0f0f",
    color: "#ffffff",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "0 0 40px 0",
  },
  header: {
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "space-between",
    padding: "28px 20px 20px",
    borderBottom: "1px solid #2a2a2a",
  },
  backBtn: {
    background: "none",
    border: "none",
    color: "#7c3aed",
    fontSize: "15px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
    whiteSpace: "nowrap",
    marginTop: "4px",
  },
  headerCenter: {
    flex: 1,
    textAlign: "center",
    padding: "0 12px",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "22px",
    fontWeight: "800",
    color: "#ffffff",
  },
  subtitle: {
    margin: 0,
    fontSize: "13px",
    color: "#9ca3af",
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr",
    gap: "14px",
    padding: "24px 20px 0",
  },
  card: {
    background: "#1a1a1a",
    border: "1px solid #2a2a2a",
    borderRadius: "16px",
    padding: "20px",
  },
  cardIcono: {
    fontSize: "40px",
    display: "block",
    marginBottom: "10px",
  },
  cardTitulo: {
    margin: "0 0 8px 0",
    fontSize: "16px",
    fontWeight: "700",
    color: "#ffffff",
  },
  cardDesc: {
    margin: 0,
    fontSize: "14px",
    color: "#9ca3af",
    lineHeight: "1.6",
  },
  footer: {
    color: "#6b7280",
    fontSize: "13px",
    textAlign: "center",
    marginTop: "32px",
    padding: "0 20px",
    lineHeight: "1.6",
  },
};
