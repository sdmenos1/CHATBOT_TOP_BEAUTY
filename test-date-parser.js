// Script de prueba para verificar el parseo de fechas
const { parseNaturalDate, formatDateForUser } = require('./src/utils/dateParser');

console.log('='.repeat(60));
console.log('PRUEBA DE PARSEO DE FECHAS');
console.log('='.repeat(60));

const testCases = [
  'mañana a las 4 pm',
  '5 de noviembre a las 5pm',
  '5 de noviembre a las 2 pm',  // Tu caso específico
  'el 15 de diciembre a las 10:30 AM',
  'hoy a las 3:00 PM',
  'pasado mañana a las 8 PM',
  '2025-11-10 14:00',
  'viernes a las 6 PM',
  '10 de noviembre a las 3 PM',
];

console.log('\nFecha de referencia (hoy):', new Date().toLocaleString('es-PE', { timeZone: 'America/Lima' }));
console.log('\n');

testCases.forEach((testCase, index) => {
  console.log(`\nPRUEBA ${index + 1}: "${testCase}"`);
  console.log('-'.repeat(60));
  
  const parsed = parseNaturalDate(testCase);
  
  if (parsed) {
    console.log('✅ Parseo exitoso');
    console.log('   📅 Fecha ISO:', parsed.toISOString());
    console.log('   🕐 Fecha local PE:', parsed.toLocaleString('es-PE', { timeZone: 'America/Lima' }));
    console.log('   📝 Formato usuario:', formatDateForUser(parsed));
  } else {
    console.log('❌ No se pudo parsear la fecha');
  }
});

console.log('\n' + '='.repeat(60));
console.log('FIN DE LAS PRUEBAS');
console.log('='.repeat(60));
