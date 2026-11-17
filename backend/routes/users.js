// Cuentas de clientes: registro, ingreso y consulta de la sesión.
import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';
import User from '../models/User.js';
import { soloUsuario } from '../middleware/auth.js';
import { ruta } from '../middleware/asyncHandler.js';

const router = Router();
const limite = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, message: { error: 'Demasiados intentos. Espera unos minutos.' } });
const firmar = (u) => jwt.sign({ rol: 'cliente', id: u._id }, process.env.JWT_SECRET, { expiresIn: '7d' });
const publico = (u) => ({ nombre: u.nombre, email: u.email }); // nunca devolvemos la clave

router.post('/registro', limite, ruta(async (req, res) => {
  const nombre = String(req.body.nombre || '').trim().slice(0, 80);
  const email = String(req.body.email || '').trim().toLowerCase();
  const clave = String(req.body.clave || '');
  if (nombre.length < 2) return res.status(400).json({ error: 'Escribe tu nombre.' });
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return res.status(400).json({ error: 'Escribe un correo válido.' });
  if (clave.length < 8 || clave.length > 72) return res.status(400).json({ error: 'La clave debe tener entre 8 y 72 caracteres.' });
  try {
    const u = await User.create({ nombre, email, clave: await bcrypt.hash(clave, 10) });
    res.status(201).json({ token: firmar(u), usuario: publico(u) });
  } catch (err) {
    if (err.code === 11000) return res.status(409).json({ error: 'Ese correo ya tiene una cuenta. Prueba ingresar.' });
    throw err;
  }
}));

router.post('/login', limite, ruta(async (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const u = await User.findOne({ email });
  // Mismo mensaje si falla el correo o la clave: así no revelamos cuál fue
  if (!u || !(await bcrypt.compare(String(req.body.clave || ''), u.clave))) {
    return res.status(401).json({ error: 'Correo o clave incorrectos.' });
  }
  res.json({ token: firmar(u), usuario: publico(u) });
}));

// El frontend la usa al cargar la página para confirmar que la sesión sigue vigente
router.get('/yo', soloUsuario, ruta(async (req, res) => {
  const u = await User.findById(req.usuario.id);
  if (!u) return res.status(401).json({ error: 'Sesión no válida.' });
  res.json(publico(u));
}));

export default router;
