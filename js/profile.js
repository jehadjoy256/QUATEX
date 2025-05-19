// js/profile.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { doc, getDoc, collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM Elements
const profileContainer = document.getElementById('profileContainer');
const postsContainer = document.getElementById('userPosts');
const profileTabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const loadingSpinner = document.getElementById('loadingSpinner');

// Current user
let currentUser = null;
let currentUserId = null;

// Initialize profile page
async function initProfile() {
  // Show loading spinner
  if (loadingSpinner) loadingSpinner.style.display = 'block';
  
  // Get user ID from URL if available
  const urlParams = new URLSearchParams(window.location.search);
  const userId = urlParams.get('id');
  
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      
      // If no user ID in URL, show current user's profile
      if (!userId) {
        currentUserId = user.uid;
        await loadUserProfile(user.uid);
        await loadUserPosts(user.uid);
      } else {
        currentUserId = userId;
        await loadUserProfile(userId);
        await loadUserPosts(userId);
      }
    } else {
      // If not logged in and no user ID in URL, redirect to login
      if (!userId) {
        window.location.href = 'login.html';
      } else {
        currentUserId = userId;
        await loadUserProfile(userId);
        await loadUserPosts(userId);
      }
    }
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  });
  
  // Add event listeners to tabs
  profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      profileTabs.forEach(t => t.classList.remove('active'));
      
      // Add active class to clicked tab
      tab.classList.add('active');
      
      // Hide all tab contents
      tabContents.forEach(content => content.style.display = 'none');
      
      // Show selected tab content
      const tabId = tab.getAttribute('data-tab');
      document.getElementById(tabId).style.display = 'block';
    });
  });
}

// Load user profile
async function loadUserProfile(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      
      // Update profile UI
      updateProfileUI(userData);
    } else {
      showAlert('User not found.', 'error');
    }
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('Failed to load profile. Please try again.', 'error');
  }
}

// Update profile UI
function updateProfileUI(userData) {
  if (!profileContainer) return;
  
  // Create profile HTML
  const profileHTML = `
    <div class="profile-header">
      <img src="${userData.photoURL || 'https://via.placeholder.com/100'}" alt="${userData.displayName}" class="profile-avatar">
      <div class="profile-info">
        <h2>${userData.displayName}</h2>
        <p>${userData.email}</p>
        <div class="profile-stats">
          <div class="stat">
            <div class="stat-value">${userData.postCount || 0}</div>
            <div class="stat-label">পোস্ট</div>
          </div>
          <div class="stat">
            <div class="stat-value">${userData.role}</div>
            <div class="stat-label">ভূমিকা</div>
          </div>
        </div>
      </div>
    </div>
  `;
  
  profileContainer.innerHTML = profileHTML;
}

// Load user posts
async function loadUserPosts(userId) {
  try {
    if (!postsContainer) return;
    
    // Clear posts container
    postsContainer.innerHTML = '';
    
    // Get user posts
    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const postsSnap = await getDocs(postsQuery);
    
    if (postsSnap.empty) {
      postsContainer.innerHTML = '<p class="text-center">কোন পোস্ট নেই।</p>';
      return;
    }
    
    // Create posts HTML
    postsSnap.forEach(doc => {
      const post = doc.data();
      const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000) : new Date();
      
      const postHTML = `
        <div class="card post-card">
          <div class="post-header">
            <img src="${post.authorPhotoURL || 'https://via.placeholder.com/40'}" alt="${post.authorName}" class="post-author-pic">
            <div class="post-meta">
              <div class="post-author">${post.authorName}</div>
              <div class="post-date">${postDate.toLocaleDateString('bn-BD')}</div>
            </div>
          </div>
          <div class="post-content">
            <h3 class="post-title">${post.title}</h3>
            <div class="post-category">${getCategoryName(post.category)}</div>
            <p class="post-excerpt">${post.content.substring(0, 150)}${post.content.length > 150 ? '...' : ''}</p>
            <a href="post.html?id=${doc.id}" class="cta-button">পুরো পোস্ট পড়ুন</a>
          </div>
          <div class="post-actions">
            <button class="action-btn">
              <i class="far fa-heart"></i> ${post.likes ? post.likes.length : 0}
            </button>
            <button class="action-btn">
              <i class="far fa-comment"></i> ${post.commentCount || 0}
            </button>
          </div>
        </div>
      `;
      
      postsContainer.innerHTML += postHTML;
    });
  } catch (error) {
    console.error('Error loading posts:', error);
    showAlert('Failed to load posts. Please try again.', 'error');
  }
}

// Get category name in Bangla
function getCategoryName(category) {
  const categories = {
    'poetry': 'কবিতা',
    'novel': 'উপন্যাস',
    'short-story': 'ছোটগল্প',
    'essay': 'প্রবন্ধ',
    'humor': 'রম্যরচনা',
    'ghost-story': 'ভৌতিক গল্প',
    'memoir': 'স্মৃতিকথা'
  };
  
  return categories[category] || category;
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

// Initialize profile page when DOM is loaded
document.addEventListener('DOMContentLoaded', initProfile);

export { loadUserProfile, loadUserPosts };