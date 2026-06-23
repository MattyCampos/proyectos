async function registrarUsuario() {
    const nombre_usuario = document.getElementById('nombre_usuario').value.trim();
    const contrasena_usuario = document.getElementById('contrasena_usuario').value.trim();
    const mensaje = document.getElementById('mensaje');

    if (!nombre_usuario || !contrasena_usuario) {
        mensaje.textContent = 'Todos los campos son obligatorios';
        mensaje.className = 'error';
        return;
    }

    try {
        // ❌ Antes: fetch('http://localhost:3000/api/registro')
        // ✅ Ahora: fetch('http://localhost:3000/registro')
        const response = await fetch('http://localhost:3000/registro', {
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
            mensaje.textContent = '✅ Usuario registrado exitosamente';
            mensaje.className = 'success';
            setTimeout(() => {
                window.location.href = 'login.html';
            }, 1500);
        } else {
            mensaje.textContent = data.mensaje || 'Error al registrar';
            mensaje.className = 'error';
        }
    } catch (err) {
        console.error('Error:', err);
        mensaje.textContent = 'Error al conectar con el servidor';
        mensaje.className = 'error';
    }
}