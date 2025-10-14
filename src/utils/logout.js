'use client';

export function handleLogout(router) {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('currentUser'); // ✅ Remove stored user session
    localStorage.removeItem('token');       // (Optional, if you store tokens)
    alert('You have been logged out.');
    router.push('/'); // Redirect to your login page
  }
}