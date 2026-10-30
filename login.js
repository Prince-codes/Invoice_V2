document.addEventListener('DOMContentLoaded', () => {
  const form = document.getElementById('loginForm');
  const usernameInput = document.getElementById('username');
  const passwordInput = document.getElementById('password');
  const loginButton = document.getElementById('loginBtn');
  const togglePassword = document.getElementById('togglePassword');
  const errorMessage = document.getElementById('errorMsg');

  fetch('/api/auth/session', { cache: 'no-store' })
    .then((response) => {
      if (response.ok) window.location.replace('Selection/selection.html');
    })
    .catch(() => {
      errorMessage.textContent = 'Unable to verify your session. Check your connection and try again.';
    });

  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    errorMessage.textContent = '';
    loginButton.disabled = true;

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          username: usernameInput.value.trim(),
          password: passwordInput.value
        })
      });
      const result = await response.json();

      if (!response.ok) {
        errorMessage.textContent = result.error || 'Unable to sign in.';
        return;
      }

      window.location.replace('Selection/selection.html');
    } catch (error) {
      console.error('Login request failed:', error);
      errorMessage.textContent = 'Unable to sign in. Check your connection and try again.';
    } finally {
      loginButton.disabled = false;
    }
  });

  togglePassword.addEventListener('click', () => {
    const showPassword = passwordInput.type === 'password';
    passwordInput.type = showPassword ? 'text' : 'password';
    togglePassword.setAttribute('aria-label', showPassword ? 'Hide password' : 'Show password');

    const icon = togglePassword.querySelector('i');
    icon.classList.toggle('fa-eye', !showPassword);
    icon.classList.toggle('fa-eye-slash', showPassword);
  });
});
