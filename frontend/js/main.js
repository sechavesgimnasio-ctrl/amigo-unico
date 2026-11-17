// main.js: lógica de la tienda pública (catálogo, pedido por WhatsApp, buscador de talla,
// formulario de contacto, cuenta de cliente y chat con el asesor de IA).
document.addEventListener('DOMContentLoaded', () => {
    // Número de WhatsApp con indicativo de país (57 = Colombia), sin + ni espacios
    const WHATSAPP = '573164970935';
    const $ = (selector) => document.querySelector(selector);

    // ---------- Alerta emergente ----------
    const toast = $('#toast');
    let temporizadorToast;
    function mostrarToast(texto) {
        toast.textContent = texto;
        toast.classList.add('show');
        clearTimeout(temporizadorToast);
        temporizadorToast = setTimeout(() => toast.classList.remove('show'), 3000);
    }

    // ---------- Menú hamburguesa ----------
    const menuToggle = $('#menu-toggle');
    const navMenu = $('#nav-menu');
    menuToggle.addEventListener('click', () => {
        const abierto = navMenu.classList.toggle('activo');
        menuToggle.setAttribute('aria-expanded', abierto);
    });
    navMenu.querySelectorAll('a').forEach((enlace) => {
        enlace.addEventListener('click', () => {
            navMenu.classList.remove('activo');
            menuToggle.setAttribute('aria-expanded', 'false');
        });
    });

    // ---------- Catálogo desde la API ----------
    const grid = $('#grid-productos');
    const formatoPrecio = (p) => (p ? '$' + Number(p).toLocaleString('es-CO') : 'Consultar precio');

    function tarjeta(p) {
        // Solo aceptamos íconos con formato fa-algo; si no, usamos la huella
        const icono = /^fa-[a-z-]+$/.test(p.icono) ? p.icono : 'fa-paw';
        return `<article class="card-producto" data-nombre="${esc(p.nombre)}">
            <div class="imagen-producto"><i class="fas ${icono}"></i></div>
            <div class="card-body">
                <h3>${esc(p.nombre)}</h3>
                <p>${esc(p.descripcion)}</p>
                <span class="precio">${formatoPrecio(p.precio)}</span>
                <div class="acciones">
                    <label class="sr-only" for="t-${esc(p._id)}">Talla</label>
                    <select id="t-${esc(p._id)}" class="talla"><option>S</option><option>M</option><option>L</option><option>XL</option></select>
                    <button class="btn-agregar">Agregar</button>
                </div>
            </div>
        </article>`;
    }

    async function cargarProductos() {
        grid.innerHTML = '<p class="estado-carga">Cargando productos...</p>';
        try {
            const productos = await api('/api/productos');
            grid.innerHTML = productos.length
                ? productos.map(tarjeta).join('')
                : '<p class="estado-carga">Pronto tendremos prendas nuevas. Escríbenos por WhatsApp.</p>';
        } catch (error) {
            grid.innerHTML = `<div class="estado-carga error"><p>${esc(error.message)}</p><button class="btn-principal" id="reintentar">Reintentar</button></div>`;
            $('#reintentar').addEventListener('click', cargarProductos);
        }
    }

    // ---------- Buscador de talla ----------
    const tallas = [{ talla: 'S', max: 40 }, { talla: 'M', max: 50 }, { talla: 'L', max: 65 }, { talla: 'XL', max: 85 }];
    const campoPecho = $('#pecho');
    const resultado = $('#resultado-talla');
    const filas = document.querySelectorAll('#tallas tbody tr');

    campoPecho.addEventListener('input', () => {
        const medida = parseFloat(campoPecho.value);
        filas.forEach((fila) => fila.classList.remove('resaltada'));
        if (!medida || medida <= 0) { resultado.textContent = 'Escribe la medida y te decimos la talla.'; return; }
        if (medida < 30 || medida > 85) { resultado.textContent = 'Esa medida está fuera de nuestras tallas. Escríbenos y la hacemos a la medida.'; return; }
        const indice = tallas.findIndex((t) => medida <= t.max);
        resultado.innerHTML = `Tu mascota usa talla <strong>${tallas[indice].talla}</strong>`;
        filas[indice].classList.add('resaltada');
    });

    // ---------- Pedido ----------
    const panel = $('#pedido');
    const botonAbrir = $('#abrir-pedido');
    const lista = $('#lista-pedido');
    const contador = $('#contador');
    const botonEnviar = $('#enviar-pedido');
    let pedido = [];

    function abrirPanel(abrir) { panel.hidden = !abrir; botonAbrir.setAttribute('aria-expanded', abrir); }
    botonAbrir.addEventListener('click', () => abrirPanel(panel.hidden));
    $('#cerrar-pedido').addEventListener('click', () => abrirPanel(false));

    function pintarPedido() {
        contador.textContent = pedido.reduce((suma, item) => suma + item.cantidad, 0);
        if (pedido.length === 0) {
            lista.innerHTML = '<li class="vacio">Aún no has agregado prendas.</li>';
            botonEnviar.classList.add('desactivado');
            botonEnviar.href = '#';
            return;
        }
        lista.innerHTML = pedido.map((item, i) =>
            `<li><span>${item.cantidad} × ${esc(item.nombre)} (talla ${item.talla})</span><button data-quitar="${i}" aria-label="Quitar ${esc(item.nombre)}">&times;</button></li>`).join('');
        const saludo = sesion ? `Hola Amigo Único, soy ${sesion.usuario.nombre} y quiero pedir:\n` : 'Hola Amigo Único, quiero pedir:\n';
        const mensaje = saludo + pedido.map((i) => `- ${i.cantidad} × ${i.nombre} (talla ${i.talla})`).join('\n');
        botonEnviar.href = `https://wa.me/${WHATSAPP}?text=${encodeURIComponent(mensaje)}`;
        botonEnviar.classList.remove('desactivado');
    }

    lista.addEventListener('click', (e) => {
        const boton = e.target.closest('[data-quitar]');
        if (!boton) return;
        pedido.splice(Number(boton.dataset.quitar), 1);
        pintarPedido();
    });

    // Las tarjetas se crean con JavaScript, así que escuchamos los clics en el contenedor
    grid.addEventListener('click', (e) => {
        const boton = e.target.closest('.btn-agregar');
        if (!boton) return;
        const tarjetaEl = boton.closest('.card-producto');
        const nombre = tarjetaEl.dataset.nombre;
        const talla = tarjetaEl.querySelector('.talla').value;
        const existente = pedido.find((p) => p.nombre === nombre && p.talla === talla);
        if (existente) existente.cantidad++; else pedido.push({ nombre, talla, cantidad: 1 });
        pintarPedido();
        mostrarToast(`Agregado: ${nombre}, talla ${talla}`);
    });

    // ---------- Formulario de contacto (se guarda en la base de datos) ----------
    const formContacto = $('#form-contacto');
    const botonContacto = $('#enviar-contacto');
    formContacto.addEventListener('submit', async (e) => {
        e.preventDefault();
        botonContacto.disabled = true;
        botonContacto.textContent = 'Enviando...';
        try {
            await api('/api/mensajes', { metodo: 'POST', cuerpo: {
                nombre: $('#nombre').value, contacto: $('#contacto-dato').value, mensaje: $('#mensaje').value
            } });
            formContacto.reset();
            mostrarToast('¡Mensaje enviado! Te responderemos pronto 🐾');
        } catch (error) {
            mostrarToast(error.message);
        } finally {
            botonContacto.disabled = false;
            botonContacto.textContent = 'Enviar mensaje';
        }
    });

    // ---------- Chat con el asesor de IA ----------
    const chat = $('#chat');
    const chatAbrir = $('#chat-abrir');
    const chatMensajes = $('#chat-mensajes');
    const chatForm = $('#chat-form');
    const chatTexto = $('#chat-texto');
    const historial = []; // se envía al backend para que recuerde la conversación

    function burbuja(texto, tipo) {
        const div = document.createElement('div');
        div.className = 'burbuja ' + tipo;
        div.textContent = texto; // textContent: seguro contra HTML inyectado
        chatMensajes.appendChild(div);
        chatMensajes.scrollTop = chatMensajes.scrollHeight;
        return div;
    }
    function abrirChat(abrir) {
        chat.hidden = !abrir;
        chatAbrir.hidden = abrir;
        chatAbrir.setAttribute('aria-expanded', abrir);
        if (abrir) {
            if (!chatMensajes.children.length) burbuja('¡Hola! Soy el asesor de Amigo Único 🐾 Cuéntame qué mascota tienes y te ayudo a elegir prenda y talla.', 'bot');
            chatTexto.focus();
        }
    }
    chatAbrir.addEventListener('click', () => abrirChat(true));
    $('#chat-cerrar').addEventListener('click', () => abrirChat(false));

    chatForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const pregunta = chatTexto.value.trim();
        if (!pregunta) return;
        chatTexto.value = '';
        burbuja(pregunta, 'yo');
        historial.push({ role: 'user', content: pregunta });
        const espera = burbuja('Escribiendo...', 'bot');
        chatForm.querySelector('button').disabled = true;
        try {
            const { respuesta } = await api('/api/chat', { metodo: 'POST', cuerpo: { mensajes: historial } });
            espera.textContent = respuesta;
            historial.push({ role: 'assistant', content: respuesta });
        } catch (error) {
            espera.textContent = error.message;
            espera.classList.add('error');
            historial.pop(); // quitamos la pregunta fallida para no desordenar la conversación
        } finally {
            chatForm.querySelector('button').disabled = false;
            chatMensajes.scrollTop = chatMensajes.scrollHeight;
        }
    });

    // ---------- Cuenta de cliente (registro e ingreso) ----------
    const dialogo = $('#cuenta');
    const avisoCuenta = $('#cuenta-aviso');
    let sesion = null; // { token, usuario: { nombre, email } }
    try { sesion = JSON.parse(localStorage.getItem('sesion')); } catch { sesion = null; }

    function guardarSesion(nueva) {
        sesion = nueva;
        try { nueva ? localStorage.setItem('sesion', JSON.stringify(nueva)) : localStorage.removeItem('sesion'); } catch { /* sin almacenamiento */ }
        pintarCuenta();
        pintarPedido(); // el mensaje de WhatsApp incluye el nombre
    }

    function pintarCuenta() {
        const dentro = Boolean(sesion);
        $('#abrir-cuenta').innerHTML = '<i class="fas fa-user"></i> ' + (dentro ? esc(sesion.usuario.nombre.split(' ')[0]) : 'Ingresar');
        $('#vista-cuenta').hidden = !dentro;
        $('#vista-auth').hidden = dentro;
        if (dentro) {
            $('#cuenta-datos').textContent = `${sesion.usuario.nombre} (${sesion.usuario.email})`;
            // Rellenamos el formulario de contacto para ahorrarle tiempo
            if (!$('#nombre').value) $('#nombre').value = sesion.usuario.nombre;
            if (!$('#contacto-dato').value) $('#contacto-dato').value = sesion.usuario.email;
        }
    }

    function vistaAuth(registro) {
        $('#form-ingreso').hidden = registro;
        $('#form-registro').hidden = !registro;
        $('#tab-ingresar').setAttribute('aria-selected', !registro);
        $('#tab-registro').setAttribute('aria-selected', registro);
        avisoCuenta.hidden = true;
    }
    $('#tab-ingresar').addEventListener('click', () => vistaAuth(false));
    $('#tab-registro').addEventListener('click', () => vistaAuth(true));

    $('#abrir-cuenta').addEventListener('click', () => { pintarCuenta(); dialogo.showModal(); });
    $('#cerrar-cuenta').addEventListener('click', () => dialogo.close());
    dialogo.addEventListener('click', (e) => { if (e.target === dialogo) dialogo.close(); }); // clic fuera = cerrar

    async function autenticar(ruta, cuerpo, boton, etiqueta) {
        avisoCuenta.hidden = true;
        boton.disabled = true;
        boton.textContent = 'Un momento...';
        try {
            const datos = await api('/api/usuarios/' + ruta, { metodo: 'POST', cuerpo });
            guardarSesion({ token: datos.token, usuario: datos.usuario });
            $('#form-ingreso').reset();
            $('#form-registro').reset();
            dialogo.close();
            mostrarToast(`¡Hola, ${datos.usuario.nombre.split(' ')[0]}! 🐾`);
        } catch (error) {
            avisoCuenta.textContent = error.message;
            avisoCuenta.hidden = false;
        } finally {
            boton.disabled = false;
            boton.textContent = etiqueta;
        }
    }
    $('#form-ingreso').addEventListener('submit', (e) => {
        e.preventDefault();
        autenticar('login', { email: $('#ing-email').value, clave: $('#ing-clave').value }, $('#ing-boton'), 'Ingresar');
    });
    $('#form-registro').addEventListener('submit', (e) => {
        e.preventDefault();
        autenticar('registro', { nombre: $('#reg-nombre').value, email: $('#reg-email').value, clave: $('#reg-clave').value }, $('#reg-boton'), 'Crear cuenta');
    });
    $('#salir-cuenta').addEventListener('click', () => {
        guardarSesion(null);
        dialogo.close();
        mostrarToast('Cerraste sesión. ¡Vuelve pronto!');
    });

    // Al cargar, confirmamos con el servidor que la sesión guardada siga vigente
    if (sesion) {
        api('/api/usuarios/yo', { token: sesion.token })
            .then((usuario) => guardarSesion({ token: sesion.token, usuario }))
            .catch((error) => { if (error.status === 401) guardarSesion(null); });
    }

    pintarCuenta();
    pintarPedido();
    cargarProductos();
});
