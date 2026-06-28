const usuario_id = localStorage.getItem('usuario_id');
const nombre_usuario = localStorage.getItem('nombre_usuario');

if (!usuario_id) {
    window.location.href = 'login.html';
}

let chartPie = null;
let chartBarras = null;
let electrodomesticos = [];

document.addEventListener('DOMContentLoaded', () => {
    if (nombre_usuario) {
        document.getElementById('saludo').textContent = 'Hola ' + nombre_usuario;
    }
    cargarElectrodomesticos();
    cargarHistorial();
    document.getElementById('precio-kwh').addEventListener('input', calcularResultados);
});

async function agregarElectrodomestico() {
    const nombre = document.getElementById('nombre').value.trim();
    const potencia = document.getElementById('potencia').value;
    const horas = document.getElementById('horas').value;
    const cantidad = document.getElementById('cantidad').value;
    const mensaje = document.getElementById('mensaje-agregar');

    if (!nombre || !potencia || !horas || !cantidad) {
        mostrarMensaje(mensaje, 'Complete todos los campos', 'error');
        return;
    }

    const btn = document.querySelector('.panel button');
    btn.disabled = true;

    try {
        const response = await fetch('/electrodomesticos', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: parseInt(usuario_id),
                nombre: nombre,
                potencia_w: parseFloat(potencia),
                horas_dia: parseFloat(horas),
                cantidad: parseInt(cantidad)
            })
        });

        const data = await response.json();

        if (response.ok) {
            mostrarMensaje(mensaje, 'Agregado correctamente', 'exito');
            document.getElementById('nombre').value = '';
            document.getElementById('potencia').value = '';
            document.getElementById('horas').value = '';
            document.getElementById('cantidad').value = '';
            cargarElectrodomesticos();
        } else {
            mostrarMensaje(mensaje, data.mensaje || 'Error', 'error');
        }
    } catch (err) {
        mostrarMensaje(mensaje, 'Error de conexion', 'error');
    } finally {
        btn.disabled = false;
    }
}

async function cargarElectrodomesticos() {
    try {
        const response = await fetch('/electrodomesticos/' + usuario_id);
        const data = await response.json();
        electrodomesticos = data;

        const container = document.getElementById('lista-electrodomesticos');

        if (data.length === 0) {
            container.innerHTML = '<p class="empty">📭 No hay electrodomésticos agregados</p>';
            calcularResultados();
            return;
        }

        container.innerHTML = data.map(item => {
            return `
                <div class="electro-item">
                    <div class="info">
                        <span class="nombre">${item.nombre}</span>
                        <span class="detalles">
                            <span>⚡ ${item.potencia_w}W</span>
                            <span>⏱ ${item.horas_dia}h</span>
                            <span>📦 ${item.cantidad}x</span>
                        </span>
                    </div>
                    <button class="btn-delete" onclick="eliminarElectrodomestico(${item.id_electro})" title="Eliminar">✕</button>
                </div>
            `;
        }).join('');

        calcularResultados();
    } catch (err) {
        console.error(err);
    }
}

async function eliminarElectrodomestico(id) {
    if (!confirm('Eliminar este electrodomestico?')) return;

    try {
        const response = await fetch('/electrodomesticos/' + id, { method: 'DELETE' });
        if (response.ok) {
            cargarElectrodomesticos();
        }
    } catch (err) {
        console.error(err);
    }
}

function calcularResultados() {
    const precioKwh = parseFloat(document.getElementById('precio-kwh').value);

    if (electrodomesticos.length === 0 || !precioKwh || precioKwh <= 0) {
        document.getElementById('kpi-diario').textContent = '0.00 kWh';
        document.getElementById('kpi-mensual').textContent = '0.00 kWh';
        document.getElementById('kpi-costo').textContent = '$0';
        actualizarGraficos([]);
        return;
    }

    const detalles = electrodomesticos.map(item => {
        const consumoDiario = (item.potencia_w / 1000) * item.horas_dia * item.cantidad;
        return {
            nombre: item.nombre,
            consumoDiario: consumoDiario,
            consumoMensual: consumoDiario * 30,
            costoMensual: consumoDiario * 30 * precioKwh
        };
    });

    const totalDiario = detalles.reduce((sum, d) => sum + d.consumoDiario, 0);
    const totalMensual = totalDiario * 30;
    const totalCosto = totalMensual * precioKwh;

    document.getElementById('kpi-diario').textContent = totalDiario.toFixed(2) + ' kWh';
    document.getElementById('kpi-mensual').textContent = totalMensual.toFixed(2) + ' kWh';
    document.getElementById('kpi-costo').textContent = '$' + totalCosto.toFixed(0);

    actualizarGraficos(detalles);
}

function actualizarGraficos(detalles) {
    const ctxPie = document.getElementById('grafico-pastel').getContext('2d');
    const ctxBarras = document.getElementById('grafico-barras').getContext('2d');

    if (chartPie) chartPie.destroy();
    if (chartBarras) chartBarras.destroy();

    if (detalles.length === 0) {
        chartPie = new Chart(ctxPie, {
            type: 'doughnut',
            data: { labels: ['Sin datos'], datasets: [{ data: [1], backgroundColor: ['#ddd'] }] },
            options: { plugins: { legend: { display: false } } }
        });
        chartBarras = new Chart(ctxBarras, {
            type: 'bar',
            data: { labels: ['Sin datos'], datasets: [{ data: [0], backgroundColor: ['#ddd'] }] },
            options: { plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true } } }
        });
        return;
    }

    const colores = ['#0f3460', '#f7971e', '#e53e3e', '#38a169', '#805ad5', '#319795', '#d69e2e', '#4299e1'];
    const labels = detalles.map(d => d.nombre);
    const consumos = detalles.map(d => d.consumoMensual);

    chartPie = new Chart(ctxPie, {
        type: 'doughnut',
        data: {
            labels: labels,
            datasets: [{ 
                data: consumos, 
                backgroundColor: colores.slice(0, labels.length),
                borderWidth: 2,
                borderColor: '#fff'
            }]
        },
        options: {
            plugins: { legend: { position: 'bottom' } }
        }
    });

    chartBarras = new Chart(ctxBarras, {
        type: 'bar',
        data: {
            labels: labels,
            datasets: [{
                label: 'Consumo mensual (kWh)',
                data: consumos,
                backgroundColor: colores.slice(0, labels.length),
                borderRadius: 4
            }]
        },
        options: {
            plugins: { legend: { display: false } },
            scales: { y: { beginAtZero: true } }
        }
    });
}

async function guardarCalculo() {
    const mes = document.getElementById('mes-calculo').value;
    const anio = document.getElementById('anio-calculo').value;
    const precioKwh = document.getElementById('precio-kwh').value;
    const mensaje = document.getElementById('mensaje-guardar');

    if (!precioKwh || parseFloat(precioKwh) <= 0) {
        mostrarMensaje(mensaje, 'Ingrese precio kWh', 'error');
        return;
    }

    if (electrodomesticos.length === 0) {
        mostrarMensaje(mensaje, 'Agregue electrodomesticos', 'error');
        return;
    }

    const btn = document.querySelector('.guardar button');
    btn.disabled = true;
    btn.textContent = 'Guardando...';

    try {
        const response = await fetch('/calcular', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                usuario_id: parseInt(usuario_id),
                mes: parseInt(mes),
                anio: parseInt(anio),
                precio_kwh: parseFloat(precioKwh)
            })
        });

        const data = await response.json();
        console.log('Respuesta:', data);

        if (response.ok) {
            mostrarMensaje(mensaje, 'Calculo guardado', 'exito');
            await cargarHistorial();
        } else {
            mostrarMensaje(mensaje, data.mensaje || 'Error al guardar', 'error');
        }
    } catch (err) {
        console.error('Error:', err);
        mostrarMensaje(mensaje, 'Error de conexion', 'error');
    } finally {
        btn.disabled = false;
        btn.textContent = 'Guardar calculo';
    }
}

async function cargarHistorial() {
    try {
        const response = await fetch('/historial/' + usuario_id);
        const data = await response.json();

        const tabla = document.getElementById('tabla-historial');

        if (!tabla) {
            console.error('No se encontró el elemento tabla-historial');
            return;
        }

        if (!data || data.length === 0) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align:center;">Sin registros</td></tr>';
            return;
        }

        const meses = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
                       'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

        tabla.innerHTML = data.map(item => {
            const diario = parseFloat(item.consumo_diario) || 0;
            const mensual = parseFloat(item.consumo_mensual) || 0;
            const costo = parseFloat(item.costo_mensual) || 0;

            return `
                <tr>
                    <td>${meses[item.mes - 1] || item.mes}</td>
                    <td>${item.anio || 0}</td>
                    <td>${diario.toFixed(2)} kWh</td>
                    <td>${mensual.toFixed(2)} kWh</td>
                    <td>$${costo.toFixed(0)}</td>
                    <td><button class="btn-eliminar" onclick="eliminarCalculo(${item.id_calculo})">Eliminar</button></td>
                </tr>
            `;
        }).join('');

    } catch (err) {
        console.error('Error cargando historial:', err);
        const tabla = document.getElementById('tabla-historial');
        if (tabla) {
            tabla.innerHTML = '<tr><td colspan="6" style="text-align:center; color:red;">Error al cargar historial</td></tr>';
        }
    }
}

async function eliminarCalculo(id) {
    if (!confirm('Eliminar este calculo?')) return;

    try {
        const response = await fetch('/historial/' + id, { method: 'DELETE' });
        if (response.ok) {
            cargarHistorial();
        }
    } catch (err) {
        console.error(err);
    }
}

function mostrarMensaje(elemento, texto, tipo) {
    elemento.textContent = texto;
    elemento.className = tipo;
    elemento.style.display = 'block';
    setTimeout(() => {
        elemento.style.display = 'none';
    }, 4000);
}

function cerrarSesion() {
    localStorage.removeItem('usuario_id');
    localStorage.removeItem('nombre_usuario');
    window.location.href = 'login.html';
}