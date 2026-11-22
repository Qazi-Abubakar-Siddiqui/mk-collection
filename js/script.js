import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import emailjs from "https://cdn.jsdelivr.net/npm/@emailjs/browser@4/+esm";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { SITE_CONFIG } from "./config.js";

const app = initializeApp(SITE_CONFIG.firebase);
const db = getFirestore(app);
const SHIPPING_FEE = Number(SITE_CONFIG.shippingFee) || 300;

const sampleProducts = [
  {
    id: "mk-1",
    title: "Rosewood Embroidered 3-Piece",
    category: "MK Closets",
    price: 5450,
    description: "Soft lawn & organza dupatta with delicate floral threadwork.",
    image: "assets/images/hero-closet.jpg"
  },
  {
    id: "mk-2",
    title: "Ivory Pearl Festive Co-ord",
    category: "MK Closets",
    price: 4200,
    description: "Minimalist pastel co-ord set tailored for effortless daytime grace.",
    image: "assets/images/hero-closet.jpg"
  },
  {
    id: "ee-1",
    title: "Noor Kundan & Pearl Jhumkas",
    category: "Jewellery",
    price: 1850,
    description: "Lightweight gold-plated festive earrings with hand-set pearls.",
    image: "assets/images/hero-jewellery.jpg"
  },
  {
    id: "ee-2",
    title: "Dainty Clover Gold Bracelet",
    category: "Jewellery",
    price: 1450,
    description: "Tarnish-resistant everyday wrist charm in warm champagne gold.",
    image: "assets/images/hero-jewellery.jpg"
  },
  {
    id: "ee-3",
    title: "Vanilla & Rose Soy Candle",
    category: "Home Essentials",
    price: 1600,
    description: "Hand-poured frosted glass jar candle for a calm, cozy room.",
    image: "assets/images/hero-jewellery.jpg"
  },
  {
    id: "ee-4",
    title: "Fluted Ceramic Vanity Tray",
    category: "Home Essentials",
    price: 2100,
    description: "Aesthetic organizer tray for perfumes, rings & dressing table decor.",
    image: "assets/images/hero-jewellery.jpg"
  }
];

let allProducts = [...sampleProducts];
let cart = JSON.parse(localStorage.getItem("mk_cart")) || [];
let activeFilter = "all";
let searchQuery = "";

const productsGrid = document.getElementById("productsGrid");
const cartCountEl = document.getElementById("cartCount");
const cartDrawer = document.getElementById("cartDrawer");
const cartOverlay = document.getElementById("cartOverlay");
const cartItemsContainer = document.getElementById("cartItemsContainer");
const cartSubtotalEl = document.getElementById("cartSubtotal");
const cartShippingEl = document.getElementById("cartShipping");
const cartGrandTotalEl = document.getElementById("cartGrandTotal");
const proceedCheckoutBtn = document.getElementById("proceedCheckoutBtn");
const checkoutModal = document.getElementById("checkoutModal");
const checkoutSummaryBox = document.getElementById("checkoutSummaryBox");
const checkoutForm = document.getElementById("checkoutForm");
const placeOrderBtn = document.getElementById("placeOrderBtn");
const toastEl = document.getElementById("toast");

function formatPKR(amount) {
  return "PKR " + Number(amount || 0).toLocaleString("en-PK");
}

function showToast(message) {
  toastEl.textContent = message;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

async function loadProductsFromFirestore() {
  try {
    const querySnapshot = await getDocs(collection(db, "products"));
    if (!querySnapshot.empty) {
      allProducts = querySnapshot.docs.map((docSnap) => ({
        id: docSnap.id,
        ...docSnap.data()
      }));
    } else {
      allProducts = [...sampleProducts];
    }
  } catch (err) {
    console.warn("Firestore products load fallback:", err.message);
    allProducts = [...sampleProducts];
  }
  renderProducts();
}

function renderProducts() {
  const filtered = allProducts.filter((item) => {
    const matchesCategory = activeFilter === "all" || item.category === activeFilter;
    const matchesSearch =
      (item.title || "").toLowerCase().includes(searchQuery) ||
      (item.description || "").toLowerCase().includes(searchQuery) ||
      (item.category || "").toLowerCase().includes(searchQuery);
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
          <span class="product-tag">${product.category || "Collection"}</span>
          <img src="${product.image || "assets/images/hero-closet.jpg"}" alt="${product.title}" loading="lazy" />
        </div>
        <div class="product-body">
          <h3 class="product-title">${product.title}</h3>
          <p class="product-desc">${product.description || ""}</p>
          <div class="product-footer">
            <span class="product-price">${formatPKR(product.price)}</span>
            <button class="add-cart-btn" data-add-id="${product.id}">+ Add to Bag</button>
          </div>
        </div>
      </article>
    `
    )
    .join("");
}

productsGrid.addEventListener("click", (e) => {
  const btn = e.target.closest("[data-add-id]");
  if (!btn) return;
  addToCart(btn.dataset.addId);
});

function saveCart() {
  localStorage.setItem("mk_cart", JSON.stringify(cart));
  updateCartUI();
}

function addToCart(productId) {
  const product = allProducts.find((p) => p.id === productId);
  if (!product) return;

  const existing = cart.find((item) => item.id === productId);
  if (existing) {
    existing.qty += 1;
  } else {
    cart.push({
      id: product.id,
      title: product.title,
      price: Number(product.price) || 0,
      image: product.image || "assets/images/hero-closet.jpg",
      qty: 1
    });
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

cartItemsContainer.addEventListener("click", (e) => {
  const qtyBtn = e.target.closest("[data-qty-id]");
  if (qtyBtn) {
    changeQty(qtyBtn.dataset.qtyId, Number(qtyBtn.dataset.delta));
    return;
  }
  const removeBtn = e.target.closest("[data-remove-id]");
  if (removeBtn) {
    removeFromCart(removeBtn.dataset.removeId);
  }
});

function updateCartUI() {
  const totalItems = cart.reduce((sum, item) => sum + item.qty, 0);
  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const shipping = cart.length > 0 ? SHIPPING_FEE : 0;
  const grandTotal = subtotal + shipping;

  cartCountEl.textContent = totalItems;
  cartSubtotalEl.textContent = formatPKR(subtotal);
  cartShippingEl.textContent = formatPKR(shipping);
  cartGrandTotalEl.textContent = formatPKR(grandTotal);
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
              <button type="button" class="qty-btn" data-qty-id="${item.id}" data-delta="-1">−</button>
              <span>${item.qty}</span>
              <button type="button" class="qty-btn" data-qty-id="${item.id}" data-delta="1">+</button>
            </div>
            <button type="button" class="remove-item" data-remove-id="${item.id}">Remove</button>
          </div>
        </div>
      </div>
    `
    )
    .join("");
}

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
  const grandTotal = subtotal + SHIPPING_FEE;
  const itemsList = cart.map((i) => `${i.title} (x${i.qty})`).join(", ");

  checkoutSummaryBox.innerHTML = `
    <strong>Items:</strong> ${itemsList}<br/>
    <strong>Subtotal:</strong> ${formatPKR(subtotal)} + <strong>Shipping:</strong> ${formatPKR(SHIPPING_FEE)}<br/>
    <strong>Total Payable (COD):</strong> ${formatPKR(grandTotal)}
  `;
  checkoutModal.classList.add("open");
}

function closeCheckoutModal() {
  checkoutModal.classList.remove("open");
}

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
  el.addEventListener("click", () => {
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

function validateOrderInput({ customerName, phone, city, address }) {
  if (customerName.length < 3 || !/^[a-zA-Z\s.'-]+$/.test(customerName)) {
    return "Please enter a valid full name (at least 3 letters).";
  }
  const cleanPhone = phone.replace(/[\s-]/g, "");
  if (!/^(\+923|923|03)\d{9}$/.test(cleanPhone)) {
    return "Please enter a valid Pakistani mobile number (e.g. 0300-1234567).";
  }
  if (city.length < 2 || !/^[a-zA-Z\s.-]+$/.test(city)) {
    return "Please enter a valid city name.";
  }
  if (address.length < 10) {
    return "Please enter a complete delivery address (House #, Street, Area).";
  }
  return null;
}

async function sendOrderEmailNotification(orderId, orderPayload) {
  const { publicKey, serviceId, templateId } = SITE_CONFIG.emailService || {};
  if (!publicKey || !serviceId || !templateId) return;

  const itemsFormatted = orderPayload.items
    .map((i) => `- ${i.title} (x${i.qty}) — ${formatPKR(i.price * i.qty)}`)
    .join("\n");

  try {
    await emailjs.send(
      serviceId,
      templateId,
      {
        order_id: orderId.slice(0, 7).toUpperCase(),
        customer_name: orderPayload.customerName,
        customer_phone: orderPayload.phone,
        customer_city: orderPayload.city,
        customer_address: orderPayload.address,
        order_note: orderPayload.note || "None",
        order_items: itemsFormatted,
        subtotal: formatPKR(orderPayload.subtotal),
        shipping_fee: formatPKR(orderPayload.shippingFee),
        total_amount: formatPKR(orderPayload.total)
      },
      { publicKey }
    );
  } catch (emailErr) {
    console.warn("Order saved, but email notification skipped:", emailErr);
  }
}

checkoutForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  if (cart.length === 0) return;

  const customerName = document.getElementById("custName").value.trim();
  const phone = document.getElementById("custPhone").value.trim();
  const city = document.getElementById("custCity").value.trim();
  const address = document.getElementById("custAddress").value.trim();
  const note = document.getElementById("custNote").value.trim();

  const validationError = validateOrderInput({ customerName, phone, city, address });
  if (validationError) {
    showToast(validationError);
    return;
  }

  placeOrderBtn.disabled = true;
  placeOrderBtn.textContent = "Placing Order...";

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.qty, 0);
  const grandTotal = subtotal + SHIPPING_FEE;

  const orderPayload = {
    customerName,
    phone: phone.replace(/[\s-]/g, ""),
    city,
    address,
    note,
    items: cart.map((i) => ({
      id: i.id,
      title: i.title,
      price: i.price,
      qty: i.qty
    })),
    subtotal,
    shippingFee: SHIPPING_FEE,
    total: grandTotal,
    paymentMethod: "Cash on Delivery",
    status: "Pending",
    createdAt: serverTimestamp()
  };

  try {
    const docRef = await addDoc(collection(db, "orders"), orderPayload);
    await sendOrderEmailNotification(docRef.id, orderPayload);
    cart = [];
    saveCart();
    checkoutForm.reset();
    closeCheckoutModal();
    showToast(`Order placed! ID: ${docRef.id.slice(0, 7).toUpperCase()}`);
  } catch (err) {
    console.error("Order save error:", err);
    showToast("Could not place order. Please try again.");
  } finally {
    placeOrderBtn.disabled = false;
    placeOrderBtn.textContent = "Place Order (Cash on Delivery)";
  }
});

function syncContactAndSocialLinks() {
  const waBtn = document.querySelector(".whatsapp-float");
  if (waBtn && SITE_CONFIG.whatsappNumber) {
    const cleanWa = String(SITE_CONFIG.whatsappNumber).replace(/[^\d]/g, "");
    const defaultMsg = encodeURIComponent(
      `Assalam-o-Alaikum ${SITE_CONFIG.brandName || "MK Collection"}! I would like to inquire about a product.`
    );
    waBtn.href = `https://wa.me/${cleanWa}?text=${defaultMsg}`;
  }

  const socialMap = {
    Instagram: SITE_CONFIG.socials?.instagram,
    Facebook: SITE_CONFIG.socials?.facebook,
    TikTok: SITE_CONFIG.socials?.tiktok
  };

  Object.entries(socialMap).forEach(([label, url]) => {
    const linkEl = document.querySelector(`.social-links a[aria-label="${label}"]`);
    if (linkEl && url) {
      linkEl.href = url;
    }
  });
}

syncContactAndSocialLinks();
renderProducts();
updateCartUI();
loadProductsFromFirestore();