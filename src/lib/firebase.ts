import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyDWpb15KCY4UfluGmRbtqSsNzkyv6B3sH4",
  authDomain: "growthtrack-f384c.firebaseapp.com",
  projectId: "growthtrack-f384c",
  storageBucket: "growthtrack-f384c.firebasestorage.app",
  messagingSenderId: "218720224460",
  appId: "1:218720224460:web:30ccbd4ad1693f7bd82e69",
  measurementId: "G-VPVELX1J6M"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const analytics = typeof window !== 'undefined' ? getAnalytics(app) : null;
export const db = getFirestore(app);
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
