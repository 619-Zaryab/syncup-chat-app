import { getDatabase } from "firebase/database";
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  // Yahan Firebase wala config paste karo
  apiKey: "AIzaSyBseZ1f7ZF9zXc9EBWP9V5UJtjFyZghLCA",
  authDomain: "chat-app-e0861.firebaseapp.com",
  projectId: "chat-app-e0861",
  storageBucket: "chat-app-e0861.firebasestorage.app",
  messagingSenderId: "806721065563",
  appId: "1:806721065563:web:7c37664cc39c3cbd86257e",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
export const db = getFirestore(app);
export const storage = getStorage(app);
export const rtdb = getDatabase(app);