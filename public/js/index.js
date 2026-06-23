const usuario_id = localStorage.getItem('usuario_id');
const nombre_usuario = localStorage.getItem('nombre_usuario');
const API_URL = window.location.origin;

if (!usuario_id) {
    window.location.href = 'login.html';
}

let grafico;

document.addEventListener('DOMContentLoaded', () => {
    // Mostrar saludo personalizado
    if (nombre_usuario) {
        document.getElementById('saludo').textContent = `Hola ${nombre_usuario} 👋`;
    }
    
    cargarHistorial();
    document.getElementById('lectura_anterior').addEventListener('input', calcularConsumo);
    document.getElementById('lectura_actual').addEventListener('input', calcularConsumo);
    document.getElementById('precio_kwh').addEventListener('input', calcularConsumo);
});

// Función para formatear en pesos chilenos
function formatoCLP(valor) {
    return new Intl.NumberFormat('es-CL', {
        style: 'currency',
        currency: 'CLP',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(valor);
}

// Función para formatear números con separador de miles
function formatoNumero(valor, decimales = 0) {
    return new Intl.NumberFormat('es-CL', {
        minimumFractionDigits: decimales,
        maximumFractionDigits: decimales
    }).format(valor);
}

function calcularConsumo() {
    const anterior = parseFloat(document.getElementById('lectura_anterior').value);
    const actual = parseFloat(document.getElementById('lectura_actual').value);
    const precio = parseFloat(document.getElementById('precio_kwh').value);

    const resultadoDiv = document.getElementById('resultado-calculado');
    
    if (!isNaN(anterior) && !isNaN(actual) && !isNaN(precio) && actual > anterior && precio > 0) {
        const consumo = actual - anterior;
        const total = consumo * precio;
        
        document.getElementById('consumoCalculado').textContent = formatoNumero(consumo, 2);
        document.getElementById('precioTotalCalculado').textContent = formatoCLP(total);
        resultadoDiv.style.display = 'block';
    } else {
        resultadoDiv.style.display = 'none';
    }
}

async function guardarConsumo() {
    const mes = document.getElementById('mes').value;
    const anio = document.getElementById('anio').value;
    const lectura_anterior = document.getElementById('lectura_anterior').value;
    const lectura_actual = document.getElementById('lectura_actual').value;
    const precio_kwh = document.getElementById('precio_kwh').value;
    const mensaje = document.getElementById('mensaje');

    if (!mes || !anio || !lectura_anterior || !lectura_actual || !precio_kwh) {
        mostrarMensaje('Todos los campos son obligatorios', 'error');
        return;
    }

    const anterior = parseFloat(lectura_anterior);
    const actual = parseFloat(lectura_actual);
    const precio = parseFloat(precio_kwh);

    if (isNaN(anterior) || isNaN(actual) || isNaN(precio)) {
        mostrarMensaje('Ingresa valores numéricos válidos', 'error');
        return;
    }

    if (anterior < 0 || actual < 0 || precio < 0) {
        mostrarMensaje('Los valores no pueden ser negativos', 'error');
        return;
    }

    if (actual <= anterior) {
        mostrarMensaje('La lectura actual debe ser mayor que la anterior', 'error');
        return;
    }

    if (precio === 0) {
        mostrarMensaje('El precio por kWh debe ser mayor que 0', 'error');
        return;
    }

    const btn = document.querySelector('.btn-guardar');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    const datos = {
        usuario_id: parseInt(usuario_id),
        mes: parseInt(mes),
        anio: parseInt(anio),
        lectura_anterior: anterior,
        lectura_actual: actual,
        precio_kwh: precio
    };

    try {
        const response = await fetch(`${API_URL}/consumo`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(datos)
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensaje('✅ Consumo guardado exitosamente', 'exito');
            document.getElementById('lectura_anterior').value = '';
            document.getElementById('lectura_actual').value = '';
            document.getElementById('precio_kwh').value = '';
            document.getElementById('resultado-calculado').style.display = 'none';
            cargarHistorial();
        } else {
            mostrarMensaje(data.mensaje || 'Error al guardar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensaje('Error al conectar con el servidor', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar Consumo';
    }
}

async function cargarHistorial() {
    try {
        const response = await fetch(`${API_URL}/consumo/${usuario_id}`);
        const datos = await response.json();

        const tabla = document.getElementById('tabla-historial');
        tabla.innerHTML = '';

        let totalConsumo = 0;
        let totalPrecio = 0;
        const labels = [];
        const consumos = [];

        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        datos.forEach(item => {
            const consumo = parseFloat(item.consumo) || 0;
            const precioTotal = parseFloat(item.precio_total) || 0;
            const precioKwh = parseFloat(item.precio_kwh) || 0;
            const lecturaAnt = parseFloat(item.lectura_anterior) || 0;
            const lecturaAct = parseFloat(item.lectura_actual) || 0;

            totalConsumo += consumo;
            totalPrecio += precioTotal;
            
            const mesNombre = meses[item.mes - 1] || item.mes;
            labels.push(`${mesNombre} ${item.anio}`);
            consumos.push(consumo);

            tabla.innerHTML += `
                <tr>
                    <td>${mesNombre} ${item.anio}</td>
                    <td>${formatoNumero(lecturaAnt, 2)}</td>
                    <td>${formatoNumero(lecturaAct, 2)}</td>
                    <td>${formatoNumero(consumo, 2)}</td>
                    <td>${formatoCLP(precioKwh)}</td>
                    <td>${formatoCLP(precioTotal)}</td>
                    <td>
                        <button class="btn-eliminar" onclick="eliminarConsumo(${item.id_consumo})">
                            🗑️
                        </button>
                    </td>
                </tr>
            `;
        });

        document.getElementById('kpiConsumo').textContent = `${formatoNumero(totalConsumo, 2)} kWh`;
        document.getElementById('kpiPrecio').textContent = formatoCLP(totalPrecio);
        document.getElementById('kpiRegistros').textContent = datos.length;

        crearGrafico(labels, consumos);
    } catch (err) {
        console.error('Error:', err);
        mostrarMensaje('Error al cargar el historial', 'error');
    }
}

async function eliminarConsumo(id_consumo) {
    if (!confirm('¿Estás seguro de eliminar este registro?')) return;

    try {
        const response = await fetch(`${API_URL}/consumo/${id_consumo}`, {
            method: 'DELETE'
        });

        if (response.ok) {
            mostrarMensaje('✅ Registro eliminado exitosamente', 'exito');
            cargarHistorial();
        } else {
            const data = await response.json();
            mostrarMensaje(data.mensaje || 'Error al eliminar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensaje('Error al conectar con el servidor', 'error');
    }
}

function crearGrafico(labels, consumos) {
    if (grafico) {
        grafico.destroy();
    }

    const ctx = document.getElementById('graficoConsumo');
    grafico = new Chart(ctx, {
        type: 'line',
        data: {
            labels: labels.length ? labels : ['Sin datos'],
            datasets: [{
                label: 'Consumo (kWh)',
                data: labels.length ? consumos : [0],
                borderColor: '#667eea',
                backgroundColor: 'rgba(102, 126, 234, 0.1)',
                borderWidth: 3,
                fill: true,
                tension: 0.4,
                pointBackgroundColor: '#764ba2'
            }]
        },
        options: {
            responsive: true,
            plugins: {
                legend: {
                    display: labels.length > 0
                }
            },
            scales: {
                y: {
                    beginAtZero: true,
                    grid: { color: 'rgba(0,0,0,0.05)' }
                },
                x: {
                    grid: { display: false }
                }
            }
        }
    });
}

function mostrarMensaje(texto, tipo) {
    const mensaje = document.getElementById('mensaje');
    mensaje.textContent = texto;
    mensaje.className = tipo;
    mensaje.style.display = 'block';
    
    setTimeout(() => {
        mensaje.style.display = 'none';
    }, 5000);
}

function cerrarSesion() {
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('nombre_usuario');
    window.location.href = 'login.html';
}