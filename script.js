document.addEventListener("DOMContentLoaded", () => {
  let users = JSON.parse(localStorage.getItem("users")) || [];
  let currentUser = JSON.parse(localStorage.getItem("currentUser"));
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
      alert("Аккаунт с таким ID уже существует!");
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
  }
  if (currentUser) {
    showProfile(currentUser);
  }
  window.logout = logout;
  window.openRegisterModal = openRegisterModal;
  window.closeRegisterModal = closeRegisterModal;
  window.openLoginModal = openLoginModal;
  window.closeLoginModal = closeLoginModal;
});
