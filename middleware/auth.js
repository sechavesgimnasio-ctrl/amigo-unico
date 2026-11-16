// Protege rutas según el tipo de sesión. El token lleva un "rol": admin o cliente.
import jwt from 'jsonwebtoken';

function leerToken(req) {
  try { return jwt.verify((req.headers.authorization || '').replace('Bearer ', ''), process.env.JWT_SECRET); }
  catch { return null; }
}

const NO_VALIDA = { error: 'Sesión no válida. Inicia sesión de nuevo.' };

// Solo el administrador (un cliente con cuenta NO puede pasar)
export function soloAdmin(req, res, next) {
  const token = leerToken(req);
  if (!token || token.rol !== 'admin') return res.status(401).json(NO_VALIDA);
  req.admin = token;
  next();
}

// Solo clientes con sesión iniciada
export function soloUsuario(req, res, next) {
  const token = leerToken(req);
  if (!token || token.rol !== 'cliente') return res.status(401).json(NO_VALIDA);
  req.usuario = token;
  next();
}
