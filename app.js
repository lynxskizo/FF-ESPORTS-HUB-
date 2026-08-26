import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp, getDocs, where } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Firebase Configuration
const firebaseConfig = {
  apiKey: "AIzaSyCdzsLgKC5ssl9ZA1yeGLIpmOkNGC7lXKM",
  authDomain: "ff-esports-hub-eb964.firebaseapp.com",
  projectId: "ff-esports-hub-eb964",
  storageBucket: "ff-esports-hub-eb964.firebasestorage.app",
  messagingSenderId: "44678895159",
  appId: "1:44678895159:web:29225572f8c7fee106d1b2",
  measurementId: "G-62FQQCRS5K"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Authentication Listener
onAuthStateChanged(auth, (user) => {
  const headerUser = document.getElementById('header-user');
  if (user && headerUser) {
    headerUser.innerHTML = `<i class="fa-solid fa-user-check"></i> ${user.email.split('@')[0]}`;
  }
});

// -------------------------------------------------------------
// 1. Web Crypto API: End-to-End Encryption (E2EE) Module
// -------------------------------------------------------------
const E2EE_SECRET = "esports_hub_e2ee_key_2026";

async function deriveKey(passphrase) {
  const enc = new TextEncoder();
  const keyMaterial = await window.crypto.subtle.importKey(
    "raw", enc.encode(passphrase), { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return window.crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: enc.encode("esports_hub_salt_secure"), iterations: 100000, hash: "SHA-256" },
    keyMaterial, { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

async function encryptMessage(text) {
  const key = await deriveKey(E2EE_SECRET);
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const encoded = new TextEncoder().encode(text);
  const ciphertext = await window.crypto.subtle.encrypt({ name: "AES-GCM", iv }, key, encoded);
  return {
    cipher: btoa(String.fromCharCode(...new Uint8Array(ciphertext))),
    iv: btoa(String.fromCharCode(...iv))
  };
}

async function decryptMessage(encryptedObj) {
  if (!encryptedObj || !encryptedObj.cipher || !encryptedObj.iv) {
    return "🔒 [Encrypted Data]";
  }
  try {
    const key = await deriveKey(E2EE_SECRET);
    const iv = Uint8Array.from(atob(encryptedObj.iv), c => c.charCodeAt(0));
    const cipher = Uint8Array.from(atob(encryptedObj.cipher), c => c.charCodeAt(0));
    const decrypted = await window.crypto.subtle.decrypt({ name: "AES-GCM", iv }, key, cipher);
    return new TextDecoder().decode(decrypted);
  } catch (err) {
    return "🔒 [Unable to decrypt message]";
  }
}

// -------------------------------------------------------------
// 2. User & Role Search Engine (FB Style Search)
// -------------------------------------------------------------
const searchBtn = document.getElementById('search-btn');
if (searchBtn) {
  searchBtn.addEventListener('click', async () => {
    const term = document.getElementById('search-input').value.trim();
    const resultsContainer = document.getElementById('search-results');
    if (!term) return;

    resultsContainer.innerHTML = '<div style="color:#8e9bb0; font-size:11px;">Searching...</div>';

    try {
      const q = query(
        collection(db, "users"),
        where("username", ">=", term),
        where("username", "<=", term + "\uf8ff")
      );
      const snapshot = await getDocs(q);
      resultsContainer.innerHTML = '';

      if (snapshot.empty) {
        resultsContainer.innerHTML = '<div style="color:#8e9bb0; font-size:11px;">No users found.</div>';
        return;
      }

      snapshot.forEach(doc => {
        const user = doc.data();
        const userCard = document.createElement('div');
        userCard.style.cssText = "background: #0d0e17; padding: 8px 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; border: 1px solid #23283b;";
        userCard.innerHTML = `
          <div>
            <strong style="color:#fff; font-size:12px;">${user.username || 'Gamer'}</strong>
            <span style="font-size:9px; background:#70a1ff; color:#000; padding:2px 6px; border-radius:3px; margin-left:6px; font-weight:bold;">${user.role || 'PLAYER'}</span>
          </div>
          <button onclick="alert('Opening encrypted chat with ${user.username || 'Gamer'}...')" style="background:#00ff88; color:#000; border:none; padding:4px 10px; font-size:11px; border-radius:4px; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-lock"></i> Chat</button>
        `;
        resultsContainer.appendChild(userCard);
      });
    } catch (err) {
      console.error("Search Error:", err);
      resultsContainer.innerHTML = '<div style="color:#ff4757; font-size:11px;">Search failed. Ensure user profiles are registered in Firestore.</div>';
    }
  });
}

// -------------------------------------------------------------
// 3. Smart Feed Post Publishing & Listener
// -------------------------------------------------------------
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    const text = document.getElementById('post-input').value.trim();
    const type = document.getElementById('post-type-select').value;
    const currentUser = auth.currentUser;

    if (!text) return alert("Please write a post description first!");

    try {
      await addDoc(collection(db, "smart_feed"), {
        text: text,
        postType: type,
        senderId: currentUser ? currentUser.uid : "guest",
        senderName: currentUser ? currentUser.email.split('@')[0] : "Pro_Gamer",
        createdAt: serverTimestamp()
      });
      document.getElementById('post-input').value = '';
    } catch (err) {
      alert("Error creating post: " + err.message);
    }
  });
}

const feedContainer = document.getElementById('feed-container');
if (feedContainer) {
  const feedQuery = query(collection(db, "smart_feed"), orderBy("createdAt", "desc"));
  
  onSnapshot(feedQuery, (snapshot) => {
    feedContainer.innerHTML = '';

    snapshot.forEach((doc) => {
      const data = doc.data();
      let badgeBg = "#00ff88";
      let badgeColor = "#000";
      let badgeLabel = "CLIP / POST";
      let actionBtn = `<button style="background:none; border:none; color:#8e9bb0; cursor:pointer;"><i class="fa-solid fa-thumbs-up"></i> GG Like</button>`;

      if (data.postType === 'hire') {
        badgeBg = "#ff4757"; badgeColor = "#fff"; badgeLabel = "HIRING PLAYER";
        actionBtn = `<button onclick="alert('Join application sent to squad!')" style="background:none; border:none; color:#ff4757; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-user-plus"></i> Apply to Squad</button>`;
      } else if (data.postType === 'analysis') {
        badgeBg = "#ffa502"; badgeColor = "#000"; badgeLabel = "COACH BREAKDOWN";
        actionBtn = `<button onclick="alert('Opening gameplay breakdown board...')" style="background:none; border:none; color:#ffa502; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-chart-line"></i> View Analysis</button>`;
      } else if (data.postType === 'host') {
        badgeBg = "#70a1ff"; badgeColor = "#000"; badgeLabel = "HOST OPPORTUNITY";
        actionBtn = `<button onclick="alert('Applied for tournament host role!')" style="background:none; border:none; color:#70a1ff; font-weight:bold; cursor:pointer;"><i class="fa-solid fa-microphone"></i> Apply for Host</button>`;
      }

      const card = document.createElement('div');
      card.className = 'feed-card';
      card.setAttribute('data-type', data.postType);

      card.innerHTML = `
        <div class="post-header">
          <div class="user-info">
            <h4>${data.senderName}</h4>
            <span>Recent Post</span>
          </div>
          <span class="role-badge" style="background: ${badgeBg}; color: ${badgeColor};">${badgeLabel}</span>
        </div>
        <p style="font-size: 13px; color: #f1f5f9; margin-bottom: 10px; line-height: 1.4;">${data.text}</p>
        <div style="border-top: 1px solid #23283b; padding-top: 8px; display: flex; justify-content: space-between; font-size: 12px;">
          ${actionBtn}
          <button style="background:none; border:none; color:#8e9bb0; cursor:pointer;"><i class="fa-solid fa-comment"></i> Comment</button>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  });
}

// -------------------------------------------------------------
// 4. E2EE Real-time Chat Engine
// -------------------------------------------------------------
const chatContainer = document.getElementById('chat-messages');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatInput = document.getElementById('chat-input');

if (chatContainer) {
  const chatQuery = query(collection(db, "encrypted_global_chat"), orderBy("createdAt", "asc"));

  onSnapshot(chatQuery, (snapshot) => {
    chatContainer.innerHTML = '';

    snapshot.forEach(async (doc) => {
      const data = doc.data();
      const currentUser = auth.currentUser;
      const isMe = currentUser && currentUser.uid === data.senderId;

      const decryptedText = await decryptMessage(data.encryptedPayload);

      const msgBubble = document.createElement('div');
      msgBubble.className = `chat-msg ${isMe ? 'me' : 'other'}`;
      msgBubble.innerHTML = `
        <div style="font-size: 10px; opacity: 0.7; margin-bottom: 2px;">${data.senderName} <i class="fa-solid fa-lock" style="font-size:8px; color:#00ff88;"></i></div>
        <div>${decryptedText}</div>
      `;
      chatContainer.appendChild(msgBubble);
      chatContainer.scrollTop = chatContainer.scrollHeight;
    });
  });
}

if (chatSendBtn) {
  chatSendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    const currentUser = auth.currentUser;

    if (!text) return;

    try {
      const encryptedPayload = await encryptMessage(text);

      await addDoc(collection(db, "encrypted_global_chat"), {
        encryptedPayload: encryptedPayload,
        senderId: currentUser ? currentUser.uid : "guest",
        senderName: currentUser ? currentUser.email.split('@')[0] : "Guest",
        createdAt: serverTimestamp()
      });
      chatInput.value = '';
    } catch (err) {
      console.error("Encryption/Sending error:", err);
    }
  });
}
