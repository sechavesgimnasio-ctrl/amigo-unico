# Amigo Único 🐾

Tienda web de ropa y estilo para mascotas: chaquetas de cuerina, enterizos, pijamas, chaquetas piloto y esmoquin.
Proyecto final de la Ruta Avanzada de Jóvenes creaTIvos.

## Qué hace
- Página de inicio con marca propia y buscador de talla.
- Catálogo de productos que se carga desde la base de datos.
- Pedido que se envía por WhatsApp con las prendas y tallas elegidas.
- Formulario de contacto que guarda los mensajes en la base de datos.
- Cuentas de clientes (registro e ingreso).
- Panel de administrador con login para gestionar productos y leer mensajes (`admin.html`).
- Asesor con IA que conoce el catálogo, las tallas y el tono de la marca.

## Tecnologías
- **Frontend:** HTML, CSS y JavaScript.
- **Backend:** Node.js, Express, MongoDB (Mongoose), JWT y bcrypt.
- **IA:** API de Anthropic (Claude), llamada solo desde el backend para no exponer la clave.

## Estructura
```
amigo-unico/
├── backend/
│   ├── server.js          # Punto de entrada de la API
│   ├── db.js              # Conexión a MongoDB y productos iniciales
│   ├── models/            # Esquemas: Product, Message, User
│   ├── routes/            # Rutas: products, messages, users, auth, chat
│   ├── middleware/        # Protección de rutas (admin / cliente) y manejo de errores
│   └── .env.example       # Variables necesarias (sin valores reales)
└── frontend/
    ├── index.html         # Tienda pública
    ├── admin.html         # Panel de administrador
    ├── css/styles.css
    └── js/                # config.js (dirección de la API), main.js, admin.js
```

## Cómo correrlo en local
1. `cd backend` y `npm install`.
2. Copia `.env.example` a `.env` y completa los valores (incluida `MONGODB_URI` de MongoDB Atlas).
3. `npm run dev` (la API queda en http://localhost:3000).
4. En `frontend/js/config.js` deja `API_URL` apuntando a la API y abre `frontend/index.html`.

## Endpoints
| Método | Ruta | Acceso |
|---|---|---|
| GET | /api/productos | público |
| GET | /api/productos/todos | admin |
| POST, PUT, DELETE | /api/productos, /api/productos/:id | admin |
| POST | /api/mensajes | público |
| GET, PATCH, DELETE | /api/mensajes | admin |
| POST | /api/auth/login | público (admin) |
| POST | /api/usuarios/registro, /api/usuarios/login | público |
| GET | /api/usuarios/yo | cliente con sesión |
| POST | /api/chat | público |

## Seguridad
- Las claves de los usuarios se guardan cifradas con bcrypt.
- Las rutas del panel exigen un token de administrador; un cliente con cuenta no puede usarlas.
- Hay límite de intentos en el login, el registro, el contacto y el chat.
- Los secretos viven en `.env`, que no se sube a GitHub.

## Despliegue
- Frontend: GitHub Pages.
- Backend: Render, con base de datos en MongoDB Atlas.
- App publicada: _(pendiente de agregar el enlace)_
