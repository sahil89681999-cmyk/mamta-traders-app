// Configuration
const SPREADSHEET_ID = '1d4GO49fUeK2MWGD5Y72vfkJs22m1xc2KkARKm5Er5ds';
const RAZORPAY_KEY = 'YOUR_RAZORPAY_KEY_HERE'; // You'll add this later

// Google Sheets API URLs
const SHEETS_BASE_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?`;
const PRODUCTS_QUERY = `${SHEETS_BASE_URL}tqx=out:json&sheet=Products`;
const ORDERS_QUERY = `${SHEETS_BASE_URL}tqx=out:json&sheet=Orders`;

// Global data
let products = [];
let cart = JSON.parse(localStorage.getItem('cart')) || [];
let orders = [];
let selectedPaymentMethod = 'COD';
let customerPhone = localStorage.getItem('customerPhone') || '';

// Initialize app
document.addEventListener('DOMContentLoaded', async () => {
    await loadProducts();
    await loadOrders();
    updateCartBadge();
    renderProducts();
    
    // Ask for phone number if not set
    if (!customerPhone) {
        const phone = prompt('Welcome! Please enter your phone number for order tracking:');
        if (phone && phone.length === 10) {
            customerPhone = phone;
            localStorage.setItem('customerPhone', phone);
        }
    }
});

// Load products from Google Sheets
async function loadProducts() {
    try {
        const response = await fetch(PRODUCTS_QUERY);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        const rows = json.table.rows;
        products = rows.map(row => ({
            id: row.c[0]?.v || '',
            name: row.c[1]?.v || '',
            category: row.c[2]?.v || '',
            price: parseFloat(row.c[3]?.v) || 0,
            unit: row.c[4]?.v || '',
            stock: row.c[5]?.v || '',
            image: row.c[6]?.v || 'https://via.placeholder.com/200',
            description: row.c[7]?.v || ''
        }));
        
        renderCategories();
    } catch (error) {
        console.error('Error loading products:', error);
        showNotification('Failed to load products. Please refresh.', 'error');
    }
}

// Load orders from Google Sheets
async function loadOrders() {
    if (!customerPhone) return;
    
    try {
        const response = await fetch(ORDERS_QUERY);
        const text = await response.text();
        const json = JSON.parse(text.substring(47).slice(0, -2));
        
        const rows = json.table.rows;
        orders = rows
            .map(row => ({
                id: row.c[0]?.v || '',
                customerName: row.c[1]?.v || '',
                customerPhone: row.c[2]?.v || '',
                address: row.c[3]?.v || '',
                items: row.c[4]?.v || '',
                total: parseFloat(row.c[5]?.v) || 0,
                paymentMethod: row.c[6]?.v || '',
                status: row.c[7]?.v || '',
                orderDate: row.c[8]?.v || '',
                deliveryDate: row.c[9]?.v || ''
            }))
            .filter(order => order.customerPhone === customerPhone);
        
        renderOrders();
    } catch (error) {
        console.error('Error loading orders:', error);
    }
}

// Render categories
function renderCategories() {
    const categories = ['All', ...new Set(products.map(p => p.category))];
    const filterHTML = categories.map(cat => 
        `<button class="category-btn ${cat === 'All' ? 'active' : ''}" onclick="filterByCategory('${cat}')">${cat}</button>`
    ).join('');
    document.getElementById('categoryFilter').innerHTML = filterHTML;
}

// Render products
function renderProducts(filteredProducts = products) {
    const grid = document.getElementById('productGrid');
    
    if (filteredProducts.length === 0) {
        grid.innerHTML = '<div class="empty-state"><div class="empty-icon">🔍</div><div class="empty-text">No products found</div></div>';
        return;
    }
    
    grid.innerHTML = filteredProducts.map(product => `
        <div class="product-card">
            <img src="${product.image}" alt="${product.name}" class="product-image" onerror="this.src='https://via.placeholder.com/200'">
            <div class="product-info">
                <div class="product-name">${product.name}</div>
                <div class="product-unit">${product.unit}</div>
                <div class="product-price">₹${product.price}</div>
                <span class="stock-badge ${product.stock === 'In Stock' ? 'in-stock' : 'out-of-stock'}">
                    ${product.stock}
                </span>
                <button 
                    class="add-to-cart-btn" 
                    onclick="addToCart('${product.id}')"
                    ${product.stock !== 'In Stock' ? 'disabled' : ''}
                >
                    ${product.stock === 'In Stock' ? '🛒 Add to Cart' : 'Out of Stock'}
                </button>
            </div>
        </div>
    `).join('');
}

// Filter products by category
function filterByCategory(category) {
    // Update active button
    document.querySelectorAll('.category-btn').forEach(btn => {
        btn.classList.remove('active');
    });
    event.target.classList.add('active');
    
    const filtered = category === 'All' 
        ? products 
        : products.filter(p => p.category === category);
    
    renderProducts(filtered);
}

// Filter products by search
function filterProducts() {
    const searchTerm = document.getElementById('searchBox').value.toLowerCase();
    const activeCategory = document.querySelector('.category-btn.active').textContent;
    
    let filtered = products;
    
    if (activeCategory !== 'All') {
        filtered = filtered.filter(p => p.category === activeCategory);
    }
    
    if (searchTerm) {
        filtered = filtered.filter(p => 
            p.name.toLowerCase().includes(searchTerm) ||
            p.category.toLowerCase().includes(searchTerm)
        );
    }
    
    renderProducts(filtered);
}

// Add to cart
function addToCart(productId) {
    const product = products.find(p => p.id === productId);
    const existingItem = cart.find(item => item.id === productId);
    
    if (existingItem) {
        existingItem.quantity++;
    } else {
        cart.push({
            id: product.id,
            name: product.name,
            price: product.price,
            image: product.image,
            quantity: 1
        });
    }
    
    saveCart();
    updateCartBadge();
    showNotification(`${product.name} added to cart!`, 'success');
}

// Update cart quantity
function updateQuantity(productId, change) {
    const item = cart.find(item => item.id === productId);
    if (item) {
        item.quantity += change;
        if (item.quantity <= 0) {
            removeFromCart(productId);
        } else {
            saveCart();
            renderCart();
        }
    }
}

// Remove from cart
function removeFromCart(productId) {
    cart = cart.filter(item => item.id !== productId);
    saveCart();
    updateCartBadge();
    renderCart();
    showNotification('Item removed from cart', 'success');
}

// Save cart to localStorage
function saveCart() {
    localStorage.setItem('cart', JSON.stringify(cart));
    updateCartBadge();
}

// Update cart badge
function updateCartBadge() {
    const totalItems = cart.reduce((sum, item) => sum + item.quantity, 0);
    document.getElementById('cartCount').textContent = totalItems;
}

// Render cart
function renderCart() {
    const cartContainer = document.getElementById('cartItems');
    const summaryContainer = document.getElementById('cartSummary');
    
    if (cart.length === 0) {
        cartContainer.innerHTML = '<div class="empty-state"><div class="empty-icon">🛒</div><div class="empty-text">Your cart is empty</div></div>';
        summaryContainer.innerHTML = '';
        return;
    }
    
    const cartHTML = cart.map(item => `
        <div class="cart-item">
            <img src="${item.image}" alt="${item.name}" class="cart-item-image" onerror="this.src='https://via.placeholder.com/80'">
            <div class="cart-item-info">
                <div class="cart-item-name">${item.name}</div>
                <div class="cart-item-price">₹${item.price} each</div>
            </div>
            <div class="quantity-control">
                <button class="qty-btn" onclick="updateQuantity('${item.id}', -1)">-</button>
                <span class="qty-display">${item.quantity}</span>
                <button class="qty-btn" onclick="updateQuantity('${item.id}', 1)">+</button>
            </div>
            <button class="remove-btn" onclick="removeFromCart('${item.id}')">🗑️</button>
        </div>
    `).join('');
    
    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    
    const summaryHTML = `
        <div class="cart-summary">
            <div class="summary-row">
                <span>Subtotal:</span>
                <span>₹${subtotal}</span>
            </div>
            <div class="summary-row">
                <span>Delivery:</span>
                <span>Free</span>
            </div>
            <div class="summary-row total">
                <span>Total:</span>
                <span>₹${subtotal}</span>
            </div>
            <button class="checkout-btn" onclick="proceedToCheckout()">Proceed to Checkout</button>
        </div>
    `;
    
    cartContainer.innerHTML = cartHTML;
    summaryContainer.innerHTML = summaryHTML;
}

// Render orders
function renderOrders() {
    const container = document.getElementById('ordersList');
    
    if (orders.length === 0) {
        container.innerHTML = '<div class="empty-state"><div class="empty-icon">📦</div><div class="empty-text">No orders yet</div></div>';
        return;
    }
    
    const ordersHTML = orders.map(order => `
        <div class="order-card">
            <div class="order-header">
                <div class="order-id">Order #${order.id}</div>
                <span class="order-status status-${order.status.toLowerCase().replace(' ', '-')}">
                    ${order.status}
                </span>
            </div>
            <div class="order-items">📦 ${order.items}</div>
            <div>📅 Ordered: ${order.orderDate}</div>
            <div>🚚 Expected: ${order.deliveryDate}</div>
            <div class="order-total">₹${order.total}</div>
        </div>
    `).join('');
    
    container.innerHTML = ordersHTML;
}

// Proceed to checkout
function proceedToCheckout() {
    if (cart.length === 0) {
        showNotification('Your cart is empty!', 'error');
        return;
    }
    
    // Hide cart, show checkout form
    document.getElementById('cartTab').classList.add('hidden');
    document.getElementById('checkoutModal').classList.remove('hidden');
    
    // Pre-fill phone if available
    if (customerPhone) {
        document.getElementById('customerPhone').value = customerPhone;
    }
}

// Select payment method
function selectPayment(method) {
    selectedPaymentMethod = method;
    document.querySelectorAll('.payment-option').forEach(option => {
        option.classList.remove('selected');
    });
    event.target.closest('.payment-option').classList.add('selected');
}

// Handle checkout form submission
document.getElementById('checkoutForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const name = document.getElementById('customerName').value;
    const phone = document.getElementById('customerPhone').value;
    const address = document.getElementById('customerAddress').value;
    
    // Save phone for future
    customerPhone = phone;
    localStorage.setItem('customerPhone', phone);
    
    const total = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const items = cart.map(item => `${item.name} (${item.quantity})`).join(', ');
    
    if (selectedPaymentMethod === 'Online') {
        // Razorpay payment
        initiateRazorpayPayment(name, phone, address, total, items);
    } else {
        // COD - Place order directly
        await placeOrder(name, phone, address, total, items, 'COD');
    }
});

// Initiate Razorpay payment
function initiateRazorpayPayment(name, phone, address, total, items) {
    const options = {
        key: RAZORPAY_KEY,
        amount: total * 100, // Convert to paise
        currency: 'INR',
        name: 'Mamta Traders',
        description: 'Order Payment',
        handler: async function(response) {
            // Payment successful
            await placeOrder(name, phone, address, total, items, 'Online', response.razorpay_payment_id);
        },
        prefill: {
            name: name,
            contact: phone
        },
        theme: {
            color: '#667eea'
        },
        modal: {
            ondismiss: function() {
                showNotification('Payment cancelled', 'error');
            }
        }
    };
    
    const rzp = new Razorpay(options);
    rzp.open();
}

// Place order
async function placeOrder(name, phone, address, total, items, paymentMethod, paymentId = '') {
    const orderId = 'ORD' + Date.now();
    const orderDate = new Date().toISOString().split('T')[0];
    const deliveryDate = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Add to Google Sheets (you'll implement this with Apps Script)
    const orderData = {
        orderId,
        customerName: name,
        customerPhone: phone,
        customerAddress: address,
        items,
        total,
        paymentMethod,
        status: 'New',
        orderDate,
        deliveryDate,
        paymentId
    };
    
    try {
        // Send to Google Sheets via Apps Script Web App
        await fetch('https://script.google.com/macros/s/AKfycbyuWNQwKueYXd6ZWLliJSq15ZumLEV5vC9Er8FZqSnjMSmeCgLRgaxT9z2y8FXINcXHpQ/exec', {
            method: 'POST',
            body: JSON.stringify(orderData)
        });
        
        // For now, simulate success
        console.log('Order placed:', orderData);
        
        // Send WhatsApp notification
        sendWhatsAppNotification(orderData);
        
        // Clear cart
        cart = [];
        saveCart();
        
        // Show success
        showNotification('Order placed successfully! 🎉', 'success');
        
        // Reset form and go to orders
        document.getElementById('checkoutForm').reset();
        document.getElementById('checkoutModal').classList.add('hidden');
        showTab('orders');
        
        // Reload orders
        await loadOrders();
        
    } catch (error) {
        console.error('Error placing order:', error);
        showNotification('Failed to place order. Please try again.', 'error');
    }
}

// Send WhatsApp notification
function sendWhatsAppNotification(order) {
    // Using WhatsApp Business API or third-party service
    // For now, create a WhatsApp link
    const message = `New Order!
Order ID: ${order.orderId}
Customer: ${order.customerName}
Phone: ${order.customerPhone}
Items: ${order.items}
Total: ₹${order.total}
Payment: ${order.paymentMethod}
Address: ${order.customerAddress}`;
    
    const encodedMessage = encodeURIComponent(message);
    const whatsappURL = `https://wa.me/YOUR_BUSINESS_NUMBER?text=${encodedMessage}`;
    
    // Open WhatsApp (optional - can be automated with API)
    // window.open(whatsappURL, '_blank');
    
    console.log('WhatsApp notification:', message);
}

// Show tab
function showTab(tabName) {
    // Hide all tabs
    document.getElementById('productsTab').classList.add('hidden');
    document.getElementById('cartTab').classList.add('hidden');
    document.getElementById('ordersTab').classList.add('hidden');
    document.getElementById('checkoutModal').classList.add('hidden');
    
    // Remove active class from all nav tabs
    document.querySelectorAll('.nav-tab').forEach(tab => {
        tab.classList.remove('active');
    });
    
    // Show selected tab
    if (tabName === 'products') {
        document.getElementById('productsTab').classList.remove('hidden');
        document.querySelectorAll('.nav-tab')[0].classList.add('active');
    } else if (tabName === 'cart') {
        document.getElementById('cartTab').classList.remove('hidden');
        document.querySelectorAll('.nav-tab')[1].classList.add('active');
        renderCart();
    } else if (tabName === 'orders') {
        document.getElementById('ordersTab').classList.remove('hidden');
        document.querySelectorAll('.nav-tab')[2].classList.add('active');
        loadOrders();
    }
}

// Show notification
function showNotification(message, type = 'success') {
    const notification = document.createElement('div');
    notification.className = `notification ${type}`;
    notification.textContent = message;
    document.body.appendChild(notification);
    
    setTimeout(() => {
        notification.remove();
    }, 3000);
}
