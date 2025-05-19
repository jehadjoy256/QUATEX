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

// Initialize profile page
async function initProfile() {
  try {
    loadingSpinner.style.display = 'block';
    
    // Get user ID from URL or current user
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id');
    
    // Check if we have a user ID to display
    if (userId) {
      await loadUserProfile(userId);
      await loadUserPosts(userId);
    } else {
      // No user ID in URL - check auth state
      onAuthStateChanged(auth, async (user) => {
        if (user) {
          await loadUserProfile(user.uid);
          await loadUserPosts(user.uid);
        } else {
          window.location.href = 'login.html';
        }
      });
    }
  } catch (error) {
    console.error('Profile initialization error:', error);
    showAlert('প্রোফাইল লোড করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।', 'error');
  } finally {
    loadingSpinner.style.display = 'none';
  }
  
  // Tab switching functionality
  setupProfileTabs();
}

// Set up tab switching
function setupProfileTabs() {
  profileTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      profileTabs.forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      
      tabContents.forEach(content => content.style.display = 'none');
      document.getElementById(tab.dataset.tab).style.display = 'block';
    });
  });
}

// Load user profile data
async function loadUserProfile(userId) {
  try {
    const userRef = doc(db, "users", userId);
    const userSnap = await getDoc(userRef);
    
    if (!userSnap.exists()) {
      throw new Error('User not found');
    }
    
    const userData = userSnap.data();
    renderProfile(userData);
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('ব্যবহারকারীর তথ্য লোড করতে সমস্যা হয়েছে।', 'error');
    profileContainer.innerHTML = `<p class="error-message">প্রোফাইল লোড করা যায়নি</p>`;
  }
}

// Render profile UI
function renderProfile(userData) {
  profileContainer.innerHTML = `
    <div class="profile-header">
      <img src="${userData.photoURL || 'https://via.placeholder.com/150'}" 
           alt="${userData.displayName || 'User'}" 
           class="profile-avatar">
      <div class="profile-info">
        <h2>${userData.displayName || 'ব্যবহারকারী'}</h2>
        ${userData.email ? `<p>${userData.email}</p>` : ''}
        <div class="profile-stats">
          <div class="stat">
            <span class="stat-value">${userData.postCount || 0}</span>
            <span class="stat-label">পোস্ট</span>
          </div>
          <div class="stat">
            <span class="stat-value">${userData.role || 'পাঠক'}</span>
            <span class="stat-label">ভূমিকা</span>
          </div>
        </div>
      </div>
    </div>
  `;
}

// Load user posts
async function loadUserPosts(userId) {
  try {
    postsContainer.innerHTML = '<div class="spinner"></div>';
    
    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );
    
    const querySnapshot = await getDocs(postsQuery);
    
    if (querySnapshot.empty) {
      postsContainer.innerHTML = '<p class="no-posts">এই ব্যবহারকারীর কোনো পোস্ট নেই</p>';
      return;
    }
    
    postsContainer.innerHTML = '';
    
    querySnapshot.forEach(doc => {
      const post = doc.data();
      const postDate = getPostDate(post.createdAt);
      
      postsContainer.innerHTML += `
        <div class="post-card">
          <div class="post-header">
            <img src="${post.authorPhotoURL || 'https://via.placeholder.com/40'}" 
                 alt="${post.authorName}" 
                 class="post-author-avatar">
            <div class="post-meta">
              <h3 class="post-title">${post.title || 'নামবিহীন পোস্ট'}</h3>
              <div class="post-details">
                <span class="post-category ${post.category || ''}">
                  ${getCategoryName(post.category)}
                </span>
                <span class="post-date">${postDate}</span>
              </div>
            </div>
          </div>
          <div class="post-content">
            <p>${truncateContent(post.content)}</p>
            <a href="post.html?id=${doc.id}" class="read-more">পুরো পড়ুন</a>
          </div>
          <div class="post-footer">
            <span class="post-likes">
              <i class="fas fa-heart"></i> ${post.likes?.length || 0}
            </span>
            <span class="post-comments">
              <i class="fas fa-comment"></i> ${post.commentCount || 0}
            </span>
          </div>
        </div>
      `;
    });
  } catch (error) {
    console.error('Error loading posts:', error);
    postsContainer.innerHTML = `
      <p class="error-message">পোস্ট লোড করতে সমস্যা হয়েছে</p>
      <button onclick="loadUserPosts('${userId}')" class="retry-btn">
        আবার চেষ্টা করুন
      </button>
    `;
  }
}

// Helper function to format post date
function getPostDate(timestamp) {
  if (!timestamp) return 'তারিখ নেই';
  
  try {
    const date = timestamp.toDate();
    return date.toLocaleDateString('bn-BD', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
  } catch (error) {
    console.error('Date conversion error:', error);
    return 'তারিখ অজানা';
  }
}

// Helper function to truncate content
function truncateContent(content) {
  if (!content) return '';
  return content.length > 200 
    ? content.substring(0, 200) + '...' 
    : content;
}

// Get Bangla category name
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
  return categories[category] || category || 'সাধারণ';
}

// Show alert message
function showAlert(message, type = 'error') {
  const alertContainer = document.getElementById('alertContainer');
  if (!alertContainer) return;
  
  const alert = document.createElement('div');
  alert.className = `alert ${type}`;
  alert.textContent = message;
  
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initProfile);
