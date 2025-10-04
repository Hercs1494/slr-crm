import { redirect } from 'next/navigation';
import { setSession, clearSession } from '@/lib/auth';

export default function LoginPage() {
  async function login(formData: FormData) {
    'use server';
    const email = String(formData.get('email') || '');
    const password = String(formData.get('password') || '');
    if (email === process.env.ADMIN_EMAIL && password === process.env.ADMIN_PASSWORD) {
      setSession(email);
      redirect('/quotes');
    }
    return;
  }

  async function logout() {
    'use server';
    clearSession();
    redirect('/admin/login');
  }

  return (
    <div className="max-w-sm mx-auto bg-white rounded-xl p-4 shadow">
      <h1 className="text-xl font-bold mb-4">Admin Login</h1>
      <form action={login} className="space-y-3">
        <input name="email" placeholder="Email" className="border rounded p-2 w-full" />
        <input name="password" placeholder="Password" type="password" className="border rounded p-2 w-full" />
        <button type="submit" className="px-4 py-2 rounded bg-black text-white w-full">Sign in</button>
      </form>

      <form action={logout} className="mt-4">
        <button type="submit" className="text-sm underline">Logout</button>
      </form>
    </div>
  );
}
