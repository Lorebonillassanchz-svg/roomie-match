export default function Terminos() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <a href="/" style={s.back}>← Volver a Roomie Match</a>

        <h1 style={s.h1}>Términos y Condiciones</h1>
        <p style={s.fecha}>Última actualización: abril de 2025</p>

        <Section titulo="1. Qué es Roomie Match">
          <p>
            Roomie Match es una plataforma digital de búsqueda de compañero de piso orientada principalmente a <strong>estudiantes en España</strong>. Permite a los usuarios crear un perfil, descubrir perfiles de otros usuarios con hábitos compatibles, establecer conexiones (matches) y comunicarse a través del chat integrado.
          </p>
          <p>
            El servicio es gestionado por <strong>Lorena Bonilla Sánchez</strong> (roomiematch@hotmail.com), en adelante "Roomie Match" o "nosotros".
          </p>
        </Section>

        <Section titulo="2. Requisitos de uso">
          <ul style={s.ul}>
            <li>Tener <strong>18 años o más</strong>. Los menores de 18 años solo podrán usar el servicio con autorización expresa de su padre, madre o tutor legal.</li>
            <li>Ser una persona física (no se permiten perfiles de empresas ni agencias).</li>
            <li>Residir o tener intención de residir en España.</li>
            <li>Proporcionar información veraz y actualizada en tu perfil.</li>
          </ul>
          <p>
            Al crear una cuenta aceptas estos Términos y la{" "}
            <a href="/privacidad" style={s.link}>Política de Privacidad</a>.
          </p>
        </Section>

        <Section titulo="3. Conductas prohibidas">
          <p>Queda expresamente prohibido:</p>
          <ul style={s.ul}>
            <li>Crear perfiles falsos, hacerse pasar por otra persona o proporcionar información fraudulenta.</li>
            <li>Publicar contenido inapropiado, ofensivo, discriminatorio, violento o de contenido sexual explícito.</li>
            <li>Acosar, amenazar o intimidar a otros usuarios dentro o fuera de la plataforma.</li>
            <li>Utilizar Roomie Match con fines publicitarios, comerciales o de spam.</li>
            <li>Intentar acceder sin autorización a cuentas ajenas o a los sistemas de la plataforma.</li>
            <li>Incumplir cualquier normativa española o europea aplicable.</li>
          </ul>
          <p>
            El incumplimiento de estas normas puede conllevar la suspensión o eliminación permanente de la cuenta sin previo aviso.
          </p>
        </Section>

        <Section titulo="4. Limitación de responsabilidad">
          <p>Roomie Match es una plataforma de conexión entre usuarios. Por ello:</p>
          <ul style={s.ul}>
            <li><strong>No garantizamos</strong> que encuentres un compañero de piso ni que los perfiles de otros usuarios sean completamente exactos.</li>
            <li><strong>No somos responsables</strong> de lo que ocurra fuera de la plataforma (conversaciones por otros medios, encuentros presenciales, contratos de arrendamiento, etc.).</li>
            <li><strong>No somos parte</strong> en ningún acuerdo de convivencia o arrendamiento entre usuarios.</li>
            <li>Recomendamos tomar precauciones al quedar con personas conocidas online y verificar la identidad de los candidatos.</li>
          </ul>
          <p>
            En ningún caso nuestra responsabilidad total ante un usuario superará el importe de las cantidades abonadas por el uso del servicio en los 12 meses anteriores al hecho causante (actualmente el servicio es gratuito, por lo que la responsabilidad máxima es de 0 €, salvo disposición legal imperativa en contrario).
          </p>
        </Section>

        <Section titulo="5. Propiedad intelectual">
          <p>
            <strong>Contenido de Roomie Match:</strong> el diseño, código, logotipos y textos de la plataforma son propiedad de Roomie Match y están protegidos por las leyes de propiedad intelectual españolas y europeas. No puedes reproducirlos ni distribuirlos sin autorización expresa.
          </p>
          <p>
            <strong>Contenido del usuario:</strong> las fotos, textos y demás contenido que publiques en tu perfil son de tu propiedad. Al subirlos, nos concedes una <strong>licencia no exclusiva, gratuita y mundial</strong> para mostrarlos a otros usuarios de la plataforma con el único fin de prestar el servicio. Esta licencia caduca cuando eliminas el contenido o tu cuenta.
          </p>
        </Section>

        <Section titulo="6. Disponibilidad del servicio">
          <p>
            Roomie Match es un servicio en desarrollo. Podemos modificar, suspender o interrumpir el servicio (o alguna de sus funcionalidades) en cualquier momento, con o sin previo aviso, especialmente por razones de mantenimiento, seguridad o cambios normativos. No nos responsabilizamos de los perjuicios derivados de interrupciones del servicio.
          </p>
        </Section>

        <Section titulo="7. Cancelación de la cuenta">
          <p>
            Puedes dar de baja tu cuenta en cualquier momento desde{" "}
            <strong>Mi perfil → Eliminar mi cuenta</strong>. Esta acción es <strong>irreversible</strong> y eliminará permanentemente todos tus datos, fotos, matches y mensajes de conformidad con el{" "}
            <a href="/privacidad" style={s.link}>derecho al olvido (art. 17 RGPD)</a>.
          </p>
          <p>
            También podemos cancelar tu cuenta si incumples estos Términos.
          </p>
        </Section>

        <Section titulo="8. Modificaciones de los Términos">
          <p>
            Podemos actualizar estos Términos para adaptarlos a cambios legales, técnicos o del servicio. Te notificaremos los cambios relevantes a través de la aplicación. El uso continuado del servicio tras la publicación de los nuevos Términos implica tu aceptación.
          </p>
        </Section>

        <Section titulo="9. Ley aplicable y jurisdicción">
          <p>
            Estos Términos se rigen por la <strong>legislación española</strong>. Para la resolución de cualquier controversia derivada de su interpretación o aplicación, las partes se someten a los <strong>Juzgados y Tribunales de Córdoba</strong>, con renuncia a cualquier otro fuero que pudiera corresponderles, sin perjuicio del fuero imperativo del consumidor cuando sea aplicable.
          </p>
        </Section>

        <Section titulo="10. Contacto">
          <p>
            Si tienes cualquier pregunta sobre estos Términos, escríbenos a{" "}
            <a href="mailto:roomiematch@hotmail.com" style={s.link}>
              roomiematch@hotmail.com
            </a>.
          </p>
        </Section>

        <div style={s.footer}>
          <a href="/" style={s.back}>← Volver a Roomie Match</a>
          <span style={s.footerSep}>·</span>
          <a href="/privacidad" style={s.back}>Política de privacidad</a>
        </div>
      </div>
    </div>
  );
}

function Section({ titulo, children }) {
  return (
    <section style={{ marginBottom: "36px" }}>
      <h2 style={s.h2}>{titulo}</h2>
      <div style={s.body}>{children}</div>
    </section>
  );
}

const s = {
  page: {
    minHeight: "100vh",
    background: "#f8fafc",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
    padding: "0 0 60px",
  },
  container: {
    maxWidth: "760px",
    margin: "0 auto",
    padding: "40px 24px",
  },
  back: {
    color: "#7c3aed",
    fontSize: "14px",
    fontWeight: "600",
    textDecoration: "none",
  },
  h1: {
    fontSize: "28px",
    fontWeight: "800",
    color: "#1a1a2e",
    margin: "24px 0 4px",
  },
  fecha: {
    fontSize: "13px",
    color: "#9ca3af",
    margin: "0 0 40px",
  },
  h2: {
    fontSize: "17px",
    fontWeight: "700",
    color: "#1a1a2e",
    margin: "0 0 12px",
    paddingBottom: "8px",
    borderBottom: "2px solid #e5e7eb",
  },
  body: {
    fontSize: "14px",
    color: "#374151",
    lineHeight: "1.75",
  },
  link: { color: "#7c3aed", textDecoration: "underline" },
  ul: { paddingLeft: "22px", margin: "8px 0", lineHeight: "1.9" },
  footer: {
    marginTop: "48px",
    paddingTop: "20px",
    borderTop: "1px solid #e5e7eb",
    display: "flex",
    gap: "12px",
    alignItems: "center",
    fontSize: "14px",
  },
  footerSep: { color: "#d1d5db" },
};
