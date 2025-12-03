const chrono = require("chrono-node");
const chronoEs = require("chrono-node/es");
const { DateTime } = require("luxon");

const LIMA_TIMEZONE = 'America/Lima';

// AJUSTE DE HORA: Se resta 5 horas a la hora actual para permitir
// reservar citas que técnicamente ya pasaron pero aún son válidas
// (por ejemplo, reservar a las 11 PM cuando son las 9 PM del mismo día)
const HORA_OFFSET_MINUTOS = -300; // -5 horas en minutos

function parseNaturalDate(text, referenceDate = null) {
  const limaTime = referenceDate 
    ? DateTime.fromJSDate(referenceDate).setZone(LIMA_TIMEZONE)
    : DateTime.now().setZone(LIMA_TIMEZONE);
  
  const cleanedText = String(text)
    .replace(/\u00A0/g, ' ')
    .replace(/[\t\n\r]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  console.log('🔍 Parseando texto:', cleanedText);
  console.log('📆 Fecha de referencia (Lima):', limaTime.toFormat('yyyy-MM-dd HH:mm:ss'));

  const referenceDateJS = limaTime.toJSDate();
  
  let results = chronoEs.casual.parse(cleanedText, referenceDateJS, {
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
      const dayMatch = cleanedText.match(/(\d{1,2})\s+de\s+(enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|octubre|noviembre|diciembre)/i);
      if (dayMatch) {
        const dayFromText = parseInt(dayMatch[1]);
        console.log('🔄 Detectado día específico en texto:', dayFromText);
        if (dayFromText !== limaTime.day) {
          parsedDateTime = parsedDateTime.set({ day: dayFromText });
          console.log('✅ Fecha corregida al día especificado:', dayFromText);
        }
      }
    }

    // Aplicar offset de -5 horas a la hora actual para la comparación
    const nowLima = DateTime.now().setZone(LIMA_TIMEZONE).plus({ minutes: HORA_OFFSET_MINUTOS });
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

  const monthsMap = {
    enero: 1, febrero: 2, marzo: 3, abril: 4, mayo: 5, junio: 6,
    julio: 7, agosto: 8, septiembre: 9, setiembre: 9, octubre: 10, noviembre: 11, diciembre: 12
  };

  const weekdaysMap = {
    lunes: 1, martes: 2, miércoles: 3, miercoles: 3, jueves: 4, viernes: 5, sábado: 6, sabado: 6, domingo: 7
  };

  const monthPattern = "enero|febrero|marzo|abril|mayo|junio|julio|agosto|septiembre|setiembre|octubre|noviembre|diciembre";
  const timePattern = "(\\d{1,2})(?::(\\d{2}))?\\s*(am|pm|AM|PM)?";

  let m;
  m = cleanedText.match(new RegExp(`^(\\d{1,2})\\s+de\\s+(${monthPattern})(?:\\s+de\\s+(\\d{4}))?\\s+a\\s+las\\s+${timePattern}$`, 'i'));
  if (m) {
    const day = parseInt(m[1], 10);
    const month = monthsMap[m[2].toLowerCase()];
    const year = m[3] ? parseInt(m[3], 10) : limaTime.year;
    let hour = parseInt(m[4] || '9', 10);
    let minute = parseInt(m[5] || '0', 10);
    const ampm = (m[6] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    let dt = DateTime.fromObject({ year, month, day, hour, minute, second: 0 }, { zone: LIMA_TIMEZONE });
    const adjustedNow = limaTime.plus({ minutes: HORA_OFFSET_MINUTOS });
    if (dt < adjustedNow) {
      dt = dt.plus({ year: 1 });
    }
    console.log('✅ Fecha parseada por fallback (día/mes/hora):', dt.toFormat('yyyy-MM-dd HH:mm:ss'));
    return dt.toJSDate();
  }

  m = cleanedText.match(new RegExp(`^(lunes|martes|miércoles|miercoles|jueves|viernes|sábado|sabado|domingo)\\s+a\\s+las\\s+${timePattern}$`, 'i'));
  if (m) {
    const targetWeekday = weekdaysMap[m[1].toLowerCase()];
    let hour = parseInt(m[2] || '9', 10);
    let minute = parseInt(m[3] || '0', 10);
    const ampm = (m[4] || '').toLowerCase();
    if (ampm === 'pm' && hour < 12) hour += 12;
    if (ampm === 'am' && hour === 12) hour = 0;
    let dt = limaTime;
    const currentWeekday = dt.weekday;
    let addDays = (targetWeekday - currentWeekday + 7) % 7;
    const adjustedNow = dt.plus({ minutes: HORA_OFFSET_MINUTOS });
    if (addDays === 0 && dt.set({ hour, minute }) <= adjustedNow) addDays = 7;
    dt = dt.plus({ days: addDays }).set({ hour, minute, second: 0, millisecond: 0 });
    console.log('✅ Fecha parseada por fallback (día de semana/hora):', dt.toFormat('yyyy-MM-dd HH:mm:ss'));
    return dt.toJSDate();
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

