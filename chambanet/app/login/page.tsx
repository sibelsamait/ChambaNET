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
      <header className="w-full bg-[#6aa9f6] px-4 py-4 shadow-[0_12px_24px_rgba(39,77,129,0.35)] sm:px-8">
        <div className="mx-auto flex w-full max-w-7xl items-center justify-between gap-3">
        <BrandLogo href="/" size="md" />
          <nav className="flex items-center gap-3 text-base font-bold text-white sm:gap-6 sm:text-2xl">
          <Link href="/" className="liftable rounded-xl px-3 py-1 hover:bg-white/20 transition">Inicio</Link>
          <Link href="/#registro" className="liftable hidden rounded-xl px-3 py-1 hover:bg-white/20 transition sm:inline">Registrarse</Link>
          <span className="rounded-xl bg-white/25 px-4 py-2 text-white">
            Iniciar sesión
          </span>
        </nav>
        </div>
      </header>

      <main className="flex flex-grow items-center justify-center px-4 py-10">
        <div className="w-full max-w-2xl rounded-[32px] border border-blue-200 bg-white/70 p-6 shadow-[0_18px_34px_rgba(38,83,140,0.28)] backdrop-blur-sm sm:p-10">
          <h1 className="mb-8 text-center text-6xl font-extrabold text-white drop-shadow-[0_4px_10px_rgba(34,73,123,.3)] sm:text-8xl">
            Iniciar sesión
          </h1>
          
          <form className="mx-auto max-w-xl space-y-7" onSubmit={handleSubmit}>
            <div>
              <label htmlFor="email" className="mb-2 block text-center text-4xl font-semibold text-gray-900 sm:text-5xl">
                Correo electrónico
              </label>
              <input
                type="email"
                id="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                placeholder="correo@correo.cl"
                className="liftable w-full rounded-full border border-transparent bg-[#77b2f0] px-8 py-4 text-center text-4xl font-semibold text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-5xl"
                required
              />
            </div>

            <div>
              <label htmlFor="password" className="mb-2 block text-center text-4xl font-semibold text-gray-900 sm:text-5xl">
                Contraseña
              </label>
              <input
                type="password"
                id="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                placeholder="********"
                className="liftable w-full rounded-full border border-transparent bg-[#77b2f0] px-8 py-4 text-center text-4xl font-semibold text-white placeholder:text-gray-400 focus:outline-none focus:ring-4 focus:ring-blue-300 sm:text-5xl"
                required
              />
            </div>

            {errorMsg ? (
              <p className="text-sm text-red-600">{errorMsg}</p>
            ) : null}

            <button 
              type="submit" 
              disabled={isSubmitting}
              className="liftable mx-auto mt-7 block rounded-[28px] bg-[#559ff6] px-16 py-5 text-5xl font-extrabold text-white shadow-[0_14px_0_rgba(90,86,121,0.22)] transition hover:bg-blue-600 disabled:cursor-not-allowed disabled:bg-gray-300 disabled:text-gray-500"
            >
              {isSubmitting ? 'Ingresando...' : 'Ingresar'}
            </button>
          </form>

          <div className="mt-8 text-center text-lg text-gray-700 sm:text-xl">
            ¿No tienes una cuenta?{' '}
            <Link href="/#registro" className="liftable inline-block rounded-lg px-2 font-bold text-blue-700 hover:underline">
              Regístrate aquí
            </Link>
          </div>
        </div>
      </main>

      <footer className="bg-[#5d98e6] py-5 text-center text-xl text-gray-900 shadow-[0_-12px_26px_rgba(39,77,129,0.3)]">
        <p>
          Hosting por <span className="font-extrabold">Sibel Sama</span>
        </p>
      </footer>
    </div>
  );
}