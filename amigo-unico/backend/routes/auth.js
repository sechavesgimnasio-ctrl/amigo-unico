import { Router } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import rateLimit from 'express-rate-limit';

const router = Router();
// Máximo 10 intentos de login cada 15 minutos por IP (frena fuerza bruta)
const limite = rateLimit({ windowMs: 15 * 60 * 1000, max: 10, message: { error: 'Demasiados intentos. Espera unos minutos.' } });

router.post('/login', limite, (req, res) => {
  const { usuario, clave } = req.body || {};
  const usuarioOk = usuario === process.env.ADMIN_USER;
  // La clave real vive solo en .env; la comparamos con bcrypt
  const claveOk = bcrypt.compareSync(String(clave || ''), bcrypt.hashSync(process.env.ADMIN_PASSWORD, 8));
  if (!usuarioOk || !claveOk) return res.status(401).json({ error: 'Usuario o clave incorrectos.' });
  const token = jwt.sign({ rol: 'admin' }, process.env.JWT_SECRET, { expiresIn: '8h' });
  res.json({ token });
});

export default router;
