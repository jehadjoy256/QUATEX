// js/post.js
import { auth, db } from './firebase.js';
import { onAuthStateChanged } from "https://www.gstatic.com/firebasejs/10.11.0/firebase-auth.js";
import { 
  collection, 
  addDoc, 
  doc, 
  getDoc, 
  getDocs, 
  query, 
  where, 
  orderBy, 
  limit,
  updateDoc,
  deleteDoc,
  arrayUnion,
  arrayRemove,
  increment,
  serverTimestamp 
} from "https://www.gstatic.com/firebasejs/10.11.0/firebase-firestore.js";

// DOM Elements
const postForm = document.getElementById('postForm');
const postContainer = document.getElementById('postContainer');
const postsGrid = document.getElementById('postsGrid');
const categoryFilter = document.getElementById('categoryFilter');
const loadMoreBtn = document.getElementById('loadMoreBtn');
const commentForm = document.getElementById('commentForm');
const commentsContainer = document.getElementById('commentsContainer');
const loadingSpinner = document.getElementById('loadingSpinner');

// Current user
let currentUser = null;
let lastVisible = null;
const postsPerPage = 6;

// Initialize post functionality
function initPost() {
  onAuthStateChanged(auth, (user) => {
    currentUser = user;
    
    // Update UI based on auth state
    updateUIForAuthState();
  });
  
  // Add event listeners
  if (postForm) {
    postForm.addEventListener('submit', handlePostSubmit);
  }
  
  if (categoryFilter) {
    categoryFilter.addEventListener('change', handleCategoryFilter);
  }
  
  if (loadMoreBtn) {
    loadMoreBtn.addEventListener('click', loadMorePosts);
  }
  
  if (commentForm) {
    commentForm.addEventListener('submit', handleCommentSubmit);
  }
  
  // Check if we're on a single post page
  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  
  if (postId && postContainer) {
    // Load single post
    loadSinglePost(postId);
  } else if (postsGrid) {
    // Load posts grid
    loadPosts();
  }
}

// Update UI based on authentication state
function updateUIForAuthState() {
  // Update create post form if it exists
  if (postForm) {
    if (!currentUser) {
      postForm.innerHTML = `
        <div class="alert alert-error">
          পোস্ট করতে আগে <a href="login.html">লগইন</a> করুন।
        </div>
      `;
    }
  }
  
  // Update comment form if it exists
  if (commentForm) {
    if (!currentUser) {
      commentForm.innerHTML = `
        <div class="alert alert-error">
          মন্তব্য করতে আগে <a href="login.html">লগইন</a> করুন।
        </div>
      `;
    }
  }
}

// Handle post submission
async function handlePostSubmit(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showAlert('পোস্ট করতে আগে লগইন করুন।', 'error');
    return;
  }
  
  // Get form data
  const title = postForm.title.value;
  const category = postForm.category.value;
  const content = postForm.content.value;
  
  if (!title || !category || !content) {
    showAlert('সব ফিল্ড পূরণ করুন।', 'error');
    return;
  }
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Add post to Firestore
    const postRef = await addDoc(collection(db, "posts"), {
      title,
      category,
      content,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorPhotoURL: currentUser.photoURL,
      createdAt: serverTimestamp(),
      status: 'pending', // Pending approval
      likes: [],
      commentCount: 0
    });
    
    // Update user's post count
    const userRef = doc(db, "users", currentUser.uid);
    await updateDoc(userRef, {
      postCount: increment(1)
    });
    
    // Reset form
    postForm.reset();
    
    // Show success message
    showAlert('পোস্ট সফলভাবে জমা হয়েছে। অনুমোদনের জন্য অপেক্ষা করুন।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error adding post:', error);
    showAlert('পোস্ট জমা দিতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Load posts for the homepage
async function loadPosts(categoryFilter = '') {
  try {
    if (!postsGrid) return;
    
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Clear posts grid if this is a new query
    if (!lastVisible) {
      postsGrid.innerHTML = '';
    }
    
    // Create query
    let postsQuery;
    
    if (categoryFilter) {
      postsQuery = query(
        collection(db, "posts"),
        where("status", "==", "approved"),
        where("category", "==", categoryFilter),
        orderBy("createdAt", "desc"),
        limit(postsPerPage)
      );
    } else {
      postsQuery = query(
        collection(db, "posts"),
        where("status", "==", "approved"),
        orderBy("createdAt", "desc"),
        limit(postsPerPage)
      );
    }
    
    // If we have a last visible document, start after it
    if (lastVisible) {
      postsQuery = query(
        postsQuery,
        startAfter(lastVisible)
      );
    }
    
    const postsSnap = await getDocs(postsQuery);
    
    if (postsSnap.empty && !lastVisible) {
      postsGrid.innerHTML = '<p class="text-center">কোন পোস্ট নেই।</p>';
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    // Update last visible document
    lastVisible = postsSnap.docs[postsSnap.docs.length - 1];
    
    // Hide load more button if we have less than postsPerPage posts
    if (postsSnap.docs.length < postsPerPage) {
      if (loadMoreBtn) loadMoreBtn.style.display = 'none';
    } else {
      if (loadMoreBtn) loadMoreBtn.style.display = 'block';
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
            <button class="action-btn like-btn" data-post-id="${doc.id}">
              <i class="far fa-heart"></i> ${post.likes ? post.likes.length : 0}
            </button>
            <button class="action-btn">
              <i class="far fa-comment"></i> ${post.commentCount || 0}
            </button>
          </div>
        </div>
      `;
      
      postsGrid.innerHTML += postHTML;
    });
    
    // Add event listeners to like buttons
    const likeButtons = document.querySelectorAll('.like-btn');
    likeButtons.forEach(button => {
      button.addEventListener('click', handleLikeClick);
    });
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error loading posts:', error);
    showAlert('পোস্ট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Load more posts
function loadMorePosts() {
  const selectedCategory = categoryFilter ? categoryFilter.value : '';
  loadPosts(selectedCategory);
}

// Handle category filter change
function handleCategoryFilter() {
  // Reset last visible
  lastVisible = null;
  
  // Load posts with selected category
  loadPosts(categoryFilter.value);
}

// Load single post
async function loadSinglePost(postId) {
  try {
    if (!postContainer) return;
    
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Get post from Firestore
    const postRef = doc(db, "posts", postId);
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      postContainer.innerHTML = '<div class="alert alert-error">পোস্ট পাওয়া যায়নি।</div>';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    const post = postSnap.data();
    
    // Check if post is approved
    if (post.status !== 'approved' && (!currentUser || (currentUser.uid !== post.authorId && !isAdmin(currentUser.email)))) {
      postContainer.innerHTML = '<div class="alert alert-error">এই পোস্টটি এখনও অনুমোদিত হয়নি।</div>';
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    const postDate = post.createdAt ? new Date(post.createdAt.seconds * 1000) : new Date();
    
    // Create post HTML
    const postHTML = `
      <div class="card">
        <div class="post-header">
          <img src="${post.authorPhotoURL || 'https://via.placeholder.com/40'}" alt="${post.authorName}" class="post-author-pic">
          <div class="post-meta">
            <div class="post-author">${post.authorName}</div>
            <div class="post-date">${postDate.toLocaleDateString('bn-BD')}</div>
          </div>
        </div>
        <div class="post-content">
          <h1 class="post-title">${post.title}</h1>
          <div class="post-category">${getCategoryName(post.category)}</div>
          <div class="post-body">${formatContent(post.content)}</div>
        </div>
        <div class="post-actions">
          <button class="action-btn like-btn" data-post-id="${postId}">
            <i class="${post.likes && post.likes.includes(currentUser?.uid) ? 'fas' : 'far'} fa-heart"></i> ${post.likes ? post.likes.length : 0}
          </button>
          <button class="action-btn">
            <i class="far fa-comment"></i> ${post.commentCount || 0}
          </button>
        </div>
      </div>
    `;
    
    postContainer.innerHTML = postHTML;
    
    // Add event listener to like button
    const likeBtn = document.querySelector('.like-btn');
    if (likeBtn) {
      likeBtn.addEventListener('click', handleLikeClick);
    }
    
    // Load comments
    loadComments(postId);
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error loading post:', error);
    showAlert('পোস্ট লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Format post content
function formatContent(content) {
  // Convert newlines to <br>
  return content.replace(/\n/g, '<br>');
}

// Load comments for a post
async function loadComments(postId) {
  try {
    if (!commentsContainer) return;
    
    // Clear comments container
    commentsContainer.innerHTML = '';
    
    // Get comments from Firestore
    const commentsQuery = query(
      collection(db, "comments"),
      where("postId", "==", postId),
      orderBy("createdAt", "desc")
    );
    
    const commentsSnap = await getDocs(commentsQuery);
    
    if (commentsSnap.empty) {
      commentsContainer.innerHTML = '<p class="text-center">কোন মন্তব্য নেই।</p>';
      return;
    }
    
    // Create comments HTML
    commentsSnap.forEach(doc => {
      const comment = doc.data();
      const commentDate = comment.createdAt ? new Date(comment.createdAt.seconds * 1000) : new Date();
      
      const commentHTML = `
        <div class="comment" id="comment-${doc.id}">
          <img src="${comment.authorPhotoURL || 'https://via.placeholder.com/40'}" alt="${comment.authorName}" class="comment-avatar">
          <div class="comment-content">
            <div class="comment-header">
              <div class="comment-author">${comment.authorName}</div>
              <div class="comment-date">${commentDate.toLocaleDateString('bn-BD')}</div>
            </div>
            <div class="comment-text">${comment.content}</div>
            <div class="comment-actions">
              ${isAdmin(currentUser?.email) || currentUser?.uid === comment.authorId ? 
                `<button class="action-btn delete-comment-btn" data-comment-id="${doc.id}">
                  <i class="far fa-trash-alt"></i> মুছুন
                </button>` : ''}
            </div>
          </div>
        </div>
      `;
      
      commentsContainer.innerHTML += commentHTML;
    });
    
    // Add event listeners to delete buttons
    const deleteButtons = document.querySelectorAll('.delete-comment-btn');
    deleteButtons.forEach(button => {
      button.addEventListener('click', handleDeleteComment);
    });
  } catch (error) {
    console.error('Error loading comments:', error);
    showAlert('মন্তব্য লোড করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
  }
}

// Handle comment submission
async function handleCommentSubmit(e) {
  e.preventDefault();
  
  if (!currentUser) {
    showAlert('মন্তব্য করতে আগে লগইন করুন।', 'error');
    return;
  }
  
  // Get form data
  const content = commentForm.comment.value;
  const postId = new URLSearchParams(window.location.search).get('id');
  
  if (!content) {
    showAlert('মন্তব্য লিখুন।', 'error');
    return;
  }
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Add comment to Firestore
    await addDoc(collection(db, "comments"), {
      postId,
      content,
      authorId: currentUser.uid,
      authorName: currentUser.displayName,
      authorPhotoURL: currentUser.photoURL,
      createdAt: serverTimestamp()
    });
    
    // Update post's comment count
    const postRef = doc(db, "posts", postId);
    await updateDoc(postRef, {
      commentCount: increment(1)
    });
    
    // Reset form
    commentForm.reset();
    
    // Reload comments
    loadComments(postId);
    
    // Show success message
    showAlert('মন্তব্য সফলভাবে যোগ করা হয়েছে।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error adding comment:', error);
    showAlert('মন্তব্য যোগ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle like button click
async function handleLikeClick(e) {
  if (!currentUser) {
    showAlert('লাইক করতে আগে লগইন করুন।', 'error');
    return;
  }
  
  const postId = e.currentTarget.getAttribute('data-post-id');
  const postRef = doc(db, "posts", postId);
  
  try {
    // Get current post data
    const postSnap = await getDoc(postRef);
    
    if (!postSnap.exists()) {
      showAlert('পোস্ট পাওয়া যায়নি।', 'error');
      return;
    }
    
    const post = postSnap.data();
    const likes = post.likes || [];
    const hasLiked = likes.includes(currentUser.uid);
    
    // Toggle like
    if (hasLiked) {
      // Unlike
      await updateDoc(postRef, {
        likes: arrayRemove(currentUser.uid)
      });
      
      // Update UI
      e.currentTarget.innerHTML = `<i class="far fa-heart"></i> ${likes.length - 1}`;
    } else {
      // Like
      await updateDoc(postRef, {
        likes: arrayUnion(currentUser.uid)
      });
      
      // Update UI
      e.currentTarget.innerHTML = `<i class="fas fa-heart"></i> ${likes.length + 1}`;
    }
  } catch (error) {
    console.error('Error toggling like:', error);
    showAlert('লাইক করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
  }
}

// Handle delete comment
async function handleDeleteComment(e) {
  if (!currentUser) {
    showAlert('মন্তব্য মুছতে আগে লগইন করুন।', 'error');
    return;
  }
  
  const commentId = e.currentTarget.getAttribute('data-comment-id');
  
  try {
    // Show loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'block';
    
    // Get comment data
    const commentRef = doc(db, "comments", commentId);
    const commentSnap = await getDoc(commentRef);
    
    if (!commentSnap.exists()) {
      showAlert('মন্তব্য পাওয়া যায়নি।', 'error');
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    const comment = commentSnap.data();
    
    // Check if user is authorized to delete
    if (comment.authorId !== currentUser.uid && !isAdmin(currentUser.email)) {
      showAlert('আপনার এই মন্তব্য মুছার অনুমতি নেই।', 'error');
      
      // Hide loading spinner
      if (loadingSpinner) loadingSpinner.style.display = 'none';
      return;
    }
    
    // Delete comment
    await deleteDoc(commentRef);
    
    // Update post's comment count
    const postRef = doc(db, "posts", comment.postId);
    await updateDoc(postRef, {
      commentCount: increment(-1)
    });
    
    // Remove comment from UI
    document.getElementById(`comment-${commentId}`).remove();
    
    // Show success message
    showAlert('মন্তব্য সফলভাবে মুছে ফেলা হয়েছে।', 'success');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error deleting comment:', error);
    showAlert('মন্তব্য মুছতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    
    // Hide loading spinner
    if (loadingSpinner) loadingSpinner.style.display = 'none';
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

// Check if user is admin
function isAdmin(email) {
  const adminEmails = ['joyjehad28@gmail.com', 'jehadjoy44@gmail.com'];
  return adminEmails.includes(email);
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

// Initialize post functionality when DOM is loaded
document.addEventListener('DOMContentLoaded', initPost);

export { loadPosts, loadSinglePost, handlePostSubmit };