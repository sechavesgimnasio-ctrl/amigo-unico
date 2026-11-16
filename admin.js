// Lógica del panel de administrador: login, productos y mensajes.
document.addEventListener('DOMContentLoaded', () => {
    const $ = (s) => document.querySelector(s);
    let token = sessionStorage.getItem('token'); // se borra al cerrar la pestaña

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
        if (si) { cargarProductos(); cargarMensajes(); }
    }
    function cerrarSesion() { token = null; sessionStorage.removeItem('token'); mostrarPanel(false); }
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
        $('#vista-productos').hidden = nombre !== 'productos';
        $('#vista-mensajes').hidden = nombre !== 'mensajes';
        $('#tab-productos').setAttribute('aria-selected', nombre === 'productos');
        $('#tab-mensajes').setAttribute('aria-selected', nombre === 'mensajes');
    }
    $('#tab-productos').addEventListener('click', () => pestana('productos'));
    $('#tab-mensajes').addEventListener('click', () => pestana('mensajes'));

    // ---------- Productos ----------
    let productos = [];
    async function cargarProductos() {
        $('#lista-productos').innerHTML = '<p class="estado-carga">Cargando...</p>';
        try {
            productos = await api('/api/productos/todos', { token });
            $('#lista-productos').innerHTML = productos.length ? productos.map((p) => `
                <div class="fila-admin ${p.activo ? '' : 'oculto'}">
                    <div><strong>${esc(p.nombre)}</strong> ${p.activo ? '' : '(oculto)'}<p>${esc(p.descripcion)}</p>
                    <p>${p.precio ? '$' + p.precio.toLocaleString('es-CO') : 'Sin precio'}</p></div>
                    <div class="acciones-fila">
                        <button class="mini" data-editar="${esc(p._id)}">Editar</button>
                        <button class="mini peligro" data-borrar="${esc(p._id)}">Borrar</button>
                    </div>
                </div>`).join('') : '<p class="estado-carga">Aún no hay productos. Agrega el primero arriba.</p>';
        } catch (error) { manejarError(error); }
    }

    function limpiarFormulario() {
        $('#form-producto').reset();
        $('#p-id').value = '';
        $('#p-activo').checked = true;
        $('#titulo-form').textContent = 'Agregar producto';
        $('#cancelar-edicion').hidden = true;
    }
    $('#cancelar-edicion').addEventListener('click', limpiarFormulario);

    $('#form-producto').addEventListener('submit', async (e) => {
        e.preventDefault();
        const id = $('#p-id').value;
        const cuerpo = { nombre: $('#p-nombre').value, descripcion: $('#p-desc').value, precio: $('#p-precio').value, icono: $('#p-icono').value, activo: $('#p-activo').checked };
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
            $('#p-precio').value = p.precio ?? ''; $('#p-icono').value = p.icono; $('#p-activo').checked = p.activo;
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

    mostrarPanel(Boolean(token));
});
