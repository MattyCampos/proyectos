const express = require('express');
const cors = require('cors');
const { Pool } = require('pg');
const path = require('path');

const app = express();
const port = process.env.PORT || 3000;

const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: { rejectUnauthorized: false }
});

app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// ========== AUTENTICACION ==========

app.post('/registro', async (req, res) => {
    const { nombre_usuario, contrasena_usuario } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO usuario(nombre_usuario, contrasena_usuario) VALUES($1, $2) RETURNING usuario_id, nombre_usuario',
            [nombre_usuario, contrasena_usuario]
        );
        res.json(result.rows[0]);
    } catch (err) {
        if (err.code === '23505') {
            return res.status(400).json({ mensaje: 'Usuario ya existe' });
        }
        res.status(500).json({ mensaje: 'Error en registro' });
    }
});

app.post('/login', async (req, res) => {
    const { nombre_usuario, contrasena_usuario } = req.body;
    try {
        const result = await pool.query(
            'SELECT usuario_id, nombre_usuario FROM usuario WHERE nombre_usuario = $1 AND contrasena_usuario = $2',
            [nombre_usuario, contrasena_usuario]
        );
        if (result.rows.length === 0) {
            return res.status(401).json({ mensaje: 'Credenciales incorrectas' });
        }
        res.json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error en login' });
    }
});

// ========== ELECTRODOMESTICOS ==========

app.get('/electrodomesticos/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM electrodomesticos WHERE usuario_id = $1 ORDER BY id_electro DESC',
            [usuario_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener electrodomesticos' });
    }
});

app.post('/electrodomesticos', async (req, res) => {
    const { usuario_id, nombre, potencia_w, horas_dia, cantidad } = req.body;
    try {
        const result = await pool.query(
            'INSERT INTO electrodomesticos(usuario_id, nombre, potencia_w, horas_dia, cantidad) VALUES($1, $2, $3, $4, $5) RETURNING *',
            [usuario_id, nombre, potencia_w, horas_dia, cantidad]
        );
        res.status(201).json(result.rows[0]);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al agregar electrodomestico' });
    }
});

app.delete('/electrodomesticos/:id_electro', async (req, res) => {
    const { id_electro } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM electrodomesticos WHERE id_electro = $1 RETURNING *',
            [id_electro]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No encontrado' });
        }
        res.json({ mensaje: 'Eliminado' });
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al eliminar' });
    }
});

// ========== CALCULO Y GUARDADO ==========

app.post('/calcular', async (req, res) => {
    const { usuario_id, mes, anio, precio_kwh } = req.body;

    try {
        const electroResult = await pool.query(
            'SELECT * FROM electrodomesticos WHERE usuario_id = $1',
            [usuario_id]
        );

        if (electroResult.rows.length === 0) {
            return res.status(400).json({ mensaje: 'No hay electrodomesticos' });
        }

        let consumoDiarioTotal = 0;
        const detalles = [];

        electroResult.rows.forEach(item => {
            const consumoDiario = (item.potencia_w / 1000) * item.horas_dia * item.cantidad;
            const consumoMensual = consumoDiario * 30;
            const costoMensual = consumoMensual * precio_kwh;

            consumoDiarioTotal += consumoDiario;

            detalles.push({
                nombre: item.nombre,
                potencia_w: item.potencia_w,
                horas_dia: item.horas_dia,
                cantidad: item.cantidad,
                consumo_diario: consumoDiario,
                consumo_mensual: consumoMensual,
                costo_mensual: costoMensual
            });
        });

        const consumoMensualTotal = consumoDiarioTotal * 30;
        const costoMensualTotal = consumoMensualTotal * precio_kwh;

        const result = await pool.query(
            `INSERT INTO calculos_historial(usuario_id, mes, anio, consumo_diario, consumo_mensual, costo_mensual, precio_kwh)
            VALUES($1, $2, $3, $4, $5, $6, $7) RETURNING id_calculo`,
            [usuario_id, mes, anio, consumoDiarioTotal, consumoMensualTotal, costoMensualTotal, precio_kwh]
        );

        const id_calculo = result.rows[0].id_calculo;

        for (const detalle of detalles) {
            await pool.query(
                `INSERT INTO detalle_calculo(
                    id_calculo, electrodomestico_nombre, potencia_w, horas_dia, cantidad,
                    consumo_diario, consumo_mensual, costo_mensual
                ) VALUES($1, $2, $3, $4, $5, $6, $7, $8)`,
                [
                    id_calculo,
                    detalle.nombre,
                    detalle.potencia_w,
                    detalle.horas_dia,
                    detalle.cantidad,
                    detalle.consumo_diario,
                    detalle.consumo_mensual,
                    detalle.costo_mensual
                ]
            );
        }

        res.status(201).json({
            mensaje: 'Calculo guardado',
            id_calculo: id_calculo,
            resumen: {
                consumo_diario: consumoDiarioTotal,
                consumo_mensual: consumoMensualTotal,
                costo_mensual: costoMensualTotal
            },
            detalles: detalles
        });

    } catch (err) {
        console.error(err);
        res.status(500).json({ mensaje: 'Error al calcular' });
    }
});

// ========== HISTORIAL ==========

app.get('/historial/:usuario_id', async (req, res) => {
    const { usuario_id } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM calculos_historial WHERE usuario_id = $1 ORDER BY anio DESC, mes DESC',
            [usuario_id]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener historial' });
    }
});

app.get('/historial/detalle/:id_calculo', async (req, res) => {
    const { id_calculo } = req.params;
    try {
        const result = await pool.query(
            'SELECT * FROM detalle_calculo WHERE id_calculo = $1',
            [id_calculo]
        );
        res.json(result.rows);
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al obtener detalle' });
    }
});

app.delete('/historial/:id_calculo', async (req, res) => {
    const { id_calculo } = req.params;
    try {
        const result = await pool.query(
            'DELETE FROM calculos_historial WHERE id_calculo = $1 RETURNING *',
            [id_calculo]
        );
        if (result.rows.length === 0) {
            return res.status(404).json({ mensaje: 'No encontrado' });
        }
        res.json({ mensaje: 'Eliminado' });
    } catch (err) {
        res.status(500).json({ mensaje: 'Error al eliminar' });
    }
});

app.listen(port, () => {
    console.log(`Servidor en http://localhost:${port}`);
});