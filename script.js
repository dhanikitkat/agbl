const menuCards = document.getElementById('menuCards');
const orderTable = document.getElementById('orderTable');
const grandTotalDisplay = document.getElementById('grandTotal');
const customerNameInput = document.getElementById('customerName');
const customerTypeSelect = document.getElementById('customerType');
const pabrikNameInput = document.getElementById('pabrikName');

// Array to store orders
const orders = [];
let orderNumber = 1; // Initialize order number

// Function to create menu cards
function createMenuCards() {
    const menuItems = [
        { name: 'Nasi Tatem Dada', price: 23000, description: 'Nasi, Ayam Dada, Tahu, Tempe, Sambel, Lalap' },
        { name: 'Nasi Tatem Paha', price: 23000, description: 'Nasi, Ayam Paha, Tahu, Tempe, Sambel, Lalap' },
        { name: 'Nasi Ayam Dada', price: 20000, description: 'Nasi, Ayam Dada, Sambel, Lalap' },
        { name: 'Nasi Ayam Paha', price: 20000, description: 'Nasi, Ayam Paha, Sambel, Lalap' },
        { name: 'Ayam Dada', price: 17000, description: 'Ayam Dada, Sambel, Lalap' },
        { name: 'Ayam Paha', price: 17000, description: 'Ayam Paha, Sambel, Lalap' },
        { name: 'Paket Tatem', price: 7000, description: '2 Tahu, 2 Tempe, Sambel' },
        { name: 'Nasi', price: 4000, description: 'Nasi 1 Porsi' },
        { name: 'Extra Sambal Terasi', price: 5000, description: 'Sambal Terasi 1 Porsi' },
        { name: 'Extra Sambal Gepuk', price: 5000, description: 'Sambal Gepuk 1 Porsi' },
        { name: 'Sayur Asem 1 Porsi', price: 7000, description: 'Seporsi Sayur Asem' },
        { name: 'Sayur Asem ½ Porsi', price: 4000, description: 'Setengah Porsi Sayur Asem' },
        { name: 'Tahu', price: 2000 },
        { name: 'Tempe', price: 2000 },
        { name: 'Es Teh Manis', price: 4000 },
        { name: 'Kerupuk', price: 1000 },
        // Add other menu items here
    ];

    menuItems.forEach(item => {
        const card = document.createElement('div');
        card.classList.add('menu-item', 'col-md-3', 'mb-3');
        card.innerHTML = `
                <div class="menu-details">
                    <h5 class="menu-title">${item.name}</h5>
                    ${item.description ? `<p class="menu-description">${item.description}</p>` : ''}
                    <p class="menu-price">Harga: Rp ${formatCurrency(item.price)}</p>
                </div>
                <button class="btn btn-primary add-to-order-button" onclick="addToOrder('${item.name}', ${item.price})"><i class="fas fa-cart-plus"></i></button>
                `;
        menuCards.appendChild(card);
    });
}

// Function to toggle display of pabrik input based on customer type
function togglePabrikInput() {
    const customerTypeSelect = document.getElementById('customerType');
    const pabrikNameInput = document.getElementById('pabrikName');
    const pabrikNameLabel = document.getElementById('pabrikLabel');
    const customerType = customerTypeSelect.value;
    if (customerType === 'pabrik') {
        pabrikNameInput.style.display = 'block';
        pabrikNameLabel.style.display = 'block';
    } else {
        pabrikNameInput.style.display = 'none';
        pabrikNameInput.value = ''; // Clear the value when switching to 'perorangan'
    }
}

// Function to add item to order
function addToOrder(name, price) {
    const existingOrder = orders.find(order => order.name === name);
    if (existingOrder) {
        existingOrder.quantity++;
    } else {
        orders.push({ name, price, quantity: 1, orderNumber: orderNumber++ }); // Add order number
    }
    renderOrder();
}

// Function to render order table
function renderOrder() {
    orderTable.innerHTML = '';
    let total = 0;
    orders.forEach(order => {
        const row = document.createElement('tr');
        row.innerHTML = `
                <td>${order.name}</td>
                <td>Rp ${formatCurrency(order.price)}</td>
                <td>${order.quantity}</td>
                <td>Rp ${formatCurrency(order.price * order.quantity)}</td>
                <td>
                   <div class="action-buttons">
        <button class="btn btn-sm btn-primary" onclick="decreaseQuantity('${order.name}')"><i class="fas fa-minus"></i></button>
        <button class="btn btn-sm btn-primary" onclick="increaseQuantity('${order.name}')"><i class="fas fa-plus"></i></button>
        <button class="btn btn-sm btn-danger" onclick="removeFromOrder('${order.name}')"><i class="fas fa-trash"></i></button>

    </div>
                </td>
                `;
        orderTable.appendChild(row);
        total += order.price * order.quantity;
    });
    const grandTotalRow = document.createElement('tr');
    grandTotalRow.innerHTML = `
                <td colspan="3"><b>Grand Total</b></td>
                <td><b>Rp ${formatCurrency(total)}</b></td>
                <td></td>
            `;
    orderTable.appendChild(grandTotalRow);

}

// Function to remove item from order
function removeFromOrder(name) {
    const index = orders.findIndex(order => order.name === name);
    if (index !== -1) {
        orders.splice(index, 1);
        renderOrder();
    }
}

// Function to decrease quantity
function decreaseQuantity(name) {
    const order = orders.find(order => order.name === name);
    if (order.quantity > 1) {
        order.quantity--;
        renderOrder();
    }
}

// Function to increase quantity
function increaseQuantity(name) {
    const order = orders.find(order => order.name === name);
    order.quantity++;
    renderOrder();
}

function printNota() {
    // Tambahkan timestamp
    const currentDate = new Date();

    // Format tanggal sesuai keinginan
    const formattedDate = currentDate.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format waktu sesuai keinginan
    const formattedTime = currentDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Gabungkan tanggal dan waktu dengan format yang diinginkan
    const timestamp = `${formattedDate} ${formattedTime}`;


    // Validate customer name
    const customerName = document.getElementById('customerName').value.trim();
    if (customerName === '') {
        document.getElementById('customerName').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('customerName').classList.remove('is-invalid');
    }

    // Validate pabrik name if applicable
    const pabrikName = document.getElementById('pabrikName').value.trim();
    if (document.getElementById('customerType').value === 'pabrik' && pabrikName === '') {
        document.getElementById('pabrikName').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('pabrikName').classList.remove('is-invalid');
    }

    // Validate menu selection
    if (orders.length === 0) {
        alert('Minimal pilih satu menu.');
        return;
    }
    const total = calculateTotal(); // Calculate total
    const customerType = customerTypeSelect.value === 'perorangan' ? 'Perorangan' : 'Pabrik ' + pabrikNameInput.value;
    const notaContent = `
<html>
<head>
    <title>Nota Pembayaran Ayam Gepuk Bu Leny</title>
    <style>
        @page {
            size: A4;
            margin: 2.5cm;
        }
        body{
            font-family: 'Poppins', sans-serif; /* Menggunakan font Poppins */
        }
        table {
            border-collapse: collapse;
            width: 100%;
            font-family: 'Poppins', sans-serif; /* Menggunakan font Poppins */
        }
        th, td {
            border: 1px solid black;
            padding: 8px;
            text-align: left;
            font-family: 'Poppins', sans-serif; /* Menggunakan font Poppins */
        }
        th {
            background-color: #f2f2f2;
        }
        .payment-info {
            margin-top: 20px;
            font-style: italic;
            font-weight: bold;
        }
    </style>
</head>
<body>
    <h2 class="nota-header">Nota Pembayaran Ayam Gepuk Bu Leny</h2>
    <p>Nama Customer: <b>${customerNameInput.value}<b/></p>
    <p><b>${customerType}</b></p>
    <p>Tanggal: ${timestamp}</p> <!-- Tambahkan timestamp di sini -->
    <table>
        <thead>
            <tr>
                <th class="text-center">No</th>
                <th>Menu</th>
                <th>Harga</th>
                <th class="text-center">Quantity</th>
                <th>Total</th>
            </tr>
        </thead>
        <tbody>
            ${getNotaContent()}
        </tbody>
    </table>
    <div class="grand-total">${grandTotalDisplay.innerHTML}</div>
    <div class="payment-info">
        <p style="margin-bottom: 5px;">Pembayaran:</p>
        <p>BNI a/n Muhammad Ramdhani : 0878898972</p>
        <p>DANA/Gopay/Ovo/Shopeepay a/n Muhammad Ramdhani : 082210403837</p>
    </div>
</body>
</html>
`;

    const newWindow = window.open('', '_blank');
    newWindow.document.open();
    newWindow.document.write(notaContent);
    newWindow.document.close();

    newWindow.onload = function () {
        newWindow.print();
    };
}

// Function to get the content of selected columns
function getNotaContent() {
    let content = '';
    orders.forEach(order => {
        content += `
    <tr>
        <td class="text-center">${order.orderNumber}</td>
        <td>${order.name}</td>
        <td>Rp ${formatCurrency(order.price)}</td>
        <td class="text-center">${order.quantity}</td>
        <td>Rp ${formatCurrency(order.price * order.quantity)}</td>
    </tr>
`;
    });

    // Add Grand Total row
    content += `
<tr>
    <td colspan="4"><b>Grand Total</b></td>
    <td><b>Rp ${calculateTotal()}</b></td>
</tr>
`;

    return content;
}

// Function to calculate total
function calculateTotal() {
    let total = 0;
    orders.forEach(order => {
        total += order.price * order.quantity;
    });
    return formatCurrency(total);
}

function sendOrderSummaryToWhatsApp() {
    // Validate customer name
    const customerName = document.getElementById('customerName').value.trim();
    if (customerName === '') {
        document.getElementById('customerName').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('customerName').classList.remove('is-invalid');
    }

    // Validate pabrik name if applicable
    const pabrikName = document.getElementById('pabrikName').value.trim();
    if (document.getElementById('customerType').value === 'pabrik' && pabrikName === '') {
        document.getElementById('pabrikName').classList.add('is-invalid');
        return;
    } else {
        document.getElementById('pabrikName').classList.remove('is-invalid');
    }

    // Validate menu selection
    if (orders.length === 0) {
        alert('Minimal pilih satu menu.');
        return;
    }
    const currentDate = new Date();

    // Format tanggal sesuai keinginan
    const formattedDate = currentDate.toLocaleDateString('id-ID', {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
    });

    // Format waktu sesuai keinginan
    const formattedTime = currentDate.toLocaleTimeString('id-ID', {
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });

    // Gabungkan tanggal dan waktu dengan format yang diinginkan
    const timestamp = `${formattedDate} ${formattedTime}`;

    // Ambil nilai dari customerType
    const customerType = customerTypeSelect.value === 'perorangan' ? 'Perorangan' : 'Pabrik ' + pabrikNameInput.value.trim();

    // Hitung grand total menggunakan fungsi calculateTotal()
    const grandTotal = calculateTotal();

    let pesanan = ''; // String untuk menyimpan detail pesanan
    orders.forEach((order, index) => {
        pesanan += `${index + 1}. ${order.name} | Rp${formatCurrency(order.price)} | ${order.quantity}pcs | Rp${formatCurrency(order.price * order.quantity)}\n`;
    });

    // Format pesan WhatsApp
    const message = `Nama Customer: *${customerName}*\n*${customerType}*\n*Tanggal: ${formattedDate}*\n*Jam: ${formattedTime}*\n\nPesanan:\n${pesanan}\n*Grand Total: Rp${grandTotal}*\n\n*_Pembayaran:_*\n_*BNI* a/n Muhammad Ramdhani : *0878898972*_\n_*DANA/Gopay/Ovo/Shopeepay* a/n Muhammad Ramdhani : *082210403837*_`;

    // Nomor WhatsApp tujuan
    const phoneNumber = '6282210403837';

    // Redirect ke aplikasi WhatsApp dengan menggunakan URL scheme
    window.open(`https://wa.me/${phoneNumber}?text=${encodeURIComponent(message)}`, '_blank');
}

// Function to format currency without decimals
function formatCurrency(amount) {
    return amount.toLocaleString('id-ID', { maximumFractionDigits: 0 });
}

// Initialize menu cards
createMenuCards();