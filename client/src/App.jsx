import React, { useEffect, useState } from "react";
import { createUserWithEmailAndPassword, onAuthStateChanged, signInWithEmailAndPassword, signOut } from "firebase/auth";
import { auth } from "./firebase";
import { apiRequest } from "./api";

const money = (value) => `₹${Number(value || 0).toLocaleString("en-IN")}`;

function AuthForm({ onClose }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  async function submit(event) {
    event.preventDefault(); setError("");
    try {
      if (mode === "login") await signInWithEmailAndPassword(auth, email, password);
      else await createUserWithEmailAndPassword(auth, email, password);
      onClose();
    } catch (err) { setError(err.message); }
  }
  return <div className="modal"><form className="auth-card" onSubmit={submit}>
    <h2>{mode === "login" ? "Welcome back" : "Create your account"}</h2>
    <label>Email<input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required /></label>
    <label>Password<input type="password" value={password} onChange={(e) => setPassword(e.target.value)} minLength={6} required /></label>
    {error && <p className="error">{error}</p>}
    <button>{mode === "login" ? "Login" : "Register"}</button>
    <button type="button" className="secondary" onClick={onClose}>Cancel</button>
    <p>{mode === "login" ? "New here?" : "Already registered?"} <button type="button" className="link-button" onClick={() => setMode(mode === "login" ? "register" : "login")}>{mode === "login" ? "Create account" : "Login"}</button></p>
  </form></div>;
}

const emptyProduct = { name: "", description: "", price: "", category: "Electronics", image: "", stock: "" };

function App() {
  const [user, setUser] = useState(null);
  const [products, setProducts] = useState([]);
  const [cart, setCart] = useState({ items: [] });
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState("All");
  const [showAuth, setShowAuth] = useState(false);
  const [view, setView] = useState("products");
  const [selectedProduct, setSelectedProduct] = useState(null);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [productForm, setProductForm] = useState(emptyProduct);
  const [editingId, setEditingId] = useState(null);

  useEffect(() => onAuthStateChanged(auth, async (currentUser) => {
    setUser(currentUser);
    if (!currentUser) { setCart({ items: [] }); return; }
    try { setCart(await apiRequest("/cart", {}, currentUser)); }
    catch (err) { setError(err.message); }
  }), []);

  useEffect(() => { loadProducts(); }, [search, category]);

  async function loadProducts() {
    setLoading(true); setError("");
    try {
      const params = new URLSearchParams();
      if (search) params.set("search", search);
      if (category !== "All") params.set("category", category);
      setProducts(await apiRequest(`/products?${params.toString()}`));
    } catch (err) { setError(err.message); }
    finally { setLoading(false); }
  }

  async function changeCart(productId, quantity = 1, replace = false) {
    if (!user) { setShowAuth(true); return; }
    try {
      setCart(await apiRequest(replace ? `/cart/${productId}` : "/cart", {
        method: replace ? "PUT" : "POST", body: JSON.stringify(replace ? { quantity } : { productId, quantity })
      }, user));
      setMessage(replace ? "Cart updated" : "Added to cart");
    } catch (err) { setError(err.message); }
  }

  async function removeFromCart(productId) {
    try { setCart(await apiRequest(`/cart/${productId}`, { method: "DELETE" }, user)); }
    catch (err) { setError(err.message); }
  }

  async function loadOrders() {
    if (!user) { setShowAuth(true); return; }
    try { setOrders(await apiRequest("/orders", {}, user)); setView("orders"); }
    catch (err) { setError(err.message); }
  }

  async function openAdmin() {
    setView("admin");
    if (!user) { setShowAuth(true); return; }
    try { setOrders(await apiRequest("/orders/admin", {}, user)); }
    catch (err) { setError(err.message); }
  }

  async function placeOrder() {
    try {
      await apiRequest("/orders", { method: "POST" }, user);
      setCart({ items: [] }); await loadOrders(); setMessage("Demo order placed. No payment was collected.");
      await loadProducts();
    } catch (err) { setError(err.message); }
  }

  async function saveProduct(event) {
    event.preventDefault();
    const payload = { ...productForm, price: Number(productForm.price), stock: Number(productForm.stock) };
    try {
      const result = await apiRequest(editingId ? `/products/${editingId}` : "/products", {
        method: editingId ? "PUT" : "POST", body: JSON.stringify(payload)
      }, user);
      setProducts((old) => editingId ? old.map((p) => p._id === result._id ? result : p) : [result, ...old]);
      setProductForm(emptyProduct); setEditingId(null); setMessage("Product saved");
    } catch (err) { setError(err.message); }
  }

  async function deleteProduct(productId) {
    try { await apiRequest(`/products/${productId}`, { method: "DELETE" }, user); setProducts((old) => old.filter((p) => p._id !== productId)); }
    catch (err) { setError(err.message); }
  }

  async function updateStatus(orderId, status) {
    try {
      const updated = await apiRequest(`/orders/${orderId}/status`, { method: "PATCH", body: JSON.stringify({ status }) }, user);
      setOrders((old) => old.map((order) => order._id === updated._id ? updated : order));
    } catch (err) { setError(err.message); }
  }

  const total = (cart.items || []).reduce((sum, item) => sum + (item.product?.price || 0) * item.quantity, 0);

  return <div className="app-shell">
    <header className="site-header"><a className="brand" href="#" onClick={() => { setView("products"); setSelectedProduct(null); }}>ShopEasy<span>.</span></a>
      <nav><button className="nav-link" onClick={() => { setView("products"); setSelectedProduct(null); }}>Shop</button>
        <button className="nav-link" onClick={() => setView("cart")}>Cart <span className="count">{cart.items?.length || 0}</span></button>
        {user && <button className="nav-link" onClick={loadOrders}>My orders</button>}
        {user && <button className="nav-link" onClick={openAdmin}>Admin</button>}
      </nav>
      <div className="account">{user ? <><span className="user-email">{user.email}</span><button className="outline-button" onClick={() => signOut(auth)}>Logout</button></> : <button className="outline-button" onClick={() => setShowAuth(true)}>Login / Register</button>}</div>
    </header>
    <main>
      <section className="intro"><p className="eyebrow">THOUGHTFUL FINDS, EVERY DAY</p><h1>Good things, <em>well chosen.</em></h1><p>Everyday essentials and little upgrades, all in one place.</p></section>
      {(message || error) && <div className={error ? "notice error-notice" : "notice"}>{error || message}<button onClick={() => { setMessage(""); setError(""); }}>×</button></div>}

      {view === "products" && !selectedProduct && <>
        <div className="toolbar"><div className="search-box"><span>⌕</span><input placeholder="Search the collection" value={search} onChange={(e) => setSearch(e.target.value)} /></div><select value={category} onChange={(e) => setCategory(e.target.value)}><option>All</option><option>Electronics</option><option>Fashion</option><option>Home</option><option>Accessories</option></select><span className="result-count">{products.length} items</span></div>
        {loading ? <p className="feedback">Loading products…</p> : products.length === 0 ? <p className="feedback">No products found. Try another search.</p> : <section className="grid">{products.map((product) => <article className="card" key={product._id}>
          <button className="image-button" onClick={() => { setSelectedProduct(product); setView("products"); }} aria-label={`View ${product.name}`}><img src={product.image || "https://placehold.co/600x450?text=Product"} alt={product.name} /></button>
          <div className="card-copy"><p className="category-label">{product.category}</p><button className="product-name" onClick={() => setSelectedProduct(product)}>{product.name}</button><p className="description">{product.description}</p><div className="card-bottom"><strong>{money(product.price)}</strong><span>{product.stock > 0 ? `${product.stock} in stock` : "Sold out"}</span></div><button disabled={product.stock < 1} onClick={() => changeCart(product._id)}>{product.stock < 1 ? "Out of stock" : "Add to bag"}</button></div>
        </article>)}</section>}
      </>}

      {view === "products" && selectedProduct && <section className="detail"><button className="back-link" onClick={() => setSelectedProduct(null)}>← Back to shop</button><img src={selectedProduct.image || "https://placehold.co/700x600?text=Product"} alt={selectedProduct.name} /><div><p className="category-label">{selectedProduct.category}</p><h2>{selectedProduct.name}</h2><p>{selectedProduct.description}</p><strong>{money(selectedProduct.price)}</strong><p>{selectedProduct.stock} available</p><button disabled={!selectedProduct.stock} onClick={() => changeCart(selectedProduct._id)}>Add to bag</button></div></section>}

      {view === "cart" && <section className="content-panel"><p className="eyebrow">YOUR SELECTION</p><h2>Your shopping bag</h2>{!user ? <p>Log in to see and save your cart.</p> : !cart.items?.length ? <p>Your bag is empty. Find something you like in the shop.</p> : <><div className="cart-list">{cart.items.map((item) => item.product && <div className="cart-row" key={item.product._id}><img src={item.product.image} alt=""/><div className="cart-item-info"><strong>{item.product.name}</strong><span>{money(item.product.price)}</span></div><div className="quantity"><button onClick={() => item.quantity > 1 ? changeCart(item.product._id, item.quantity - 1, true) : removeFromCart(item.product._id)}>−</button><span>{item.quantity}</span><button disabled={item.quantity >= item.product.stock} onClick={() => changeCart(item.product._id, item.quantity + 1, true)}>+</button></div><strong>{money(item.product.price * item.quantity)}</strong><button className="remove-button" onClick={() => removeFromCart(item.product._id)}>Remove</button></div>)}</div><div className="checkout"><span>Subtotal <small>Demo checkout, no payment collected</small></span><strong>{money(total)}</strong><button onClick={placeOrder}>Place demo order</button></div></>}</section>}

      {view === "orders" && <section className="content-panel"><p className="eyebrow">ACCOUNT</p><h2>Order history</h2>{orders.length === 0 ? <p>No orders yet.</p> : orders.map((order) => <article className="order" key={order._id}><div><strong>Order #{order._id.slice(-6)}</strong><p>{order.items.map((item) => `${item.name} × ${item.quantity}`).join(", ")}</p><small>{new Date(order.createdAt).toLocaleDateString()}</small><details className="order-details"><summary>Order details</summary>{order.items.map((item, index) => <p key={`${item.product}-${index}`}>{item.name}: {item.quantity} × {money(item.price)}</p>)}</details></div><span className="status">{order.status}</span><strong>{money(order.totalAmount)}</strong></article>)}</section>}

      {view === "admin" && <section className="content-panel"><p className="eyebrow">STORE MANAGEMENT</p><h2>Admin dashboard</h2><p>Admin access is granted on the server to Firebase UIDs listed in <code>ADMIN_UIDS</code>.</p><form className="product-form" onSubmit={saveProduct}><h3>{editingId ? "Edit product" : "Add a product"}</h3><input placeholder="Product name" value={productForm.name} onChange={(e) => setProductForm({ ...productForm, name: e.target.value })} required/><textarea placeholder="Description" value={productForm.description} onChange={(e) => setProductForm({ ...productForm, description: e.target.value })}/><div className="form-row"><input type="number" min="0" step="0.01" placeholder="Price" value={productForm.price} onChange={(e) => setProductForm({ ...productForm, price: e.target.value })} required/><input type="number" min="0" step="1" placeholder="Stock" value={productForm.stock} onChange={(e) => setProductForm({ ...productForm, stock: e.target.value })} required/><input placeholder="Category" value={productForm.category} onChange={(e) => setProductForm({ ...productForm, category: e.target.value })} required/></div><input placeholder="Image URL (optional)" value={productForm.image} onChange={(e) => setProductForm({ ...productForm, image: e.target.value })}/><div><button>{editingId ? "Save changes" : "Add product"}</button>{editingId && <button type="button" className="secondary" onClick={() => { setEditingId(null); setProductForm(emptyProduct); }}>Cancel</button>}</div></form><h3>Products and inventory</h3>{products.map((product) => <div className="admin-row" key={product._id}><span>{product.name} <small>· {product.stock} in stock</small></span><button className="secondary" onClick={() => { setProductForm({ ...product, price: String(product.price), stock: String(product.stock), image: product.image || "" }); setEditingId(product._id); window.scrollTo({ top: 0, behavior: "smooth" }); }}>Edit</button><button className="danger" onClick={() => deleteProduct(product._id)}>Delete</button></div>)}<h3>Update order status</h3>{orders.length === 0 ? <button className="secondary" onClick={loadOrders}>Load my orders</button> : orders.map((order) => <div className="admin-row" key={order._id}><span>Order #{order._id.slice(-6)}</span><select value={order.status} onChange={(e) => updateStatus(order._id, e.target.value)}><option>Pending</option><option>Confirmed</option><option>Delivered</option></select></div>)}</section>}
    </main>
    <footer><span>ShopEasy</span><span>Considered essentials for everyday life.</span></footer>
    {showAuth && <AuthForm onClose={() => setShowAuth(false)} />}
  </div>;
}

export default App;
