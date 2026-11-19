// Pedidos: la tienda avisa al servidor cuando un cliente envía su pedido por WhatsApp,
// y el administrador los ve en su panel.
import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Order from '../models/Order.js';
import Product from '../models/Product.js';
import User from '../models/User.js';
import { soloAdmin, usuarioOpcional } from '../middleware/auth.js';
import { ruta } from '../middleware/asyncHandler.js';

const router = Router();
const limite = rateLimit({ windowMs: 60 * 60 * 1000, max: 20, message: { error: 'Demasiados pedidos seguidos. Intenta más tarde.' } });
const TALLAS = ['S', 'M', 'L', 'XL'];
const idValido = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Identificador no válido.' });

// Público: registra el pedido. Si el cliente tiene sesión, se guarda su nombre y correo.
router.post('/', limite, usuarioOpcional, ruta(async (req, res) => {
  const crudo = Array.isArray(req.body.items) ? req.body.items.slice(0, 20) : [];
  const catalogo = await Product.find({ activo: true }).select('nombre precio precios').lean();

  const items = [];
  for (const i of crudo) {
    const nombre = String(i.nombre || '').trim().slice(0, 100);
    const cantidad = Number(i.cantidad);
    const producto = catalogo.find((p) => p.nombre === nombre);
    if (!producto || !TALLAS.includes(i.talla) || !Number.isInteger(cantidad) || cantidad < 1 || cantidad > 20) continue;
    // El precio sale de la base de datos, nunca del navegador: así nadie puede inventar precios
    items.push({ nombre, talla: i.talla, cantidad, precio: (producto.precios && producto.precios[i.talla]) ?? producto.precio ?? null });
  }
  if (!items.length) return res.status(400).json({ error: 'El pedido está vacío.' });

  let cliente = { nombre: '', email: '' };
  if (req.usuario) {
    const u = await User.findById(req.usuario.id);
    if (u) cliente = { nombre: u.nombre, email: u.email };
  }
  await Order.create({
    items,
    total: items.reduce((suma, i) => suma + (i.precio || 0) * i.cantidad, 0),
    precioIncompleto: items.some((i) => i.precio === null),
    cliente
  });
  res.status(201).json({ ok: true });
}));

// Admin: ver, marcar como atendido y borrar
router.get('/', soloAdmin, ruta(async (req, res) => {
  res.json(await Order.find().sort({ createdAt: -1 }).limit(100));
}));
router.patch('/:id/atendido', soloAdmin, idValido, ruta(async (req, res) => {
  await Order.findByIdAndUpdate(req.params.id, { atendido: true });
  res.json({ ok: true });
}));
router.delete('/:id', soloAdmin, idValido, ruta(async (req, res) => {
  await Order.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
