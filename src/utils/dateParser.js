const chrono = require("chrono-node");
const chronoEs = require("chrono-node/es");

function parseNaturalDate(text, referenceDate = new Date()) {
  console.log('🔍 Parseando texto:', text);
  console.log('📆 Fecha de referencia:', referenceDate.toLocaleString('es-PE'));

  const results = chronoEs.casual.parse(text, referenceDate, {
    forwardDate: true
  });

  console.log('🔎 Resultados de chrono:', results.length > 0 ? 'Encontrado' : 'No encontrado');

  if (results.length > 0) {
    const result = results[0];

    console.log('📋 Componentes detectados por chrono:', {
      year: result.start.get('year'),
      month: result.start.get('month'),
      day: result.start.get('day'),
      hour: result.start.get('hour'),
      minute: result.start.get('minute'),
      isCertainDay: result.start.isCertain('day'),
      isCertainMonth: result.start.isCertain('month'),
      isCertainYear: result.start.isCertain('year'),
      isCertainHour: result.start.isCertain('hour'),
      textoMatch: result.text,
      indexMatch: result.index,
      fechaRaw: result.start.date().toISOString()
    });

    const hasTime = result.start.isCertain('hour');
    const hasDay = result.start.isCertain('day');
    const hasMonth = result.start.isCertain('month');

    // 🚀 SOLUCIÓN: Crear la fecha usando los componentes en hora local de Lima
    // Chrono parsea los componentes correctamente, pero result.start.date() devuelve UTC
    // Por eso creamos manualmente la fecha con los componentes
    const parsedDate = new Date(
      result.start.get('year'),
      result.start.get('month') - 1, // Month es 0-indexed en JavaScript
      result.start.get('day'),
      result.start.get('hour') || 9, // Default 9 AM si no hay hora
      result.start.get('minute') || 0,
      0
    );

    console.log('✅ Fecha creada manualmente en hora local:', {
      componentes: {
        year: result.start.get('year'),
        month: result.start.get('month'),
        day: result.start.get('day'),
        hour: result.start.get('hour'),
        minute: result.start.get('minute')
      },
      fechaCreada: parsedDate.toLocaleString('es-PE'),
      fechaISO: parsedDate.toISOString()
    });

    const refDay = referenceDate.getDate();
    const refMonth = referenceDate.getMonth();

    if (hasDay && hasMonth) {
      console.log('✅ Usuario especificó día y mes explícitamente');
      if (parsedDate.getDate() === refDay && parsedDate.getMonth() === refMonth) {
        const dayMatch = text.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
        if (dayMatch) {
          const dayFromText = parseInt(dayMatch[1]);
          console.log('🔄 Detectado día específico en texto:', dayFromText);
          if (dayFromText !== refDay) {
            parsedDate.setDate(dayFromText);
            console.log('✅ Fecha corregida al día especificado:', dayFromText);
          }
        }
      }
    }

    const now = new Date();
    const timeDiff = parsedDate.getTime() - now.getTime();
    const minutesDiff = timeDiff / (1000 * 60);

    console.log('⏰ Comparando fechas:', {
      fechaActual: now.toLocaleString('es-PE'),
      fechaParseada: parsedDate.toLocaleString('es-PE'),
      diferenciaMinutos: Math.round(minutesDiff)
    });

    if (minutesDiff < 0 &&
        parsedDate.getDate() === now.getDate() &&
        parsedDate.getMonth() === now.getMonth() &&
        parsedDate.getFullYear() === now.getFullYear()) {
      console.log('⚠️  La hora indicada ya pasó hoy, ajustando al día siguiente...');
      parsedDate.setDate(parsedDate.getDate() + 1);
      console.log('✅ Fecha ajustada:', parsedDate.toLocaleString('es-PE'));
    }

    if (!hasTime) {
      console.log('⚠️  No se detectó hora en el texto, usando hora por defecto 9:00 AM');
    }

    console.log('✅ Fecha parseada final:', {
      textoOriginal: text,
      fechaParseada: parsedDate.toISOString(),
      fechaLocal: parsedDate.toLocaleString('es-PE'),
      tieneTiempo: hasTime,
      componentes: {
        year: parsedDate.getFullYear(),
        month: parsedDate.getMonth() + 1,
        day: parsedDate.getDate(),
        hour: parsedDate.getHours(),
        minute: parsedDate.getMinutes()
      }
    });

    return parsedDate;
  }

  console.log('❌ No se pudo parsear la fecha');
  return null;
}

function formatDateForUser(date) {
  const days = [
    "domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"
  ];
  const months = [
    "enero", "febrero", "marzo", "abril", "mayo", "junio",
    "julio", "agosto", "septiembre", "octubre", "noviembre", "diciembre"
  ];

  const localDate = new Date(date);

  const dayName = days[localDate.getDay()];
  const dayNumber = localDate.getDate();
  const monthName = months[localDate.getMonth()];
  const year = localDate.getFullYear();
  const hours = localDate.getHours();
  const minutes = localDate.getMinutes().toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;

  console.log('🗓️ Formateando fecha:', {
    fechaOriginal: date.toISOString(),
    dia: dayName,
    hora: `${hours12}:${minutes} ${ampm}`
  });

  return `${dayName} ${dayNumber} de ${monthName} de ${year} a las ${hours12}:${minutes} ${ampm}`;
}

module.exports = {
  parseNaturalDate,
  formatDateForUser,
};
