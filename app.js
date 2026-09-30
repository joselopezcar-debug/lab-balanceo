const express = require('express');
const session = require('express-session');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');

const app = express();
// Captura el puerto desde los argumentos o usa el 8081 por defecto
const PORT = process.env.PORT || process.argv[2] || 8081;

// Configuración de middlewares
app.use(express.urlencoded({ extended: true }));
app.use(express.json());
app.use(session({
    secret: 'secreto-laboratorio',
    resave: false,
    saveUninitialized: true
}));

// Base de datos en memoria (compartida idealmente, pero para este lab local cada app creará su tabla)
const db = new sqlite3.Database(':memory:');
db.serialize(() => {
    db.run("CREATE TABLE usuarios (id INTEGER PRIMARY KEY AUTOINCREMENT, nombre TEXT, email TEXT)");
    // Usuario por defecto para el LOGIN
    db.run("INSERT INTO usuarios (nombre, email) VALUES ('Admin', 'admin@correo.com')");
});

// Middleware para proteger rutas
const requiereLogin = (req, res, next) => {
    if (req.session.usuario) return next();
    res.redirect('/login');
};

app.get('/', (req, res) => res.redirect('/login'));

// Rutas de Páginas
app.get('/login', (req, res) => res.sendFile(path.join(__dirname, 'views', 'login.html')));
app.get('/crud', requiereLogin, (req, res) => res.sendFile(path.join(__dirname, 'views', 'crud.html')));

// API de Información del Servidor (Para verificar el puerto en la UI)
app.get('/api/info', (req, res) => {
    res.json({ puerto: PORT, usuario: req.session.usuario || null });
});

// Lógica de LOGIN
app.post('/api/login', (req, res) => {
    const { email } = req.body;
    if (email === 'admin@correo.com') { // Validación simple para simulación
        req.session.usuario = email;
        return res.redirect('/crud');
    }
    res.send('Credenciales incorrectas. <a href="/login">Volver</a>');
});

// Lógica del CRUD (API)
app.get('/api/usuarios', requiereLogin, (req, res) => {
    db.all("SELECT * FROM usuarios", [], (err, rows) => res.json(rows));
});

app.post('/api/usuarios', requiereLogin, (req, res) => {
    const { nombre, email } = req.body;
    db.run("INSERT INTO usuarios (nombre, email) VALUES (?, ?)", [nombre, email], () => res.redirect('/crud'));
});

app.get('/api/usuarios/eliminar/:id', requiereLogin, (req, res) => {
    db.run("DELETE FROM usuarios WHERE id = ?", req.params.id, () => res.redirect('/crud'));
});

// Inicio del servidor
app.listen(PORT, () => {
    console.log(`Servidor Backend corriendo en http://127.0.0.1:${PORT}`);
});
