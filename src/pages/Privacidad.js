export default function Privacidad() {
  return (
    <div style={s.page}>
      <div style={s.container}>
        <a href="/" style={s.back}>← Volver a Roomie Match</a>

        <h1 style={s.h1}>Política de Privacidad</h1>
        <p style={s.fecha}>Última actualización: abril de 2025</p>

        <Section titulo="1. Responsable del tratamiento">
          <p>
            <strong>Lorena Bonilla Sánchez</strong><br />
            Correo electrónico: <a href="mailto:roomiematch@hotmail.com" style={s.link}>roomiematch@hotmail.com</a><br />
            En adelante, "Roomie Match" o "nosotros".
          </p>
        </Section>

        <Section titulo="2. Datos que recogemos y finalidad">
          <p>Recogemos los siguientes datos personales con las finalidades indicadas:</p>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={s.th}>Dato</th>
                <th style={s.th}>Finalidad</th>
                <th style={s.th}>Base legal</th>
              </tr>
            </thead>
            <tbody>
              {[
                ["Correo electrónico", "Identificación y acceso mediante Google Sign-In", "Consentimiento (art. 6.1.a RGPD)"],
                ["Nombre y foto", "Mostrar tu perfil a otros usuarios", "Consentimiento"],
                ["Edad, sexo, bio", "Completar el perfil y facilitar la búsqueda de compañero", "Consentimiento"],
                ["Ciudad, provincia, código postal", "Mostrar ubicación aproximada y filtrar resultados", "Consentimiento"],
                ["Presupuesto mensual", "Filtrar compañeros con presupuesto compatible", "Consentimiento"],
                ["Fotos de verificación (selfies)", "Verificar que eres una persona real; se eliminan tras la revisión", "Consentimiento"],
                ["Respuestas al test de convivencia", "Calcular compatibilidad de hábitos entre usuarios", "Consentimiento"],
                ["Valoraciones y comentarios (feedback)", "Mejorar el servicio", "Interés legítimo / Consentimiento"],
              ].map(([dato, fin, base]) => (
                <tr key={dato}>
                  <td style={s.td}>{dato}</td>
                  <td style={s.td}>{fin}</td>
                  <td style={s.td}>{base}</td>
                </tr>
              ))}
            </tbody>
          </table>
          <p style={{ marginTop: "12px" }}>
            No realizamos <strong>decisiones automatizadas</strong> ni elaboración de perfiles con efectos jurídicos sobre los usuarios.
          </p>
        </Section>

        <Section titulo="3. Con quién compartimos tus datos">
          <p>
            Roomie Match no vende ni cede tus datos a terceros con fines publicitarios o comerciales.
          </p>
          <p>
            Utilizamos <strong>Firebase (Google LLC)</strong> como encargado del tratamiento para los siguientes servicios:
          </p>
          <ul style={s.ul}>
            <li><strong>Firebase Authentication</strong> — gestión de cuentas</li>
            <li><strong>Cloud Firestore</strong> — base de datos de perfiles, matches y mensajes</li>
            <li><strong>Firebase Storage</strong> — almacenamiento de fotos</li>
            <li><strong>Firebase Hosting</strong> — alojamiento de la web</li>
            <li><strong>Firebase Cloud Messaging</strong> — notificaciones push</li>
          </ul>
          <p>
            Google LLC está sujeto a las cláusulas contractuales tipo aprobadas por la Comisión Europea y al marco EU-US Data Privacy Framework. Más información en{" "}
            <a href="https://firebase.google.com/support/privacy" style={s.link} target="_blank" rel="noreferrer">
              firebase.google.com/support/privacy
            </a>.
          </p>
        </Section>

        <Section titulo="4. Transferencias internacionales de datos">
          <p>
            Los servidores de Firebase pueden estar ubicados fuera del Espacio Económico Europeo (EEE). Google LLC dispone de las garantías adecuadas (cláusulas contractuales tipo, art. 46 RGPD) para amparar dichas transferencias.
          </p>
        </Section>

        <Section titulo="5. Plazo de conservación">
          <p>
            Conservamos tus datos mientras mantengas una cuenta activa en Roomie Match.{" "}
            <strong>Si eliminas tu cuenta</strong>, todos tus datos (perfil, fotos, matches, mensajes y test de convivencia) se borran de forma permanente e inmediata.
          </p>
          <p>
            Las fotos de verificación se eliminan de nuestros servidores una vez completada la revisión manual.
          </p>
        </Section>

        <Section titulo="6. Tus derechos">
          <p>
            De acuerdo con el RGPD y la LOPDGDD, tienes derecho a:
          </p>
          <ul style={s.ul}>
            <li><strong>Acceso:</strong> obtener confirmación de si tratamos tus datos y una copia de los mismos.</li>
            <li><strong>Rectificación:</strong> corregir datos inexactos o incompletos.</li>
            <li><strong>Supresión ("derecho al olvido"):</strong> solicitar la eliminación de tus datos. Puedes ejercerlo directamente desde <em>Mi perfil → Eliminar mi cuenta</em>.</li>
            <li><strong>Portabilidad:</strong> recibir tus datos en formato estructurado y legible por máquina.</li>
            <li><strong>Oposición:</strong> oponerte al tratamiento de tus datos en determinadas circunstancias.</li>
            <li><strong>Limitación:</strong> solicitar que restrinjamos el tratamiento mientras se resuelve una reclamación.</li>
          </ul>
          <p>
            Para ejercer cualquiera de estos derechos, escríbenos a{" "}
            <a href="mailto:roomiematch@hotmail.com" style={s.link}>roomiematch@hotmail.com</a>{" "}
            indicando tu solicitud. Responderemos en el plazo máximo de 30 días.
          </p>
        </Section>

        <Section titulo="7. Derecho a reclamar ante la AEPD">
          <p>
            Si consideras que el tratamiento de tus datos no es conforme a la normativa, tienes derecho a presentar una reclamación ante la{" "}
            <strong>Agencia Española de Protección de Datos (AEPD)</strong>:{" "}
            <a href="https://www.aepd.es" style={s.link} target="_blank" rel="noreferrer">www.aepd.es</a>.
          </p>
        </Section>

        <Section titulo="8. Cookies">
          <p>
            Roomie Match utiliza únicamente <strong>cookies técnicas estrictamente necesarias</strong> para el funcionamiento de la aplicación (gestión de sesión de Firebase Authentication).
          </p>
          <p>
            <strong>No utilizamos cookies publicitarias, de seguimiento ni de analítica de terceros.</strong>
          </p>
          <table style={s.tabla}>
            <thead>
              <tr>
                <th style={s.th}>Cookie</th>
                <th style={s.th}>Proveedor</th>
                <th style={s.th}>Finalidad</th>
                <th style={s.th}>Duración</th>
              </tr>
            </thead>
            <tbody>
              <tr>
                <td style={s.td}>Cookies de sesión Firebase</td>
                <td style={s.td}>Google LLC</td>
                <td style={s.td}>Mantener la sesión autenticada del usuario</td>
                <td style={s.td}>Sesión / 1 año</td>
              </tr>
            </tbody>
          </table>
          <p style={{ marginTop: "12px" }}>
            Las cookies técnicas no requieren consentimiento previo según el art. 22.2 de la LSSI-CE.
          </p>
        </Section>

        <Section titulo="9. Seguridad">
          <p>
            Aplicamos medidas técnicas y organizativas adecuadas para proteger tus datos frente a accesos no autorizados, pérdida o alteración, incluyendo:
          </p>
          <ul style={s.ul}>
            <li>Conexión cifrada mediante HTTPS en todas las comunicaciones.</li>
            <li>Reglas de seguridad de Firestore que limitan el acceso a cada usuario a sus propios datos.</li>
            <li>Autenticación delegada en Google (no almacenamos contraseñas).</li>
          </ul>
        </Section>

        <Section titulo="10. Modificaciones">
          <p>
            Podemos actualizar esta política para adaptarla a cambios normativos o funcionales. Te notificaremos los cambios relevantes a través de la aplicación. La fecha de "última actualización" al inicio del documento indica la versión vigente.
          </p>
        </Section>

        <div style={s.footer}>
          <a href="/" style={s.back}>← Volver a Roomie Match</a>
          <span style={s.footerSep}>·</span>
          <a href="/terminos" style={s.back}>Términos y condiciones</a>
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
  tabla: {
    width: "100%",
    borderCollapse: "collapse",
    fontSize: "13px",
    marginTop: "8px",
  },
  th: {
    background: "#f5f3ff",
    color: "#5b21b6",
    fontWeight: "700",
    padding: "9px 12px",
    textAlign: "left",
    border: "1px solid #e5e7eb",
  },
  td: {
    padding: "8px 12px",
    border: "1px solid #e5e7eb",
    color: "#374151",
    verticalAlign: "top",
  },
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
