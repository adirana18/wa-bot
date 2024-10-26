const { Client, LocalAuth } = require('whatsapp-web.js');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const client = new Client({
    authStrategy: new LocalAuth()
});

client.on('qr', (qr) => {
    qrcode.generate(qr, { small: true });
});

const sendMenu = (chatId) => {
    const menu = `Selamat datang di Laundry Kelompok B 😇\n\nKetik angka 1 : untuk 🧰 Daftar Harga\nKetik angka 2 : untuk Cek Cucian Saya`;
    client.sendMessage(chatId, menu);
};

client.on('ready', () => {
    console.log('Client siap digunakan!');
});

const readOrders = () => {
    const data = fs.readFileSync('pesanan.txt', 'utf8');
    const orders = {};
    data.split('\n').forEach(line => {
        const [id, ...details] = line.split(':'); // Ambil ID dan sisa detail
        if (id && details.length > 0) {
            orders[id.trim()] = details.join(':').trim(); // Gabungkan kembali detail
        }
    });
    console.log("Orders:", orders); // Debugging log
    return orders;
};

const readPrices = () => {
    const data = fs.readFileSync('harga.txt', 'utf8');
    const prices = {};
    data.split('\n').forEach(line => {
        const [product, price] = line.split(':');
        if (product && price) {
            prices[product.trim()] = price.trim();
        }
    });
    return prices;
};

client.on('message', message => {
    console.log(`Pesan dari ${message.from}: ${message.body}`);

    if (message.body.toLowerCase() === 'menu') {
        sendMenu(message.from);
    } else if (message.body.toLowerCase() === '1') {
        const prices = readPrices();
        let priceList = 'Daftar Harga:\n';
        for (const product in prices) {
            priceList += `${product}: ${prices[product]}\n`;
        }
        priceList += '*Ketik Menu untuk kembali*';
        message.reply(priceList);
    } else if (message.body.toLowerCase() === '2') {
        message.reply('Silakan masukkan ID pesanan Anda.');
    } else {
        const orders = readOrders();
        const orderId = message.body.trim();
        console.log("Received Order ID:", orderId); // Debugging log
        if (orders[orderId]) {
            // Memformat detail pesanan untuk output yang lebih rapi
            const detailsArray = orders[orderId].split(','); // Memisahkan detail berdasarkan koma
            let orderDetails = `Detail pesanan untuk ID ${orderId}:\n`;
            
            // Menambahkan setiap detail dengan format rapi
            detailsArray.forEach(detail => {
                orderDetails += `- ${detail.trim()}\n`; // Menggunakan tanda '-' untuk format yang lebih jelas
            });
            
            message.reply(orderDetails);
        
        
        } else {
            sendMenu(message.from); // Kirim menu kembali tanpa pesan tambahan
        }
    }
});

// Inisialisasi client
client.initialize();
