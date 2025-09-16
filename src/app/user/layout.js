'use client';
import MainLayout from '../../components/MainLayout';

export default function UserLayout({ children }) {
  return <MainLayout role="user">{children}</MainLayout>;
}