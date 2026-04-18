import { useState } from "react";
import { doc, setDoc } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";
import { auth, db, storage } from "../firebase";

export default function CreateProfile({ onProfileSaved }) {
  const [form, setForm] = useState({
    nombre: "",
    edad: "",
    ciudad: "",
    presupuesto: "",
    bio: "",
  });
  const [photoFile, setPhotoFile] = useState(null);
  const [photoPreview, setPhotoPreview] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
  };

  const handlePhoto = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    setPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");

    if (!form.nombre || !form.edad || !form.ciudad || !form.presupuesto) {
      setError("Por favor completa todos los campos obligatorios.");
      return;
    }

    setSaving(true);
    try {
      const user = auth.currentUser;

      let photoURL = user.photoURL || "";
      if (photoFile) {
        const storageRef = ref(storage, `fotos/${user.uid}`);
        await uploadBytes(storageRef, photoFile);
        photoURL = await getDownloadURL(storageRef);
      }

      await setDoc(doc(db, "users", user.uid), {
        uid: user.uid,
        email: user.email,
        nombre: form.nombre,
        edad: Number(form.edad),
        ciudad: form.ciudad,
        presupuesto: Number(form.presupuesto),
        bio: form.bio,
        photoURL,
        creadoEn: new Date().toISOString(),
      });

      if (onProfileSaved) onProfileSaved();
    } catch (err) {
      console.error(err);
      setError("Error al guardar el perfil. Inténtalo de nuevo.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <div style={styles.logoCircle}>
            <span style={{ fontSize: "28px" }}>🏠</span>
          </div>
          <h1 style={styles.title}>Crea tu perfil</h1>
          <p style={styles.subtitle}>Cuéntanos un poco sobre ti</p>
        </div>

        <form onSubmit={handleSubmit} style={styles.form}>
          {/* Foto de perfil */}
          <div style={styles.photoSection}>
            <div style={styles.photoCircle} onClick={() => document.getElementById("photoInput").click()}>
              {photoPreview ? (
                <img src={photoPreview} alt="preview" style={styles.photoImg} />
              ) : (
                <div style={styles.photoPlaceholder}>
                  <span style={{ fontSize: "32px" }}>📷</span>
                  <span style={styles.photoLabel}>Subir foto</span>
                </div>
              )}
            </div>
            <input
              id="photoInput"
              type="file"
              accept="image/*"
              onChange={handlePhoto}
              style={{ display: "none" }}
            />
            {photoPreview && (
              <button
                type="button"
                style={styles.changePhotoBtn}
                onClick={() => document.getElementById("photoInput").click()}
              >
                Cambiar foto
              </button>
            )}
          </div>

          {/* Nombre */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Nombre <span style={styles.required}>*</span></label>
            <input
              name="nombre"
              type="text"
              placeholder="¿Cómo te llamas?"
              value={form.nombre}
              onChange={handleChange}
              style={styles.input}
            />
          </div>

          {/* Edad y Ciudad en fila */}
          <div style={styles.row}>
            <div style={{ ...styles.fieldGroup, flex: 1 }}>
              <label style={styles.label}>Edad <span style={styles.required}>*</span></label>
              <input
                name="edad"
                type="number"
                placeholder="Ej: 24"
                min="18"
                max="99"
                value={form.edad}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
            <div style={{ width: "14px" }} />
            <div style={{ ...styles.fieldGroup, flex: 2 }}>
              <label style={styles.label}>Ciudad <span style={styles.required}>*</span></label>
              <input
                name="ciudad"
                type="text"
                placeholder="Ej: Madrid"
                value={form.ciudad}
                onChange={handleChange}
                style={styles.input}
              />
            </div>
          </div>

          {/* Presupuesto */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>
              Presupuesto mensual (€) <span style={styles.required}>*</span>
            </label>
            <div style={styles.inputWrapper}>
              <span style={styles.inputPrefix}>€</span>
              <input
                name="presupuesto"
                type="number"
                placeholder="Ej: 500"
                min="0"
                value={form.presupuesto}
                onChange={handleChange}
                style={{ ...styles.input, paddingLeft: "36px" }}
              />
            </div>
          </div>

          {/* Bio */}
          <div style={styles.fieldGroup}>
            <label style={styles.label}>Bio</label>
            <textarea
              name="bio"
              placeholder="Cuéntanos algo sobre ti, tus hábitos, horarios..."
              value={form.bio}
              onChange={handleChange}
              rows={4}
              style={styles.textarea}
            />
          </div>

          {/* Error */}
          {error && <p style={styles.error}>{error}</p>}

          {/* Submit */}
          <button type="submit" style={styles.submitButton} disabled={saving}>
            {saving ? "Guardando..." : "Guardar perfil"}
          </button>
        </form>
      </div>
    </div>
  );
}

const styles = {
  container: {
    minHeight: "100vh",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "flex-start",
    justifyContent: "center",
    padding: "32px 24px",
    fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  },
  card: {
    background: "#ffffff",
    borderRadius: "28px",
    padding: "36px 28px 40px",
    maxWidth: "420px",
    width: "100%",
    boxShadow: "0 20px 60px rgba(0,0,0,0.2)",
  },
  header: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    textAlign: "center",
    marginBottom: "28px",
  },
  logoCircle: {
    width: "60px",
    height: "60px",
    borderRadius: "50%",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "12px",
    boxShadow: "0 6px 18px rgba(102,126,234,0.4)",
  },
  title: {
    margin: "0 0 6px 0",
    fontSize: "26px",
    fontWeight: "800",
    color: "#1a1a2e",
  },
  subtitle: {
    margin: 0,
    fontSize: "14px",
    color: "#6b7280",
  },
  form: {
    display: "flex",
    flexDirection: "column",
    gap: "18px",
  },
  photoSection: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "10px",
  },
  photoCircle: {
    width: "100px",
    height: "100px",
    borderRadius: "50%",
    border: "3px dashed #c4b5fd",
    background: "#f5f3ff",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    cursor: "pointer",
    overflow: "hidden",
    transition: "border-color 0.2s",
  },
  photoImg: {
    width: "100%",
    height: "100%",
    objectFit: "cover",
  },
  photoPlaceholder: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    gap: "4px",
  },
  photoLabel: {
    fontSize: "11px",
    color: "#7c3aed",
    fontWeight: "600",
  },
  changePhotoBtn: {
    background: "none",
    border: "none",
    color: "#667eea",
    fontSize: "13px",
    fontWeight: "600",
    cursor: "pointer",
    padding: 0,
  },
  fieldGroup: {
    display: "flex",
    flexDirection: "column",
    gap: "6px",
  },
  row: {
    display: "flex",
    flexDirection: "row",
    alignItems: "flex-start",
  },
  label: {
    fontSize: "13px",
    fontWeight: "600",
    color: "#374151",
  },
  required: {
    color: "#ef4444",
  },
  inputWrapper: {
    position: "relative",
  },
  inputPrefix: {
    position: "absolute",
    left: "12px",
    top: "50%",
    transform: "translateY(-50%)",
    color: "#9ca3af",
    fontSize: "15px",
    pointerEvents: "none",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#1a1a2e",
    outline: "none",
    boxSizing: "border-box",
    transition: "border-color 0.2s",
    background: "#fafafa",
  },
  textarea: {
    width: "100%",
    padding: "12px 14px",
    border: "2px solid #e5e7eb",
    borderRadius: "12px",
    fontSize: "14px",
    color: "#1a1a2e",
    outline: "none",
    boxSizing: "border-box",
    resize: "none",
    background: "#fafafa",
    fontFamily: "inherit",
    lineHeight: "1.5",
  },
  error: {
    margin: 0,
    fontSize: "13px",
    color: "#ef4444",
    background: "#fef2f2",
    border: "1px solid #fecaca",
    borderRadius: "10px",
    padding: "10px 14px",
  },
  submitButton: {
    padding: "14px",
    borderRadius: "14px",
    border: "none",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "#ffffff",
    fontSize: "15px",
    fontWeight: "700",
    cursor: "pointer",
    boxShadow: "0 4px 14px rgba(102,126,234,0.4)",
    marginTop: "4px",
  },
};
