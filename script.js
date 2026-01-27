document.addEventListener("DOMContentLoaded", () => {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
  let posts = [];

  // --- IndexedDB helpers (fallback when localStorage is full) ---
  function openIDB() {
    return new Promise((resolve, reject) => {
      const req = indexedDB.open('turin-students-db', 1);
      req.onupgradeneeded = function(e) {
        const db = e.target.result;
        if (!db.objectStoreNames.contains('posts')) {
          db.createObjectStore('posts', { keyPath: 'id' });
        }
      };
      req.onsuccess = function(e) { resolve(e.target.result); };
      req.onerror = function(e) { reject(e.target.error); };
    });
  }

  function idbGetAllPosts() {
    return new Promise(async (resolve) => {
      try {
        const db = await openIDB();
        const tx = db.transaction('posts', 'readonly');
        const store = tx.objectStore('posts');
        const req = store.getAll();
        req.onsuccess = () => resolve(req.result.sort((a,b)=>b.id - a.id));
        req.onerror = () => resolve([]);
      } catch (e) { resolve([]); }
    });
  }

  function idbAddPost(post) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await openIDB();
        const tx = db.transaction('posts', 'readwrite');
        const store = tx.objectStore('posts');
        store.put(post);
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB write error'));
      } catch (e) { reject(e); }
    });
  }

  function idbClearAndSave(postsArray) {
    return new Promise(async (resolve, reject) => {
      try {
        const db = await openIDB();
        const tx = db.transaction('posts', 'readwrite');
        const store = tx.objectStore('posts');
        const clearReq = store.clear();
        clearReq.onsuccess = function() {
          postsArray.forEach(p => store.put(p));
        };
        tx.oncomplete = () => resolve();
        tx.onerror = () => reject(tx.error || new Error('IDB clear/save error'));
      } catch (e) { reject(e); }
    });
  }

  // Try to load posts from localStorage first, otherwise from IDB
  (async function loadPosts() {
    try {
      const ls = localStorage.getItem('posts');
      if (ls) posts = JSON.parse(ls) || [];
    } catch (e) {
      posts = [];
    }
    if (!posts || posts.length === 0) {
      const idbPosts = await idbGetAllPosts();
      if (idbPosts && idbPosts.length) {
        posts = idbPosts;
        try { localStorage.setItem('posts', JSON.stringify(posts)); } catch (e) { /* ignore */ }
      }
    }
    try { displayPosts(); } catch (e) { /* ignore */ }
  })();

  // simple non-blocking toast
  function showToast(message, timeout = 2500) {
    let el = document.getElementById('toastMessage');
    if (!el) {
      el = document.createElement('div');
      el.id = 'toastMessage';
      el.style.position = 'fixed';
      el.style.bottom = '24px';
      el.style.left = '50%';
      el.style.transform = 'translateX(-50%)';
      el.style.background = 'rgba(15,23,36,0.95)';
      el.style.color = '#fff';
      el.style.padding = '10px 16px';
      el.style.borderRadius = '8px';
      el.style.boxShadow = '0 6px 20px rgba(2,6,23,0.2)';
      el.style.zIndex = 20000;
      el.style.fontSize = '14px';
      document.body.appendChild(el);
    }
    el.textContent = message;
    el.style.opacity = '1';
    clearTimeout(el._timeout);
    el._timeout = setTimeout(() => { el.style.opacity = '0'; }, timeout);
  }

  function showSection(sectionId) {
    document.querySelectorAll(".content-section").forEach(section => {
      section.classList.remove("active");
    });
    document.querySelectorAll(".sbtn").forEach(btn => {
      btn.classList.remove("active");
    });
    document.getElementById(sectionId).classList.add("active");
    event.target.classList.add("active");
  }
  
  function openRegisterModal() {
    document.getElementById("registerModal").style.display = "flex";
  }
  function closeRegisterModal() {
    document.getElementById("registerModal").style.display = "none";
  }
  function openLoginModal() {
    document.getElementById("loginModal").style.display = "flex";
  }
  function closeLoginModal() {
    document.getElementById("loginModal").style.display = "none";
  }
  function openCreatePostModal() {
    if (!currentUser) {
      alert("Пожалуйста, войдите в аккаунт для создания поста");
      openLoginModal();
      return;
    }
    document.getElementById("createPostModal").style.display = "flex";
  }
  function closeCreatePostModal() {
    document.getElementById("createPostModal").style.display = "none";
    document.getElementById("createPostForm").reset();
  }
  const avatarInput = document.getElementById("avatar");
  const avatarPreview = document.querySelector(".avatar-preview");
  if (avatarInput) {
    avatarInput.addEventListener("change", () => {
      if (avatarInput.files && avatarInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          avatarPreview.style.backgroundImage = `url(${e.target.result})`;
          avatarPreview.style.backgroundSize = "cover";
          avatarPreview.style.backgroundPosition = "center";
        };
        reader.readAsDataURL(avatarInput.files[0]);
      }
    });
  }
  const registerForm = document.getElementById("registerForm");
  registerForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const id = registerForm.querySelector('input[name="id"]').value.trim();
    const fullname = registerForm.querySelector('input[name="fullname"]').value.trim();
    const group = registerForm.querySelector('input[name="group"]').value.trim();
    const faculty = registerForm.querySelector('input[name="faculty"]').value.trim();
    const password = registerForm.querySelector('input[name="password"]').value;
    const exists = users.some(u => u.id === id);
    if (exists) {
      alert("Аккаунт c таким ID уже существует!");
      return;
    }
    let avatarBase64 = "";
    if (avatarInput && avatarInput.files[0]) {
      const reader = new FileReader();
      reader.onload = function(e) {
        avatarBase64 = e.target.result;
        saveUser(id, fullname, group, faculty, password, avatarBase64);
      };
      reader.readAsDataURL(avatarInput.files[0]);
    } else {
      saveUser(id, fullname, group, faculty, password, avatarBase64);
    }
  });
  function saveUser(id, fullname, group, faculty, password, avatar) {
    const user = { id, fullname, group, faculty, password, avatar };
    users.push(user);
    localStorage.setItem("users", JSON.stringify(users));
    localStorage.setItem("currentUser", JSON.stringify(user));
    currentUser = user;
    closeRegisterModal();
    showProfile(user);
  }
  const loginForm = document.getElementById("loginForm");
  loginForm.addEventListener("submit", function(e) {
    e.preventDefault();
    const id = loginForm.querySelector('input[name="id"]').value.trim();
    const password = loginForm.querySelector('input[name="password"]').value;
    const users = JSON.parse(localStorage.getItem("users")) || [];
    const user = users.find(u => u.id === id && u.password === password);
    if (user) {
      localStorage.setItem("currentUser", JSON.stringify(user));
      currentUser = user;
      closeLoginModal();
      showProfile(user);
    } else {
      alert("Неверный ID или пароль");
    }
  });
  function showProfile(user) {
    const loginBtn = document.querySelector(".btn.login");
    const registerBtn = document.querySelector(".btn.register");
    if (loginBtn) loginBtn.style.display = "none";
    if (registerBtn) registerBtn.style.display = "none";
    const profileMenu = document.getElementById("profileMenu");
    profileMenu.classList.remove("hidden");
    const circle = profileMenu.querySelector(".profile-circle");
    if (user.avatar) {
      circle.style.backgroundImage = `url(${user.avatar})`;
      circle.style.backgroundSize = "cover";
      circle.style.backgroundPosition = "center";
      circle.textContent = "";
    } else {
      circle.textContent = user.fullname?.[0] || "?";
    }
    circle.onclick = () => {
      document.querySelector(".dropdown").classList.toggle("hidden");
    };
  }
  function logout() {
    const profileMenu = document.getElementById("profileMenu");
    profileMenu.classList.add("hidden");
    const loginBtn = document.querySelector(".btn.login");
    const registerBtn = document.querySelector(".btn.register");
    if (loginBtn) loginBtn.style.display = "inline-block";
    if (registerBtn) registerBtn.style.display = "inline-block";
    localStorage.removeItem("currentUser");
    currentUser = null;
  }
  if (currentUser) {
    showProfile(currentUser);
  }
  
  function displayPosts() {
    const postsFeed = document.getElementById("postsFeed");
    postsFeed.innerHTML = "";
    posts.forEach((post, index) => {
      const postElement = document.createElement("div");
      postElement.className = "post";
      const timeAgo = getTimeAgo(post.timestamp);
      postElement.innerHTML = `
        <div class="post-header">
          <div class="post-avatar" ${post.userAvatar ? `style="background-image: url(${post.userAvatar})"` : ""}>
            ${!post.userAvatar ? post.userName?.[0] || "?" : ""}
          </div>
          <div class="post-user-info">
            <p class="post-user-name">${post.userName}</p>
            <p class="post-time">${timeAgo}</p>
          </div>
        </div>
        <div class="post-content">${post.content}</div>
        ${post.image ? `<img src="${post.image}" class="post-image" />` : ""}
        <div class="post-actions">
          <button class="post-action">👍 Like</button>
          <button class="post-action">💬 Comment</button>
          <button class="post-action">↗️ Share</button>
        </div>
      `;
      postsFeed.appendChild(postElement);
    });
  }
  
  function getTimeAgo(timestamp) {
    const now = new Date();
    const postTime = new Date(timestamp);
    const seconds = Math.floor((now - postTime) / 1000);
    
    if (seconds < 60) return "только что";
    const minutes = Math.floor(seconds / 60);
    if (minutes < 60) return `${minutes} мин назад`;
    const hours = Math.floor(minutes / 60);
    if (hours < 24) return `${hours} ч назад`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days} дн назад`;
    return postTime.toLocaleDateString();
  }
  
  const createPostForm = document.getElementById("createPostForm");
  if (createPostForm) {
    createPostForm.addEventListener("submit", function(e) {
      e.preventDefault();
      
      if (!currentUser) {
        alert("Пожалуйста, войдите в аккаунт");
        return;
      }
      
      const content = createPostForm.querySelector('textarea[name="content"]').value.trim();
      const imageInput = createPostForm.querySelector('input[name="image"]');
      
      if (!content) {
        alert("Напишите что-то в посте");
        return;
      }
      
      let imageBase64 = "";
      if (imageInput && imageInput.files[0]) {
        const reader = new FileReader();
        reader.onload = function(e) {
          imageBase64 = e.target.result;
          // Сжимаем изображение если оно слишком большое
          if (imageBase64.length > 500000) {
            compressImage(imageBase64, (compressedImage) => {
              savePost(content, compressedImage);
            });
          } else {
            savePost(content, imageBase64);
          }
        };
        reader.readAsDataURL(imageInput.files[0]);
      } else {
        savePost(content, imageBase64);
      }
    });
  }
  
  function compressImage(src, callback) {
    const img = new Image();
    img.src = src;
    img.onload = function() {
      const canvas = document.createElement("canvas");
      const maxWidth = 800;
      const maxHeight = 600;
      let width = img.width;
      let height = img.height;
      
      if (width > height) {
        if (width > maxWidth) {
          height *= maxWidth / width;
          width = maxWidth;
        }
      } else {
        if (height > maxHeight) {
          width *= maxHeight / height;
          height = maxHeight;
        }
      }
      
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext("2d");
      ctx.drawImage(img, 0, 0, width, height);
      callback(canvas.toDataURL("image/jpeg", 0.7));
    };
  }
  
  function savePost(content, image) {
    const post = {
      id: Date.now(),
      userName: currentUser.fullname,
      userAvatar: currentUser.avatar || "",
      content: content,
      image: image,
      timestamp: new Date().toISOString(),
      likes: 0,
      comments: []
    };
    // Попытка сохранить в localStorage; при неудаче — fallback в IndexedDB
    try {
      // Получаем массив из localStorage (или новый)
      let lsPosts = [];
      try {
        const raw = localStorage.getItem('posts');
        lsPosts = raw ? JSON.parse(raw) : [];
      } catch (e) {
        lsPosts = [];
      }
      // Добавляем новый пост и сохраняем
      lsPosts.unshift(post);
      localStorage.setItem('posts', JSON.stringify(lsPosts));
      posts = lsPosts;
      // Обновим IDB в фоне (не влияет на логику)
      idbAddPost(post).catch(() => {});
      displayPosts();
      closeCreatePostModal();
      showToast("Пост успешно опубликован!");
    } catch (error) {
      // Если localStorage не доступен или переполнен — сохраняем в IndexedDB
      idbAddPost(post).then(() => {
        // Обновим оперативный массив и интерфейс (только один раз)
        posts.unshift(post);
        displayPosts();
        closeCreatePostModal();
        showToast('Пост сохранён (IndexedDB)');
      }).catch(() => {
        // Попытка уменьшить размер и сохранить снова в localStorage
        try {
          let lsPosts = [];
          try { lsPosts = JSON.parse(localStorage.getItem('posts')) || []; } catch (e) { lsPosts = posts || []; }
          if (lsPosts.length > 10) lsPosts = lsPosts.slice(0, 10);
          post.image = "";
          lsPosts.unshift(post);
          localStorage.setItem('posts', JSON.stringify(lsPosts));
          posts = lsPosts;
          displayPosts();
          closeCreatePostModal();
          showToast('Пост опубликован (без изображения)');
          return;
        } catch (e) {
          showToast('Не удалось сохранить пост. Проверьте объем памяти браузера.');
        }
      });
    }
  }
  
  window.logout = logout;
  window.showSection = showSection;
  window.openRegisterModal = openRegisterModal;
  window.closeRegisterModal = closeRegisterModal;
  window.openLoginModal = openLoginModal;
  window.closeLoginModal = closeLoginModal;
  window.openCreatePostModal = openCreatePostModal;
  window.closeCreatePostModal = closeCreatePostModal;
});