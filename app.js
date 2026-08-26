import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

const firebaseConfig = {
  apiKey: "AIzaSyCdzsLgKC5ssl9ZA1yeGLIpmOkNGC7lXKM",
  authDomain: "ff-esports-hub-eb964.firebaseapp.com",
  projectId: "ff-esports-hub-eb964",
  storageBucket: "ff-esports-hub-eb964.firebasestorage.app",
  messagingSenderId: "44678895159",
  appId: "1:44678895159:web:29225572f8c7fee106d1b2"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// Auth Monitor
onAuthStateChanged(auth, (user) => {
  if (user) {
    const avatar = document.getElementById('user-avatar');
    if (avatar) avatar.innerText = user.email[0].toUpperCase();
  }
});

// Post Publisher
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    const text = document.getElementById('post-input').value.trim();
    const type = document.getElementById('post-type-select').value;
    const user = auth.currentUser;

    if (!text) return alert("Write something to post!");

    try {
      await addDoc(collection(db, "smart_feed"), {
        text: text,
        postType: type,
        senderName: user ? user.email.split('@')[0] : "Pro_Gamer",
        senderId: user ? user.uid : "guest",
        createdAt: serverTimestamp()
      });
      document.getElementById('post-input').value = '';
    } catch (err) {
      console.error(err);
    }
  });
}

// Feed Listener
const feedContainer = document.getElementById('feed-container');
if (feedContainer) {
  onSnapshot(query(collection(db, "smart_feed"), orderBy("createdAt", "desc")), (snapshot) => {
    feedContainer.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const card = document.createElement('div');
      card.className = 'feed-card';
      
      let badgeBg = "#00ff88"; let badgeText = "GAMEPLAY";
      if (data.postType === 'hire') { badgeBg = "#ef4444"; badgeText = "HIRING"; }
      else if (data.postType === 'analysis') { badgeBg = "#f59e0b"; badgeText = "ANALYST"; }

      card.innerHTML = `
        <div class="feed-header">
          <div style="display:flex; gap:10px; align-items:center;">
            <div class="avatar" style="width:32px; height:32px; font-size:11px;">${(data.senderName || 'P')[0].toUpperCase()}</div>
            <div>
              <h5 style="font-size:13px; color:#fff;">${data.senderName}</h5>
              <span style="font-size:10px; color:var(--text-muted);">Just now</span>
            </div>
          </div>
          <span class="badge" style="background:${badgeBg}; color:#000;">${badgeText}</span>
        </div>
        <p style="font-size:13px; color:#f3f4f6; margin-bottom:12px; line-height:1.4;">${data.text}</p>
        <div style="border-top:1px solid var(--border-dark); padding-top:8px; display:flex; justify-content:space-around; font-size:12px; color:var(--text-muted);">
          <span style="cursor:pointer;"><i class="fa-solid fa-thumbs-up"></i> Like</span>
          <span style="cursor:pointer;"><i class="fa-solid fa-comment"></i> Comment</span>
          <span style="cursor:pointer;"><i class="fa-solid fa-share"></i> Share</span>
        </div>
      `;
      feedContainer.appendChild(card);
    });
  });
}

// E2EE Messenger Logic
const chatContainer = document.getElementById('chat-messages');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatInput = document.getElementById('chat-input');

if (chatContainer) {
  onSnapshot(query(collection(db, "global_chat"), orderBy("createdAt", "asc")), (snapshot) => {
    chatContainer.innerHTML = '';
    snapshot.forEach((doc) => {
      const data = doc.data();
      const user = auth.currentUser;
      const isMe = user && user.uid === data.senderId;

      const bubble = document.createElement('div');
      bubble.className = `msg-bubble ${isMe ? 'me' : 'other'}`;
      bubble.innerText = data.text;
      chatContainer.appendChild(bubble);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

if (chatSendBtn) {
  chatSendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    const user = auth.currentUser;
    if (!text) return;

    await addDoc(collection(db, "global_chat"), {
      text: text,
      senderId: user ? user.uid : "guest",
      senderName: user ? user.email.split('@')[0] : "Guest",
      createdAt: serverTimestamp()
    });
    chatInput.value = '';
  });
      }
