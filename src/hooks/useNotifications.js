import { useEffect, useState } from "react";
import { getToken, onMessage } from "firebase/messaging";
import { doc, updateDoc } from "firebase/firestore";
import { messaging, db } from "../firebase";

// Obtén esta clave en Firebase Console → Project Settings → Cloud Messaging → Web Push certificates
const VAPID_KEY = "BM8C9uSmQgYW_LkN9a8e4_TcCfScsbTKk-y3cmXmXn3TWRv2LdQGHgCIF5LkC5fZO1y3LeUr8jcdEIONqbatL_A";

export function useNotifications(user) {
  const [toast, setToast] = useState(null);

  useEffect(() => {
    if (!user || !messaging) return;
    const uid = user.uid;

    const init = async () => {
      try {
        const permission = await Notification.requestPermission();
        if (permission !== "granted") return;

        const token = await getToken(messaging, { vapidKey: VAPID_KEY });
        if (token) {
          await updateDoc(doc(db, "users", uid), { fcmToken: token });
        }
      } catch (err) {
        console.error("[Notifications] Error al obtener token FCM:", err);
      }
    };

    init();

    const unsub = onMessage(messaging, (payload) => {
      const title = payload.notification?.title || "Notificación";
      const body  = payload.notification?.body  || "";
      setToast(body ? `${title} · ${body}` : title);
      setTimeout(() => setToast(null), 4000);
    });

    return () => unsub();
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  const NotificationToast = toast ? (
    <div style={toastStyle}>{toast}</div>
  ) : null;

  return { NotificationToast };
}

const toastStyle = {
  position: "fixed",
  top: "16px",
  left: "50%",
  transform: "translateX(-50%)",
  background: "#7c3aed",
  color: "#ffffff",
  padding: "12px 20px",
  borderRadius: "14px",
  fontSize: "14px",
  fontWeight: "600",
  zIndex: 9999,
  boxShadow: "0 8px 24px rgba(124,58,237,0.4)",
  maxWidth: "90vw",
  textAlign: "center",
  fontFamily: "'Segoe UI', Tahoma, Geneva, Verdana, sans-serif",
  lineHeight: "1.4",
  pointerEvents: "none",
};
