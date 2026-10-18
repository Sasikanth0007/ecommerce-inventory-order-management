# ShopEasy: E-Commerce with Inventory and Orders

A small full-stack store built to demonstrate a product catalog, Firebase login, per-user carts, demo checkout, inventory tracking, and server-protected admin tools. Checkout is for demonstration only; the app does not collect payment details.

## Features

- Firebase email/password registration, login, and logout
- Product listing, search, category filter, and product details
- Cart quantity controls with server-side stock checks
- Demo checkout that records orders and reduces inventory
- Private order history and simple order statuses
- Admin product create, edit, delete, inventory, and order status management
- Admin access checked by Express using a Firebase UID allowlist

## Technologies and folders

- React and Vite: `client/`
- Node.js, Express, and Mongoose: `server/`
- MongoDB stores products, carts, and orders
- Firebase Authentication identifies users; Firebase Admin verifies ID tokens on the server

```text
client/src/App.jsx                 Store screens and user interactions
client/src/api.js                  Calls the Express API and attaches ID tokens
client/src/firebase.js             Firebase web app setup
server/src/server.js               Express app and API routes
server/src/config/db.js            MongoDB connection
server/src/config/firebaseAdmin.js Firebase Admin initialization
server/src/middleware/auth.js      Token verification and admin UID check
server/src/models/                 Product, cart, and order schemas
server/src/controllers/            API operations
server/src/seed.js                 Repeatable sample product seeder
```

## Prerequisites

- Node.js 18 or newer and npm
- MongoDB locally, or a MongoDB Atlas cluster
- A Firebase project with the Email/Password sign-in provider enabled

## Configure Firebase

1. In Firebase Console, create/select a project and add a Web App.
2. In **Authentication → Sign-in method**, enable **Email/Password**.
3. Copy the web app configuration into `client/.env` (see the client example below).
4. In **Project settings → Service accounts**, generate a private key. Keep the downloaded JSON private; copy its project ID, client email, and private key to `server/.env`. Do not commit the JSON key.
5. Add your local frontend host under **Authentication → Settings → Authorized domains** if Firebase asks for it.

Set `ADMIN_UIDS` in `server/.env` to the Firebase Authentication UID of each administrator, separated by commas. Find a UID in **Authentication → Users** after creating the account. Only a server operator can change this allowlist; a frontend field cannot grant admin access.

## Configure MongoDB and environment files

From the project root in PowerShell:

```powershell
Copy-Item server/.env.example server/.env
Copy-Item client/.env.example client/.env
```

Set `MONGODB_URI` in `server/.env`. For local MongoDB, use `mongodb://127.0.0.1:27017/ecommerce`. For Atlas, create a database user, copy the driver's connection string, replace its username/password, and add your current IP in **Network Access → IP Access List**. Atlas changes may take a minute to apply.

If the backend reports `querySrv ECONNREFUSED`, the computer's default DNS resolver is refusing Atlas's SRV lookup. Set the optional `MONGODB_DNS_SERVERS=8.8.8.8,8.8.4.4` in `server/.env` if your network permits those resolvers, then restart the backend. Otherwise use a network/DNS resolver that permits SRV queries. If the error instead says the connection timed out after SRV lookup, check Atlas's IP access list and network firewall.

Backend `server/.env`:

```env
PORT=5000
MONGODB_URI=mongodb://127.0.0.1:27017/ecommerce
CLIENT_URL=http://localhost:5173
ADMIN_UIDS=your-firebase-user-uid
FIREBASE_PROJECT_ID=your-project-id
FIREBASE_CLIENT_EMAIL=service-account-email
FIREBASE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\nYOUR_KEY\n-----END PRIVATE KEY-----\n"
```

Frontend `client/.env`:

```env
VITE_API_URL=http://localhost:5000/api
VITE_FIREBASE_API_KEY=your-web-api-key
VITE_FIREBASE_AUTH_DOMAIN=your-project-id.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project-id.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=your-sender-id
VITE_FIREBASE_APP_ID=your-app-id
```

The `.env` files are ignored by Git. Never paste actual service account keys or database passwords into source code or commit them.

## Install, seed, and run (PowerShell)

Open two PowerShell terminals from the project root. Set up the backend in the first terminal:

```powershell
cd server
npm install
npm run seed
npm run dev
```

The seeder uses upserts keyed by product name. Re-running it inserts missing examples without deleting products or overwriting edits.

In the second terminal, start the frontend:

```powershell
cd client
npm install
npm run dev
```

Open the Vite URL, normally `http://localhost:5173`. The API health check is `http://localhost:5000/api/health`. If either service cannot connect, check its `.env`, that MongoDB is running, and (for Atlas) the IP access list.

## API examples

Protected endpoints require `Authorization: Bearer <Firebase ID token>`.

| Method | Endpoint | Access | Purpose |
|---|---|---|---|
| GET | `/api/products?search=watch&category=Electronics` | Public | Search/filter catalog |
| GET | `/api/products/:id` | Public | Product details |
| POST / PUT / DELETE | `/api/products[/:id]` | Admin | Manage products |
| GET / POST | `/api/cart` | Signed-in user | Read cart / add item |
| PUT / DELETE | `/api/cart/:productId` | Signed-in user | Set quantity / remove item |
| GET | `/api/orders` | Signed-in user | Own order history only |
| POST | `/api/orders` | Signed-in user | Create demo order |
| GET | `/api/orders/admin` | Admin | All orders for management |
| PATCH | `/api/orders/:id/status` | Admin | Set Pending, Confirmed, or Delivered |

## Manual journey checks

1. Register and log in with Firebase.
2. Search/filter the seeded catalog and open a product detail.
3. Add it to the cart, change quantity, and remove it.
4. Place a demo order. Confirm it appears in My Orders and the product stock decreased.
5. Try to exceed available stock; the API should reject it.
6. Sign in as a UID absent from `ADMIN_UIDS` and try admin operations; the API should return `403`.
7. Check order access with two different accounts; each `/api/orders` response is scoped to the verified Firebase UID.

## Architecture in brief

React calls Firebase Authentication directly for registration and login. Firebase returns an ID token. `client/src/api.js` attaches that token to protected API calls. Express middleware verifies it with Firebase Admin, then controllers use the verified UID to read or write that user's cart and orders in MongoDB through Mongoose.

Checkout takes current prices from MongoDB rather than trusting browser totals. It conditionally decrements each product only when enough stock remains, preventing concurrent checkouts from taking stock below zero. If a later step fails, deducted stock is restored. This is a practical demo approach; it is not a multi-document MongoDB transaction, so a process or database outage during compensation can still need manual repair. Production order processing should use MongoDB transactions on a replica set and stronger operational recovery.

## Known limitations

- No payment processing, shipping integration, or password reset flow.
- Admin accounts are configured manually through the server-side UID allowlist.
- Checkout compensation is not a distributed transaction (see above).
- Product images use external image URLs; use trusted URLs for a real deployment.
- The included checks are local build/syntax checks; Firebase, MongoDB, stock flow, and authorization also need the manual journey checks above with configured services.
