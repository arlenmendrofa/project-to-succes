import { initializeApp } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/11.6.0/firebase-firestore.js";

export const ADMIN_EMAIL = "mendrofaarlen5@gmail.com";

const firebaseConfig = {
  apiKey: "AIzaSyDT17f7kSxpUnxF8dHrU3293rkDTbVpZkU",
  authDomain: "project-to-succes-by-len.firebaseapp.com",
  projectId: "project-to-succes-by-len",
  storageBucket: "project-to-succes-by-len.firebasestorage.app",
  messagingSenderId: "1046921541067",
  appId: "1:1046921541067:web:ed964f4972caa1cb5eb24e",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
