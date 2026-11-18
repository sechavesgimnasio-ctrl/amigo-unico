// Dirección del backend. Cuando publiques la API en Render, cambia SOLO esta línea.
const API_URL = 'https://amigo-unico-api.onrender.com';

// Función única para hablar con la API: maneja errores y devuelve mensajes claros.
async function api(ruta, { metodo = 'GET', cuerpo, token } = {}) {
    let respuesta;
    try {
        respuesta = await fetch(API_URL + ruta, {
            method: metodo,
            headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: 'Bearer ' + token } : {}) },
            body: cuerpo ? JSON.stringify(cuerpo) : undefined
        });
    } catch {
        throw new Error('No hay conexión con el servidor. Intenta de nuevo en un momento.');
    }
    const datos = await respuesta.json().catch(() => ({}));
    if (!respuesta.ok) {
        const error = new Error(datos.error || 'Algo salió mal. Intenta de nuevo.');
        error.status = respuesta.status;
        throw error;
    }
    return datos;
}

// Evita que el texto de la base de datos se interprete como HTML (seguridad)
function esc(texto) {
    return String(texto ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
