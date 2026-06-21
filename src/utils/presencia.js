import { doc, setDoc } from 'firebase/firestore';
import { db } from '../firebase';

export function iniciarPresencia(uid) {
  const userRef = doc(db, 'users', uid);

  const marcarOnline = () =>
    setDoc(userRef, { online: true, ultimaVez: new Date().toISOString() }, { merge: true }).catch(() => {});

  const marcarOffline = () =>
    setDoc(userRef, { online: false, ultimaVez: new Date().toISOString() }, { merge: true }).catch(() => {});

  marcarOnline();

  const handleVisibility = () => {
    if (document.hidden) marcarOffline();
    else marcarOnline();
  };

  document.addEventListener('visibilitychange', handleVisibility);
  window.addEventListener('beforeunload', marcarOffline);

  return () => {
    document.removeEventListener('visibilitychange', handleVisibility);
    window.removeEventListener('beforeunload', marcarOffline);
    marcarOffline();
  };
}
