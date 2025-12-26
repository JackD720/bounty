import { initializeApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";
import { getFirestore } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyA3Y2-RhElVt-ZfY3h78jAXZeUr9DTbAL4",
  authDomain: "bounty-92791.firebaseapp.com",
  projectId: "bounty-92791",
  storageBucket: "bounty-92791.firebasestorage.app",
  messagingSenderId: "867449257496",
  appId: "1:867449257496:web:6a0babf2a1874b94e68d6d",
  measurementId: "G-QZ1H547JGL"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
export const db = getFirestore(app);

export default app;