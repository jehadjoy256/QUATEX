# সাহিত্যপাতা (Sahityapata)

A modern Bangla literature platform where users can share and read literary content in Bengali.

## Features

- **Google Authentication**: Users can log in with their Google accounts
- **User Roles**: Admin and regular user roles
- **Post Categories**: Poetry (কবিতা), Novel (উপন্যাস), Short Story (ছোটগল্প), Essay (প্রবন্ধ), Humor (রম্যরচনা), Ghost Story (ভৌতিক গল্প), Memoir (স্মৃতিকথা)
- **User Features**: Profile management, post creation, viewing others' posts, comments and likes
- **Admin Features**: Post approval system, comment deletion, user banning
- **UI/UX**: Dark/Light mode toggle, mobile responsive design, minimal yet modern layout

## Project Structure

```
sahityapata/
│
├── public/
│   └── logo.png
│
├── css/
│   └── style.css
│
├── js/
│   ├── auth.js
│   ├── firebase.js
│   ├── profile.js
│   ├── post.js
│   └── admin.js
│
├── index.html
├── login.html
├── profile.html
├── create-post.html
├── admin.html
└── README.md
```

## Setup Instructions

1. Clone the repository
2. Set up Firebase:
   - Create a Firebase project
   - Enable Authentication (Google provider)
   - Set up Firestore Database
   - Set up Storage
   - Update the Firebase configuration in `js/firebase.js`
3. Deploy to a web server or use Firebase Hosting

## Firebase Configuration

The project uses Firebase for:
- Authentication (Google login)
- Firestore Database (storing posts, comments, user data)
- Storage (for future image uploads)

## Admin Access

Admin emails are configured in the `auth.js` file. By default, the following emails have admin access:
- joyjehad28@gmail.com
- jehadjoy44@gmail.com

## License

© 2024 সাহিত্যপাতা। All rights reserved.
```

This completes the entire Sahityapata project with the requested folder structure. The platform includes all the features you specified:

1. Google Authentication using Firebase
2. User roles (Admin, User)
3. Post categories (কবিতা, উপন্যাস, ছোটগল্প, প্রবন্ধ, রম্যরচনা, ভৌতিক গল্প, স্মৃতিকথা)
4. User features (profile, post creation, viewing posts, comments, likes)
5. Admin features (post approval, comment deletion, user banning)
6. Dark/Light mode toggle
7. Mobile responsive design

The code is organized according to your requested structure and includes all the necessary files for a fully functional Bangla literature platform.

