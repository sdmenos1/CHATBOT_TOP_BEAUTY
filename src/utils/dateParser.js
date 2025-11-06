const chrono = require("chrono-node");
const chronoEs = require("chrono-node/es");
const { format, addHours, parse, isValid, setHours, setMinutes } = require("date-fns");

function parseNaturalDate(text, referenceDate = new Date()) {
  console.log('🔍 Parseando texto:', text);
  console.log('📆 Fecha de referencia:', referenceDate.toLocaleString('es-PE'));
  
  // Usar chrono en modo español (casual para lenguaje natural)
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
    
    // Verificar si la hora fue especificada en el texto
    const hasTime = result.start.isCertain('hour');
    const hasDay = result.start.isCertain('day');
    const hasMonth = result.start.isCertain('month');
    
    // Obtener los componentes de la fecha parseada
    const year = result.start.get('year');
    const month = result.start.get('month') - 1; // JavaScript months are 0-indexed
    const day = result.start.get('day');
    const hour = hasTime ? result.start.get('hour') : 9; // 9 AM por defecto si no hay hora
    const minute = result.start.get('minute') || 0;
    const second = 0;
    
    // Crear la fecha usando el constructor de Date con componentes individuales
    // Esto asegura que la fecha se cree en el timezone local del servidor
    let parsedDate = new Date(year, month, day, hour, minute, second);
    
    // VALIDACIÓN IMPORTANTE: Verificar que la fecha parseada coincida con lo que el usuario pidió
    const refDay = referenceDate.getDate();
    const refMonth = referenceDate.getMonth();
    
    // Si el usuario especificó un día diferente al de hoy, asegurarse de que se respete
    if (hasDay && hasMonth) {
      console.log('✅ Usuario especificó día y mes explícitamente');
      // Si el día parseado es igual al día de referencia pero el usuario dijo un día diferente,
      // es probable que chrono lo haya interpretado mal
      if (parsedDate.getDate() === refDay && parsedDate.getMonth() === refMonth) {
        // Revisar el texto original para ver si menciona un número de día diferente
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
    
    // Validar que la fecha parseada sea futura
    if (parsedDate <= referenceDate) {
      console.log('⚠️  La fecha parseada no es futura, ajustando...');
      // Si es el mismo día pero hora pasada, mover al siguiente día
      if (parsedDate.getDate() === referenceDate.getDate() && 
          parsedDate.getMonth() === referenceDate.getMonth()) {
        parsedDate.setDate(parsedDate.getDate() + 1);
      }
    }
    
    if (!hasTime) {
      console.log('⚠️  No se detectó hora en el texto, usando hora por defecto 9:00 AM');
    }
    
    console.log('✅ Fecha parseada final:', {
      textoOriginal: text,
      fechaParseada: parsedDate.toISOString(),
      fechaLocal: parsedDate.toLocaleString('es-PE', { timeZone: 'America/Lima' }),
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
    "domingo",
    "lunes",
    "martes",
    "miércoles",
    "jueves",
    "viernes",
    "sábado",
  ];
  const months = [
    "enero",
    "febrero",
    "marzo",
    "abril",
    "mayo",
    "junio",
    "julio",
    "agosto",
    "septiembre",
    "octubre",
    "noviembre",
    "diciembre",
  ];

  // Asegurarnos de trabajar con la fecha correcta
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

function createCalendarDateTime(appointmentDate, durationHours = 1) {
  const startDateTime = new Date(appointmentDate);
  const endDateTime = addHours(startDateTime, durationHours);

  return {
    start: startDateTime.toISOString(),
    end: endDateTime.toISOString(),
  };
}

module.exports = {
  parseNaturalDate,
  formatDateForUser,
  createCalendarDateTime,
};
