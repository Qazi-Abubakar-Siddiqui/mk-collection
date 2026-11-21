// Temporary Starter Products (Phase 3 mein Firebase Firestore se live replace honge)
const sampleProducts = [
  {
    id: "mk-1",
    title: "Rosewood Embroidered 3-Piece",
    category: "MK Closets",
    price: 5450,
    description: "Soft lawn & organza dupatta with delicate floral threadwork.",
    image: "https://images.unsplash.com/photo-1610030469983-98e550d6193c?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "mk-2",
    title: "Ivory Pearl Festive Co-ord",
    category: "MK Closets",
    price: 4200,
    description: "Minimalist pastel co-ord set tailored for effortless daytime grace.",
    image: "https://images.unsplash.com/photo-1595777457583-95e059d581b8?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "ee-1",
    title: "Noor Kundan & Pearl Jhumkas",
    category: "Jewellery",
    price: 1850,
    description: "Lightweight gold-plated festive earrings with hand-set pearls.",
    image: "https://images.unsplash.com/photo-1630019852942-f89202989a59?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "ee-2",
    title: "Dainty Clover Gold Bracelet",
    category: "Jewellery",
    price: 1450,
    description: "Tarnish-resistant everyday wrist charm in warm champagne gold.",
    image: "https://images.unsplash.com/photo-1611591437281-460bfbe1220a?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "ee-3",
    title: "Vanilla & Rose Soy Candle",
    category: "Home Essentials",
    price: 1600,
    description: "Hand-poured frosted glass jar candle for a calm, cozy room.",
    image: "https://images.unsplash.com/photo-1602874801007-bd458bb1b8b6?auto=format&fit=crop&w=700&q=80"
  },
  {
    id: "ee-4",
    title: "Fluted Ceramic Vanity Tray",
    category: "Home Essentials",
    price: 2100,
    description: "Aesthetic organizer tray for perfumes, rings & dressing table decor.",
    image: "https://images.unsplash.com/photo-1616486338812-3dadae4b4ace?auto=format&fit=crop&w=700&q=80"
  }
];

let cart = JSON.parse(localStorage.getItem("mk_cart")) || [];
let activeFilter = "all";
let searchQuery = "";

// DOM Elements
const productsGrid = document.getElementById("productsGrid");
const cartCountEl = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutSummaryBox = document.getElementById("checkoutSummaryBox");
const checkoutForm = document.getElementById("checkoutForm");
const toastEl = document.getElementById("toast");

function formatPKR(amount) {
  return "PKR " + Number(amount).toLocaleString("en-PK");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 2600);
}

// Render Products
function renderProducts() {
  const filtered = sampleProducts.filter((item) => {
    const matchesCategory = activeFilter === "all" || item.category === activeFilter;
    const matchesSearch =
      item.title.toLowerCase().includes(searchQuery) ||
      item.description.toLowerCase().includes(searchQuery) ||
      item.category.toLowerCase().includes(searchQuery);
    return matchesCategory && matchesSearch;
  });

  if (filtered.length === 0) {
    productsGrid.innerHTML = `<p style="grid-column:1/-1;text-align:center;color:#6e5f61;padding:30px;">No matching products found.</p>`;
    return;
  }

  productsGrid.innerHTML = filtered
    .map(
      (product) => `
      <article class="product-card">
        <div class="product-img-wrap">
          <span class="product-tag">${product.category}</span>
          <img src="${product.image}" alt="${product.title}" loading="lazy" />
        </div>
        <div class="product-body">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-desc">${product.description}</p>
          <div class="product-footer">
            <span class="product-price">${formatPKR(product.price)}</span>
            <button class="add-cart-btn" onclick="addToCart('${product.id}')">+ Add to Bag</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

// Cart Functions
function saveCart() {
  localStorage.setItem("mk_cart", JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const product = sampleProducts.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({ ...product, qty: 1 });
  }

  saveCart();
  showToast(`Added "${product.title}" to your bag`);
}

function changeQty(productId, delta) {
  const item = cart.find((i) => i.id === productId);
  if (!item) return;

  item.qty += delta;
  if (item.qty <= 0) {
    cart = cart.filter((i) => i.id !== productId);
  }
  saveCart();
}

function removeFromCart(productId) {
  cart = cart.filter((i) => i.id !== productId);
  saveCart();
}

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);

  cartCountEl.textContent = totalItems;
  cartSubtotalEl.textContent = formatPKR(subtotal);
  proceedCheckoutBtn.disabled = cart.length === 0;

  if (cart.length === 0) {
    cartItemsContainer.innerHTML = `
      <div class="empty-bag">
        <p>Your shopping bag is currently empty.</p>
        <small>Explore MK Closets &amp; Elite Essentials to add your favorites.</small>
      </div>
    `;
    return;
  }

  cartItemsContainer.innerHTML = cart
    .map(
      (item) => `
      <div class="cart-item">
        <img src="${item.image}" alt="${item.title}" />
        <div class="cart-item-info">
          <div class="cart-item-title">${item.title}</div>
          <div class="cart-item-price">${formatPKR(item.price)}</div>
          <div>
            <div class="qty-controls">
              <button class="qty-btn" onclick="changeQty('${item.id}', -1)">−</button>
              <span>${item.qty}</span>
              <button class="qty-btn" onclick="changeQty('${item.id}', 1)">+</button>
            </div>
            <button class="remove-item" onclick="removeFromCart('${item.id}')">Remove</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

// Drawer & Modal Controls
function openCart() {
  cartDrawer.classList.add("open");
  cartOverlay.classList.add("open");
}

function closeCart() {
  cartDrawer.classList.remove("open");
  cartOverlay.classList.remove("open");
}

function openCheckoutModal() {
  closeCart();
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const itemsList = cart.map((i) => `${i.title} (x${i.qty})`).join(", ");

  checkoutSummaryBox.innerHTML = `
    <strong>Order Summary:</strong> ${itemsList}<br/>
    <strong>Total Payable:</strong> ${formatPKR(subtotal)}
  `;
  checkoutModal.classList.add("open");
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("open");
}

// Filter & Search Listeners
function setActiveFilter(filterValue) {
  activeFilter = filterValue;

  document.querySelectorAll("#filterPills .pill").forEach((btn) => {
    btn.classList.toggle("active", btn.dataset.filter === filterValue);
  });

  document.querySelectorAll(".nav-links .nav-link").forEach((link) => {
    link.classList.toggle("active", link.dataset.filter === filterValue);
  });

  renderProducts();
}

document.querySelectorAll("#filterPills .pill, .nav-links .nav-link, .cat-card").forEach((el) => {
  el.addEventListener("click", (e) => {
    const filterVal = el.dataset.filter;
    if (!filterVal) return;
    setActiveFilter(filterVal);
    if (el.classList.contains("cat-card")) {
      document.getElementById("collections").scrollIntoView({ behavior: "smooth" });
    }
  });
});

document.getElementById("searchInput").addEventListener("input", (e) => {
  searchQuery = e.target.value.trim().toLowerCase();
  renderProducts();
});

document.getElementById("openCartBtn").addEventListener("click", openCart);
document.getElementById("closeCartBtn").addEventListener("click", closeCart);
cartOverlay.addEventListener("click", closeCart);
proceedCheckoutBtn.addEventListener("click", openCheckoutModal);
document.getElementById("closeModalBtn").addEventListener("click", closeCheckoutModal);

// Test Checkout Submit (Phase 5 mein EmailJS/Formspree + Firebase se connect hoga)
checkoutForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const orderData = {
    customerName: document.getElementById("custName").value.trim(),
    phone: document.getElementById("custPhone").value.trim(),
    city: document.getElementById("custCity").value.trim(),
    address: document.getElementById("custAddress").value.trim(),
    note: document.getElementById("custNote").value.trim(),
    items: cart,
    total: cart.reduce((sum, item) => sum + item.price * item.qty, 0)
  };

  console.log("Test Order Payload:", orderData);

  cart = [];
  saveCart();
  checkoutForm.reset();
  closeCheckoutModal();
  showToast("Thank you! Your order has been placed.");
});

// Initial Render
renderProducts();
updateCartUI();