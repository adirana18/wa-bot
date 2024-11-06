const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
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
    console.log('Database connect');
});

// Inisialisasi client WhatsApp
const client = new Client({
    authStrategy: new LocalAuth()
});

// Menampilkan QR Code untuk autentikasi
client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

// Fungsi untuk mengirim menu ke pengguna
const sendMenu = (chatId) => {
    const menu = `Selamat datang di Laundry Kelompok B 😇\n\nKetik angka 1: untuk Daftar Harga\nKetik angka 2: untuk Cek Cucian Saya\nKetik angka 3: untuk melakukan Pemesanan Antar Jemput.`;
    client.sendMessage(chatId, menu);
};

// Menjalankan saat bot sudah siap
client.on('ready', () => {
    console.log('Bot Ready');
});

// Fungsi untuk mengambil data pesanan dari database berdasarkan ID
const readOrderById = (orderId, callback) => {
    db.query('SELECT * FROM pesanan WHERE id = ?', [orderId], (err, results) => {
        if (err) throw err;
        callback(results[0]);
    });
};

// Fungsi untuk mengambil daftar harga dari database
const readPrices = (callback) => {
    db.query('SELECT nama, harga FROM harga', (err, results) => {
        if (err) throw err;
        const prices = {};
        results.forEach(row => {
            prices[row.nama] = `Rp ${row.harga}/kg`;
        });
        callback(prices);
    });
};

// Mengambil harga berdasarkan jenis layanan
const getPrice = (jenisLayanan) => {
    const prices = {
        'pakaian': 8000,
        'sprei': 10000,
        'handuk': 9000,
        'selimut': 12000,
        'karpet kecil': 15000
    };
    return prices[jenisLayanan.toLowerCase()] || 0;
};

// Mengelola pesan yang masuk
client.on('message', async message => {
    console.log(`Pesan dari ${message.from}: ${message.body}`);

    // Menangani pesan gambar
    if (message.hasMedia) {
        await message.reply('Terima kasih!\nSilahkan Share Lokasi Anda\nKurir Kita Akan Segera Menuju Lokasi Anda');
        return;
    }

    // Menangani pesan lokasi
    if (message.location) {
        await message.reply('Meluncur!\nKurir kita akan segera menuju lokasi pengambilan\n\nNama Kurir : Adirana\nNo Whatsapp : 0832212112121');
        return;
    }

    const msgBody = message.body.toLowerCase();

    if (msgBody === 'menu') {
        sendMenu(message.from);
    } else if (msgBody === '1') {
        readPrices(prices => {
            let priceList = 'Daftar Harga:\n';
            for (const product in prices) {
                priceList += `${product}: ${prices[product]}\n`;
            }
            priceList += ' ______________________________\n *Ketik Menu untuk kembali*';
            message.reply(priceList);
        });
    } else if (msgBody === '2') {
        message.reply('Silakan masukkan ID pesanan Anda.');
    } else if (msgBody === '3') {
        message.reply(`Untuk Melakukan Pemesanan silahkan tuliskan detail pesanan seperti di bawah ini:\n\ncontoh: order/adi/pakaian/1kg`);
    } else if (msgBody.startsWith('order')) {
        const orderDetails = msgBody.split('/');

        // Pastikan format input benar
        if (orderDetails.length === 4) {
            const nama = orderDetails[1].trim();
            const jenisLayanan = orderDetails[2].trim().toLowerCase().replace('_', ' ');
            const jumlahStr = orderDetails[3].trim().replace('kg', '');
            const jumlah = parseInt(jumlahStr);

            if (isNaN(jumlah) || jumlah <= 0) {
                message.reply('Jumlah tidak valid. Silakan masukkan dalam format: order/nama/pakaian/5kg.');
                return;
            }

            const hargaLayanan = getPrice(jenisLayanan);
            if (hargaLayanan === 0) {
                message.reply('Jenis layanan tidak dikenali.');
                return;
            }

            const totalHarga = jumlah * hargaLayanan; // Hitung total harga

            // Mendapatkan waktu masuk (tanggal sekarang)
            const currentDate = new Date();
            const waktuMasuk = currentDate.toISOString().slice(0, 19).replace('T', ' '); // Format ke 'YYYY-MM-DD HH:mm:ss'

            // Menghitung estimasi waktu selesai (3 hari ke depan)
            const estimasiSelesai = new Date(currentDate.getTime() + 3 * 24 * 60 * 60 * 1000); // 3 hari ke depan
        
            const status = 'belum selesai';

            // Dapatkan nomor pengirim dari message.from
            const nomorHP = message.from; // Nomor pengirim (format: "1234567890@s.whatsapp.net")

            // Simpan ke database
            db.query('INSERT INTO pesanan (nama, nomor_hp, status, total_harga, estimasi_selesai, waktu_masuk, pakaian, sprei, handuk, selimut, karpet_kecil) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)', 
                [nama, nomorHP, status, totalHarga, formattedEstimasiSelesai, waktuMasuk, jenisLayanan === 'pakaian' ? jumlah : 0, jenisLayanan === 'sprei' ? jumlah : 0, jenisLayanan === 'handuk' ? jumlah : 0, jenisLayanan === 'selimut' ? jumlah : 0, jenisLayanan === 'karpet kecil' ? jumlah : 0],
                (err, result) => {
                    if (err) {
                        console.error('Error saat menyimpan ke database:', err);
                        message.reply('Terjadi kesalahan saat menyimpan pesanan Anda. Silakan coba lagi.');
                        return;
                    }

                    const orderId = result.insertId;

                    readOrderById(orderId, (order) => {
                        if (order) {
                            let orderDetails = `Pesanan Anda Berhasil Dibuat\nBerikut Detail Pesanan ID ${orderId}\n`;
                            orderDetails += '------------------------------------------------------------\n';
                            orderDetails += `Nama: ${order.nama}\n`;
                            orderDetails += `Nomor HP: ${order.nomor_hp}\n`; // Menampilkan nomor HP
                            orderDetails += `Status: ${order.status}\n`;
                            orderDetails += `Estimasi Selesai: ${order.estimasi_selesai}\n`; // Menampilkan estimasi selesai
                            orderDetails += `Berat: ${jenisLayanan} ${jumlah}Kg\n`;
                            orderDetails += `Total Harga: Rp.${order.total_harga}\n`;
                            orderDetails += '-------------------------------------------------------------\nSilahkan Lakukan pembayaran\nBank : BCA\nNo Rek: 7115461869\nAn. ADIRANA\n\n\nSetelah Anda Melakukan Pembayaran, Segera kurir kami akan ke tempat anda\n\nJangan lupa kirim Bukti Transfernya 😇\nThank you!';

                            message.reply(orderDetails);
                        } else {
                            message.reply('Pesanan berhasil disimpan, tetapi tidak dapat menemukan detailnya.');
                        }
                    });
                });
        } else {
            message.reply('Format salah. Silakan masukkan dalam format: order/nama/pakaian/5kg.');
        }
    } else {
        const orderId = msgBody.trim();
        console.log("Received Order ID:", orderId);
        readOrderById(orderId, (order) => {
            if (order) {
                let orderDetails = `Berikut Detail Pesanan Anda ID ${orderId}\n`;
                orderDetails += '------------------------------------------------------------\n';
                orderDetails += `Nama: ${order.nama}\n`;
                orderDetails += `Status: ${order.status}\n`;
                orderDetails += `Estimasi Selesai: ${order.estimasi_selesai}\n`; // Menampilkan estimasi selesai
                orderDetails += `Total Harga: Rp.${order.total_harga}\n`;
                orderDetails += '-------------------------------------------------------------\nThank you!';
                message.reply(orderDetails);
            } else {
                sendMenu(message.from);
            }
        });
    }
});

// Inisialisasi client
client.initialize();
