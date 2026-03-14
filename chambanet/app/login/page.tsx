import Link from 'next/link';

export default function Login() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
      {/* --- NAVBAR --- */}
      <header className="w-full bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <div className="text-2xl font-bold text-[#FFACCA] font-mono">
          <Link href="/">ChambaNET</Link>
        </div>
        <nav className="flex gap-6 text-sm font-medium items-center">
          <Link href="/" className="hover:text-[#FFACCA] transition">Inicio</Link>
          <Link href="/#registro" className="hover:text-[#FFACCA] transition">Registrarse</Link>
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
          
          <form className="space-y-6">
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1">
                Correo electrónico
              </label>
              <input 
                type="email" 
                id="email"
                placeholder="Ingresa tu correo" 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFACCA] transition"
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
                placeholder="••••••••" 
                className="w-full p-3 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#FFACCA] transition"
                required
              />
            </div>

            <button 
              type="submit" 
              className="w-full bg-[#FFACCA] text-white font-bold py-3 rounded-md hover:bg-pink-400 transition mt-4 shadow-sm"
            >
              Ingresar
            </button>
          </form>

          <div className="mt-6 text-center text-sm text-gray-500">
            ¿No tienes una cuenta? <Link href="/#registro" className="text-[#FFACCA] font-medium hover:underline">Regístrate aquí</Link>
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