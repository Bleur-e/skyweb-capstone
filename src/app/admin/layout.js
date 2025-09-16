'use client';
import MainLayout from '../../components/MainLayout';

export default function AdminLayout({ children }) {
  return <MainLayout role="admin">{children}</MainLayout>;
}