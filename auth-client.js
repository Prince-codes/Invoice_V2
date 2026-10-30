window.InvoiceAuth = {
  async initializeUserDisplay(elementId) {
    const response = await fetch('/api/auth/session', { cache: 'no-store' });
    if (response.status === 401) {
      window.location.replace('/index.html');
      return null;
    }
    if (!response.ok) {
      throw new Error('Unable to verify the login session.');
    }

    const result = await response.json();
    const username = result.user.username;
    const display = document.getElementById(elementId);
    if (display) display.textContent = `Signed in as: ${username}`;
    return username;
  },

  bindLogout(buttonId) {
    const button = document.getElementById(buttonId);
    if (!button) return;

    button.addEventListener('click', async () => {
      button.disabled = true;
      try {
        const response = await fetch('/api/auth/logout', { method: 'POST' });
        if (!response.ok) throw new Error('Unable to sign out.');
        window.location.replace('/index.html');
      } catch (error) {
        console.error('Logout request failed:', error);
        alert('Unable to sign out. Check your connection and try again.');
        button.disabled = false;
      }
    });
  }
};
