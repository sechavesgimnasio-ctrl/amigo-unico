# Amigo Único

Tienda de ropa para mascotas. Frontend estático (`/frontend`) + API en Node/Express con MongoDB (Mongoose) (`/backend`).

## Correr en local
1. `cd backend && npm install`
2. Copia `.env.example` a `.env` y completa los valores (incluida `MONGODB_URI` de MongoDB Atlas).
3. `npm run dev` (la API queda en http://localhost:3000)
4. Abre `frontend/pagina.html` con Live Server.

## Endpoints
| Método | Ruta | Acceso |
|---|---|---|
| GET | /api/productos | público |
| GET/POST/PUT/DELETE | /api/productos/todos, /api/productos, /api/productos/:id | admin |
| POST | /api/mensajes | público |
| GET/PATCH/DELETE | /api/mensajes | admin |
| POST | /api/auth/login | público |
| POST | /api/chat | público |
| POST | /api/usuarios/registro, /api/usuarios/login | público |
| GET | /api/usuarios/yo | cliente con sesión |

## Despliegue
- Frontend: GitHub Pages (carpeta `frontend`).
- Backend: Render (Root Directory `backend`, Build `npm install`, Start `npm start`) con las variables de `.env`.
