// Script para verificar que la solución de Google Sheets funciona correctamente
// Este script simula agregar citas y verifica que todo funcione

const { addRowToSheet } = require('./src/services/googleSheets.service');

async function testGoogleSheets() {
  console.log('🧪 PRUEBA DE GOOGLE SHEETS - MENÚS DESPLEGABLES');
  console.log('='.repeat(70));
  console.log('');

  // Simular agregar una cita
  const citaPrueba = {
    local: 'Chimbote',
    nombre: 'Juan Pérez TEST',
    telefono: '999888777',
    servicio: 'Botox',
    precio: 100,
    fecha: new Date().toLocaleDateString('es-PE', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit'
    }).replace(/\//g, '-'),
    hora: '2:00 PM',
    estado: 'Confirmado'
  };

  console.log('📋 Datos de la cita de prueba:');
  console.log(citaPrueba);
  console.log('');
  console.log('📤 Intentando agregar a Google Sheets...');
  console.log('');

  try {
    const result = await addRowToSheet(citaPrueba);

    if (result.success) {
      console.log('');
      console.log('✅ PRUEBA EXITOSA!');
      console.log('='.repeat(70));
      console.log('');
      console.log('📊 Resultado:');
      console.log(`   • Fila agregada: ${result.updatedRange}`);
      console.log(`   • Número de fila: ${result.rowNumber}`);
      console.log('');
      console.log('🔍 Verificaciones a realizar manualmente en Google Sheets:');
      console.log('');
      console.log('   1. ✅ Las filas anteriores NO se desplazaron');
      console.log('   2. ✅ La nueva cita está en la fila correcta');
      console.log(`   3. ✅ La celda de "Estado" (columna G, fila ${result.rowNumber}) tiene menú desplegable`);
      console.log('   4. ✅ El estado dice "Confirmado"');
      console.log('   5. ✅ Puedes cambiar el estado usando el menú');
      console.log('');
      console.log('📝 Si alguna verificación falla, revisa SOLUCION_GOOGLE_SHEETS.md');
      console.log('');
    } else {
      console.log('');
      console.log('❌ PRUEBA FALLIDA');
      console.log('='.repeat(70));
      console.log('');
      console.log(`Error: ${result.error}`);
      console.log('');
      console.log('💡 Posibles causas:');
      console.log('');
      console.log('   1. Google Sheets no está configurado correctamente');
      console.log('   2. El Service Account no tiene permisos');
      console.log('   3. La hoja no existe');
      console.log('   4. Falta el ID del spreadsheet en .env');
      console.log('');
      console.log('📝 Revisa SOLUCION_GOOGLE_SHEETS.md para más detalles');
      console.log('');
    }
  } catch (error) {
    console.log('');
    console.log('❌ ERROR INESPERADO');
    console.log('='.repeat(70));
    console.log('');
    console.error('Error:', error.message);
    console.error('Stack:', error.stack);
    console.log('');
  }

  console.log('='.repeat(70));
  console.log('🏁 FIN DE LA PRUEBA');
  console.log('');
}

// Ejecutar la prueba
testGoogleSheets()
  .then(() => {
    console.log('✅ Script completado');
    process.exit(0);
  })
  .catch((error) => {
    console.error('❌ Error en el script:', error);
    process.exit(1);
  });
