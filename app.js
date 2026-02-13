const API_URL = "https://script.google.com/macros/s/AKfycbzPtqcHZe1ijBBxoerSu_Heqm4ioRoGfbFqW8s7ezb9aQkRl87H77yhbSpjWVAeTPv4Nw/exec";

let products = [];
let cart = JSON.parse(localStorage.getItem("cart")) || [];

document.addEventListener("DOMContentLoaded", async () => {
  await loadProducts();
  updateCartCount();
});

async function loadProducts() {
  const res = await fetch(API_URL);
  products = await res.json();
  renderProducts(products);
}

function renderProducts(data) {
  const grid = document.getElementById("productGrid");
  grid.innerHTML = "";

  data.forEach(product => {
    grid.innerHTML += `
      <div class="product-card">
        <img src="${product.image}" class="product-image">
        <div class="product-info">
          <div class="product-name">${product.name}</div>
          <div class="product-price">₹${product.price}</div>
          <div class="stock-badge ${product.stock === 'In Stock' ? 'in-stock' : 'out-of-stock'}">
            ${product.stock}
          </div>
          <button class="add-to-cart-btn"
            onclick='addToCart(${JSON.stringify(product)})'
            ${product.stock !== 'In Stock' ? 'disabled' : ''}>
            Add to Cart
          </button>
        </div>
      </div>
    `;
  });
}

function addToCart(product) {
  const existing = cart.find(p => p.id === product.id);

  if (existing) {
    existing.quantity += 1;
  } else {
    product.quantity = 1;
    cart.push(product);
  }

  saveCart();
  updateCartCount();
  alert("Added to cart");
}

function saveCart() {
  localStorage.setItem("cart", JSON.stringify(cart));
}

function updateCartCount() {
  const total = cart.reduce((sum, item) => sum + item.quantity, 0);
  document.getElementById("cartCount").textContent = total;
}

function showCart() {
  const container = document.getElementById("cartItems");
  const summary = document.getElementById("cartSummary");

  if (cart.length === 0) {
    container.innerHTML = "Cart is empty";
    summary.innerHTML = "";
    return;
  }

  let total = 0;

  container.innerHTML = cart.map(item => {
    total += item.price * item.quantity;
    return `
      <div class="cart-item">
        <div>${item.name}</div>
        <div>₹${item.price} x ${item.quantity}</div>
      </div>
    `;
  }).join("");

  summary.innerHTML = `
    <h3>Total: ₹${total}</h3>
    <button onclick="sendWhatsApp()">Order on WhatsApp</button>
  `;
}

function sendWhatsApp() {
  if (cart.length === 0) {
    alert("Cart empty");
    return;
  }

  let message = "🛒 New Order:%0A";
  let total = 0;

  cart.forEach(item => {
    message += `${item.name} x ${item.quantity} - ₹${item.price * item.quantity}%0A`;
    total += item.price * item.quantity;
  });

  message += `%0ATotal: ₹${total}`;

  const phone = "918968199945"; 
  window.open(`https://wa.me/${phone}?text=${message}`, "_blank");
}
