
import { initializeApp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js';
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js';
import { getFirestore, doc, getDoc, setDoc, serverTimestamp } from 'https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js';

export const firebaseConfig={apiKey:"AIzaSyDL6sVxhq6RqzjhaZyhneGMURQeSGCLxKQ",authDomain:"nutritrack-v2-ab92f.firebaseapp.com",projectId:"nutritrack-v2-ab92f",storageBucket:"nutritrack-v2-ab92f.firebasestorage.app",messagingSenderId:"203433318539",appId:"1:203433318539:web:89d8e0e3d2222991829c8e"};
export const app=initializeApp(firebaseConfig);
export const auth=getAuth(app);
export const db=getFirestore(app);
export const premium=['luisangelesquerra@gmail.com','luiskah77@gmail.com'];
export { doc, getDoc, setDoc, serverTimestamp, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, sendPasswordResetEmail, onAuthStateChanged };
