async function loginUsuario() {
    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const contrasena_usuario = document.getElementById('contrasena_usuario').value.trim();
    const mensaje = document.getElementById('mensaje');

    if (!nombre_usuario || !contrasena_usuario) {
        mensaje.textContent = 'Complete todos los campos';
        mensaje.className = 'error';
        return;
    }

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario, contrasena_usuario })
        });

        const data = await response.json();

        if (response.ok) {
            mensaje.textContent = 'Sesion iniciada';
            mensaje.className = 'success';
            localStorage.setItem('usuario_id', data.usuario_id);
            localStorage.setItem('nombre_usuario', data.nombre_usuario);
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            mensaje.textContent = data.mensaje || 'Error';
            mensaje.className = 'error';
        }
    } catch (err) {
        mensaje.textContent = 'Error de conexion';
        mensaje.className = 'error';
    }
}

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') loginUsuario();
});