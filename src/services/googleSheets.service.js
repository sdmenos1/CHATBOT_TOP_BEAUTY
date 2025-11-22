const { google } = require("googleapis");
const path = require("path");
const fs = require("fs");

let sheetsClient = null;
let isInitialized = false;

function initializeSheetsClient() {
  try {
    const credentialsPath =
      process.env.GOOGLE_CREDENTIALS_PATH || "src/credentials/google.json";
    const absolutePath = path.resolve(credentialsPath);

    if (!fs.existsSync(absolutePath)) {
      console.warn(
        "⚠️  Archivo de credenciales de Google no encontrado:",
        absolutePath
      );
      console.warn(
        "⚠️  Google Sheets estará deshabilitado hasta que se configure el archivo."
      );
      return null;
    }

    const credentials = JSON.parse(fs.readFileSync(absolutePath, "utf8"));

    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ["https://www.googleapis.com/auth/spreadsheets"],
    });

    sheetsClient = google.sheets({ version: "v4", auth });
    isInitialized = true;

    console.log("✅ Google Sheets API inicializada correctamente");
    return sheetsClient;
  } catch (error) {
    console.error("❌ Error inicializando Google Sheets API:", error.message);
    return null;
  }
}

async function findNextEmptyRow(spreadsheetId, sheetName) {
  try {
    // Buscar en la columna C (NOMBRE Y APELLIDO) empezando desde la fila 12
    const range = `${sheetName}!C12:C100`; // Limitar a 100 filas para optimizar
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
      majorDimension: 'ROWS',
      valueRenderOption: 'UNFORMATTED_VALUE'
    });

    const rows = response.data.values || [];
    
    console.log(`🔍 DEBUG findNextEmptyRow:`);
    console.log(`   - Hoja: ${sheetName}`);
    console.log(`   - Filas encontradas: ${rows.length}`);
    console.log(`   - Primeras 3 filas:`, rows.slice(0, 3));
    
    // Si no hay datos, empezar en la fila 12
    if (rows.length === 0) {
      console.log(`📍 Siguiente fila vacía en ${sheetName}: 12 (primera fila de datos)`);
      return 12;
    }
    
    // Buscar la primera fila vacía entre las existentes
    for (let i = 0; i < rows.length; i++) {
      if (!rows[i] || rows[i].length === 0 || !rows[i][0] || rows[i][0].toString().trim() === '') {
        const emptyRow = 12 + i;
        console.log(`📍 Siguiente fila vacía en ${sheetName}: ${emptyRow} (encontrada vacía en posición ${i})`);
        return emptyRow;
      }
    }
    
    // Si todas las filas tienen datos, agregar después de la última
    const nextRow = 12 + rows.length;
    console.log(`📍 Siguiente fila vacía en ${sheetName}: ${nextRow} (después de ${rows.length} filas con datos)`);
    return nextRow;
  } catch (error) {
    console.error("❌ Error buscando fila vacía:", error.message);
    // Si hay error, retornar fila 12
    return 12;
  }
}

async function getSheetId(spreadsheetId, sheetName) {
  try {
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId,
    });

    const sheet = response.data.sheets.find(
      (s) => s.properties.title === sheetName
    );

    if (sheet) {
      return sheet.properties.sheetId;
    }
    
    console.warn(`⚠️  No se encontró la hoja "${sheetName}"`);
    return null;
  } catch (error) {
    console.error("❌ Error obteniendo ID de hoja:", error.message);
    return null;
  }
}

async function copyDataValidation(spreadsheetId, sheetId, sourceRow, targetRow) {
  try {
    const response = await sheetsClient.spreadsheets.getByDataFilter({
      spreadsheetId,
      resource: {
        includeGridData: true,
        dataFilters: [
          {
            gridRange: {
              sheetId: sheetId,
              startRowIndex: sourceRow - 1,
              endRowIndex: sourceRow,
              startColumnIndex: 1,
              endColumnIndex: 21,
            },
          },
        ],
      },
    });

    const sheets = response.data.sheets || [];
    if (!sheets.length || !sheets[0].data || !sheets[0].data.length) {
      console.log('⚠️  No se encontró data validation para copiar');
      return false;
    }

    const rowData = sheets[0].data[0].rowData || [];
    const sourceRowData = rowData[0];
    
    if (!sourceRowData || !sourceRowData.values) {
      console.log('⚠️  No hay datos en la fila fuente');
      return false;
    }

    const requests = [];
    
    sourceRowData.values.forEach((cell, colIndex) => {
      if (cell.dataValidation) {
        requests.push({
          setDataValidation: {
            range: {
              sheetId: sheetId,
              startRowIndex: targetRow - 1,
              endRowIndex: targetRow,
              startColumnIndex: colIndex,
              endColumnIndex: colIndex + 1,
            },
            rule: cell.dataValidation,
          },
        });
      }
    });

    if (requests.length > 0) {
      await sheetsClient.spreadsheets.batchUpdate({
        spreadsheetId,
        resource: { requests },
      });
      
      console.log(`✅ Copiada validación de datos de fila ${sourceRow} a fila ${targetRow}`);
      return true;
    } else {
      console.log('ℹ️  No hay validación de datos para copiar');
      return false;
    }
  } catch (error) {
    console.error("❌ Error copiando validación de datos:", error.message);
    return false;
  }
}

async function addRowToSheet({
  local,
  nombre,
  telefono,
  servicio,
  precio,
  fecha,
  hora,
  estado,
  nombreAsesora,
  apellidoAsesora,
  telefonoAsesor,
}) {
  try {
    if (!isInitialized) {
      sheetsClient = initializeSheetsClient();
    }

    if (!sheetsClient) {
      console.warn(
        "⚠️  Google Sheets no está configurado. La cita no se guardará en la hoja."
      );
      return { success: false, error: "Google Sheets no configurado" };
    }

    let spreadsheetId;
    let baseEnvVarName;
    switch (local) {
      case "Chimbote":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHIMBOTE;
        baseEnvVarName = "GOOGLE_SHEETS_ID_CHIMBOTE";
        break;
      case "Trujillo":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_TRUJILLO;
        baseEnvVarName = "GOOGLE_SHEETS_ID_TRUJILLO";
        break;
      case "Olivos": // backward compatibility
      case "Los Olivos":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_OLIVOS;
        baseEnvVarName = "GOOGLE_SHEETS_ID_OLIVOS";
        break;
      case "Arequipa":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_AREQUIPA;
        baseEnvVarName = "GOOGLE_SHEETS_ID_AREQUIPA";
        break;
      case "Lince":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LINCE;
        baseEnvVarName = "GOOGLE_SHEETS_ID_LINCE";
        break;
      case "Pucallpa":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_PUCALLPA;
        baseEnvVarName = "GOOGLE_SHEETS_ID_PUCALLPA";
        break;
      case "Luxury":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LUXURY;
        baseEnvVarName = "GOOGLE_SHEETS_ID_LUXURY";
        break;
      case "Medellin": // legacy without accent
      case "Medellín":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_MEDELLIN;
        baseEnvVarName = "GOOGLE_SHEETS_ID_MEDELLIN";
        break;
      case "Chapineros": // legacy plural
      case "Chapinero":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHAPINEROS;
        baseEnvVarName = "GOOGLE_SHEETS_ID_CHAPINEROS";
        break;
      case "Los Leones":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LOS_LEONES;
        baseEnvVarName = "GOOGLE_SHEETS_ID_LOS_LEONES";
        break;
      case "Providencia":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_PROVIDENCIA;
        baseEnvVarName = "GOOGLE_SHEETS_ID_PROVIDENCIA";
        break;
      case "Chico":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHICO;
        baseEnvVarName = "GOOGLE_SHEETS_ID_CHICO";
        break;
      case "Mor":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_MOR;
        baseEnvVarName = "GOOGLE_SHEETS_ID_MOR";
        break;
      default:
        spreadsheetId = process.env.GOOGLE_SHEETS_ID;
        baseEnvVarName = "GOOGLE_SHEETS_ID";
    }

    if (!spreadsheetId) {
      console.error(
        `❌ GOOGLE_SHEETS_ID para el local "${local}" no está configurado en las variables de entorno`
      );
      return { success: false, error: `GOOGLE_SHEETS_ID para ${local} no configurado` };
    }

    console.log(`📄 Intentando agregar cita a Google Sheets del local: ${local}...`);

    // Determinar qué Google Sheet usar según el mes y usar el día como nombre de hoja
    let sheetName;
    
    try {
      const [dd, mm, yyyy] = fecha.split("/");
      const day = parseInt(dd, 10);
      const month = parseInt(mm, 10);
      const year = parseInt(yyyy, 10);
      
      // El nombre de la hoja será solo el día (1, 2, 3, etc.)
      sheetName = day.toString();
      
      // Cambiar al Google Sheet específico del mes si existe
      if (baseEnvVarName && year === 2024 && month === 11) {
        // Noviembre 2024 - Usa la variable base sin sufijo
        console.log("🔁 Usando Google Sheet para Noviembre 2024 (variable base)");
        // spreadsheetId ya está configurado con la variable base
      } else if (baseEnvVarName && year === 2024 && month === 12) {
        // Diciembre 2024
        const overrideId = process.env[`${baseEnvVarName}_DIC_2024`];
        if (overrideId) {
          spreadsheetId = overrideId;
          console.log("🔁 Usando Google Sheet específico para Diciembre 2024");
        }
      } else if (baseEnvVarName && year === 2025 && month === 11) {
        // Noviembre 2025 - Usa la variable base sin sufijo
        console.log("🔁 Usando Google Sheet para Noviembre 2025 (variable base)");
        // spreadsheetId ya está configurado con la variable base
      } else if (baseEnvVarName && year === 2025 && month === 12) {
        // Diciembre 2025
        const overrideId = process.env[`${baseEnvVarName}_DIC_2025`];
        if (overrideId) {
          spreadsheetId = overrideId;
          console.log("🔁 Usando Google Sheet específico para Diciembre 2025");
        }
      } else if (baseEnvVarName && year === 2026 && month === 1) {
        // Enero 2026
        const overrideId = process.env[`${baseEnvVarName}_ENE_2026`];
        if (overrideId) {
          spreadsheetId = overrideId;
          console.log("🔁 Usando Google Sheet específico para Enero 2026");
        }
      }
      
      console.log(`📊 DEBUG: SpreadsheetId final: ${spreadsheetId}`);
      console.log(`📊 DEBUG: Nombre de hoja: ${sheetName}`);
    } catch (e) {
      console.log("⚠️  Error parseando fecha, usando formato por defecto");
      sheetName = fecha.replace(/\//g, "-"); // Fallback al formato antiguo
    }
    
    console.log(`📅 Guardando en la pestaña: ${sheetName}`);
    console.log(`🔑 SpreadsheetId: ${spreadsheetId}`);

    const nextRow = await findNextEmptyRow(spreadsheetId, sheetName);
    
    console.log(`🔢 FILA ASIGNADA: ${nextRow}`);

    // Preparar los datos según el nuevo formato de columnas
    // A: N° (ya rellenada, no se modifica)
    // B: REDES (Nombre completo de asesora)
    // C: NOMBRE Y APELLIDO (Nombre completo del cliente)
    // D: FECHA DE CONTACTO
    // E: SEDE (vacío)
    // F: HORA
    // G: TELÉFONO
    // H: WHATSAPP (vacío)
    // I: PROMOCIÓN (vacío)
    // J: DNI (vacío)
    // K: FECHA DE NACIMIENTO (vacío)
    // L: VISITAS (vacío)
    // M: ESTILISTA (vacío)
    // N: SERVICIO
    // O: PRECIO (vacío)
    // P: TIPO DE CABELLO (vacío)
    // Q: COMO SE ENTERÓ DE TOP (vacío)
    // R: EMAIL (vacío)
    // S: NIVEL DE ATENCIÓN (vacío)
    // T: OBSERVACIÓN (vacío)
    // U: CONFIRMACIÓN
    
    const nombreCompletoCliente = nombre; // El nombre ya viene completo
    const nombreCompletoAsesora = `${nombreAsesora} ${apellidoAsesora}`.trim();
    
    // Crear array con 20 columnas (B hasta U, A no se toca)
    const values = [[
      nombreCompletoAsesora,  // B: REDES
      nombreCompletoCliente,  // C: NOMBRE Y APELLIDO
      fecha,                  // D: FECHA DE CONTACTO
      '',                     // E: SEDE
      hora,                   // F: HORA
      telefono,               // G: TELÉFONO
      '',                     // H: WHATSAPP
      '',                     // I: PROMOCIÓN
      '',                     // J: DNI
      '',                     // K: FECHA DE NACIMIENTO
      '',                     // L: VISITAS
      '',                     // M: ESTILISTA
      servicio,               // N: SERVICIO
      '',                     // O: PRECIO (no se incluye)
      '',                     // P: TIPO DE CABELLO
      '',                     // Q: COMO SE ENTERÓ DE TOP
      '',                     // R: EMAIL
      '',                     // S: NIVEL DE ATENCIÓN
      '',                     // T: OBSERVACIÓN
      estado                  // U: CONFIRMACIÓN
    ]];
    
    const range = `${sheetName}!B${nextRow}:U${nextRow}`;

    const response = await sheetsClient.spreadsheets.values.update({
      spreadsheetId,
      range,
      valueInputOption: "USER_ENTERED",
      resource: {
        values,
      },
    });

    console.log("✅ Cita guardada correctamente en Google Sheets");
    console.log(`   📊 Fila agregada: ${range}`);

    // OPTIMIZACIÓN: copyDataValidation deshabilitado para reducir uso de memoria
    // Si necesitas copiar validación de datos, configura las validaciones directamente en Google Sheets
    // y se aplicarán automáticamente a las nuevas filas
    /* 
    if (nextRow > 12) {
      const sheetId = await getSheetId(spreadsheetId, sheetName);
      if (sheetId !== null) {
        const sourceRow = 12;
        await copyDataValidation(spreadsheetId, sheetId, sourceRow, nextRow);
      }
    } else {
      console.log('ℹ️  Primera cita en esta hoja, no hay validación para copiar aún');
    }
    */
    console.log('ℹ️  Copia de validación de datos deshabilitada para optimizar memoria');

    return {
      success: true,
      updatedRange: range,
      updatedRows: 1,
      rowNumber: nextRow,
    };
  } catch (error) {
    console.error("❌ Error al guardar cita en Google Sheets:", error.message);

    if (error.code === 404) {
      console.error(
        "   💡 Verifica que el ID de la hoja sea correcto y que esté compartida con el Service Account"
      );
    } else if (error.code === 403) {
      console.error(
        "   💡 El Service Account no tiene permisos en la hoja. Compártela con el email del Service Account"
      );
    } else if (error.message.includes("Unable to parse range")) {
      const sheetName = fecha.replace(/\//g, "-");
      console.error(
        `   💡 La hoja "${sheetName}" no existe en el documento de Google Sheets`
      );
      console.error(
        `   📝 Por favor, crea una hoja llamada "${sheetName}" en el Google Sheet del local "${local}"`
      );
    }

    return { success: false, error: error.message };
  }
}

async function getSheetData(range = "Citas!A:G") {
  try {
    if (!isInitialized) {
      sheetsClient = initializeSheetsClient();
    }

    if (!sheetsClient) {
      return { success: false, error: "Google Sheets no configurado" };
    }

    const spreadsheetId = process.env.GOOGLE_SHEETS_ID;

    if (!spreadsheetId) {
      return { success: false, error: "GOOGLE_SHEETS_ID no configurado" };
    }

    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];

    return {
      success: true,
      data: rows,
      totalRows: rows.length,
    };
  } catch (error) {
    console.error("❌ Error al leer datos de Google Sheets:", error.message);
    return { success: false, error: error.message };
  }
}

module.exports = {
  addRowToSheet,
  getSheetData,
  initializeSheetsClient,
};
