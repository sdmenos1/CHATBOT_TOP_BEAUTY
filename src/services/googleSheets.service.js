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
    const range = `${sheetName}!A:A`;
    const response = await sheetsClient.spreadsheets.values.get({
      spreadsheetId,
      range,
    });

    const rows = response.data.values || [];
    const nextRow = rows.length + 1;
    
    console.log(`📍 Siguiente fila vacía en ${sheetName}: ${nextRow}`);
    return nextRow;
  } catch (error) {
    console.error("❌ Error buscando fila vacía:", error.message);
    return 2;
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
    const response = await sheetsClient.spreadsheets.get({
      spreadsheetId,
      ranges: [],
      includeGridData: true,
    });

    const sheet = response.data.sheets.find(s => s.properties.sheetId === sheetId);
    
    if (!sheet || !sheet.data || !sheet.data[0] || !sheet.data[0].rowData) {
      console.log('⚠️  No se encontró data validation para copiar');
      return false;
    }

    const rowData = sheet.data[0].rowData;
    const sourceRowData = rowData[sourceRow - 1];
    
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
    switch (local) {
      case "Chimbote":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHIMBOTE;
        break;
      case "Trujillo":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_TRUJILLO;
        break;
      case "Olivos": // backward compatibility
      case "Los Olivos":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_OLIVOS;
        break;
      case "Arequipa":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_AREQUIPA;
        break;
      case "Lince":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LINCE;
        break;
      case "Pucallpa":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_PUCALLPA;
        break;
      case "Luxury":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LUXURY;
        break;
      case "Medellin": // legacy without accent
      case "Medellín":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_MEDELLIN;
        break;
      case "Chapineros": // legacy plural
      case "Chapinero":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHAPINEROS;
        break;
      case "Los Leones":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_LOS_LEONES;
        break;
      case "Providencia":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_PROVIDENCIA;
        break;
      case "Chico":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_CHICO;
        break;
      case "Mor":
        spreadsheetId = process.env.GOOGLE_SHEETS_ID_MOR;
        break;
      default:
        spreadsheetId = process.env.GOOGLE_SHEETS_ID;
    }

    if (!spreadsheetId) {
      console.error(
        `❌ GOOGLE_SHEETS_ID para el local "${local}" no está configurado en las variables de entorno`
      );
      return { success: false, error: `GOOGLE_SHEETS_ID para ${local} no configurado` };
    }

    console.log(`📄 Intentando agregar cita a Google Sheets del local: ${local}...`);

    const sheetName = fecha.replace(/\//g, "-");
    console.log(`📅 Guardando en la hoja: ${sheetName}`);

    const nextRow = await findNextEmptyRow(spreadsheetId, sheetName);

    const values = [[nombre, telefono, servicio, precio, fecha, hora, estado]];
    const range = `${sheetName}!A${nextRow}:G${nextRow}`;

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

    if (nextRow > 2) {
      const sheetId = await getSheetId(spreadsheetId, sheetName);
      if (sheetId !== null) {
        const sourceRow = 2;
        await copyDataValidation(spreadsheetId, sheetId, sourceRow, nextRow);
      }
    } else {
      console.log('ℹ️  Primera cita en esta hoja, no hay validación para copiar aún');
    }

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
