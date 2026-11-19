// Lógica del panel de administrador: login, productos y mensajes.
document.addEventListener('DOMContentLoaded', () => {
    const $ = (s) => document.querySelector(s);
    let token = sessionStorage.getItem('token'); // se borra al cerrar la pestaña
    let avisos = null; // temporizador que revisa si llegaron pedidos nuevos

    // ---------- Avisos ----------
    function aviso(texto, tipo = 'ok') {
        const el = $('#aviso');
        el.textContent = texto;
        el.className = 'aviso ' + tipo;
        el.hidden = false;
        clearTimeout(aviso.t);
        aviso.t = setTimeout(() => (el.hidden = true), 4000);
    }
    // Si el servidor dice 401, la sesión venció: volvemos al login
    function manejarError(error) {
        if (error.status === 401) { cerrarSesion(); $('#login-aviso').textContent = error.message; $('#login-aviso').hidden = false; }
        else aviso(error.message, 'error');
    }

    // ---------- Sesión ----------
    function mostrarPanel(si) {
        $('#login-caja').hidden = si;
        $('#panel').hidden = !si;
        if (si) { cargarProductos(); cargarMensajes(); cargarPedidos(); iniciarAvisos(); }
    }
    function cerrarSesion() { clearInterval(avisos); token = null; sessionStorage.removeItem('token'); mostrarPanel(false); }
    $('#salir').addEventListener('click', cerrarSesion);

    $('#form-login').addEventListener('submit', async (e) => {
        e.preventDefault();
        const boton = $('#login-boton');
        boton.disabled = true; boton.textContent = 'Entrando...';
        $('#login-aviso').hidden = true;
        try {
            const datos = await api('/api/auth/login', { metodo: 'POST', cuerpo: { usuario: $('#usuario').value, clave: $('#clave').value } });
            token = datos.token;
            sessionStorage.setItem('token', token);
            $('#clave').value = '';
            mostrarPanel(true);
        } catch (error) {
            $('#login-aviso').textContent = error.message;
            $('#login-aviso').hidden = false;
        } finally { boton.disabled = false; boton.textContent = 'Entrar'; }
    });

    // ---------- Pestañas ----------
    function pestana(nombre) {
        ['productos', 'mensajes', 'pedidos'].forEach((n) => {
            $('#vista-' + n).hidden = n !== nombre;
            $('#tab-' + n).setAttribute('aria-selected', n === nombre);
        });
        if (nombre === 'pedidos') cargarPedidos();
    }
    ['productos', 'mensajes', 'pedidos'].forEach((n) => $('#tab-' + n).addEventListener('click', () => pestana(n)));

    // ---------- Productos ----------
    let productos = [];
    async function cargarProductos() {
        $('#lista-productos').innerHTML = '<p class="estado-carga">Cargando...</p>';
        try {
            productos = await api('/api/productos/todos', { token });
            $('#lista-productos').innerHTML = productos.length ? productos.map((p) => `
                <div class="fila-admin ${p.activo ? '' : 'oculto'}">
                    <div>${p.imagen ? `<img class="mini-foto" src="${p.imagen}" alt="">` : ''}<strong>${esc(p.nombre)}</strong> ${p.activo ? '' : '(oculto)'}<p>${esc(p.descripcion)}</p>
                    <p>${resumenPrecios(p)}</p></div>
                    <div class="acciones-fila">
                        <button class="mini" data-editar="${esc(p._id)}">Editar</button>
                        <button class="mini peligro" data-borrar="${esc(p._id)}">Borrar</button>
                    </div>
                </div>`).join('') : '<p class="estado-carga">Aún no hay productos. Agrega el primero arriba.</p>';
        } catch (error) { manejarError(error); }
    }

    function limpiarFormulario() {
        $('#form-producto').reset();
        ponerFoto('');
        $('#p-id').value = '';
        $('#p-activo').checked = true;
        $('#titulo-form').textContent = 'Agregar producto';
        $('#cancelar-edicion').hidden = true;
    }
    $('#cancelar-edicion').addEventListener('click', limpiarFormulario);

    $('#form-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('#p-id').value;
        const cuerpo = { nombre: $('#p-nombre').value, descripcion: $('#p-desc').value, precio: $('#p-precio').value, icono: $('#p-icono').value, imagen: $('#p-imagen').value, activo: $('#p-activo').checked,
            precios: { S: $('#p-ps').value, M: $('#p-pm').value, L: $('#p-pl').value, XL: $('#p-pxl').value } };
        const boton = $('#guardar-producto');
        boton.disabled = true; boton.textContent = 'Guardando...';
        try {
            await api(id ? `/api/productos/${id}` : '/api/productos', { metodo: id ? 'PUT' : 'POST', cuerpo, token });
            aviso(id ? 'Producto actualizado.' : 'Producto agregado.');
            limpiarFormulario();
            cargarProductos();
        } catch (error) { manejarError(error); }
        finally { boton.disabled = false; boton.textContent = 'Guardar producto'; }
    });

    $('#lista-productos').addEventListener('click', async (e) => {
        const editar = e.target.closest('[data-editar]');
        const borrar = e.target.closest('[data-borrar]');
        if (editar) {
            const p = productos.find((x) => x._id === editar.dataset.editar);
            $('#p-id').value = p._id; $('#p-nombre').value = p.nombre; $('#p-desc').value = p.descripcion || '';
            $('#p-precio').value = p.precio ?? ''; $('#p-icono').value = p.icono; $('#p-activo').checked = p.activo; ponerFoto(p.imagen || '');
            const pr = p.precios || {};
            $('#p-ps').value = pr.S ?? ''; $('#p-pm').value = pr.M ?? ''; $('#p-pl').value = pr.L ?? ''; $('#p-pxl').value = pr.XL ?? '';
            $('#titulo-form').textContent = 'Editar producto';
            $('#cancelar-edicion').hidden = false;
            $('#form-producto').scrollIntoView({ behavior: 'smooth' });
        }
        if (borrar && confirm('¿Seguro que quieres borrar este producto?')) {
            try { await api(`/api/productos/${borrar.dataset.borrar}`, { metodo: 'DELETE', token }); aviso('Producto borrado.'); cargarProductos(); }
            catch (error) { manejarError(error); }
        }
    });

    // ---------- Mensajes ----------
    async function cargarMensajes() {
        try {
            const mensajes = await api('/api/mensajes', { token });
            const sinLeer = mensajes.filter((m) => !m.leido).length;
            $('#no-leidos').textContent = sinLeer ? `(${sinLeer})` : '';
            $('#lista-mensajes').innerHTML = mensajes.length ? mensajes.map((m) => `
                <div class="fila-admin ${m.leido ? '' : 'no-leido'}">
                    <div><strong>${esc(m.nombre)}</strong> <small>${new Date(m.createdAt).toLocaleString('es-CO')}</small>
                    <p>${esc(m.mensaje)}</p>${m.contacto ? `<p>Contacto: ${esc(m.contacto)}</p>` : ''}</div>
                    <div class="acciones-fila">
                        ${m.leido ? '' : `<button class="mini" data-leido="${esc(m._id)}">Marcar leído</button>`}
                        <button class="mini peligro" data-borrar-msg="${esc(m._id)}">Borrar</button>
                    </div>
                </div>`).join('') : '<p class="estado-carga">Todavía no hay mensajes.</p>';
        } catch (error) { manejarError(error); }
    }

    $('#lista-mensajes').addEventListener('click', async (e) => {
        const leido = e.target.closest('[data-leido]');
        const borrar = e.target.closest('[data-borrar-msg]');
        try {
            if (leido) { await api(`/api/mensajes/${leido.dataset.leido}/leido`, { metodo: 'PATCH', token }); cargarMensajes(); }
            if (borrar && confirm('¿Borrar este mensaje?')) { await api(`/api/mensajes/${borrar.dataset.borrarMsg}`, { metodo: 'DELETE', token }); cargarMensajes(); }
        } catch (error) { manejarError(error); }
    });

    // Texto corto con el precio base y los de cada talla, para la lista de productos
    function resumenPrecios(p) {
        const dinero = (n) => '$' + Number(n).toLocaleString('es-CO');
        const porTalla = ['S', 'M', 'L', 'XL'].filter((t) => p.precios && p.precios[t]).map((t) => `${t} ${dinero(p.precios[t])}`);
        const base = p.precio ? `Base ${dinero(p.precio)}` : '';
        return [base, ...porTalla].filter(Boolean).join(' · ') || 'Sin precio';
    }

    // ---------- Foto del producto ----------
    // Reduce la foto en el navegador (máximo 800 px, formato JPEG) para que pese poco y quepa en la base de datos.
    function reducirFoto(archivo, maximo = 800) {
        return new Promise((resolver, rechazar) => {
            const lector = new FileReader();
            lector.onerror = () => rechazar(new Error('No pude leer la foto.'));
            lector.onload = () => {
                const img = new Image();
                img.onerror = () => rechazar(new Error('Ese archivo no es una imagen válida.'));
                img.onload = () => {
                    const escala = Math.min(1, maximo / Math.max(img.width, img.height));
                    const lienzo = document.createElement('canvas');
                    lienzo.width = Math.round(img.width * escala);
                    lienzo.height = Math.round(img.height * escala);
                    const ctx = lienzo.getContext('2d');
                    ctx.fillStyle = '#ffffff'; // fondo blanco por si la imagen es PNG con transparencia
                    ctx.fillRect(0, 0, lienzo.width, lienzo.height);
                    ctx.drawImage(img, 0, 0, lienzo.width, lienzo.height);
                    resolver(lienzo.toDataURL('image/jpeg', 0.82));
                };
                img.src = lector.result;
            };
            lector.readAsDataURL(archivo);
        });
    }
    function ponerFoto(dataUrl) {
        $('#p-imagen').value = dataUrl;
        const vista = $('#foto-vista');
        vista.src = dataUrl || '';
        vista.classList.toggle('visible', Boolean(dataUrl));
        $('#quitar-foto').hidden = !dataUrl;
    }
    $('#p-foto').addEventListener('change', async (e) => {
        const archivo = e.target.files[0];
        if (!archivo) return;
        try { ponerFoto(await reducirFoto(archivo)); }
        catch (error) { aviso(error.message, 'error'); e.target.value = ''; }
    });
    $('#quitar-foto').addEventListener('click', () => { ponerFoto(''); $('#p-foto').value = ''; });

    // ---------- Pedidos (llegan cuando un cliente pulsa "Pedir por WhatsApp") ----------
    let pedidosNuevosAntes = null;
    async function cargarPedidos(silencioso = false) {
        try {
            const pedidos = await api('/api/pedidos', { token });
            const nuevos = pedidos.filter((x) => !x.atendido).length;
            $('#pedidos-nuevos').textContent = nuevos ? `(${nuevos})` : '';
            document.title = (nuevos ? `(${nuevos}) ` : '') + 'Panel de administrador - Amigo Único';
            if (silencioso && pedidosNuevosAntes !== null && nuevos > pedidosNuevosAntes) aviso('🛎️ ¡Llegó un pedido nuevo!');
            pedidosNuevosAntes = nuevos;
            $('#lista-pedidos').innerHTML = pedidos.length ? pedidos.map((x) => `
                <div class="fila-admin ${x.atendido ? '' : 'no-leido'}">
                    <div><strong>${x.cliente && x.cliente.nombre ? esc(x.cliente.nombre) : 'Cliente sin cuenta'}</strong> <small>${new Date(x.createdAt).toLocaleString('es-CO')}</small>
                    ${x.cliente && x.cliente.email ? `<p>${esc(x.cliente.email)}</p>` : ''}
                    <p>${x.items.map((i) => `${i.cantidad} × ${esc(i.nombre)} (talla ${esc(i.talla)})`).join('<br>')}</p>
                    <p><strong>${x.total ? 'Total: $' + x.total.toLocaleString('es-CO') + (x.precioIncompleto ? ' + prendas por confirmar' : '') : 'Total por confirmar'}</strong></p></div>
                    <div class="acciones-fila">
                        ${x.atendido ? '' : `<button class="mini" data-atendido="${esc(x._id)}">Marcar atendido</button>`}
                        <button class="mini peligro" data-borrar-pedido="${esc(x._id)}">Borrar</button>
                    </div>
                </div>`).join('') : '<p class="estado-carga">Todavía no hay pedidos.</p>';
        } catch (error) { if (!silencioso || error.status === 401) manejarError(error); }
    }
    // Revisa cada 30 segundos si llegó un pedido nuevo mientras el panel está abierto
    function iniciarAvisos() { clearInterval(avisos); avisos = setInterval(() => cargarPedidos(true), 30000); }

    $('#lista-pedidos').addEventListener('click', async (e) => {
        const atendido = e.target.closest('[data-atendido]');
        const borrar = e.target.closest('[data-borrar-pedido]');
        try {
            if (atendido) { await api(`/api/pedidos/${atendido.dataset.atendido}/atendido`, { metodo: 'PATCH', token }); cargarPedidos(); }
            if (borrar && confirm('¿Borrar este pedido?')) { await api(`/api/pedidos/${borrar.dataset.borrarPedido}`, { metodo: 'DELETE', token }); cargarPedidos(); }
        } catch (error) { manejarError(error); }
    });

    mostrarPanel(Boolean(token));
});
