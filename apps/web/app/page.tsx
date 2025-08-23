import { redirect } from 'next/navigation';
import { signOut } from 'next-auth/react';

export default async function Home() {
  // Force logout on app start
  await signOut({ redirect: false });
  
  // Redirect to login page
  redirect('/login');
}