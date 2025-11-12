const chrono = require("chrono-node");
const chronoEs = require("chrono-node/es");
const { DateTime } = require("luxon");

const LIMA_TIMEZONE = 'America/Lima';

function parseNaturalDate(text, referenceDate = null) {
  const limaTime = referenceDate 
    ? DateTime.fromJSDate(referenceDate).setZone(LIMA_TIMEZONE)
    : DateTime.now().setZone(LIMA_TIMEZONE);
  
  console.log('🔍 Parseando texto:', text);
  console.log('📆 Fecha de referencia (Lima):', limaTime.toFormat('yyyy-MM-dd HH:mm:ss'));

  const referenceDateJS = limaTime.toJSDate();
  
  const results = chronoEs.casual.parse(text, referenceDateJS, {
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
      indexMatch: result.index
    });

    const hasTime = result.start.isCertain('hour');
    const hasDay = result.start.isCertain('day');
    const hasMonth = result.start.isCertain('month');

    const hour = result.start.get('hour');
    const minute = result.start.get('minute');

    let parsedDateTime = DateTime.fromObject({
      year: result.start.get('year'),
      month: result.start.get('month'),
      day: result.start.get('day'),
      hour: hour !== null && hour !== undefined ? hour : 9,
      minute: minute !== null && minute !== undefined ? minute : 0,
      second: 0
    }, { zone: LIMA_TIMEZONE });

    console.log('✅ Fecha creada (Lima):', {
      componentes: {
        year: result.start.get('year'),
        month: result.start.get('month'),
        day: result.start.get('day'),
        hour: hour !== null && hour !== undefined ? hour : 9,
        minute: minute !== null && minute !== undefined ? minute : 0
      },
      fechaCreada: parsedDateTime.toFormat('yyyy-MM-dd HH:mm:ss')
    });

    if (hasDay && hasMonth) {
      console.log('✅ Usuario especificó día y mes explícitamente');
      const dayMatch = text.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      if (dayMatch) {
        const dayFromText = parseInt(dayMatch[1]);
        console.log('🔄 Detectado día específico en texto:', dayFromText);
        if (dayFromText !== limaTime.day) {
          parsedDateTime = parsedDateTime.set({ day: dayFromText });
          console.log('✅ Fecha corregida al día especificado:', dayFromText);
        }
      }
    }

    const nowLima = DateTime.now().setZone(LIMA_TIMEZONE);
    const diffMinutes = parsedDateTime.diff(nowLima, 'minutes').minutes;

    console.log('⏰ Comparando fechas (Lima):', {
      fechaActual: nowLima.toFormat('yyyy-MM-dd HH:mm:ss'),
      fechaParseada: parsedDateTime.toFormat('yyyy-MM-dd HH:mm:ss'),
      diferenciaMinutos: Math.round(diffMinutes),
      esFutura: diffMinutes > 0
    });

    if (diffMinutes < 0) {
      const esMismoDia = parsedDateTime.hasSame(nowLima, 'day');
      
      if (esMismoDia) {
        console.log('⚠️  La hora indicada ya pasó hoy, ajustando al día siguiente...');
        parsedDateTime = parsedDateTime.plus({ days: 1 });
        console.log('✅ Fecha ajustada:', parsedDateTime.toFormat('yyyy-MM-dd HH:mm:ss'));
      } else {
        console.log('⚠️  La fecha parseada está en el pasado');
      }
    }

    if (!hasTime) {
      console.log('⚠️  No se detectó hora en el texto, usando hora por defecto 9:00 AM');
    }

    console.log('✅ Fecha parseada final (Lima):', {
      textoOriginal: text,
      fechaLocal: parsedDateTime.toFormat('yyyy-MM-dd HH:mm:ss'),
      tieneTiempo: hasTime,
      componentes: {
        year: parsedDateTime.year,
        month: parsedDateTime.month,
        day: parsedDateTime.day,
        hour: parsedDateTime.hour,
        minute: parsedDateTime.minute
      }
    });

    return parsedDateTime.toJSDate();
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

  const limaDate = DateTime.fromJSDate(date).setZone(LIMA_TIMEZONE);

  const dayName = days[limaDate.weekday % 7];
  const dayNumber = limaDate.day;
  const monthName = months[limaDate.month - 1];
  const year = limaDate.year;
  const hours = limaDate.hour;
  const minutes = limaDate.minute.toString().padStart(2, "0");
  const ampm = hours >= 12 ? "PM" : "AM";
  const hours12 = hours % 12 || 12;

  console.log('🗓️ Formateando fecha (Lima):', {
    dia: dayName,
    hora: `${hours12}:${minutes} ${ampm}`,
    timezone: LIMA_TIMEZONE
  });

  return `${dayName} ${dayNumber} de ${monthName} de ${year} a las ${hours12}:${minutes} ${ampm}`;
}

module.exports = {
  parseNaturalDate,
  formatDateForUser,
};

