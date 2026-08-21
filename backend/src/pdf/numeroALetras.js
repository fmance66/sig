const UNIDADES = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE',
  'DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const VEINTIS = ['VEINTE', 'VEINTIUN', 'VEINTIDÓS', 'VEINTITRÉS', 'VEINTICUATRO', 'VEINTICINCO',
  'VEINTISÉIS', 'VEINTISIETE', 'VEINTIOCHO', 'VEINTINUEVE'];
const DECENAS = ['', '', '', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const CENTENAS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS',
  'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function trescientos99(n) {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  const c = Math.floor(n / 100);
  const resto = n % 100;
  const texto = CENTENAS[c];
  if (resto === 0) return texto;
  let parte;
  if (resto < 20) parte = UNIDADES[resto];
  else {
    const d = Math.floor(resto / 10);
    const u = resto % 10;
    if (d === 2) parte = VEINTIS[u];
    else parte = u > 0 ? `${DECENAS[d]} Y ${UNIDADES[u]}` : DECENAS[d];
  }
  return [texto, parte].filter(Boolean).join(' ');
}

function milesUnMillon(n) {
  if (n === 0) return '';
  const miles = Math.floor(n / 1000);
  const resto = n % 1000;
  let texto = '';
  if (miles === 1) texto = 'MIL';
  else if (miles > 1) texto = `${trescientos99(miles)} MIL`;
  const restoTexto = trescientos99(resto);
  return [texto, restoTexto].filter(Boolean).join(' ');
}

function enterosEnLetras(n) {
  if (n === 0) return 'CERO';
  const millones = Math.floor(n / 1000000);
  const resto = n % 1000000;
  let texto = '';
  if (millones === 1) texto = 'UN MILLÓN';
  else if (millones > 1) texto = `${milesUnMillon(millones)} MILLONES`;
  const restoTexto = milesUnMillon(resto);
  return [texto, restoTexto].filter(Boolean).join(' ') || 'CERO';
}

// Convierte un monto en pesos a texto en castellano, ej: 12345.67 -> "DOCE MIL TRESCIENTOS
// CUARENTA Y CINCO CON 67/100". Usado en el recibo para "Recibí conforme la suma de pesos: ...".
function pesosEnLetras(monto) {
  const valor = Math.abs(Number(monto) || 0);
  const enteros = Math.floor(valor);
  const centavos = Math.round((valor - enteros) * 100);
  return `${enterosEnLetras(enteros)} CON ${String(centavos).padStart(2, '0')}/100`;
}

// Antigüedad en texto ("3 años y 7 meses"), usado en el Libro de Sueldos (EMPLEADO_ANTIGUEDAD_LETRA).
function antiguedadEnLetras(fechaIngreso, hasta = new Date()) {
  if (!fechaIngreso) return '';
  const desde = new Date(fechaIngreso);
  if (Number.isNaN(desde.getTime())) return '';
  let anios = hasta.getFullYear() - desde.getFullYear();
  let meses = hasta.getMonth() - desde.getMonth();
  if (hasta.getDate() < desde.getDate()) meses -= 1;
  if (meses < 0) { anios -= 1; meses += 12; }
  if (anios < 0) return '';
  const partes = [];
  if (anios > 0) partes.push(`${anios} año${anios === 1 ? '' : 's'}`);
  if (meses > 0 || partes.length === 0) partes.push(`${meses} mes${meses === 1 ? '' : 'es'}`);
  return partes.join(' y ');
}

module.exports = { pesosEnLetras, antiguedadEnLetras };
