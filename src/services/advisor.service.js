const axios = require('axios');

/**
 * Servicio para gestionar la información de las asesoras
 * obteniéndola dinámicamente desde el Sistema de Caja.
 */

// Por defecto apunta al puerto 3001 del backend de caja
const CAJA_API_URL = process.env.CAJA_API_URL || 'http://localhost:3001/api/advisors';

let cachedAdvisors = [];
let lastFetchTime = 0;
const CACHE_DURATION = 5 * 60 * 1000; // 5 minutos de caché en memoria

/**
 * Obtiene la lista de todas las asesoras desde la API
 */
async function getAdvisors() {
    const now = Date.now();
    
    // Retornar caché si es reciente
    if (cachedAdvisors.length > 0 && (now - lastFetchTime < CACHE_DURATION)) {
        return cachedAdvisors;
    }

    try {
        console.log(`📡 Consultando asesoras desde: ${CAJA_API_URL}`);
        const response = await axios.get(CAJA_API_URL, { timeout: 5000 });
        
        if (Array.isArray(response.data)) {
            cachedAdvisors = response.data;
            lastFetchTime = now;
            console.log(`✅ Se cargaron ${cachedAdvisors.length} asesoras.`);
        }
        
        return cachedAdvisors;
    } catch (error) {
        console.error('❌ Error al conectar con la API de Sistema Caja:', error.message);
        // Si falla la API pero tenemos caché previa (aunque sea vieja), la usamos
        return cachedAdvisors;
    }
}

/**
 * Busca una asesora por su número de teléfono
 * @param {string} phone - Teléfono del remitente
 */
async function findAdvisorByPhone(phone) {
    if (!phone) return null;
    
    const advisors = await getAdvisors();
    const normalizedSearch = phone.replace(/[\s\-\+]/g, "");
    
    const advisor = advisors.find(a => {
        const normalizedPhone = a.phone.replace(/[\s\-\+]/g, "");
        return normalizedPhone === normalizedSearch;
    });

    if (advisor) {
        // Adaptar al formato que espera el flujo del chatbot
        return {
            nombre: advisor.first_name,
            apellido: advisor.last_name,
            telefono: advisor.phone,
            activo: advisor.active
        };
    }

    return null;
}

module.exports = {
    getAdvisors,
    findAdvisorByPhone
};
