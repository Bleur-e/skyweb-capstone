'use client';

export function handleLogout(router) {
  if (typeof window !== 'undefined') {
    // Clear ALL user-related data
    sessionStorage.removeItem('currentUser');
    sessionStorage.removeItem('token');
    
    // Clear any other potential session data
    const keysToRemove = [];
    for (let i = 0; i < sessionStorage.length; i++) {
      const key = sessionStorage.key(i);
      if (key && (key.includes('user') || key.includes('auth') || key.includes('session'))) {
        keysToRemove.push(key);
      }
    }
    keysToRemove.forEach(key => sessionStorage.removeItem(key));
    
    alert('You have been logged out.');
    
    // Force redirect to login page
    if (router) {
      router.push('/');
      // Optional: force page refresh to clear all states
      setTimeout(() => {
        window.location.reload();
      }, 100);
    } else {
      window.location.href = '/'; // Fallback
    }
  }
}