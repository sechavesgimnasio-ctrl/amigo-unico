// Asesor virtual de Amigo Único. Tiene dos modos:
//  1) IA: si existe ANTHROPIC_API_KEY, responde con Claude usando el catálogo real como contexto.
//  2) Reglas: sin clave (o si la IA falla), responde con reglas escritas por nosotros.
// En los dos casos conoce los productos de la base de datos y habla con el tono de la marca.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Product from '../models/Product.js';

const router = Router();
const limite = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Vas muy rápido. Espera un momento.' } });

// ===== MODO REGLAS (sin IA) =====
const TALLAS = [{ talla: 'S', max: 40 }, { talla: 'M', max: 50 }, { talla: 'L', max: 65 }, { talla: 'XL', max: 85 }];
const RAZAS = [
  { claves: ['chihuahua', 'poodle', 'gato', 'gata', 'gatito'], talla: 'S' },
  { claves: ['pug', 'shih tzu', 'schnauzer'], talla: 'M' },
  { claves: ['bulldog', 'cocker'], talla: 'L' },
  { claves: ['labrador', 'golden', 'pitbull', 'pit bull'], talla: 'XL' }
];
// Situación del cliente -> palabra clave del producto que mejor le sirve
const SITUACIONES = [
  { claves: ['fiesta', 'boda', 'evento', 'elegante', 'cumple', 'matrimonio'], producto: 'esmoquin', frase: 'Para un evento especial' },
  { claves: ['dormir', 'noche'], producto: 'pijama', frase: 'Para dormir rico' },
  { claves: ['frio', 'abrigo', 'lluvia', 'helado'], producto: 'piloto', frase: 'Para el frío' },
  { claves: ['rockero', 'moderno', 'cuero', 'rock'], producto: 'cuerina', frase: 'Para un look rockero' },
  { claves: ['comodo', 'calor', 'jugar', 'correr', 'fresco', 'libertad'], producto: 'licra', frase: 'Para moverse con libertad' }
];
const MENU = 'Puedo ayudarte con la talla de tu mascota, qué prenda elegir, precios, envíos y pagos. ¿Qué quieres saber? 🐾';

// Pasa a minúsculas y quita tildes para comparar sin problemas ("Bogotá" = "bogota")
const limpiar = (t) => String(t).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
const contiene = (texto, claves) => claves.some((c) => texto.includes(c));
const precioTexto = (p) => (p.precio ? '$' + Number(p.precio).toLocaleString('es-CO') : 'precio por consultar');

export function responderConReglas(pregunta, productos) {
  const t = limpiar(pregunta);
  const palabras = new Set(t.split(/[^a-z0-9]+/));

  // 1. Talla a partir de una medida: "mi perro mide 45 cm de pecho"
  const medida = t.match(/(\d{2,3})(?:[.,](\d))?/);
  if (medida && contiene(t, ['pecho', 'talla', 'mide', 'cm', 'medida', 'contorno'])) {
    const cm = parseFloat(`${medida[1]}.${medida[2] || '0'}`);
    if (cm < 30 || cm > 85) return 'Esa medida está fuera de nuestras tallas (de 30 a 85 cm de pecho). Escríbenos por WhatsApp y vemos una prenda a la medida 🐾';
    const { talla } = TALLAS.find((x) => cm <= x.max);
    return `Con ${cm} cm de pecho, tu mascota usa talla ${talla} 🐾 Elígela en el catálogo antes de agregar la prenda al pedido.`;
  }

  // 2. Talla orientativa por raza
  const raza = RAZAS.find((r) => contiene(t, r.claves));
  if (raza) return `Para esa raza suele servir la talla ${raza.talla} 🐾 Para estar seguros, mide el contorno de pecho en cm y escríbemelo, así te digo la talla exacta.`;

  // 3. Pregunta general sobre tallas
  if (contiene(t, ['talla', 'medida', 'mide', 'tamano'])) {
    return 'Mide el contorno de pecho de tu mascota en cm y escríbemelo, por ejemplo: "mide 45 cm de pecho". Nuestras tallas: S (30-40 cm), M (41-50), L (51-65) y XL (66-85) 🐾';
  }

  // 4. Medios de pago
  if (contiene(t, ['pago', 'pagar', 'nequi', 'daviplata', 'transferencia', 'tarjeta'])) {
    return 'Aceptamos transferencia bancaria, Nequi y Daviplata. Si prefieres otro medio, pregúntanos por WhatsApp 🐾';
  }

  // 5. Envíos
  if (contiene(t, ['envio', 'enviar', 'domicilio', 'entrega', 'despacho', 'bogota'])) {
    return 'Enviamos a todo el país. En Bogotá el envío es gratis en compras desde $80.000, y hay pago contra entrega según la zona 🐾';
  }

  // 6. Precios
  if (contiene(t, ['precio', 'cuesta', 'cuanto', 'valor', 'vale', 'costo'])) {
    if (!productos.length) return 'Los precios los confirmamos por WhatsApp según el modelo y la talla 🐾';
    return 'Estos son nuestros precios:\n' + productos.map((p) => `- ${p.nombre}: ${precioTexto(p)}`).join('\n') + '\nPara los que dicen "por consultar", escríbenos por WhatsApp.';
  }

  // 7. El cliente menciona un producto por su nombre. Gana el que coincide con más palabras:
  //    "chaqueta piloto" coincide con 2 palabras de "Chaquetas Piloto" y con 1 de "Chaquetas de Cuerina".
  const puntos = productos.map((p) => ({
    p,
    n: limpiar(p.nombre).split(/\s+/).filter((w) => w.length >= 5 && t.includes(w.slice(0, 6))).length
  })).filter((x) => x.n > 0);
  const mejor = Math.max(0, ...puntos.map((x) => x.n));
  const porNombre = puntos.filter((x) => x.n === mejor).map((x) => x.p);
  if (porNombre.length === 1) {
    const p = porNombre[0];
    return `${p.nombre}: ${p.descripcion || 'una prenda muy especial'} (${precioTexto(p)}). Elige la talla en el catálogo y pulsa Agregar 🐾`;
  }
  if (porNombre.length > 1) return `Tenemos varias opciones: ${porNombre.map((p) => p.nombre).join(' y ')}. ¿Cuál te llama más la atención? 🐾`;

  // 8. El cliente cuenta una situación ("es para una boda", "hace frío")
  for (const s of SITUACIONES) {
    if (!contiene(t, s.claves)) continue;
    const p = productos.find((x) => limpiar(x.nombre).includes(s.producto));
    if (p) return `${s.frase} te recomiendo ${p.nombre}: ${p.descripcion || 'queda hermosa'} (${precioTexto(p)}) 🐾`;
  }

  // 9. Cómo comprar
  if (contiene(t, ['pedido', 'comprar', 'pedir', 'compra', 'quiero'])) {
    return 'Elige la prenda y la talla en el catálogo, pulsa Agregar y luego "Mi pedido": el mensaje se arma solo y lo envías por WhatsApp 🐾';
  }

  // 10. Cortesías
  if (contiene(t, ['gracias'])) return '¡Con mucho gusto! Si necesitas algo más, aquí estoy 🐾';
  if (['hola', 'buenas', 'buenos', 'hey', 'saludos'].some((s) => palabras.has(s))) return `¡Hola! Soy el asesor de Amigo Único. ${MENU}`;

  return `No estoy seguro de haber entendido. ${MENU} También puedes escribirnos por WhatsApp.`;
}
// ===== FIN MODO REGLAS =====

// ===== MODO IA =====
function instrucciones(productos) {
  const catalogo = productos
    .map((p) => `- ${p.nombre}: ${p.descripcion} (${p.precio ? '$' + p.precio.toLocaleString('es-CO') : 'precio: consultar por WhatsApp'})`).join('\n');
  return `Eres el asesor virtual de Amigo Único, una tienda colombiana de ropa y estilo para mascotas.
Tono: cercano, cálido y juguetón, en español de Colombia, con respuestas cortas (máximo 4 frases). Puedes usar algún emoji de huellas o mascotas, sin exagerar.
Tallas: S (pecho 30-40 cm), M (41-50), L (51-65), XL (66-85). Si te dan la medida del pecho, recomienda la talla.
Catálogo actual:
${catalogo}
Envío gratis en Bogotá en compras desde $80.000; envíos a todo el país y pago contra entrega según la zona. Pagos: transferencia, Nequi y Daviplata.
Reglas: recomienda solo productos del catálogo; no inventes precios, descuentos ni disponibilidad. Si no sabes algo o piden cerrar un pedido, invita a escribir por WhatsApp. Habla solo de la tienda y del cuidado de la ropa de mascotas.`;
}

router.post('/', limite, async (req, res) => {
  // Solo aceptamos los últimos 10 mensajes, con roles y largo controlados
  const mensajes = (Array.isArray(req.body.mensajes) ? req.body.mensajes : [])
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== 'user') return res.status(400).json({ error: 'Escribe una pregunta.' });

  try {
    const productos = await Product.find({ activo: true }).lean();
    const pregunta = mensajes[mensajes.length - 1].content;

    // Sin clave de IA: respondemos con las reglas
    if (!process.env.ANTHROPIC_API_KEY) return res.json({ respuesta: responderConReglas(pregunta, productos), modo: 'reglas' });

    try {
      const r = await fetch('https://api.anthropic.com/v1/messages', {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
        body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, system: instrucciones(productos), messages: mensajes })
      });
      if (!r.ok) throw new Error('API ' + r.status);
      const data = await r.json();
      return res.json({ respuesta: data.content.filter((b) => b.type === 'text').map((b) => b.text).join(''), modo: 'ia' });
    } catch (err) {
      // Si la IA falla (sin créditos, clave inválida, caída), el chat no se rompe: usa las reglas
      console.error('IA no disponible, usando reglas:', err.message);
      return res.json({ respuesta: responderConReglas(pregunta, productos), modo: 'reglas' });
    }
  } catch (err) {
    console.error('Error del chat:', err.message);
    res.status(502).json({ error: 'No pude responder ahora. Escríbenos por WhatsApp.' });
  }
});

export default router;
