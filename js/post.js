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
        <div class="comment">
          <div class="comment-header">
            <img src="${comment.authorPhotoURL || 'https://via.placeholder.com/30'}" alt="${comment.authorName}" class="comment-author-pic">
            <div class="comment-meta">
              <div class="comment-author">${comment.authorName}</div>
              <div class="comment-date">${commentDate.toLocaleDateString('bn-BD')}</div>
            </div>
          </div>
          <div class="comment-body">${comment.content.replace(/\n/g, '<br>')}</div>
        </div>
      `;

      commentsContainer.innerHTML += commentHTML;
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

  const urlParams = new URLSearchParams(window.location.search);
  const postId = urlParams.get('id');
  if (!postId) {
    showAlert('পোস্ট সনাক্ত করা যায়নি।', 'error');
    return;
  }

  const commentContent = commentForm.comment.value.trim();
  if (!commentContent) {
    showAlert('মন্তব্য লিখুন।', 'error');
    return;
  }

  try {
    if (loadingSpinner) loadingSpinner.style.display = 'block';

    // Add comment to Firestore
    await addDoc(collection(db, "comments"), {
      postId,
      content: commentContent,
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

    // Reset comment form
    commentForm.reset();

    // Reload comments
    loadComments(postId);

    showAlert('মন্তব্য সফলভাবে যোগ হয়েছে।', 'success');

    if (loadingSpinner) loadingSpinner.style.display = 'none';
  } catch (error) {
    console.error('Error adding comment:', error);
    showAlert('মন্তব্য যোগ করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
    if (loadingSpinner) loadingSpinner.style.display = 'none';
  }
}

// Handle like button click
async function handleLikeClick(e) {
  const button = e.currentTarget;
  const postId = button.getAttribute('data-post-id');

  if (!currentUser) {
    showAlert('পোস্ট লাইক করতে আগে লগইন করুন।', 'error');
    return;
  }

  if (!postId) return;

  const postRef = doc(db, "posts", postId);

  try {
    // Get current post data
    const postSnap = await getDoc(postRef);
    if (!postSnap.exists()) return;

    const post = postSnap.data();
    const likes = post.likes || [];

    let updatedLikes;

    if (likes.includes(currentUser.uid)) {
      // User already liked - remove like
      updatedLikes = likes.filter(uid => uid !== currentUser.uid);
    } else {
      // Add user like
      updatedLikes = [...likes, currentUser.uid];
    }

    // Update likes array in Firestore
    await updateDoc(postRef, {
      likes: updatedLikes
    });

    // Update UI
    // Change heart icon style and number
    const heartIcon = button.querySelector('i');
    if (heartIcon) {
      if (updatedLikes.includes(currentUser.uid)) {
        heartIcon.classList.remove('far');
        heartIcon.classList.add('fas');
      } else {
        heartIcon.classList.remove('fas');
        heartIcon.classList.add('far');
      }
    }
    button.innerHTML = `<i class="${updatedLikes.includes(currentUser.uid) ? 'fas' : 'far'} fa-heart"></i> ${updatedLikes.length}`;

  } catch (error) {
    console.error('Error updating likes:', error);
    showAlert('লাইকের সময় সমস্যা হয়েছে। আবার চেষ্টা করুন।', 'error');
  }
}

// Check if current user is admin
function isAdmin(email) {
  const adminEmails = [
    'joyjehad28@gmail.com'
  ];
  return adminEmails.includes(email);
}

// Show alert messages
function showAlert(message, type = 'info') {
  const alertDiv = document.createElement('div');
  alertDiv.className = `alert alert-${type}`;
  alertDiv.textContent = message;

  document.body.prepend(alertDiv);

  setTimeout(() => {
    alertDiv.remove();
  }, 4000);
}

// Get category name for display
function getCategoryName(categoryId) {
  const categories = {
    kobita: 'কবিতা',
    uponnash: 'উপন্যাস',
    chotogolpo: 'ছোটগল্প',
    probondho: 'প্রবন্ধ',
    rommorachona: 'রম্যরচনা',
    bhoutikgolpo: 'ভৌতিক গল্প',
    smritikotha: 'স্মৃতিকথা'
    // add other categories here if needed
  };
  return categories[categoryId] || categoryId;
}

// Initialize the post module on page load
document.addEventListener('DOMContentLoaded', initPost);
