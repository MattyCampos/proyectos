// Usar ruta relativa - funciona en local y en Render
async function loginUsuario() {
    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const contrasena_usuario = document.getElementById('contrasena_usuario').value.trim();
    const mensaje = document.getElementById('mensaje');

    if (!nombre_usuario || !contrasena_usuario) {
        mensaje.textContent = 'Todos los campos son obligatorios';
        mensaje.className = 'error';
        return;
    }

    const btn = document.querySelector('button');
    btn.disabled = true;
    btn.textContent = 'Iniciando sesión...';

    try {
        const response = await fetch('/login', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nombre_usuario,
                contrasena_usuario
            })
        });

        const data = await response.json();

        if (response.ok) {
            mensaje.textContent = '✅ Sesión iniciada exitosamente';
            mensaje.className = 'success';
            localStorage.setItem('usuario_id', data.usuario_id);
            localStorage.setItem('nombre_usuario', data.nombre_usuario);
            
            setTimeout(() => {
                window.location.href = 'index.html';
            }, 1000);
        } else {
            mensaje.textContent = data.mensaje || 'Credenciales incorrectas';
            mensaje.className = 'error';
        }
    } catch (err) {
        console.error('Error:', err);
        mensaje.textContent = 'Error al conectar con el servidor';
        mensaje.className = 'error';
    } finally {
        btn.disabled = false;
        btn.textContent = 'Iniciar Sesión';
    }
}

document.addEventListener('keypress', (e) => {
    if (e.key === 'Enter') {
        loginUsuario();
    }
});

document.addEventListener('DOMContentLoaded', () => {
    if (localStorage.getItem('usuario_id')) {
        window.location.href = 'index.html';
    }
});