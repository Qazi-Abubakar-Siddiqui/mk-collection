import { initializeApp } from "https://www.gstatic.com/firebasejs/13.4.0/firebase-app.js";
import {
  getAuth,
  signInWithEmailAndPassword,
  signOut,
  onAuthStateChanged
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-auth.js";
import {
  getFirestore,
  collection,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp
} from "https://www.gstatic.com/firebasejs/13.4.0/firebase-firestore.js";
import { SITE_CONFIG } from "./config.js";

const app = initializeApp(SITE_CONFIG.firebase);
const auth = getAuth(app);
const db = getFirestore(app);

const loginSection = document.getElementById("loginSection");
const dashboardSection = document.getElementById("dashboardSection");
const loginForm = document.getElementById("loginForm");
const loginBtn = document.getElementById("loginBtn");
const logoutBtn = document.getElementById("logoutBtn");
const adminUserBadge = document.getElementById("adminUserBadge");

const productForm = document.getElementById("productForm");
const editingProductId = document.getElementById("editingProductId");
const formHeading = document.getElementById("formHeading");
const saveProductBtn = document.getElementById("saveProductBtn");
const cancelEditBtn = document.getElementById("cancelEditBtn");

const addProductImageBtn = document.getElementById("addProductImageBtn");
const removeProductImageBtn = document.getElementById("removeProductImageBtn");
const prodImageFile = document.getElementById("prodImageFile");
const prodImageInput = document.getElementById("prodImage");
const imagePreviewWrap = document.getElementById("imagePreviewWrap");
const imagePreview = document.getElementById("imagePreview");
const uploadStatusText = document.getElementById("uploadStatusText");

const productsTableBody = document.getElementById("productsTableBody");
const ordersTableBody = document.getElementById("ordersTableBody");
const prodCountEl = document.getElementById("prodCount");
const orderCountEl = document.getElementById("orderCount");
const toastEl = document.getElementById("toast");

let cachedProducts = [];

function showToast(msg) {
  toastEl.textContent = msg;
  toastEl.classList.add("show");
  setTimeout(() => toastEl.classList.remove("show"), 3000);
}

function formatPKR(num) {
  return "PKR " + Number(num || 0).toLocaleString("en-PK");
}

document.querySelectorAll(".admin-tabs .pill").forEach((btn) => {
  btn.addEventListener("click", () => {
    const targetId = btn.dataset.tab;
    document.querySelectorAll(".admin-tabs .pill").forEach((b) => b.classList.remove("active"));
    btn.classList.add("active");

    ["addTab", "productsTab", "ordersTab"].forEach((id) => {
      document.getElementById(id).classList.toggle("hidden", id !== targetId);
    });
  });
});

function switchToTab(tabId) {
  document.querySelector(`.admin-tabs .pill[data-tab="${tabId}"]`)?.click();
}

onAuthStateChanged(auth, async (user) => {
  if (user) {
    loginSection.classList.add("hidden");
    dashboardSection.classList.remove("hidden");
    logoutBtn.classList.remove("hidden");
    adminUserBadge.textContent = `Signed in as ${user.email}`;
    await Promise.all([loadAdminProducts(), loadAdminOrders()]);
  } else {
    loginSection.classList.remove("hidden");
    dashboardSection.classList.add("hidden");
    logoutBtn.classList.add("hidden");
    adminUserBadge.textContent = "";
  }
});

loginForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  loginBtn.disabled = true;
  loginBtn.textContent = "Signing in...";

  const email = document.getElementById("adminEmail").value.trim();
  const password = document.getElementById("adminPassword").value;

  try {
    await signInWithEmailAndPassword(auth, email, password);
    showToast("Welcome back! Admin session active.");
  } catch (err) {
    console.error("Login error:", err);
    showToast("Invalid email or password.");
  } finally {
    loginBtn.disabled = false;
    loginBtn.textContent = "Sign In";
  }
});

logoutBtn.addEventListener("click", async () => {
  await signOut(auth);
  showToast("Logged out.");
});

function clearProductImage() {
  prodImageInput.value = "";
  prodImageFile.value = "";
  imagePreview.src = "";
  imagePreviewWrap.style.display = "none";
  uploadStatusText.textContent = "Opens gallery on mobile or files on laptop";
}

addProductImageBtn.addEventListener("click", () => {
  prodImageFile.click();
});

removeProductImageBtn.addEventListener("click", () => {
  clearProductImage();
  showToast("Image removed.");
});

prodImageFile.addEventListener("change", async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;

  if (!file.type.startsWith("image/")) {
    showToast("Please select a valid image file.");
    return;
  }

  const localUrl = URL.createObjectURL(file);
  imagePreview.src = localUrl;
  imagePreviewWrap.style.display = "flex";

  const { cloudName, uploadPreset } = SITE_CONFIG.cloudinary || {};
  if (!cloudName || cloudName === "PASTE_YOUR_CLOUD_NAME") {
    prodImageInput.value = localUrl;
    uploadStatusText.textContent = "Local preview ready (set Cloudinary cloudName for permanent link)";
    return;
  }

  saveProductBtn.disabled = true;
  addProductImageBtn.disabled = true;
  uploadStatusText.textContent = "Uploading image...";

  try {
    const formData = new FormData();
    formData.append("file", file);
    formData.append("upload_preset", uploadPreset);

    const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
      method: "POST",
      body: formData
    });
    const data = await res.json();

    if (!res.ok || !data.secure_url) {
      throw new Error(data.error?.message || "Upload failed");
    }

    prodImageInput.value = data.secure_url;
    imagePreview.src = data.secure_url;
    uploadStatusText.textContent = "Image added and ready!";
    showToast("Product image uploaded!");
  } catch (err) {
    console.error("Image upload error:", err);
    uploadStatusText.textContent = "Upload failed. Try again.";
    showToast("Could not upload image.");
  } finally {
    saveProductBtn.disabled = false;
    addProductImageBtn.disabled = false;
  }
});

async function loadAdminProducts() {
  const snap = await getDocs(collection(db, "products"));
  cachedProducts = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  prodCountEl.textContent = cachedProducts.length;

  if (cachedProducts.length === 0) {
    productsTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6e5f61;">No products in Firestore yet. Add your first product!</td></tr>`;
    return;
  }

  productsTableBody.innerHTML = cachedProducts
    .map(
      (p) => `
      <tr>
        <td><img src="${p.image || "assets/images/hero-closet.jpg"}" alt="${p.title}" class="thumb-mini" /></td>
        <td><strong>${p.title}</strong></td>
        <td>${p.category}</td>
        <td>${formatPKR(p.price)}</td>
        <td>
          <button type="button" class="action-btn" data-edit-id="${p.id}">Edit</button>
          <button type="button" class="action-btn danger" data-del-id="${p.id}">Delete</button>
        </td>
      </tr>
    `
    )
    .join("");
}

function resetProductForm() {
  editingProductId.value = "";
  clearProductImage();
  formHeading.textContent = "Add New Product";
  saveProductBtn.textContent = "Save Product";
  cancelEditBtn.classList.add("hidden");
  productForm.reset();
}

cancelEditBtn.addEventListener("click", resetProductForm);

productForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const imageVal = prodImageInput.value.trim();
  if (!imageVal) {
    showToast("Please click 'Add Product Image' to select a photo first.");
    return;
  }

  saveProductBtn.disabled = true;

  const payload = {
    title: document.getElementById("prodTitle").value.trim(),
    category: document.getElementById("prodCategory").value,
    price: Number(document.getElementById("prodPrice").value),
    image: imageVal,
    description: document.getElementById("prodDesc").value.trim()
  };

  try {
    if (editingProductId.value) {
      await updateDoc(doc(db, "products", editingProductId.value), payload);
      showToast("Product updated!");
    } else {
      await addDoc(collection(db, "products"), {
        ...payload,
        createdAt: serverTimestamp()
      });
      showToast("Product added to store!");
    }
    resetProductForm();
    await loadAdminProducts();
    switchToTab("productsTab");
  } catch (err) {
    console.error("Save product error:", err);
    showToast("Error saving product.");
  } finally {
    saveProductBtn.disabled = false;
  }
});

productsTableBody.addEventListener("click", async (e) => {
  const editBtn = e.target.closest("[data-edit-id]");
  if (editBtn) {
    const prod = cachedProducts.find((item) => item.id === editBtn.dataset.editId);
    if (!prod) return;
    editingProductId.value = prod.id;
    document.getElementById("prodTitle").value = prod.title || "";
    document.getElementById("prodCategory").value = prod.category || "MK Closets";
    document.getElementById("prodPrice").value = prod.price || "";
    prodImageInput.value = prod.image || "";
    document.getElementById("prodDesc").value = prod.description || "";
    if (prod.image) {
      imagePreview.src = prod.image;
      imagePreviewWrap.style.display = "flex";
      uploadStatusText.textContent = "Current product photo loaded (click button to replace)";
    }
    formHeading.textContent = "Edit Product";
    saveProductBtn.textContent = "Update Product";
    cancelEditBtn.classList.remove("hidden");
    switchToTab("addTab");
    return;
  }

  const delBtn = e.target.closest("[data-del-id]");
  if (delBtn) {
    const id = delBtn.dataset.delId;
    if (!confirm("Are you sure you want to delete this product?")) return;
    try {
      await deleteDoc(doc(db, "products", id));
      showToast("Product deleted.");
      await loadAdminProducts();
    } catch (err) {
      console.error("Delete error:", err);
      showToast("Could not delete product.");
    }
  }
});

async function loadAdminOrders() {
  const snap = await getDocs(collection(db, "orders"));
  const orders = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
  orderCountEl.textContent = orders.length;

  if (orders.length === 0) {
    ordersTableBody.innerHTML = `<tr><td colspan="5" style="text-align:center;color:#6e5f61;">No customer orders yet.</td></tr>`;
    return;
  }

  ordersTableBody.innerHTML = orders
    .map((o) => {
      const itemsText = Array.isArray(o.items)
        ? o.items.map((i) => `${i.title} (x${i.qty})`).join(", ")
        : "";
      const currentStatus = o.status || "Pending";
      return `
        <tr>
          <td><strong>${o.customerName || "Guest"}</strong><br/><small style="color:#6e5f61;">${o.address || ""}</small></td>
          <td>${o.phone || ""}<br/><small style="color:#6e5f61;">${o.city || ""}</small></td>
          <td>${itemsText}</td>
          <td><strong>${formatPKR(o.total)}</strong></td>
          <td>
            <select class="status-select" data-order-id="${o.id}">
              <option value="Pending" ${currentStatus === "Pending" ? "selected" : ""}>Pending</option>
              <option value="Confirmed" ${currentStatus === "Confirmed" ? "selected" : ""}>Confirmed</option>
              <option value="Delivered" ${currentStatus === "Delivered" ? "selected" : ""}>Delivered</option>
              <option value="Cancelled" ${currentStatus === "Cancelled" ? "selected" : ""}>Cancelled</option>
            </select>
          </td>
        </tr>
      `;
    })
    .join("");
}

ordersTableBody.addEventListener("change", async (e) => {
  const sel = e.target.closest(".status-select[data-order-id]");
  if (!sel) return;
  try {
    await updateDoc(doc(db, "orders", sel.dataset.orderId), {
      status: sel.value
    });
    showToast(`Order status updated to ${sel.value}`);
  } catch (err) {
    console.error("Order status update error:", err);
    showToast("Could not update status.");
  }
});