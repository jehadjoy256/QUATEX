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
const alertContainer = document.getElementById('alertContainer');

let loggedInUserId = null;

// Initialize profile page
async function initProfile() {
  try {
    showLoading(true);

    // Get current user
    loggedInUserId = await getCurrentUserId();
    const urlParams = new URLSearchParams(window.location.search);
    const userId = urlParams.get('id') || loggedInUserId;

    if (!userId) {
      window.location.href = 'login.html';
      return;
    }

    await Promise.all([
      loadUserProfile(userId),
      loadUserPosts(userId)
    ]);

  } catch (error) {
    console.error('Profile initialization error:', error);
    showAlert('প্রোফাইল লোড করতে সমস্যা হয়েছে। পরে আবার চেষ্টা করুন।', 'error');
  } finally {
    showLoading(false);
  }

  setupProfileTabs();
}

async function getCurrentUserId() {
  return new Promise((resolve) => {
    onAuthStateChanged(auth, (user) => {
      if (user) {
        resolve(user.uid);
      } else {
        resolve(null);
      }
    });
  });
}

function showLoading(show) {
  if (loadingSpinner) loadingSpinner.style.display = show ? 'block' : 'none';
}

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

    renderProfile(userSnap.data(), userId);
  } catch (error) {
    console.error('Error loading profile:', error);
    showAlert('ব্যবহারকারীর তথ্য লোড করতে সমস্যা হয়েছে।', 'error');
    renderProfileError();
  }
}

function renderProfile(userData, userId) {
  profileContainer.innerHTML = `
    <div class="profile-header">
      <img src="${userData.photoURL || 'https://via.placeholder.com/150'}" 
           alt="${userData.displayName || 'User'}" 
           class="profile-avatar">
      <div class="profile-info">
        <h2>${userData.displayName || 'ব্যবহারকারী'}</h2>
        ${userData.email ? `<p class="profile-email">${userData.email}</p>` : ''}
        <div class="profile-stats">
          <div class="stat">
            <span class="stat-value">${userData.postCount || 0}</span>
            <span class="stat-label">পোস্ট</span>
          </div>
          <div class="stat">
            <span class="stat-value">${getRoleName(userData.role)}</span>
            <span class="stat-label">ভূমিকা</span>
          </div>
          <div class="stat">
            <span class="stat-value">${userData.joinedDate ? formatDate(userData.joinedDate) : 'অজানা'}</span>
            <span class="stat-label">যোগদান</span>
          </div>
        </div>
      </div>
    </div>
    ${loggedInUserId === userId ? `
    <div class="profile-actions">
      <a href="edit-profile.html" class="edit-profile-btn">প্রোফাইল সম্পাদনা</a>
    </div>
    ` : ''}
  `;
}

function renderProfileError() {
  profileContainer.innerHTML = `
    <div class="profile-error">
      <i class="fas fa-exclamation-circle"></i>
      <p>প্রোফাইল লোড করা যায়নি</p>
      <button onclick="window.location.reload()" class="retry-btn">
        <i class="fas fa-sync-alt"></i> আবার চেষ্টা করুন
      </button>
    </div>
  `;
}

// Load user posts
async function loadUserPosts(userId) {
  try {
    postsContainer.innerHTML = '<div class="spinner small"></div>';

    const postsQuery = query(
      collection(db, "posts"),
      where("authorId", "==", userId),
      orderBy("createdAt", "desc")
    );

    const querySnapshot = await getDocs(postsQuery);

    if (querySnapshot.empty) {
      postsContainer.innerHTML = `
        <div class="no-posts">
          <i class="fas fa-book-open"></i>
          <p>এই ব্যবহারকারীর কোনো পোস্ট নেই</p>
          ${loggedInUserId === userId ? `
          <a href="create-post.html" class="cta-button">নতুন পোস্ট লিখুন</a>
          ` : ''}
        </div>
      `;
      return;
    }

    postsContainer.innerHTML = '';

    querySnapshot.forEach(doc => {
      const post = doc.data();
      const postDate = formatPostDate(post.createdAt);

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
      <div class="posts-error">
        <i class="fas fa-exclamation-triangle"></i>
        <p>পোস্ট লোড করতে সমস্যা হয়েছে</p>
        <button onclick="loadUserPosts('${userId}')" class="retry-btn">
          <i class="fas fa-sync-alt"></i> আবার চেষ্টা করুন
        </button>
      </div>
    `;
  }
}

// Helper functions
function formatPostDate(timestamp) {
  if (!timestamp?.toDate) return 'তারিখ নেই';
  const date = timestamp.toDate();
  return date.toLocaleDateString('bn-BD', {
    year: 'numeric',
    month: 'long',
    day: 'numeric'
  });
}

function formatDate(date) {
  if (date?.toDate) {
    return date.toDate().toLocaleDateString('bn-BD');
  }
  return typeof date === 'string' ? date : 'অজানা';
}

function truncateContent(content, maxLength = 200) {
  if (!content) return '';
  return content.length > maxLength 
    ? content.substring(0, maxLength) + '...' 
    : content;
}

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

function getRoleName(role) {
  const roles = {
    'admin': 'প্রশাসক',
    'author': 'লেখক',
    'user': 'ব্যবহারকারী'
  };
  return roles[role] || role || 'ব্যবহারকারী';
}

function showAlert(message, type = 'error') {
  const alert = document.createElement('div');
  alert.className = `alert alert-${type}`;
  alert.innerHTML = `
    <i class="fas fa-${type === 'error' ? 'exclamation-circle' : 'check-circle'}"></i>
    <span>${message}</span>
  `;
  alertContainer.appendChild(alert);
  setTimeout(() => alert.remove(), 5000);
}

// Initialize when DOM is loaded
document.addEventListener('DOMContentLoaded', initProfile);
