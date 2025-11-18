// Base de datos de asesoras con su información de contacto
const asesoras = [
  // Perú
  { nombre: "MARITZA", apellido: "MORA", telefono: "51913400316" },
  { nombre: "ARIANNA", apellido: "FERNANDEZ", telefono: "51913161201" },
  { nombre: "LAURA", apellido: "MENDEZ", telefono: "51914650449" },
  { nombre: "CLAUDIA", apellido: "PORCARELLI", telefono: "51963411931" },
  { nombre: "CLAIRYS", apellido: "CASTILLO", telefono: "51913365819" },

  // Colombia
  { nombre: "ELIANA", apellido: "MERCADO", telefono: "573134950422" },
  { nombre: "MARIA", apellido: "GARCIA", telefono: "573114594798" },
  { nombre: "YESICA", apellido: "ROJAS", telefono: "573134544701" },
  { nombre: "MERY", apellido: "PINEDA", telefono: "573115599569" },
  { nombre: "ORIANA", apellido: "GÓMEZ", telefono: "573136007914" },
  { nombre: "LARA", apellido: "TORREALBA", telefono: "573136007942" },
  { nombre: "VALERIA", apellido: "HURTADO", telefono: "573134485095" },
  { nombre: "EVA", apellido: "DUGARTE", telefono: "573202088761" },
  { nombre: "YULIANA", apellido: "RAMIREZ", telefono: "573134486342" },
  { nombre: "ILIANA", apellido: "VALLES", telefono: "56977551435" },
  { nombre: "ROUS", apellido: "COLINA", telefono: "56956935833" },
  { nombre: "BARBARA", apellido: "TORREALBA", telefono: "56940123023" },
  { nombre: "MIA", apellido: "ESCALONA", telefono: "56923734939" },
  { nombre: "ZARA", apellido: "FERNANDEZ", telefono: "56979801173" },
  { nombre: "BETANIA", apellido: "MALDONADO", telefono: "56940617409" },
  { nombre: "ANDREINA", apellido: "MENDOZA", telefono: "56973950206" },
  { nombre: "MELISSA", apellido: "MENDOZA", telefono: "51973706366" },
];

/**
 * Busca la información de una asesora por su número de teléfono
 * @param {string} telefono - Número de teléfono de la asesora
 * @returns {Object|null} - Objeto con nombre, apellido y teléfono, o null si no se encuentra
 */
function buscarAsesoraPorTelefono(telefono) {
  if (!telefono) return null;

  // Normalizar el teléfono (quitar espacios, guiones, etc.)
  const telefonoNormalizado = telefono.replace(/[\s\-\+]/g, "");

  // Buscar en la base de datos
  const asesora = asesoras.find((a) => {
    const telefonoAsesoraNormalizado = a.telefono.replace(/[\s\-\+]/g, "");
    return telefonoAsesoraNormalizado === telefonoNormalizado;
  });

  return asesora || null;
}

module.exports = {
  asesoras,
  buscarAsesoraPorTelefono,
};
