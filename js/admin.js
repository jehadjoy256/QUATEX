// js/admin.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
  collection, 
  doc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  orderBy 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM Elements
const pendingPostsContainer = document.getElementById('pendingPosts');
const approvedPostsContainer = document.getElementById('approvedPosts');
const usersContainer = document.getElementById('users');
const adminTabs = document.querySelectorAll('.tab');
const tabContents = document.querySelectorAll('.tab-content');
const loadingSpinner = document.getElementById('loadingSpinner');

// Current user
let currentUser = null;
const adminEmails = ['joyjehad28@gmail.com', 'jehadjoy44@gmail.com'];

// Initialize admin page
function initAdmin() {
  onAuthStateChanged(auth, async (user) => {
    if (user) {
      currentUser = user;
      
      // Check if user is admin
      if (!adminEmails.includes(user.email)) {
        window.location.href = 'index.html';
        return;
      }
      
      // Load admin data
      loadPendingPosts();
      loadApprovedPosts();
      loadUsers();
    } else {
      // Redirect to login if not logged in
      window.location.href = 'login.html';
    }
  });
  
  // Add event listeners to tabs
  adminTabs.forEach(tab => {
    tab.addEventListener('click', () => {
      // Remove active class from all tabs
      adminTabs.forEach(t => t.classList.remove('active'));
      
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

// Load pending posts
async function loadPendingPosts() {
  try {
    if (!pendingPostsContainer) return;
    
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Clear container
    pendingPostsContainer.innerHTML = '';
    
    // Get pending posts
    const postsQuery = query(
      collection(db, "posts"),
      where("status", "==", "pending"),
      orderBy("createdAt", "desc")
    );
    
    const postsSnap = await getDocs(postsQuery);
    
    if (postsSnap.empty) {
      pendingPostsContainer.innerHTML = '<p class="text-center">কোন অপেক্ষমান পোস্ট নেই।</p>';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    // Create table
    let tableHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>শিরোনাম</th>
            <th>লেখক</th>
            <th>বিভাগ</th>
            <th>তারিখ</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Add posts to table
    postsSnap.forEach(doc => {
      const post = doc.data();
      const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000) : new Date();
      
      tableHTML += `
        <tr>
          <td>${post.title}</td>
          <td>${post.authorName}</td>
          <td>${getCategoryName(post.category)}</td>
          <td>${postDate.toLocaleDateString('bn-BD')}</td>
          <td class="action-buttons">
            <button class="approve-btn" data-post-id="${doc.id}">অনুমোদন</button>
            <button class="reject-btn" data-post-id="${doc.id}">প্রত্যাখ্যান</button>
            <button class="view-btn" data-post-id="${doc.id}">দেখুন</button>
          </td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    pendingPostsContainer.innerHTML = tableHTML;
    
    // Add event listeners to buttons
    const approveButtons = document.querySelectorAll('.approve-btn');
    const rejectButtons = document.querySelectorAll('.reject-btn');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    approveButtons.forEach(button => {
      button.addEventListener('click', handleApprovePost);
    });
    
    rejectButtons.forEach(button => {
      button.addEventListener('click', handleRejectPost);
    });
    
    viewButtons.forEach(button => {
      button.addEventListener('click', handleViewPost);
    });
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error loading pending posts:', error);
    showAlert('অপেক্ষমান পোস্ট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Load approved posts
async function loadApprovedPosts() {
  try {
    if (!approvedPostsContainer) return;
    
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Clear container
    approvedPostsContainer.innerHTML = '';
    
    // Get approved posts
    const postsQuery = query(
      collection(db, "posts"),
      where("status", "==", "approved"),
      orderBy("createdAt", "desc")
    );
    
    const postsSnap = await getDocs(postsQuery);
    
    if (postsSnap.empty) {
      approvedPostsContainer.innerHTML = '<p class="text-center">কোন অনুমোদিত পোস্ট নেই।</p>';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    // Create table
    let tableHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>শিরোনাম</th>
            <th>লেখক</th>
            <th>বিভাগ</th>
            <th>তারিখ</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Add posts to table
    postsSnap.forEach(doc => {
      const post = doc.data();
      const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000) : new Date();
      
      tableHTML += `
        <tr>
          <td>${post.title}</td>
          <td>${post.authorName}</td>
          <td>${getCategoryName(post.category)}</td>
          <td>${postDate.toLocaleDateString('bn-BD')}</td>
          <td class="action-buttons">
            <button class="delete-btn" data-post-id="${doc.id}">মুছুন</button>
            <button class="view-btn" data-post-id="${doc.id}">দেখুন</button>
          </td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    approvedPostsContainer.innerHTML = tableHTML;
    
    // Add event listeners to buttons
    const deleteButtons = document.querySelectorAll('.delete-btn');
    const viewButtons = document.querySelectorAll('.view-btn');
    
    deleteButtons.forEach(button => {
      button.addEventListener('click', handleDeletePost);
    });
    
    viewButtons.forEach(button => {
      button.addEventListener('click', handleViewPost);
    });
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error loading approved posts:', error);
    showAlert('অনুমোদিত পোস্ট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Load users
async function loadUsers() {
  try {
    if (!usersContainer) return;
    
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Clear container
    usersContainer.innerHTML = '';
    
    // Get users
    const usersQuery = query(
      collection(db, "users"),
      orderBy("createdAt", "desc")
    );
    
    const usersSnap = await getDocs(usersQuery);
    
    if (usersSnap.empty) {
      usersContainer.innerHTML = '<p class="text-center">কোন ব্যবহারকারী নেই।</p>';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    // Create table
    let tableHTML = `
      <table class="table">
        <thead>
          <tr>
            <th>নাম</th>
            <th>ইমেইল</th>
            <th>ভূমিকা</th>
            <th>পোস্ট সংখ্যা</th>
            <th>অবস্থা</th>
            <th>অ্যাকশন</th>
          </tr>
        </thead>
        <tbody>
    `;
    
    // Add users to table
    usersSnap.forEach(doc => {
      const user = doc.data();
      
      tableHTML += `
        <tr>
          <td>${user.displayName}</td>
          <td>${user.email}</td>
          <td>${user.role}</td>
          <td>${user.postCount || 0}</td>
          <td>${user.banned ? '<span class="status-badge status-rejected">নিষিদ্ধ</span>' : '<span class="status-badge status-approved">সক্রিয়</span>'}</td>
          <td class="action-buttons">
            ${user.role !== 'admin' ? 
              `<button class="${user.banned ? 'approve-btn' : 'ban-btn'}" data-user-id="${doc.id}" data-banned="${user.banned}">
                ${user.banned ? 'নিষেধাজ্ঞা তুলুন' : 'নিষিদ্ধ করুন'}
              </button>` : 
              '<span>অ্যাডমিন</span>'}
            <button class="view-user-btn" data-user-id="${user.uid}">দেখুন</button>
          </td>
        </tr>
      `;
    });
    
    tableHTML += `
        </tbody>
      </table>
    `;
    
    usersContainer.innerHTML = tableHTML;
    
    // Add event listeners to buttons
    const banButtons = document.querySelectorAll('.ban-btn, .approve-btn');
    const viewUserButtons = document.querySelectorAll('.view-user-btn');
    
    banButtons.forEach(button => {
      button.addEventListener('click', handleToggleBan);
    });
    
    viewUserButtons.forEach(button => {
      button.addEventListener('click', handleViewUser);
    });
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error loading users:', error);
    showAlert('ব্যবহারকারী লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle approve post
async function handleApprovePost(e) {
  const postId = e.currentTarget.getAttribute('data-post-id');
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Update post status
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      status: 'approved'
    });
    
    // Reload pending posts
    loadPendingPosts();
    loadApprovedPosts();
    
    // Show success message
    showAlert('পোস্ট সফলভাবে অনুমোদিত হয়েছে।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error approving post:', error);
    showAlert('পোস্ট অনুমোদন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle reject post
async function handleRejectPost(e) {
  const postId = e.currentTarget.getAttribute('data-post-id');
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Update post status
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      status: 'rejected'
    });
    
    // Reload pending posts
    loadPendingPosts();
    
    // Show success message
    showAlert('পোস্ট প্রত্যাখ্যান করা হয়েছে।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error rejecting post:', error);
    showAlert('পোস্ট প্রত্যাখ্যান করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle delete post
async function handleDeletePost(e) {
  const postId = e.currentTarget.getAttribute('data-post-id');
  
  // Confirm delete
  if (!confirm('আপনি কি নিশ্চিত যে আপনি এই পোস্টটি মুছতে চান?')) {
    return;
  }
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Get post data
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      showAlert('পোস্ট পাওয়া যায়নি।', 'error');
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    const post = postSnap.data();
    
    // Delete post
    await deleteDoc(postRef);
    
    // Update user's post count
    const userRef = doc(db, "users", post.authorId);
    const userSnap = await getDoc(userRef);
    
    if (userSnap.exists()) {
      const userData = userSnap.data();
      await updateDoc(userRef, {
        postCount: Math.max(0, (userData.postCount || 0) - 1)
      });
    }
    
    // Delete comments
    const commentsQuery = query(
      collection(db, "comments"),
      where("postId", "==", postId)
    );
    
    const commentsSnap = await getDocs(commentsQuery);
    
    commentsSnap.forEach(async (commentDoc) => {
      await deleteDoc(doc(db, "comments", commentDoc.id));
    });
    
    // Reload approved posts
    loadApprovedPosts();
    
    // Show success message
    showAlert('পোস্ট সফলভাবে মুছে ফেলা হয়েছে।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error deleting post:', error);
    showAlert('পোস্ট মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle view post
function handleViewPost(e) {
  const postId = e.currentTarget.getAttribute('data-post-id');
  window.location.href = `post.html?id=${postId}`;
}

// Handle toggle ban
async function handleToggleBan(e) {
  const userId = e.currentTarget.getAttribute('data-user-id');
  const isBanned = e.currentTarget.getAttribute('data-banned') === 'true';
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Update user's banned status
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      banned: !isBanned
    });
    
    // Reload users
    loadUsers();
    
    // Show success message
    showAlert(`ব্যবহারকারী সফলভাবে ${isBanned ? 'নিষেধাজ্ঞা তোলা' : 'নিষিদ্ধ করা'} হয়েছে।`, 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error toggling ban:', error);
    showAlert('ব্যবহারকারীর অবস্থা পরিবর্তন করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle view user
function handleViewUser(e) {
  const userId = e.currentTarget.getAttribute('data-user-id');
  window.location.href = `profile.html?id=${userId}`;
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

// Initialize admin page when DOM is loaded
document.addEventListener('DOMContentLoaded', initAdmin);

export { loadPendingPosts, loadApprovedPosts, loadUsers };