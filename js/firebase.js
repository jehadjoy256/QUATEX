// js/firebase.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-app.js";
import { getAuth, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// Your Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyCcNLmMFjrm05pNd_4s6de_KPhlMBHTbMM",
  authDomain: "sahityapata-b83be.firebaseapp.com",
  projectId: "sahityapata-b83be",
  storageBucket: "sahityapata-b83be.appspot.com",
  messagingSenderId: "159602785131",
  appId: "1:159602785131:web:8fa2da46c91b1205ab6a2e"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const provider = new GoogleAuthProvider();
const db = getFirestore(app);

export { auth, provider, db };
