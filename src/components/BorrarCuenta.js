import { useState } from "react";
import {
  collection, deleteDoc, doc, getDocs, query, where,
} from "firebase/firestore";
import { deleteObject, ref as storageRef } from "firebase/storage";
import {
  deleteUser, GoogleAuthProvider, reauthenticateWithPopup,
} from "firebase/auth";
import { auth, db, storage } from "../firebase";

const CONTACT_EMAIL = "roomiematch@hotmail.com";

async function tryDeleteStorageFile(path) {
  try {
    await deleteObject(storageRef(storage, path));
  } catch {
    // El archivo puede no existir — ignoramos el error
  }
}

async function deleteSubcollectionDocs(colPath) {
  const snap = await getDocs(collection(db, colPath));
  await Promise.all(snap.docs.map((d) => deleteDoc(d.ref)));
}

async function borrarTodosLosDatos(uid) {
  // 1. Documento principal de usuario
  await deleteDoc(doc(db, "users", uid));

  // 2. Copia admin (puede no existir)
  try { await deleteDoc(doc(db, "usuarios", uid)); } catch {}

  // 3. Test de convivencia (puede no existir)
  try { await deleteDoc(doc(db, "convivencia", uid)); } catch {}

  // 4. Fotos en Storage
  await Promise.all([
    tryDeleteStorageFile(`fotos/${uid}`),
    tryDeleteStorageFile(`verificaciones/${uid}/foto1`),
    tryDeleteStorageFile(`verificaciones/${uid}/foto2`),
    tryDeleteStorageFile(`verificaciones/${uid}/foto3`),
  ]);

  // 5. Matches y sus mensajes
  const matchesSnap = await getDocs(
    query(collection(db, "matches"), where("users", "array-contains", uid))
  );
  await Promise.all(
    matchesSnap.docs.map(async (matchDoc) => {
      await deleteSubcollectionDocs(`mensajes/${matchDoc.id}/chats`);
      await deleteDoc(matchDoc.ref);
    })
  );

  // 6. Likes y dislikes
  const [likesFrom, likesTo, dislikesFrom, dislikesTo] = await Promise.all([
    getDocs(query(collection(db, "likes"),    where("from", "==", uid))),
    getDocs(query(collection(db, "likes"),    where("to",   "==", uid))),
    getDocs(query(collection(db, "dislikes"), where("from", "==", uid))),
    getDocs(query(collection(db, "dislikes"), where("to",   "==", uid))),
  ]);
  await Promise.all(
    [...likesFrom.docs, ...likesTo.docs, ...dislikesFrom.docs, ...dislikesTo.docs]
      .map((d) => deleteDoc(d.ref))
  );

  // 7. Reportes (como reportado o como reportador)
  const [reportesReportado, reportesReportador] = await Promise.all([
    getDocs(query(collection(db, "reportes"), where("reportadoUid",  "==", uid))),
    getDocs(query(collection(db, "reportes"), where("reportadorUid", "==", uid))),
  ]);
  await Promise.all(
    [...reportesReportado.docs, ...reportesReportador.docs].map((d) => deleteDoc(d.ref))
  );

  // 8. Notificaciones
  const notifSnap = await getDocs(
    query(collection(db, "notificaciones"), where("uid", "==", uid))
  );
  await Promise.all(notifSnap.docs.map((d) => deleteDoc(d.ref)));
}

export default function BorrarCuenta({ onClose }) {
  const [estado, setEstado] = useState("idle"); // idle | borrando | error
  const [errorMsg, setErrorMsg] = useState("");

  const handleEliminar = async () => {
    const user = auth.currentUser;
    if (!user) return;
    setEstado("borrando");

    try {
      await borrarTodosLosDatos(user.uid);

      // Borrar cuenta de Auth — si el token está expirado, reautenticar primero
      try {
        await deleteUser(user);
      } catch (authErr) {
        if (
          authErr.code === "auth/requires-recent-login" ||
          authErr.code === "auth/user-token-expired"
        ) {
          await reauthenticateWithPopup(user, new GoogleAuthProvider());
          await deleteUser(user);
        } else {
          throw authErr;
        }
      }

      window.location.replace("/");
    } catch (err) {
      console.error("[BorrarCuenta]", err);
      setErrorMsg(
        `No se pudo eliminar la cuenta. Escríbenos a ${CONTACT_EMAIL} y lo hacemos manualmente.`
      );
      setEstado("error");
    }
  };

  return (
    <div style={st.overlay}>
      <div style={st.modal}>
        {estado === "borrando" ? (
          <div style={st.spinnerWrap}>
            <div style={st.spinner} />
            <p style={st.spinnerText}>Eliminando tus datos…</p>
          </div>
        ) : (
          <>
            <div style={{ fontSize: "44px", marginBottom: "12px" }}>⚠️</div>
            <h2 style={st.titulo}>Eliminar mi cuenta</h2>
            <p style={st.aviso}>
              Esta acción es irreversible. Se eliminarán todos tus datos, fotos,
              matches y mensajes de forma permanente.
            </p>

            {estado === "error" && (
              <div style={st.errorBox}>{errorMsg}</div>
            )}

            <button style={st.btnEliminar} onClick={handleEliminar}>
              Eliminar mi cuenta
            </button>
            <button style={st.btnCancelar} onClick={onClose}>
              Cancelar
            </button>
          </>
        )}
      </div>
    </div>
  );
}

const st = {
  overlay: {
    position: "fixed", inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000, padding: "20px",
  },
  modal: {
    background: "#ffffff", borderRadius: "24px",
    padding: "32px 28px", maxWidth: "380px", width: "100%",
    boxShadow: "0 24px 80px rgba(0,0,0,0.35)",
    display: "flex", flexDirection: "column", alignItems: "center",
    textAlign: "center",
  },
  titulo: {
    margin: "0 0 14px 0", fontSize: "20px",
    fontWeight: "800", color: "#1a1a2e",
  },
  aviso: {
    fontSize: "14px", color: "#6b7280",
    lineHeight: "1.6", margin: "0 0 24px 0",
  },
  btnEliminar: {
    width: "100%", padding: "13px", borderRadius: "14px",
    border: "none", background: "#dc2626",
    color: "#ffffff", fontSize: "15px", fontWeight: "700",
    cursor: "pointer", marginBottom: "10px",
    boxShadow: "0 4px 12px rgba(220,38,38,0.35)",
  },
  btnCancelar: {
    width: "100%", padding: "12px", borderRadius: "14px",
    border: "none", background: "#f3f4f6",
    color: "#6b7280", fontSize: "14px", fontWeight: "600",
    cursor: "pointer",
  },
  errorBox: {
    width: "100%", padding: "12px 14px",
    background: "#fef2f2", border: "1px solid #fecaca",
    borderRadius: "12px", fontSize: "13px",
    color: "#dc2626", lineHeight: "1.5",
    marginBottom: "18px",
  },
  spinnerWrap: {
    display: "flex", flexDirection: "column",
    alignItems: "center", gap: "16px", padding: "12px 0",
  },
  spinner: {
    width: "44px", height: "44px",
    border: "4px solid rgba(220,38,38,0.2)",
    borderTop: "4px solid #dc2626",
    borderRadius: "50%",
    animation: "spin 0.8s linear infinite",
  },
  spinnerText: {
    margin: 0, fontSize: "14px",
    color: "#6b7280", fontWeight: "600",
  },
};
