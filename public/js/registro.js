async function registrarUsuario() {
    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const contrasena_usuario = document.getElementById('contrasena_usuario').value.trim();
    const mensaje = document.getElementById('mensaje');

    if (!nombre_usuario || !contrasena_usuario) {
        mensaje.textContent = 'Complete todos los campos';
        mensaje.className = 'error';
        return;
    }

    if (contrasena_usuario.length < 6) {
        mensaje.textContent = 'Contraseña minimo 6 caracteres';
        mensaje.className = 'error';
        return;
    }

    try {
        const response = await fetch('/registro', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ nombre_usuario, contrasena_usuario })
        });

        const data = await response.json();

        if (response.ok) {
            mensaje.textContent = 'Usuario registrado';
            mensaje.className = 'success';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
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
    if (e.key === 'Enter') registrarUsuario();
});