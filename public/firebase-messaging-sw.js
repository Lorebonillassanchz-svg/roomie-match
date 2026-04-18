importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.7.1/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyDL-mqvZuL-P5Fy5fdKG6DEOaO8ykSr2mE",
  authDomain: "roomie-match-4546c.firebaseapp.com",
  projectId: "roomie-match-4546c",
  storageBucket: "roomie-match-4546c.firebasestorage.app",
  messagingSenderId: "31351051890",
  appId: "1:31351051890:web:ce6fc93edf151bcfcb14eb"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  self.registration.showNotification(payload.notification.title, {
    body: payload.notification.body,
    icon: '/logo192.png'
  });
});
