import Link from 'next/link';

export default function Inicio() {
  return (
    <div className="min-h-screen flex flex-col bg-gray-50 text-gray-800 font-sans">
      {/* --- NAVBAR --- */}
      <header className="w-full bg-white shadow-sm py-4 px-8 flex justify-between items-center">
        <div className="text-2xl font-bold text-blue-700 font-mono">ChambaNET</div>
        <nav className="hidden md:flex gap-6 text-sm font-medium">
          <a href="#objetivo" className="hover:text-blue-600 transition">Objetivo</a>
          <a href="#nosotros" className="hover:text-blue-600 transition">Nosotros</a>
          <Link href="/login" className="px-4 py-2 border border-blue-600 text-blue-700 rounded-md hover:bg-blue-600 hover:text-white transition">
            Iniciar Sesión
          </Link>
        </nav>
      </header>

      {/* --- HERO & REGISTRO --- */}
      <main className="flex-grow">
        <section className="max-w-7xl mx-auto px-4 py-12 grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
          {/* Textos Hero */}
          <div className="space-y-4">
            <h1 className="text-5xl font-extrabold tracking-tight font-mono text-gray-900">
              Menos vueltas,<br />más chambas
            </h1>
            <p className="text-lg text-gray-600">
              Publica, conecta y ponte en obra. La mejor red de trabajos esporádicos en Chile.
            </p>
          </div>

          {/* Formulario de Registro */}
          <div className="bg-white p-8 rounded-xl shadow-lg border border-gray-100">
            <h2 className="text-2xl font-bold mb-6 font-mono text-center">Crea una cuenta</h2>
            <form className="space-y-4 text-sm">
              <div className="grid grid-cols-2 gap-4">
                <input type="text" placeholder="R.U.N" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="text" placeholder="Nombres" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="text" placeholder="Apellido Paterno" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="text" placeholder="Apellido Materno" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-3 gap-4">
                <input type="text" placeholder="Calle" className="p-2 border rounded w-full col-span-2 focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="text" placeholder="Número" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <select className="p-2 border rounded w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>Región</option>
                  <option>Valparaíso</option>
                </select>
                <select className="p-2 border rounded w-full bg-white focus:outline-none focus:ring-2 focus:ring-blue-400">
                  <option>Comuna</option>
                  <option>Valparaíso</option>
                </select>
              </div>
              <input type="email" placeholder="e-Mail" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
              <div className="grid grid-cols-2 gap-4">
                <input type="password" placeholder="Contraseña" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
                <input type="password" placeholder="Repetir contraseña" className="p-2 border rounded w-full focus:outline-none focus:ring-2 focus:ring-blue-400" />
              </div>
              <p className="text-xs text-gray-400">La contraseña debe contener mínimo 8 caracteres</p>
              <div className="flex items-center gap-2 mt-2">
                <input type="checkbox" id="terminos" className="accent-blue-600" />
                <label htmlFor="terminos" className="text-xs text-gray-600">Confirmo haber leído los Términos y Condiciones</label>
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white font-bold py-3 rounded-md hover:bg-blue-700 transition mt-4">
                Crear cuenta
              </button>
            </form>
          </div>
        </section>

        {/* --- PROPÓSITO --- */}
        <section id="objetivo" className="bg-white py-16 px-4">
          <div className="max-w-4xl mx-auto text-center space-y-6">
            <h2 className="text-3xl font-bold font-mono">Nuestro propósito</h2>
            <p className="text-gray-600 leading-relaxed">
              Frente a la crisis laboral mundial, ChambaNET es la solución tecnológica para generar ingresos rápidos y sin burocracia. Conectamos al instante a quienes necesitan resolver una tarea urgente con el talento dispuesto a ejecutarla.
            </p>
            <p className="text-gray-600 leading-relaxed">
              Los chilenos sabemos darnos la mano en los momentos difíciles. Al usar esta red, no solo resuelves un problema en tu hogar, sino que impulsas la economía y ayudas directamente a un compatriota. Desde Arica hasta Punta Arenas: cuando nos apoyamos, Chile entero sale adelante.
            </p>
          </div>
        </section>

        {/* --- QUIÉNES SOMOS --- */}
        <section id="nosotros" className="py-16 px-4 bg-gray-50">
          <div className="max-w-5xl mx-auto text-center space-y-10">
            <h2 className="text-3xl font-bold font-mono">Quiénes somos</h2>
            <p className="text-gray-600 max-w-2xl mx-auto">
              Somos un grupo de estudiantes de DUOC UC enfocado en crear soluciones tecnológicas eficientes frente a problemas reales. Combinamos ingeniería de software y visión estratégica para construir una plataforma escalable, segura y al servicio de la comunidad.
            </p>
            
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
              {/* Tarjeta Sibel */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
                <h3 className="font-bold text-lg">Sibel Sama</h3>
                <p className="text-blue-700 text-sm font-medium mb-2">Informática</p>
                <a href="#" className="text-gray-400 hover:text-gray-800 transition">@github_sibel</a>
              </div>
              {/* Tarjetas Placeholder para el resto del equipo */}
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
                <h3 className="font-bold text-lg">Nombre Apellido</h3>
                <p className="text-blue-700 text-sm font-medium mb-2">Ingeniero</p>
                <a href="#" className="text-gray-400 hover:text-gray-800 transition">@gitusername</a>
              </div>
              <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 flex flex-col items-center">
                <div className="w-20 h-20 bg-gray-200 rounded-full mb-4"></div>
                <h3 className="font-bold text-lg">Nombre Apellido</h3>
                <p className="text-blue-700 text-sm font-medium mb-2">Ingeniero</p>
                <a href="#" className="text-gray-400 hover:text-gray-800 transition">@gitusername</a>
              </div>
            </div>
          </div>
        </section>
      </main>

      {/* --- FOOTER --- */}
      <footer className="bg-gray-900 text-gray-400 py-6 text-center text-sm">
        <div className="max-w-7xl mx-auto px-4 flex flex-col md:flex-row justify-between items-center">
          <p>¿Qué esperas para unirte a la red de empleos más grande de Chile?</p>
          <p className="mt-2 md:mt-0 font-mono text-blue-400">Hosting por Sibel Sama</p>
        </div>
      </footer>
    </div>
  );
}