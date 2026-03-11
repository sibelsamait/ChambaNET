/**
 * Validacion de RUT chileno usando el algoritmo de Módulo 11
 * Admite formato con o sin puntos, pero requiere el guion (12345678-9)
 */
export const validarRut = (rut: string): boolean => {
  // 1. Excepción para el Admin (Regla de negocio)
  if (rut === "00000000-0") return true;

  // 2. Limpiar el string (quitar puntos y espacios) y pasar a mayúscula
  const rutLimpio = rut.replace(/[^0-9kK-]/g, '').toUpperCase();
  
  // 3. Validar formato básico mediante Expresión Regular
  if (!/^[0-9]+-[0-9K]$/.test(rutLimpio)) return false;

  // 4. Separar los números del dígito verificador (DV)
  const partes = rutLimpio.split('-');
  let digitos = partes[0];
  const dvIngresado = partes[1];

  // 5. Algoritmo Módulo 11
  let suma = 0;
  let multiplicador = 2;

  for (let i = digitos.length - 1; i >= 0; i--) {
    suma += parseInt(digitos[i]) * multiplicador;
    multiplicador = multiplicador === 7 ? 2 : multiplicador + 1;
  }

  // Cálculo matemático del DV
  const resto = suma % 11;
  const dvCalculadoNum = 11 - resto;

  // 6. Transformar el resultado a texto según las reglas del Registro Civil
  let dvFinal = dvCalculadoNum.toString();
  if (dvCalculadoNum === 11) dvFinal = '0';
  if (dvCalculadoNum === 10) dvFinal = 'K';

  // 7. Comparar el DV calculado con el ingresado
  return dvFinal === dvIngresado;
};


/**
 * Validación de mayoría de edad.
 * Calcula la edad exacta y determina si el usuario debe ser bloqueado por ser menor de 18 años.
 * Retorna null si es mayor de edad, o la Fecha en la que cumple 18 años si es menor.
 */
export const calcularBloqueoEdad = (fechaNacimiento: string): Date | null => {
  const hoy = new Date(); // Sysdate actual
  const nacimiento = new Date(fechaNacimiento);
  
  let edad = hoy.getFullYear() - nacimiento.getFullYear();
  const mes = hoy.getMonth() - nacimiento.getMonth();
  
  // Restar un año si el mes actual es anterior al mes de nacimiento, 
  // o si estamos en el mismo mes pero el día actual es anterior al día de cumpleaños
  if (mes < 0 || (mes === 0 && hoy.getDate() < nacimiento.getDate())) {
    edad--;
  }

  // Si tiene menos de 18, calculamos cuándo exactamente cumple los 18 para el bloqueo temporal
  if (edad < 18) {
     const fechaDesbloqueo = new Date(nacimiento);
     fechaDesbloqueo.setFullYear(nacimiento.getFullYear() + 18);
     return fechaDesbloqueo;
  }

  // Retorna null si no hay bloqueo (es mayor o igual a 18 años)
  return null; 
};