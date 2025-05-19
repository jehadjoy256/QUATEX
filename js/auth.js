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

// User state
let currentUser = null;
const adminEmails = ['joyjehad28@gmail.com', 'jehadjoy44@gmail.com'];

// নতুন: auth স্টেট চেক করার ফ্ল্যাগ
let authChecked = false;

// Check if user is logged in
onAuthStateChanged(auth, async (user) => {
  authChecked = true;

  if (user) {
    currentUser = user;
    
    // Check if user exists in database, if not create a new user
    const userRef = doc(db, "users", user.uid);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      // Create new user in database
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
      // Check if user is banned
      const userData = userSnap.data();
      if (userData.banned) {
        await logout();
        showAlert('Your account has been banned. Please contact the administrator.', 'error');
        return;
      }
    }
    
    // Update UI for logged in user
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
    
    // Redirect to appropriate page after login
    if (window.location.pathname.includes('login.html')) {
      if (adminEmails.includes(result.user.email)) {
        window.location.href = 'admin.html';  // admin হলে admin পেজে যাবে
      } else {
        window.location.href = 'index.html';  // সাধারণ ইউজার হলে হোমপেজে যাবে
      }
    }
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
    
    // Redirect to homepage if on protected page
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
  
  // Check if user is admin and show admin link if they are
  checkIfUserIsAdmin(user.email);
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
  if (loginBtn) loginBtn.style.display = 'block';
  if (logoutBtn) logoutBtn.style.display = 'none';
  if (userMenu) userMenu.style.display = 'none';
  
  // Hide admin link
  const adminLink = document.getElementById('adminLink');
  if (adminLink) adminLink.style.display = 'none';
}

// Check if user is admin
async function checkIfUserIsAdmin(email) {
  const adminLink = document.getElementById('adminLink');
  if (!adminLink) return;
  
  if (adminEmails.includes(email)) {
    adminLink.style.display = 'block';
  } else {
    adminLink.style.display = 'none';
  }
}

// Show alert message
function showAlert(message, type) {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  
  // Remove alert after 3 seconds
  setTimeout(() => {
    alert.remove();
  }, 3000);
}

// Check if user is logged in and redirect if not
function checkAuth() {
  if (!authChecked) {
    // এখনো auth state পাওয়া যায় নি, তাই redirect দিবেন না
    return;
  }
  if (!currentUser) {
    window.location.href = 'login.html';
  }
}

// Check if user is admin and redirect if not
async function checkAdmin() {
  if (!currentUser) {
    window.location.href = 'login.html';
    return;
  }
  
  if (!adminEmails.includes(currentUser.email)) {
    // **alert দেখানোর আগে redirect করলে alert দেখাবে না, তাই আগে দেখাবো তারপর redirect করব**
    showAlert('You do not have permission to access this page.', 'error');
    setTimeout(() => {
      window.location.href = 'index.html';
    }, 1500);  // 1.5 সেকেন্ড দেরি করে redirect
  }
}

// Event listeners
if (loginBtn) {
  loginBtn.addEventListener('click', login);
}

if (logoutBtn) {
  logoutBtn.addEventListener('click', logout);
}

// Toggle dark mode
const themeToggle = document.getElementById('themeToggle');
if (themeToggle) {
  themeToggle.addEventListener('click', toggleDarkMode);
}

// Check if dark mode is enabled in localStorage
function checkDarkMode() {
  if (localStorage.getItem('darkMode') === 'enabled') {
    document.body.classList.add('dark-mode');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
  }
}

// Toggle dark mode
function toggleDarkMode() {
  if (document.body.classList.contains('dark-mode')) {
    document.body.classList.remove('dark-mode');
    localStorage.setItem('darkMode', 'disabled');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-moon"></i>';
    }
  } else {
    document.body.classList.add('dark-mode');
    localStorage.setItem('darkMode', 'enabled');
    if (themeToggle) {
      themeToggle.innerHTML = '<i class="fas fa-sun"></i>';
    }
  }
}

// Initialize dark mode
checkDarkMode();

export { login, logout, checkAuth, checkAdmin, currentUser };
