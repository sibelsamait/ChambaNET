import Link from 'next/link';
import Image from 'next/image';
import BrandLogo from './components/BrandLogo';
import RegistroForm from './components/RegistroForm';

export default function Inicio() {
  return (
    <div className="flex min-h-screen flex-col bg-[#559ff6] text-gray-900 font-sans">
      <header className="w-full bg-[#6aa9f6] px-4 py-4 shadow-[0_12px_24px_rgba(39,77,129,0.35)] sm:px-8">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4">
        <BrandLogo href="/" size="md" />
          <nav className="hidden gap-6 text-base font-bold text-white md:flex">
          <a href="#objetivo" className="liftable rounded-xl px-3 py-1 hover:bg-white/20 transition">Objetivo</a>
          <a href="#nosotros" className="liftable rounded-xl px-3 py-1 hover:bg-white/20 transition">Nosotros</a>
          <Link href="/login" className="liftable rounded-xl border border-white/60 px-4 py-2 hover:bg-white hover:text-blue-700 transition">
            Iniciar Sesión
          </Link>
        </nav>
        <details className="md:hidden relative group">
          <summary className="list-none cursor-pointer select-none rounded-md border border-white/70 px-3 py-2 text-sm font-semibold text-white hover:bg-white/20 transition">
            Menú
          </summary>
          <div className="absolute right-0 z-20 mt-2 w-52 rounded-lg border border-blue-100 bg-white p-2 shadow-lg">
            <a href="#objetivo" className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">Objetivo</a>
            <a href="#nosotros" className="block rounded-md px-3 py-2 text-sm text-gray-700 hover:bg-blue-50 hover:text-blue-700">Nosotros</a>
            <Link href="/login" className="block mt-1 rounded-md border border-blue-200 px-3 py-2 text-sm font-semibold text-blue-700 hover:border-blue-600 hover:bg-blue-600 hover:text-white transition">
              Iniciar Sesión
            </Link>
          </div>
        </details>
        </div>
      </header>

      <main className="flex-grow">
        <section className="mx-auto grid max-w-7xl grid-cols-1 items-stretch gap-6 px-4 py-10 md:grid-cols-2">
          <div className="rounded-[18px] border border-blue-200 bg-white p-6 shadow-[0_12px_24px_rgba(36,73,121,0.2)]">
            <div className="relative mx-auto h-32 w-32 sm:h-44 sm:w-44">
              <Image
                src="/brand/chambanet-logo.svg"
                alt="Logo ChambaNET"
                fill
                priority
                className="object-contain"
              />
            </div>
            <p className="mt-4 text-center text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl">
              ChambaNET
            </p>
          </div>

          <div className="rounded-[18px] border border-blue-200 bg-white/75 p-5 shadow-[0_12px_24px_rgba(36,73,121,0.2)] sm:p-6">
            <h1 className="text-2xl font-extrabold tracking-tight text-gray-900 sm:text-3xl">
              Menos vueltas, más chambas
            </h1>
            <p className="mt-3 text-sm text-gray-700 sm:text-base">
              Publica, conecta y ponte en obra. La mejor red de trabajos esporádicos en Chile.
            </p>
            <a href="#registro" className="liftable mt-5 inline-block rounded-lg bg-[#559ff6] px-5 py-2 text-sm font-bold text-white hover:bg-blue-600">
              Crear cuenta
            </a>
          </div>
        </section>

        <section id="registro" className="mx-auto max-w-7xl px-4 pb-12">
          <div className="liftable rounded-[22px] border border-blue-200 bg-[#5ea4f7] p-5 shadow-[0_14px_24px_rgba(33,66,109,0.26)] sm:p-7">
            <h2 className="mb-4 text-center text-2xl font-extrabold text-white sm:text-3xl">Crea una cuenta</h2>
            <RegistroForm />
          </div>
        </section>

        <section id="objetivo" className="bg-white py-16 px-4">
          <div className="mx-auto max-w-4xl space-y-6 text-center">
            <h2 className="text-3xl font-extrabold">Nuestro propósito</h2>
            <p className="text-base leading-relaxed text-gray-700 sm:text-lg">
              Frente a la crisis laboral mundial, ChambaNET es la solución tecnológica para generar ingresos rápidos y sin burocracia. Conectamos al instante a quienes necesitan resolver una tarea urgente con el talento dispuesto a ejecutarla.
            </p>
            <p className="text-base leading-relaxed text-gray-700 sm:text-lg">
              Los chilenos sabemos darnos la mano en los momentos difíciles. Al usar esta red, no solo resuelves un problema en tu hogar, sino que impulsas la economía y ayudas directamente a un compatriota. Desde Arica hasta Punta Arenas: cuando nos apoyamos, Chile entero sale adelante.
            </p>
          </div>
        </section>

        <section id="nosotros" className="bg-[#559ff6] py-16 px-4">
          <div className="mx-auto max-w-5xl space-y-10 text-center text-white">
            <h2 className="text-4xl font-extrabold">Quiénes somos</h2>
            <p className="mx-auto max-w-2xl text-base text-blue-100 sm:text-lg">
              Somos un grupo de estudiantes de DUOC UC enfocado en crear soluciones tecnológicas eficientes frente a problemas reales. Combinamos ingeniería de software y visión estratégica para construir una plataforma escalable, segura y al servicio de la comunidad.
            </p>
            
            <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
              <div className="liftable flex flex-col items-center rounded-2xl bg-blue-400/30 p-6 shadow-[0_10px_20px_rgba(25,53,90,0.2)]">
                <div className="mb-4 h-24 w-24 rounded-full bg-blue-100"></div>
                <h3 className="text-xl font-extrabold">Sibel Sama</h3>
                <p className="mb-2 text-sm text-blue-100">Informática</p>
                <a
                  href="https://github.com/sibelsamait"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-white/80 hover:text-white transition"
                >
                  @github_sibel
                </a>
              </div>
              <div className="liftable flex flex-col items-center rounded-2xl bg-blue-400/30 p-6 shadow-[0_10px_20px_rgba(25,53,90,0.2)]">
                <div className="mb-4 h-24 w-24 rounded-full bg-blue-100"></div>
                <h3 className="text-xl font-extrabold">Nombre Apellido</h3>
                <p className="mb-2 text-sm text-blue-100">Ingeniero</p>
                <a
                  href="https://www.linkedin.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-white/80 hover:text-white transition"
                >
                  LinkedIn
                </a>
              </div>
              <div className="liftable flex flex-col items-center rounded-2xl bg-blue-400/30 p-6 shadow-[0_10px_20px_rgba(25,53,90,0.2)]">
                <div className="mb-4 h-24 w-24 rounded-full bg-blue-100"></div>
                <h3 className="text-xl font-extrabold">Nombre Apellido</h3>
                <p className="mb-2 text-sm text-blue-100">Ingeniero</p>
                <a
                  href="https://www.computrabajo.cl/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-base text-white/80 hover:text-white transition"
                >
                  Computrabajo
                </a>
              </div>
            </div>

            <div className="mx-auto flex w-full max-w-2xl flex-wrap justify-center gap-3 rounded-xl bg-white/10 p-3">
              <a
                href="https://www.bne.cl/"
                target="_blank"
                rel="noopener noreferrer"
                className="liftable rounded-full border border-white/40 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20"
              >
                Bolsa Nacional de Empleo
              </a>
              <a
                href="https://www.linkedin.com/jobs/"
                target="_blank"
                rel="noopener noreferrer"
                className="liftable rounded-full border border-white/40 px-3 py-1.5 text-sm font-bold text-white hover:bg-white/20"
              >
                LinkedIn Jobs
              </a>
            </div>
          </div>
        </section>
      </main>

      <footer className="bg-gradient-to-b from-[#4f8ce0] to-[#36588f] py-8 text-center text-white">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-2 px-4 md:flex-row">
          <p className="text-lg font-semibold text-balance">¿Qué esperas para unirte a la red de empleos más grande de Chile?</p>
          <p className="mt-2 text-base md:mt-0">
            Hosting por <span className="font-extrabold">Sibel Sama</span>
          </p>
        </div>
      </footer>
    </div>
  );
}