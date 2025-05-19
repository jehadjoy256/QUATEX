// js/auth.js
import { auth, provider, db } from './firebase.js';
import { signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM Elements
const loginBtn = document.getElementById('loginBtn');
const logoutBtn = document.getElementById('logoutBtn');
const userMenu = document.getElementById('userMenu');
const userProfilePic = document.getElementById('userProfilePic');
const userDisplayName = document.getElementById('userDisplayName');

let currentUser = null;
const adminEmails = ['joyjehad28@gmail.com', 'jehadjoy44@gmail.com'];

// Observe auth state
onAuthStateChanged(auth, async (user) => {
  if (user) {
    currentUser = user;

    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);

    if (!userSnap.exists()) {
      const isAdmin = adminEmails.includes(user.email);
      await setDoc(userRef, {
        uid: user.uid,
        displayName: user.displayName,
        email: user.email,
        photoURL: user.photoURL,
        role: isAdmin ? 'admin' : 'user',
        createdAt: new Date(),
        postCount: 0,
        banned: false
      });
    } else {
      const userData = userSnap.data();
      if (userData.banned) {
        await logout();
        showAlert('Your account has been banned. Please contact the administrator.', 'error');
        return;
      }
    }

    updateUIForLoggedInUser(user);
  } else {
    currentUser = null;
    updateUIForLoggedOutUser();
  }
});

// Login with Google
async function login() {
  try {
    const result = await signInWithPopup(auth, provider);
    showAlert('Login successful!', 'success');

    const isAdmin = adminEmails.includes(result.user.email);
    window.location.href = isAdmin ? 'admin.html' : 'index.html';

  } catch (error) {
    console.error('Login error:', error);
    showAlert('Login failed. Please try again.', 'error');
  }
}

// Logout
async function logout() {
  try {
    await signOut(auth);
    showAlert('Logout successful!', 'success');

    const protectedPages = ['profile.html', 'create-post.html', 'admin.html'];
    const currentPage = window.location.pathname.split('/').pop();

    if (protectedPages.includes(currentPage)) {
      window.location.href = 'index.html';
    }
  } catch (error) {
    console.error('Logout error:', error);
    showAlert('Logout failed. Please try again.', 'error');
  }
}

// Update UI for logged in user
function updateUIForLoggedInUser(user) {
  if (loginBtn) loginBtn.style.display = 'none';
  if (logoutBtn) logoutBtn.style.display = 'block';
  if (userMenu) userMenu.style.display = 'flex';

  if (userProfilePic) {
    userProfilePic.src = user.photoURL || 'https://via.placeholder.com/40';
    userProfilePic.alt = user.displayName;
  }

  if (userDisplayName) {
    userDisplayName.textContent = user.displayName;
  }

  checkIfUserIsAdmin(user.email);
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
  if (loginBtn) loginBtn.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (userMenu) userMenu.style.display = 'none';

  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.style.display = 'none';
}

// Check if user is admin
async function checkIfUserIsAdmin(email) {
  const adminLink = document.getElementById('adminLink');
  if (!adminLink) return;

  adminLink.style.display = adminEmails.includes(email) ? 'block' : 'none';
}

// Show alert
function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;

  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  alertContainer.appendChild(alert);

  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Check authentication before page access
function checkAuth() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = 'login.html';
      } else {
        currentUser = user;
        resolve();
      }
    });
  });
}

// Check if admin before page access
function checkAdmin() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (!user) {
        window.location.href = 'login.html';
      } else if (!adminEmails.includes(user.email)) {
        showAlert('You do not have permission to access this page.', 'error');
        setTimeout(() => {
          window.location.href = 'index.html';
        }, 1500);
      } else {
        currentUser = user;
        resolve();
      }
    });
  });
}

// Event Listeners
if (loginBtn) loginBtn.addEventListener('click', login);
if (logoutBtn) logoutBtn.addEventListener('click', logout);

// Dark mode toggle
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', toggleDarkMode);
}

function checkDarkMode() {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

function toggleDarkMode() {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
  } else {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    if (themeToggle) themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
  }
}

checkDarkMode();

export { login, logout, checkAuth, checkAdmin, currentUser };
