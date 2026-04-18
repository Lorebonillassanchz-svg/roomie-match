import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";

const firebaseConfig = {
  apiKey: "AIzaSyDL-mqvZuL-P5Fy5fdKG6DEOaO8ykSr2mE",
  authDomain: "roomie-match-4546c.firebaseapp.com",
  projectId: "roomie-match-4546c",
  storageBucket: "roomie-match-4546c.firebasestorage.app",
  messagingSenderId: "31351051890",
  appId: "1:31351051890:web:ce6fc93edf151bcfcb14eb"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);

let messaging = null;
try {
  messaging = getMessaging(app);
} catch (err) {
  console.warn("[Firebase] Messaging no disponible:", err);
}
export { messaging };

export default app;
