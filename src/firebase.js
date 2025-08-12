// Import the functions you need from the SDKs you need
import { initializeApp } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
// TODO: Add SDKs for Firebase products that you want to use
// https://firebase.google.com/docs/web/setup#available-libraries

// Your web app's Firebase configuration
// For Firebase JS SDK v7.20.0 and later, measurementId is optional
const firebaseConfig = {
  apiKey: "AIzaSyDibvW6f9vb4C3NUhHnhHVlBF_URhM15aE",
  authDomain: "heatscape-547da.firebaseapp.com",
  projectId: "heatscape-547da",
  storageBucket: "heatscape-547da.firebasestorage.app",
  messagingSenderId: "479991817227",
  appId: "1:479991817227:web:ebba256d020a6e2de1930e",
  measurementId: "G-RDNX0D524E"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const analytics = getAnalytics(app);
export const db = getFirestore(app);
export const storage = getStorage(app);