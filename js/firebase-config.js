// firebase-config.js
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCRzD8f3qId26vcw8b8NjKdoy7NJ_6XArs",
  authDomain: "bel-angers.firebaseapp.com",
  projectId: "bel-angers",
  storageBucket: "bel-angers.firebasestorage.app",
  messagingSenderId: "274109545795",
  appId: "1:274109545795:web:2d3cef55970d6145a303f6",
  measurementId: "G-BCNB62HXDW"
};

// Initialisation
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);
