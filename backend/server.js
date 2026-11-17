// Punto de entrada de la API de Amigo Único.
import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import { conectar } from './db.js';
import authRoutes from './routes/auth.js';
import productRoutes from './routes/products.js';
import messageRoutes from './routes/messages.js';
import chatRoutes from './routes/chat.js';
import userRoutes from './routes/users.js';

for (const v of ['JWT_SECRET', 'ADMIN_USER', 'ADMIN_PASSWORD', 'MONGODB_URI']) {
  if (!process.env[v]) { console.error(`Falta la variable ${v} en .env`); process.exit(1); }
}

const app = express();
app.set('trust proxy', 1); // necesario detrás de Render para el límite por IP
// CORS: solo el sitio del frontend puede llamar a la API desde el navegador
app.use(cors({ origin: (process.env.FRONTEND_URL || '').split(',') }));
app.use(express.json({ limit: '10kb' }));

app.get('/api/salud', (req, res) => res.json({ ok: true }));
app.use('/api/auth', authRoutes);
app.use('/api/productos', productRoutes);
app.use('/api/mensajes', messageRoutes);
app.use('/api/chat', chatRoutes);
app.use('/api/usuarios', userRoutes);

app.use((req, res) => res.status(404).json({ error: 'Ruta no encontrada.' }));
app.use((err, req, res, next) => { console.error(err); res.status(500).json({ error: 'Error del servidor.' }); });

// Primero conectamos a la base de datos; si falla, no abrimos el servidor
try {
  await conectar();
  app.listen(process.env.PORT || 3000, () => console.log('API lista en el puerto ' + (process.env.PORT || 3000)));
} catch (err) {
  console.error('No se pudo conectar a MongoDB:', err.message);
  process.exit(1);
}
