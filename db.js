const mysql = require('mysql');

// Konfigurasi koneksi ke database MySQL
const db = mysql.createConnection({
    host: 'localhost',
    user: 'root',
    password: '',
    database: 'moni'
});

// Koneksi ke database
db.connect((err) => {
    if (err) {
        console.error('Koneksi ke database gagal:', err);
        return;
    }
    console.log('Database connected');
});

module.exports = db; // Export koneksi untuk digunakan di file lain
