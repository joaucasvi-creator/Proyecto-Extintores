require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { Sequelize, DataTypes } = require('sequelize');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const verificarToken = require('./middlewares/auth'); // Importamos el middleware

const app = express();
app.use(cors());
app.use(express.json());
app.use(express.static(__dirname + '/public'));

// 1. Configurar la conexión a MySQL
const sequelize = new Sequelize(
    process.env.DB_NAME, 
    process.env.DB_USER, 
    process.env.DB_PASSWORD, 
    {
        host: process.env.DB_HOST,
        dialect: process.env.DB_DIALECT,
        logging: false, 
    }
);

// 2. Definir el Modelo (Tabla) de Extintores
const Extintor = sequelize.define('Extintor', {
    tipo: { type: DataTypes.STRING, allowNull: false },
    capacidad: { type: DataTypes.STRING, allowNull: false },
    YearFabricacion: { type: DataTypes.INTEGER, allowNull: false }, 
    estado: { type: DataTypes.STRING, defaultValue: 'Lleno' }
});

// 3. Definir el Modelo (Tabla) de Usuarios (NUEVO)
const Usuario = sequelize.define('Usuario', {
    nombre: { type: DataTypes.STRING, allowNull: false },
    email: { type: DataTypes.STRING, allowNull: false, unique: true },
    password: { type: DataTypes.STRING, allowNull: false }
});

// Ruta de prueba
app.get('/', (req, res) => {
    res.send('API de Extintores del Centro funcionando correctamente');
});

// 1. Registro de usuarios
app.post('/api/auth/registro', async (req, res) => {
    try {
        const { nombre, email, password } = req.body;
        
        // Encriptar contraseña
        const salt = await bcrypt.genSalt(10);
        const passwordEncriptada = await bcrypt.hash(password, salt);

        const nuevoUsuario = await Usuario.create({
            nombre,
            email,
            password: passwordEncriptada
        });
        
        res.status(201).json({ mensaje: 'Usuario registrado con éxito', id: nuevoUsuario.id });
    } catch (error) {
        res.status(400).json({ error: 'Error al registrar usuario', detalle: error.message });
    }
});

// 2. Login de usuarios
app.post('/api/auth/login', async (req, res) => {
    try {
        const { email, password } = req.body;
        
        // Buscar usuario
        const usuario = await Usuario.findOne({ where: { email } });
        if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

        // Verificar contraseña
        const passwordValido = await bcrypt.compare(password, usuario.password);
        if (!passwordValido) return res.status(401).json({ error: 'Contraseña incorrecta' });

        // Generar Token JWT
        const token = jwt.sign(
            { id: usuario.id, email: usuario.email }, 
            process.env.JWT_SECRET, 
            { expiresIn: '2h' }
        );

        res.json({ mensaje: 'Login exitoso', token });
    } catch (error) {
        res.status(500).json({ error: 'Error en el login', detalle: error.message });
    }
});

// 4. CREAR un nuevo extintor (POST) - PROTEGIDA CON verificarToken
app.post('/api/extintores', verificarToken, async (req, res) => {
    try {
        const nuevoExtintor = await Extintor.create(req.body);
        res.status(201).json({ mensaje: 'Extintor registrado con éxito', data: nuevoExtintor });
    } catch (error) {
        res.status(400).json({ error: 'Error al crear el extintor', detalle: error.message });
    }
});

// 5. LEER todos los extintores (GET) 
app.get('/api/extintores', async (req, res) => {
    try {
        const extintores = await Extintor.findAll();
        res.json(extintores);
    } catch (error) {
        res.status(500).json({ error: 'Error al obtener los extintores', detalle: error.message });
    }
});

// 6. LEER un solo extintor por su ID (GET) 
app.get('/api/extintores/:id', async (req, res) => {
    try {
        const extintor = await Extintor.findByPk(req.params.id);
        if (extintor) {
            res.json(extintor);
        } else {
            res.status(404).json({ error: 'Extintor no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al buscar el extintor', detalle: error.message });
    }
});

// 7. ACTUALIZAR un extintor (PUT) - PROTEGIDA CON verificarToken
app.put('/api/extintores/:id', verificarToken, async (req, res) => {
    try {
        const extintor = await Extintor.findByPk(req.params.id);
        if (extintor) {
            await extintor.update(req.body);
            res.json({ mensaje: 'Extintor actualizado con éxito', data: extintor });
        } else {
            res.status(404).json({ error: 'Extintor no encontrado' });
        }
    } catch (error) {
        res.status(400).json({ error: 'Error al actualizar el extintor', detalle: error.message });
    }
});

// 8. ELIMINAR un extintor (DELETE) - con verificarToken
app.delete('/api/extintores/:id', verificarToken, async (req, res) => {
    try {
        const extintor = await Extintor.findByPk(req.params.id);
        if (extintor) {
            await extintor.destroy();
            res.json({ mensaje: 'Extintor eliminado correctamente' });
        } else {
            res.status(404).json({ error: 'Extintor no encontrado' });
        }
    } catch (error) {
        res.status(500).json({ error: 'Error al eliminar el extintor', detalle: error.message });
    }
});

// Middleware para manejar errores
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ error: 'Ocurrió un error interno en el servidor.' });
});

// 9. Conectar a MySQL y arrancar el servidor
const iniciarServidor = async () => {
    try {
        await sequelize.authenticate();
        console.log('Conexión a MySQL exitosa.');
        
        // sync({ alter: true }) es útil en desarrollo para actualizar las tablas con los nuevos modelos
        await sequelize.sync({ alter: true }); 
        console.log('Tablas sincronizadas en la base de datos.');

        app.listen(process.env.PORT, () => {
            console.log(`Servidor corriendo en http://localhost:${process.env.PORT}`);
        });
    } catch (error) {
        console.error('Error al conectar con la base de datos:', error);
    }
};
iniciarServidor();