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
  return { nombre, descripcion: String(body.descripcion || '').trim(), precio, icono: String(body.icono || 'fa-paw').trim(), activo: !(body.activo === false || body.activo === 0) };
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
