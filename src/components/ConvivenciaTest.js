import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { auth, db } from "../firebase";

const PREGUNTAS = [
  {
    id: "horario_acostarse",
    titulo: "¿A qué hora sueles acostarte?",
    icono: "🌙",
    tipo: "opciones",
    opciones: [
      { valor: "temprano", etiqueta: "🐓 Antes de las 23h", desc: "Madrugador" },
      { valor: "normal", etiqueta: "🌆 Entre 23h y 1h", desc: "Estándar" },
      { valor: "tarde", etiqueta: "🦉 Después de la 1h", desc: "Noctámbulo" },
    ],
  },
  {
    id: "limpieza_propio",
    titulo: "¿Cómo de ordenado/a eres tú?",
    icono: "🧹",
    tipo: "escala",
    etiquetaMin: "Caos total",
    etiquetaMax: "Impecable",
    emojis: ["🌪️", "😅", "🙂", "✨", "🏆"],
  },
  {
    id: "tolerancia_limpieza",
    titulo: "¿Qué nivel de limpieza esperas de tu compañero/a?",
    icono: "🧼",
    tipo: "opciones",
    opciones: [
      { valor: "muy_alto", etiqueta: "🏆 Todo siempre limpio", desc: "Estándares altos" },
      { valor: "alto", etiqueta: "✨ Bastante ordenado", desc: "Ordenado" },
      { valor: "medio", etiqueta: "🙂 Razonablemente limpio", desc: "Flexible" },
      { valor: "bajo", etiqueta: "😌 Me adapto a cualquiera", desc: "Sin exigencias" },
    ],
  },
  {
    id: "frecuencia_visitas",
    titulo: "¿Con qué frecuencia recibes visitas en casa?",
    icono: "🚪",
    tipo: "opciones",
    opciones: [
      { valor: "pocas", etiqueta: "🧘 Raramente", desc: "Mi casa es mi refugio" },
      { valor: "moderado", etiqueta: "😊 Alguna vez a la semana", desc: "Con moderación" },
      { valor: "muchas", etiqueta: "🎉 Casi a diario", desc: "Casa abierta" },
    ],
  },
  {
    id: "tolerancia_visitas",
    titulo: "Tu compañero/a avisa a las 23h de un martes que viene alguien...",
    icono: "😬",
    tipo: "opciones",
    opciones: [
      { valor: "ok_siempre", etiqueta: "🤗 Sin problema, bienvenido", desc: "Total apertura" },
      { valor: "ok_aviso", etiqueta: "👍 Bien si me avisa con tiempo", desc: "Con aviso previo" },
      { valor: "mal_laboral", etiqueta: "😒 En días laborables, no", desc: "Sólo fines de semana" },
      { valor: "mal_siempre", etiqueta: "🚫 Prefiero no visitas nocturnas", desc: "Espacio propio" },
    ],
  },
  {
    id: "nivel_ruido",
    titulo: "¿Cuánto ruido eres capaz de tolerar en casa?",
    icono: "🔊",
    tipo: "escala",
    etiquetaMin: "Silencio absoluto",
    etiquetaMax: "Me da igual",
    emojis: ["🤫", "🔇", "🔉", "🔊", "🎸"],
  },
  {
    id: "fumar",
    titulo: "¿Cuál es tu relación con el tabaco?",
    icono: "🚬",
    tipo: "opciones",
    opciones: [
      { valor: "no_fuma_no_tolera", etiqueta: "🚭 No fumo y prefiero piso sin fumadores", desc: "Sin humo" },
      { valor: "no_fuma_tolera", etiqueta: "😊 No fumo pero acepto si es en terraza/exterior", desc: "Flexible" },
      { valor: "fuma_fuera", etiqueta: "🚬 Fumo solo en mi habitación o terraza", desc: "Fumo exterior" },
      { valor: "fuma_dentro", etiqueta: "💨 Fumo con normalidad en casa", desc: "Fumador interior" },
    ],
  },
  {
    id: "gastos_comunes",
    titulo: "¿Cómo prefieres gestionar los gastos comunes?",
    icono: "💰",
    tipo: "opciones",
    opciones: [
      { valor: "app", etiqueta: "📱 App de gastos compartidos", desc: "Splitwise o similar" },
      { valor: "bote", etiqueta: "🏦 Bote común mensual", desc: "Fondo compartido" },
      { valor: "turno", etiqueta: "🔄 Turnos y nos fiamos", desc: "Confianza mutua" },
      { valor: "independiente", etiqueta: "🙅 Cada uno lo suyo, mínimo compartido", desc: "Independiente" },
    ],
  },
];

export default function ConvivenciaTest({ onTestCompletado }) {
  const [paso, setPaso] = useState(0);
  const [respuestas, setRespuestas] = useState({});
  const [guardando, setGuardando] = useState(false);
  const [error, setError] = useState("");

  const pregunta = PREGUNTAS[paso];
  const progreso = ((paso) / PREGUNTAS.length) * 100;
  const esUltima = paso === PREGUNTAS.length - 1;

  const seleccionarOpcion = (valor) => {
    setRespuestas((prev) => ({ ...prev, [pregunta.id]: valor }));
  };

  const siguiente = async () => {
    if (respuestas[pregunta.id] === undefined) return;
    if (!esUltima) {
      setPaso((p) => p + 1);
      return;
    }
    setGuardando(true);
    setError("");
    try {
      const uid = auth.currentUser.uid;
      await setDoc(doc(db, "convivencia", uid), {
        uid,
        ...respuestas,
        actualizadoEn: new Date().toISOString(),
      });
      if (onTestCompletado) onTestCompletado(respuestas);
    } catch (err) {
      console.error(err);
      setError("Error al guardar. Inténtalo de nuevo.");
    } finally {
      setGuardando(false);
    }
  };

  const anterior = () => {
    if (paso > 0) setPaso((p) => p - 1);
  };

  const respondida = respuestas[pregunta.id] !== undefined;

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Barra de progreso */}
        <div style={styles.progressHeader}>
          <span style={styles.progressLabel}>
            {paso + 1} de {PREGUNTAS.length}
          </span>
          <span style={styles.progressLabel}>{Math.round(progreso)}%</span>
        </div>
        <div style={styles.progressTrack}>
          <div style={{ ...styles.progressFill, width: `${progreso}%` }} />
        </div>

        {/* Icono + Pregunta */}
        <div style={styles.questionSection}>
          <div style={styles.iconCircle}>{pregunta.icono}</div>
          <h2 style={styles.questionText}>{pregunta.titulo}</h2>
        </div>

        {/* Opciones */}
        {pregunta.tipo === "opciones" && (
          <div style={styles.optionsList}>
            {pregunta.opciones.map((op) => {
              const seleccionada = respuestas[pregunta.id] === op.valor;
              return (
                <button
                  key={op.valor}
                  style={{
                    ...styles.optionButton,
                    ...(seleccionada ? styles.optionSelected : {}),
                  }}
                  onClick={() => seleccionarOpcion(op.valor)}
                >
                  <span style={styles.optionEtiqueta}>{op.etiqueta}</span>
                  <span style={{
                    ...styles.optionDesc,
                    color: seleccionada ? "#7c3aed" : "#9ca3af",
                  }}>
                    {op.desc}
                  </span>
                  {seleccionada && <span style={styles.checkmark}>✓</span>}
                </button>
              );
            })}
          </div>
        )}

        {/* Escala */}
        {pregunta.tipo === "escala" && (
          <div style={styles.scaleSection}>
            <div style={styles.scaleEmojis}>
              {pregunta.emojis.map((emoji, i) => {
                const seleccionado = respuestas[pregunta.id] === i + 1;
                return (
                  <button
                    key={i}
                    style={{
                      ...styles.scaleButton,
                      ...(seleccionado ? styles.scaleSelected : {}),
                    }}
                    onClick={() => seleccionarOpcion(i + 1)}
                  >
                    <span style={styles.scaleEmoji}>{emoji}</span>
                    <span style={{
                      ...styles.scaleNum,
                      color: seleccionado ? "#7c3aed" : "#9ca3af",
                      fontWeight: seleccionado ? "700" : "400",
                    }}>
                      {i + 1}
                    </span>
                  </button>
                );
              })}
            </div>
            <div style={styles.scaleLabels}>
              <span style={styles.scaleLabelText}>{pregunta.etiquetaMin}</span>
              <span style={styles.scaleLabelText}>{pregunta.etiquetaMax}</span>
            </div>
          </div>
        )}

        {/* Error */}
        {error && <p style={styles.error}>{error}</p>}

        {/* Navegación */}
        <div style={styles.nav}>
          {paso > 0 && (
            <button style={styles.backButton} onClick={anterior}>
              ← Anterior
            </button>
          )}
          <button
            style={{
              ...styles.nextButton,
              ...(respondida ? {} : styles.nextDisabled),
              marginLeft: paso > 0 ? "12px" : "0",
              flex: 1,
            }}
            onClick={siguiente}
            disabled={!respondida || guardando}
          >
            {guardando
              ? "Guardando..."
              : esUltima
              ? "Ver mis resultados 🎉"
              : "Siguiente →"}
          </button>
        </div>
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
    padding: "32px 28px 36px",
    maxWidth: "440px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  progressHeader: {
    display: "flex",
    justifyContent: "space-between",
    marginBottom: "8px",
  },
  progressLabel: {
    fontSize: "12px",
    fontWeight: "600",
    color: "#9ca3af",
  },
  progressTrack: {
    width: "100%",
    height: "6px",
    background: "#e5e7eb",
    borderRadius: "99px",
    overflow: "hidden",
    marginBottom: "28px",
  },
  progressFill: {
    height: "100%",
    background: "linear-gradient(90deg, #667eea, #764ba2)",
    borderRadius: "99px",
    transition: "width 0.4s ease",
  },
  questionSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "28px",
  },
  iconCircle: {
    width: "68px",
    height: "68px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #f5f3ff, #ede9fe)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontSize: "32px",
    marginBottom: "16px",
    boxShadow: "0 4px 14px rgba(102,126,234,0.15)",
  },
  questionText: {
    margin: 0,
    fontSize: "17px",
    fontWeight: "700",
    color: "#1a1a2e",
    lineHeight: "1.4",
    maxWidth: "320px",
  },
  optionsList: {
    display: "flex",
    flexDirection: "column",
    gap: "10px",
    marginBottom: "28px",
  },
  optionButton: {
    position: "relative",
    display: "flex",
    flexDirection: "column",
    alignItems: "flex-start",
    padding: "14px 18px",
    border: "2px solid #e5e7eb",
    borderRadius: "16px",
    background: "#fafafa",
    cursor: "pointer",
    textAlign: "left",
    transition: "all 0.15s ease",
    outline: "none",
  },
  optionSelected: {
    border: "2px solid #7c3aed",
    background: "#f5f3ff",
  },
  optionEtiqueta: {
    fontSize: "14px",
    fontWeight: "600",
    color: "#1a1a2e",
    marginBottom: "2px",
  },
  optionDesc: {
    fontSize: "12px",
  },
  checkmark: {
    position: "absolute",
    right: "16px",
    top: "50%",
    transform: "translateY(-50%)",
    width: "22px",
    height: "22px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea, #764ba2)",
    color: "#fff",
    fontSize: "13px",
    fontWeight: "700",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
  },
  scaleSection: {
    marginBottom: "28px",
  },
  scaleEmojis: {
    display: "flex",
    justifyContent: "space-between",
    gap: "8px",
    marginBottom: "12px",
  },
  scaleButton: {
    flex: 1,
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "6px",
    padding: "12px 4px",
    border: "2px solid #e5e7eb",
    borderRadius: "14px",
    background: "#fafafa",
    cursor: "pointer",
    transition: "all 0.15s ease",
    outline: "none",
  },
  scaleSelected: {
    border: "2px solid #7c3aed",
    background: "#f5f3ff",
    transform: "scale(1.06)",
  },
  scaleEmoji: {
    fontSize: "26px",
    lineHeight: 1,
  },
  scaleNum: {
    fontSize: "13px",
  },
  scaleLabels: {
    display: "flex",
    justifyContent: "space-between",
    paddingTop: "4px",
  },
  scaleLabelText: {
    fontSize: "11px",
    color: "#9ca3af",
    fontWeight: "500",
  },
  error: {
    margin: "0 0 16px 0",
    fontSize: "13px",
    color: "#ef4444",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 14px",
  },
  nav: {
    display: "flex",
    alignItems: "center",
  },
  backButton: {
    padding: "14px 20px",
    borderRadius: "14px",
    border: "2px solid #e5e7eb",
    background: "#ffffff",
    color: "#374151",
    fontSize: "14px",
    fontWeight: "600",
    cursor: "pointer",
    whiteSpace: "nowrap",
    outline: "none",
  },
  nextButton: {
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
    outline: "none",
  },
  nextDisabled: {
    background: "#e5e7eb",
    color: "#9ca3af",
    boxShadow: "none",
    cursor: "not-allowed",
  },
};
