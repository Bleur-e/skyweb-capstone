'use client';

import Swal from 'sweetalert2';

export async function handleLogout(router) {
  if (typeof window === 'undefined') return;

  // Clear session data
  sessionStorage.clear();

  // Show a nice popup using SweetAlert2
  await Swal.fire({
    title: 'Logged Out',
    text: 'You have been successfully logged out',
    icon: 'success',
    confirmButtonText: 'OK',
    confirmButtonColor: '#8F87F1', // Your stream overlay color ✨
    background: '#f9f9ff',
  });

  // Redirect to login
  if (router) {
    router.push('/');
    setTimeout(() => window.location.reload(), 150);
  } else {
    window.location.href = '/';
  }
}
