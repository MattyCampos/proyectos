const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = 3000;

const pool = new Pool({
    user: 'postgres',
    host: 'localhost',
    database: 'tu_consumo',
    password: '1243',
    port: 5432,
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ENDPOINT REGISTRO DE USUARIO
app.post('/registro', async (req, res) => {
    const { nombre_usuario, contrasena_usuario } = req.body;

    if (!nombre_usuario || !contrasena_usuario) {
        return res.status(400).json({ mensaje: 'Todos los campos son obligatorios' });
    }

    try {
        const result = await pool.query(
            `INSERT INTO usuario(nombre_usuario, contrasena_usuario)
            VALUES($1, $2)
            RETURNING usuario_id, nombre_usuario`,
            [nombre_usuario, contrasena_usuario]
        );

        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ mensaje: 'El nombre de usuario ya existe' });
        }
        console.error(err);
        res.status(500).json({ mensaje: 'Error interno del servidor' });
    }
});

// ENDPOINT LOGIN
app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena_usuario } = req.body;

    try {
        const result = await pool.query(
            `SELECT usuario_id, nombre_usuario 
            FROM usuario 
            WHERE nombre_usuario = $1 AND contrasena_usuario = $2`,
            [nombre_usuario, contrasena_usuario]
        );
        
        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al iniciar sesion de usuario');
    }
});

// ENDPOINT GUARDAR CONSUMO - CORREGIDO
app.post('/consumo', async (req, res) => {
    const {
        usuario_id,
        mes,
        anio,
        lectura_anterior,
        lectura_actual,
        precio_kwh
    } = req.body;

    console.log('Datos recibidos:', req.body); // Para depuración

    // Validar campos obligatorios
    if (!usuario_id || !mes || !anio || lectura_anterior === undefined || lectura_actual === undefined || !precio_kwh) {
        return res.status(400).json({ 
            mensaje: 'Todos los campos son obligatorios' 
        });
    }

    // Convertir a números
    const anterior = parseFloat(lectura_anterior);
    const actual = parseFloat(lectura_actual);
    const precio = parseFloat(precio_kwh);

    console.log('Valores convertidos:', { anterior, actual, precio });

    // Validar que sean números válidos
    if (isNaN(anterior) || isNaN(actual) || isNaN(precio)) {
        return res.status(400).json({ 
            mensaje: 'Los valores deben ser números válidos' 
        });
    }

    if (anterior < 0 || actual < 0 || precio < 0) {
        return res.status(400).json({ 
            mensaje: 'Los valores no pueden ser negativos' 
        });
    }

    if (actual <= anterior) {
        return res.status(400).json({ 
            mensaje: 'La lectura actual debe ser mayor que la lectura anterior' 
        });
    }

    // Calcular consumo y precio total
    const consumo = actual - anterior;
    const precio_total = consumo * precio;

    console.log('Cálculos:', { consumo, precio_total });

    try {
        // Verificar si ya existe un registro para ese mes/año
        const existe = await pool.query(
            `SELECT id_consumo FROM consumo 
            WHERE usuario_id = $1 AND mes = $2 AND anio = $3`,
            [usuario_id, mes, anio]
        );

        if (existe.rows.length > 0) {
            return res.status(400).json({ 
                mensaje: 'Ya existe un registro para este mes y año' 
            });
        }

        const result = await pool.query(
            `INSERT INTO consumo(
                usuario_id, mes, anio, 
                lectura_anterior, lectura_actual, 
                consumo, precio_kwh, precio_total
            )
            VALUES($1, $2, $3, $4, $5, $6, $7, $8)
            RETURNING *`,
            [usuario_id, mes, anio, anterior, actual, consumo, precio, precio_total]
        );

        console.log('Registro guardado:', result.rows[0]);

        res.status(201).json({
            mensaje: 'Consumo guardado exitosamente',
            consumo: result.rows[0],
            calculos: {
                consumo_kwh: consumo,
                precio_kwh: precio,
                precio_total: precio_total
            }
        });
    } catch (err) {
        console.error('Error guardando consumo:', err.message);
        res.status(500).json({ 
            mensaje: 'Error al guardar el consumo' 
        });
    }
});

// ENDPOINT HISTORIAL DE USUARIO
app.get('/consumo/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;

    try {
        const result = await pool.query(
            `SELECT * FROM consumo
            WHERE usuario_id = $1
            ORDER BY anio DESC, mes DESC`,
            [usuario_id]
        );

        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send('Error al consultar el historial del usuario');
    }
});

// ENDPOINT ELIMINAR CONSUMO
app.delete('/consumo/:id_consumo', async (req, res) => {
    const { id_consumo } = req.params;

    try {
        const result = await pool.query(
            'DELETE FROM consumo WHERE id_consumo = $1 RETURNING *',
            [id_consumo]
        );

        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'Consumo no encontrado' });
        }

        res.json({ mensaje: 'Consumo eliminado exitosamente' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al eliminar el consumo' });
    }
});

// CONEXION LOCALHOST
app.listen(port, () => {
    console.log(`Servidor escuchando en http://localhost:${port}`);
});