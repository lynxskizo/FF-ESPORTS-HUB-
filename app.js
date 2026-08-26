import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, signInWithEmailAndPassword, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-auth.js";
import { getFirestore, doc, setDoc, getDoc, collection, addDoc, updateDoc, arrayUnion } from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// Your Firebase Config Setup
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

// Sign Up Handler
const signupForm = document.getElementById('signup-form');
if (signupForm) {
  signupForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('signup-email').value;
    const password = document.getElementById('signup-password').value;
    const username = document.getElementById('username').value;
    const game = document.querySelector('input[name="primaryGame"]:checked').value;

    try {
      const res = await createUserWithEmailAndPassword(auth, email, password);
      await setDoc(doc(db, "users", res.user.uid), {
        uid: res.user.uid,
        username: username,
        email: email,
        primaryGame: game,
        currentTeamId: null,
        createdAt: new Date().toISOString()
      });
      window.location.href = 'userprofile.html';
    } catch (err) {
      alert("Registration Error: " + err.message);
    }
  });
}

// Login Handler
const loginForm = document.getElementById('login-form');
if (loginForm) {
  loginForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const email = document.getElementById('login-email').value;
    const password = document.getElementById('login-password').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      window.location.href = 'userprofile.html';
    } catch (err) {
      alert("Login Error: " + err.message);
    }
  });
}

// Profile Loader & Team Creation Logic
onAuthStateChanged(auth, async (user) => {
  if (user) {
    if (window.location.pathname.includes('userprofile.html')) {
      const userSnap = await getDoc(doc(db, "users", user.uid));
      if (userSnap.exists()) {
        const data = userSnap.data();
        document.getElementById('profile-name').innerText = data.username;
        document.getElementById('profile-game').innerText = data.primaryGame;
      }
    }
  } else {
    if (window.location.pathname.includes('userprofile.html')) {
      window.location.href = 'index.html';
    }
  }
});

// Create Team Handler (Max 50 Members Limit Engine)
const createTeamForm = document.getElementById('create-team-form');
if (createTeamForm) {
  createTeamForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    const currentUser = auth.currentUser;
    if (!currentUser) return;

    const teamName = document.getElementById('team-name').value;
    const game = document.getElementById('team-game').value;

    try {
      const teamRef = await addDoc(collection(db, "teams"), {
        teamName: teamName,
        game: game,
        leaderId: currentUser.uid,
        totalMembersCount: 1,
        maxLimit: 50,
        members: [currentUser.uid],
        squads: [
          {
            squadName: "Alpha Squad",
            maxSquadLimit: 5,
            members: [currentUser.uid]
          }
        ],
        createdAt: new Date().toISOString()
      });

      await updateDoc(doc(db, "users", currentUser.uid), {
        currentTeamId: teamRef.id
      });

      alert("Esports Team Successfully Created!");
      document.getElementById('create-team-modal').style.display = 'none';
      location.reload();
    } catch (err) {
      alert("Error Creating Team: " + err.message);
    }
  });
}

// Logout Action
const logoutBtn = document.getElementById('logout-btn');
if (logoutBtn) {
  logoutBtn.addEventListener('click', () => {
    signOut(auth).then(() => window.location.href = 'index.html');
  });
}
