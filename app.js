import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signInAnonymously } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, collection, addDoc, doc, updateDoc, arrayUnion, arrayRemove, query, orderBy, onSnapshot, serverTimestamp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

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

let currentUser = null;
let currentFilter = 'all';
let rawPosts = [];

// Anonymous Auth fallback so every user has a unique ID to Like/Comment immediately
signInAnonymously(auth).catch(console.error);

onAuthStateChanged(auth, (user) => {
  if (user) {
    currentUser = user;
    const userDisplay = document.getElementById('user-display');
    if (userDisplay) userDisplay.innerText = `User: ${user.uid.substring(0, 6)}`;
  }
});

// -------------------------------------------------------------
// 1. REAL-TIME POST PUBLISHING
// -------------------------------------------------------------
const publishBtn = document.getElementById('publish-btn');
if (publishBtn) {
  publishBtn.addEventListener('click', async () => {
    const text = document.getElementById('post-input').value.trim();
    const type = document.getElementById('post-type').value;

    if (!text) return alert("Please enter post text!");

    try {
      await addDoc(collection(db, "posts"), {
        text: text,
        postType: type,
        senderId: currentUser ? currentUser.uid : "guest",
        senderName: currentUser ? `Gamer_${currentUser.uid.substring(0, 4)}` : "Guest Gamer",
        likes: [],
        comments: [],
        createdAt: serverTimestamp()
      });
      document.getElementById('post-input').value = '';
    } catch (err) {
      alert("Error publishing post: " + err.message);
    }
  });
}

// -------------------------------------------------------------
// 2. DYNAMIC REAL-TIME FEED & FILTERING ENGINE
// -------------------------------------------------------------
const feedContainer = document.getElementById('feed-container');

onSnapshot(query(collection(db, "posts"), orderBy("createdAt", "desc")), (snapshot) => {
  rawPosts = [];
  snapshot.forEach((docSnap) => {
    rawPosts.push({ id: docSnap.id, ...docSnap.data() });
  });
  renderFeed();
});

function renderFeed() {
  if (!feedContainer) return;
  feedContainer.innerHTML = '';

  const searchKeyword = document.getElementById('search-input').value.toLowerCase().trim();

  const filtered = rawPosts.filter(post => {
    const matchCategory = currentFilter === 'all' || post.postType === currentFilter;
    const matchSearch = !searchKeyword || post.text.toLowerCase().includes(searchKeyword) || post.senderName.toLowerCase().includes(searchKeyword);
    return matchCategory && matchSearch;
  });

  if (filtered.length === 0) {
    feedContainer.innerHTML = `<div style="text-align:center; color:var(--text-muted); font-size:12px; padding:20px;">No posts found in this category.</div>`;
    return;
  }

  filtered.forEach(post => {
    const uid = currentUser ? currentUser.uid : '';
    const likesArray = post.likes || [];
    const isLiked = likesArray.includes(uid);
    const commentsArray = post.comments || [];

    let badgeBg = "#00ff88"; let badgeText = "CLIP";
    if (post.postType === 'hire') { badgeBg = "#ef4444"; badgeText = "HIRING"; }
    else if (post.postType === 'analysis') { badgeBg = "#f59e0b"; badgeText = "STRATEGY"; }
    else if (post.postType === 'host') { badgeBg = "#3b82f6"; badgeText = "HOST"; }

    const card = document.createElement('div');
    card.className = 'post-card';
    card.innerHTML = `
      <div class="post-header">
        <div>
          <strong style="font-size:13px; color:#fff;">${post.senderName}</strong>
          <div style="font-size:10px; color:var(--text-muted);">Real-time Post</div>
        </div>
        <span class="post-badge" style="background:${badgeBg}; color:#000;">${badgeText}</span>
      </div>
      <p style="font-size:13px; color:#f1f5f9; line-height:1.4;">${post.text}</p>
      
      <div class="post-actions">
        <button class="action-btn ${isLiked ? 'liked' : ''}" onclick="toggleLike('${post.id}', ${isLiked})">
          <i class="fa-solid fa-thumbs-up"></i> ${likesArray.length} Likes
        </button>
        <button class="action-btn" onclick="toggleCommentBox('${post.id}')">
          <i class="fa-solid fa-comment"></i> ${commentsArray.length} Comments
        </button>
      </div>

      <div id="comments-${post.id}" class="comments-box">
        ${commentsArray.map(c => `
          <div class="comment-item">
            <strong style="color:var(--accent-neon);">${c.sender}:</strong> ${c.text}
          </div>
        `).join('')}
        <div class="comment-input-wrap">
          <input type="text" id="input-${post.id}" placeholder="Write a comment...">
          <button onclick="submitComment('${post.id}')" style="background:var(--accent-neon); border:none; padding:4px 10px; border-radius:10px; font-weight:bold; cursor:pointer; font-size:10px;">Reply</button>
        </div>
      </div>
    `;
    feedContainer.appendChild(card);
  });
}

// Category Filter Click Handler
document.querySelectorAll('.chip').forEach(btn => {
  btn.addEventListener('click', (e) => {
    document.querySelectorAll('.chip').forEach(c => c.classList.remove('active'));
    e.target.classList.add('active');
    currentFilter = e.target.getAttribute('data-category');
    renderFeed();
  });
});

// Live Search Trigger
document.getElementById('search-input').addEventListener('input', renderFeed);

// -------------------------------------------------------------
// 3. WORKABLE LIKE & COMMENT FUNCTIONS
// -------------------------------------------------------------
window.toggleLike = async (postId, currentlyLiked) => {
  if (!currentUser) return alert("Authentication connecting...");
  const postRef = doc(db, "posts", postId);
  try {
    if (currentlyLiked) {
      await updateDoc(postRef, { likes: arrayRemove(currentUser.uid) });
    } else {
      await updateDoc(postRef, { likes: arrayUnion(currentUser.uid) });
    }
  } catch (err) {
    console.error("Like error:", err);
  }
};

window.submitComment = async (postId) => {
  const input = document.getElementById(`input-${postId}`);
  const text = input.value.trim();
  if (!text) return;

  const postRef = doc(db, "posts", postId);
  try {
    await updateDoc(postRef, {
      comments: arrayUnion({
        sender: currentUser ? `Gamer_${currentUser.uid.substring(0, 4)}` : "Guest",
        text: text,
        createdAt: Date.now()
      })
    });
    input.value = '';
  } catch (err) {
    console.error("Comment error:", err);
  }
};

// -------------------------------------------------------------
// 4. REAL-TIME MESSENGER
// -------------------------------------------------------------
const chatContainer = document.getElementById('chat-messages');
const chatSendBtn = document.getElementById('chat-send-btn');
const chatInput = document.getElementById('chat-input');

if (chatContainer) {
  onSnapshot(query(collection(db, "global_chat"), orderBy("createdAt", "asc")), (snapshot) => {
    chatContainer.innerHTML = '';
    snapshot.forEach(docSnap => {
      const data = docSnap.data();
      const isMe = currentUser && currentUser.uid === data.senderId;
      const bubble = document.createElement('div');
      bubble.className = `msg-bubble ${isMe ? 'me' : 'other'}`;
      bubble.innerText = `${data.senderName}: ${data.text}`;
      chatContainer.appendChild(bubble);
    });
    chatContainer.scrollTop = chatContainer.scrollHeight;
  });
}

if (chatSendBtn) {
  chatSendBtn.addEventListener('click', async () => {
    const text = chatInput.value.trim();
    if (!text) return;

    await addDoc(collection(db, "global_chat"), {
      text: text,
      senderId: currentUser ? currentUser.uid : "guest",
      senderName: currentUser ? `Gamer_${currentUser.uid.substring(0, 4)}` : "Guest",
      createdAt: serverTimestamp()
    });
    chatInput.value = '';
  });
}
