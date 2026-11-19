import { Router } from 'express';
import mongoose from 'mongoose';
import Product from '../models/Product.js';
import { soloAdmin } from '../middleware/auth.js';
import { ruta } from '../middleware/asyncHandler.js';

const router = Router();

// Valida y limpia los datos de un producto
function limpiar(body) {
  const nombre = String(body.nombre || '').trim();
  if (!nombre) return { error: 'El nombre es obligatorio.' };
  const precio = body.precio === '' || body.precio == null ? null : Number(body.precio);
  if (precio !== null && (!Number.isInteger(precio) || precio < 0)) return { error: 'El precio debe ser un número entero.' };
  // Precio por talla: cada talla puede tener el suyo; vacío = se usa el precio base
  const precios = {};
  for (const t of ['S', 'M', 'L', 'XL']) {
    const v = body.precios && body.precios[t];
    if (v === '' || v == null) { precios[t] = null; continue; }
    const n = Number(v);
    if (!Number.isInteger(n) || n < 0) return { error: `El precio de la talla ${t} debe ser un número entero.` };
    precios[t] = n;
  }

  // La foto llega como data URL (jpeg, png o webp). Validamos formato y peso para no guardar basura.
  const imagen = String(body.imagen || '');
  if (imagen && !/^data:image\/(jpeg|png|webp);base64,[A-Za-z0-9+/=]+$/.test(imagen)) return { error: 'La imagen no es válida.' };
  if (imagen.length > 350000) return { error: 'La imagen pesa demasiado. Prueba con otra más pequeña.' };
  return { nombre, descripcion: String(body.descripcion || '').trim(), precio, precios, icono: String(body.icono || 'fa-paw').trim(), imagen, activo: !(body.activo === false || body.activo === 0) };
}

// Evita consultas con ids mal formados
const idValido = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Identificador no válido.' });

// Público: solo productos activos (los que ve el cliente)
router.get('/', ruta(async (req, res) => {
  res.json(await Product.find({ activo: true }).sort({ _id: 1 }));
}));

// Admin: todos, incluso ocultos
router.get('/todos', soloAdmin, ruta(async (req, res) => {
  res.json(await Product.find().sort({ _id: 1 }));
}));

router.post('/', soloAdmin, ruta(async (req, res) => {
  const p = limpiar(req.body);
  if (p.error) return res.status(400).json(p);
  res.status(201).json(await Product.create(p));
}));

router.put('/:id', soloAdmin, idValido, ruta(async (req, res) => {
  const p = limpiar(req.body);
  if (p.error) return res.status(400).json(p);
  const actualizado = await Product.findByIdAndUpdate(req.params.id, p, { new: true });
  if (!actualizado) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json(actualizado);
}));

router.delete('/:id', soloAdmin, idValido, ruta(async (req, res) => {
  const borrado = await Product.findByIdAndDelete(req.params.id);
  if (!borrado) return res.status(404).json({ error: 'Producto no encontrado.' });
  res.json({ ok: true });
}));

export default router;
