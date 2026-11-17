// Asesor con IA: conoce el catálogo real y habla con el tono de la marca.
import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import Product from '../models/Product.js';

const router = Router();
const limite = rateLimit({ windowMs: 60 * 1000, max: 15, message: { error: 'Vas muy rápido. Espera un momento.' } });

async function instrucciones() {
  const productos = await Product.find({ activo: true }).lean();
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
  if (!process.env.ANTHROPIC_API_KEY) return res.status(503).json({ error: 'El asesor aún no está configurado.' });

  // Solo aceptamos los últimos 10 mensajes, con roles y largo controlados
  const mensajes = (Array.isArray(req.body.mensajes) ? req.body.mensajes : [])
    .filter((m) => ['user', 'assistant'].includes(m.role) && typeof m.content === 'string' && m.content.trim())
    .slice(-10)
    .map((m) => ({ role: m.role, content: m.content.slice(0, 500) }));
  if (!mensajes.length || mensajes[mensajes.length - 1].role !== 'user') return res.status(400).json({ error: 'Escribe una pregunta.' });

  try {
    const r = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-api-key': process.env.ANTHROPIC_API_KEY, 'anthropic-version': '2023-06-01' },
      body: JSON.stringify({ model: process.env.ANTHROPIC_MODEL || 'claude-haiku-5-5', max_tokens: 400, system: await instrucciones(), messages: mensajes })
    });
    if (!r.ok) throw new Error('API ' + r.status);
    const data = await r.json();
    res.json({ respuesta: data.content.filter((b) => b.type === 'text').map((b) => b.text).join('') });
  } catch (err) {
    console.error('Error del chat:', err.message);
    res.status(502).json({ error: 'No pude responder ahora. Escríbenos por WhatsApp.' });
  }
});

export default router;
