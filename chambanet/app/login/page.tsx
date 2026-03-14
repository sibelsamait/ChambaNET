"use client";

import { FormEvent, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import BrandLogo from '../components/BrandLogo';

export default function Login() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setErrorMsg(null);
    setIsSubmitting(true);

    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data?.error || 'No se pudo iniciar sesión.');
      }

      router.push('/dashboard');
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : 'Error desconocido al iniciar sesión.';
      setErrorMsg(message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
      {/* --- NAVBAR --- */}
      <header className="w-full bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <BrandLogo href="/" size="md" />
        <nav className="flex gap-6 text-sm font-medium items-center">
          <Link href="/" className="hover:text-blue-600 transition">Inicio</Link>
          <Link href="/#registro" className="hover:text-blue-600 transition">Registrarse</Link>
          <span className="px-4 py-2 bg-gray-100 text-gray-400 rounded-md cursor-not-allowed">
            Iniciar sesión
          </span>
        </nav>
      </header>

      {/* --- LOGIN SECTION --- */}
      <main className="flex-grow flex items-center justify-center px-4">
        <div className="bg-white p-8 sm:p-10 rounded-xl shadow-lg border border-gray-100 w-full max-w-md">
          <h1 className="text-3xl font-bold mb-8 font-mono text-center text-gray-900">
            Bienvenido
          </h1>
          
          <form className="space-y-6" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input 
                type="email" 
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="Ingresa tu correo" 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 mb-1">
                Contraseña
              </label>
              <input 
                type="password" 
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="••••••••" 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
                required
              />
            </div>

            {errorMsg ? (
              <p className="text-sm text-red-600">{errorMsg}</p>
            ) : null}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition mt-4 shadow-sm disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes una cuenta? <Link href="/#registro" className="text-blue-700 font-medium hover:underline">Regístrate aquí</Link>
          </div>
        </div>
      </main>

      {/* --- FOOTER --- */}
      <footer className="py-6 text-center text-sm text-gray-400 font-mono">
        <p>Hosting por Sibel Sama</p>
      </footer>
    </div>
  );
}