import { redirect } from 'next/navigation';

// Always redirect to login page
export default function Home() {
  redirect('/login');
}