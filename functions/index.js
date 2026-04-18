const { onDocumentCreated } = require("firebase-functions/v2/firestore");
const { initializeApp }     = require("firebase-admin/app");
const { getMessaging }      = require("firebase-admin/messaging");
const { getFirestore }      = require("firebase-admin/firestore");

initializeApp();

exports.enviarNotificacionPush = onDocumentCreated(
  "notificaciones/{docId}",
  async (event) => {
    const data = event.data?.data();
    if (!data) return;

    const { token, title, body } = data;
    if (!token || !title) return;

    const mensaje = {
      token,
      notification: { title, body: body || "" },
      webpush: {
        notification: {
          icon: "/logo192.png",
          badge: "/logo192.png",
        },
      },
    };

    try {
      await getMessaging().send(mensaje);
      await getFirestore()
        .doc(`notificaciones/${event.params.docId}`)
        .update({ enviada: true });
    } catch (err) {
      console.error("[FCM] Error enviando notificación:", err);
    }
  }
);
