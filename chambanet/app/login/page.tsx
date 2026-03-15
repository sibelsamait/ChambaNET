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
    <div className="flex min-h-screen flex-col bg-gradient-to-b from-[#9ec3ef] to-[#f1f3f7] text-gray-900 font-sans">
      <header className="w-full bg-[#6aa9f6] px-4 py-3 shadow-[0_10px_18px_rgba(39,77,129,0.32)] sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <BrandLogo href="/" size="md" />
          <nav className="flex items-center gap-3 text-xs font-semibold text-white sm:gap-5 sm:text-sm">
          <Link href="/" className="liftable rounded-xl px-3 py-1 hover:bg-white/20 transition">Inicio</Link>
          <Link href="/#registro" className="liftable hidden rounded-xl px-3 py-1 hover:bg-white/20 transition sm:inline">Registrarse</Link>
          <span className="rounded-xl bg-white/25 px-4 py-2 text-white">
            Iniciar sesión
          </span>
        </nav>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-4 py-8">
        <div className="w-full max-w-lg rounded-[18px] border border-blue-200 bg-white/70 p-5 shadow-[0_14px_26px_rgba(38,83,140,0.24)] backdrop-blur-sm sm:p-6">
          <h1 className="mb-5 text-center text-3xl font-extrabold text-white drop-shadow-[0_3px_8px_rgba(34,73,123,.3)] sm:text-4xl">
            Iniciar sesión
          </h1>
          
          <form className="mx-auto max-w-sm space-y-4" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-1.5 block text-center text-base font-semibold text-gray-900 sm:text-lg">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@correo.cl"
                className="liftable w-full rounded-full border border-transparent bg-[#77b2f0] px-5 py-2.5 text-center text-base font-semibold text-white placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-300"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-center text-base font-semibold text-gray-900 sm:text-lg">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="liftable w-full rounded-full border border-transparent bg-[#77b2f0] px-5 py-2.5 text-center text-base font-semibold text-white placeholder:text-gray-300 focus:outline-none focus:ring-4 focus:ring-blue-300"
                required
              />
            </div>

            {errorMsg ? (
              <p className="text-sm text-red-600">{errorMsg}</p>
            ) : null}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="liftable mx-auto mt-2 block rounded-[18px] bg-[#559ff6] px-10 py-2.5 text-lg font-bold text-white shadow-[0_8px_0_rgba(90,86,121,0.18)] transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-5 text-center text-xs text-gray-700 sm:text-sm">
            ¿No tienes una cuenta?{' '}
            <Link href="/#registro" className="liftable inline-block rounded-lg px-2 font-bold text-blue-700 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-[#5d98e6] py-3 text-center text-xs text-gray-900 shadow-[0_-10px_18px_rgba(39,77,129,0.3)]">
        <p>
          Hosting por <span className="font-extrabold">Sibel Sama</span>
        </p>
      </footer>
    </div>
  );
}