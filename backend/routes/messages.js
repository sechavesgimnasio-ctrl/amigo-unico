import { Router } from 'express';
import mongoose from 'mongoose';
import rateLimit from 'express-rate-limit';
import Message from '../models/Message.js';
import { soloAdmin } from '../middleware/auth.js';
import { ruta } from '../middleware/asyncHandler.js';

const router = Router();
// Anti-spam: 5 mensajes por hora por IP
const limite = rateLimit({ windowMs: 60 * 60 * 1000, max: 5, message: { error: 'Enviaste muchos mensajes. Intenta más tarde.' } });
const idValido = (req, res, next) =>
  mongoose.isValidObjectId(req.params.id) ? next() : res.status(400).json({ error: 'Identificador no válido.' });

// Público: el formulario de contacto
router.post('/', limite, ruta(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim().slice(0, 80);
  const contacto = String(req.body.contacto || '').trim().slice(0, 120);
  const mensaje = String(req.body.mensaje || '').trim().slice(0, 1000);
  if (!nombre || !mensaje) return res.status(400).json({ error: 'Escribe tu nombre y tu mensaje.' });
  await Message.create({ nombre, contacto, mensaje });
  res.status(201).json({ ok: true });
}));

// Admin: leer, marcar como leído y borrar
router.get('/', soloAdmin, ruta(async (req, res) => {
  res.json(await Message.find().sort({ createdAt: -1 }));
}));
router.patch('/:id/leido', soloAdmin, idValido, ruta(async (req, res) => {
  await Message.findByIdAndUpdate(req.params.id, { leido: true });
  res.json({ ok: true });
}));
router.delete('/:id', soloAdmin, idValido, ruta(async (req, res) => {
  await Message.findByIdAndDelete(req.params.id);
  res.json({ ok: true });
}));

export default router;
