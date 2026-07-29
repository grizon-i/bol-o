import { initializeApp } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-app.js";
    import {
      getFirestore,
      collection,
      doc,
      setDoc,
      getDocs,
      onSnapshot,
      serverTimestamp
    } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";


    const firebaseConfig = {
      apiKey: "AIzaSyBCBIiJz2cGCOYk-OL-6UwD-WSVStAvhzs",
      authDomain: "primas-da-bola.firebaseapp.com",
      projectId: "primas-da-bola",
      storageBucket: "primas-da-bola.firebasestorage.app",
      messagingSenderId: "251269916606",
      appId: "1:251269916606:web:7e5ddcdad08b55f8e7fbef"
    };

    const app = initializeApp(firebaseConfig);
    const db = getFirestore(app);
   

    window.db = db;
    window.serverTimestamp = serverTimestamp;
    window.collection = collection;
    window.doc = doc;
    window.setDoc = setDoc;
    window.getDocs = getDocs;
    window.onSnapshot = onSnapshot;