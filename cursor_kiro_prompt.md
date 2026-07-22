# MASTER PROMPT: Multi-Branch Sales & Inventory Management System (V1)

## ROLE & GOAL
Act as a Principal Software Engineer and System Architect. Your task is to build a production-ready, modular, multi-branch **Sales & Inventory Management System (V1)** using Node.js, Express, HTML5, Vanilla JavaScript, and SQLite/Prisma. 

Execute the project systematically following the architecture, database schema, security rules, and implementation steps defined below.

---

## 1. ARCHITECTURE & TECH STACK

* **Backend Environment:** Node.js with Express.js (Modular REST API structure).
* **Database:** SQLite managed via Prisma ORM (or `better-sqlite3`), structured for seamless PostgreSQL migration in V2.
* **Frontend:** Clean HTML5, Tailwind CSS (via CDN), and Vanilla JavaScript (Fetch API + async state management).
* **Security Layer:**
  * `express-session` with secure cookies or HTTP-only JWTs.
  * `bcryptjs` for salt-based password hashing.
  * `helmet` for HTTP security headers.
  * `express-rate-limit` to block brute-force attempts on `/api/auth/login`.
  * `zod` or `express-validator` for strict input validation/sanitization.
* **Receipt Printing Engine:** Browser-native CSS `@media print` rules optimized for POS receipts.

---

## 2. DATABASE SCHEMA DESIGN

Implement the following entities with strict foreign key constraints and transactional integrity:

1. **Branches:** `id`, `name`, `location`, `created_at`
2. **Users:** `id`, `name`, `username`, `password_hash`, `role` (`ADMIN`, `MANAGER`, `CASHIER`), `branch_id` (FK to Branches), `is_active`
3. **Categories:** `id`, `name`, `description`
4. **Products:** `id`, `category_id` (FK), `sku` (Unique), `name`, `unit_price`, `unit_of_measure`, `reorder_level`
5. **BranchInventory:** `id`, `branch_id` (FK), `product_id` (FK), `quantity` *(Composite Unique Index: branch_id + product_id)*
6. **Suppliers:** `id`, `company_name`, `contact_person`, `phone`, `email`
7. **PurchaseOrders:** `id`, `supplier_id` (FK), `branch_id` (FK), `created_by` (FK User), `status` (`DRAFT`, `ORDERED`, `RECEIVED`, `CANCELLED`), `total_amount`, `created_at`
8. **POItems:** `id`, `purchase_order_id` (FK), `product_id` (FK), `quantity_ordered`, `quantity_received`, `unit_cost`
9. **Sales:** `id`, `branch_id` (FK), `cashier_id` (FK User), `subtotal`, `discount_amount`, `total_amount`, `customer_name`, `created_at`
10. **SaleItems:** `id`, `sale_id` (FK), `product_id` (FK), `quantity`, `unit_price`, `subtotal`
11. **StockTransfers:** `id`, `from_branch_id` (FK), `to_branch_id` (FK), `initiated_by` (FK User), `status` (`PENDING`, `IN_TRANSIT`, `COMPLETED`, `CANCELLED`), `created_at`
12. **TransferItems:** `id`, `transfer_id` (FK), `product_id` (FK), `quantity`

---

## 3. SECURITY & ROLE-BASED ACCESS CONTROL (RBAC)

Enforce strict middleware guards (`isAuthenticated`, `hasRole([...])`) on all API endpoints:

| Role | Operational Scope | Permissions & Rules |
| :--- | :--- | :--- |
| **ADMIN** | System-Wide (All Branches) | Full read/write access to all entities, user management, and global reports. |
| **MANAGER** | Assigned Branch | View multi-branch stock levels, initiate/receive stock transfers, create POs, apply sales discounts **up to 50%**, view branch sales summaries. |
| **CASHIER** | Assigned Branch | Access POS checkout, search catalog, generate printable receipts, apply sales discounts **up to 10%**, view local branch stock. |

---

## 4. CORE FUNCTIONAL WORKFLOWS & BUSINESS LOGIC

1. **Atomic Inventory Transactions:**
   * Sales transactions must use database transactions (`prisma.$transaction` or SQLite transactions).
   * Verify available stock before completing a sale. Reject transactions if `quantity < requested_amount` (prevents negative inventory).

2. **Point of Sale (POS) & Receipt Engine:**
   * Rapid item lookup by product name or category filter.
   * Real-time shopping cart calculation: `Total = Subtotal - Discount`.
   * Trigger modal displaying printable receipt with printable CSS hiding all navigation UI elements.

3. **Two-Step Stock Transfer System:**
   * **Step 1 (Dispatch):** Transfer initiated -> Status set to `IN_TRANSIT` -> Quantity deducted from `from_branch_id` inventory immediately.
   * **Step 2 (Receive):** Target branch confirms receipt -> Status updated to `COMPLETED` -> Quantity added to `to_branch_id` inventory.

4. **Purchase Order & Receiving Workflow:**
   * Create PO in `ORDERED` state.
   * Receiving goods updates PO status to `RECEIVED` and automatically increments the destination branch inventory.

5. **Reporting & Low-Stock Alerts:**
   * Daily branch sales summaries aggregated by cashier, date, and discount metrics.
   * Real-time query matching `BranchInventory.quantity <= Product.reorder_level`.

---

## 5. API ROUTE ARCHITECTURE

Implement clean REST API endpoints:

* **Auth:** `POST /api/auth/login`, `POST /api/auth/logout`, `GET /api/auth/me`
* **Products:** `GET /api/products`, `POST /api/products`, `PUT /api/products/:id`
* **Inventory:** `GET /api/inventory`, `GET /api/inventory/low-stock`, `GET /api/inventory/branch/:branchId`
* **Sales:** `POST /api/sales`, `GET /api/sales/daily-summary`
* **Transfers:** `POST /api/transfers`, `PATCH /api/transfers/:id/status`
* **Purchasing:** `GET /api/suppliers`, `POST /api/purchase-orders`, `PATCH /api/purchase-orders/:id/receive`

---

## 6. PROJECT DIRECTORY STRUCTURE

Structure the code clean and modularly:

```
/
├── config/             # DB connection and env configurations
├── middleware/         # Auth, RBAC, error handlers, rate limiters
├── models/             # Prisma schema or database query models
├── public/             # Static frontend assets
│   ├── css/            # Custom styles & Tailwind rules
│   └── js/             # Vanilla JS API controllers and DOM managers
├── routes/             # REST API routers
├── views/              # HTML templates/pages (Login, Dashboard, POS, Inventory, Reports)
├── scripts/            # Database initialization and seed scripts
├── .env.example
├── app.js              # Application entry point
└── package.json
```

---

## 7. EXECUTION PLAN FOR THE AI

1. **Setup Scaffolding:** Create `package.json` with required dependencies, configure `app.js`, environment variables, and static folder mounts.
2. **Database & Seeding:** Build the database schema and generate a seed script (`scripts/seed.js`) with 6 branches, 10 categories, 30 products, and 3 test accounts (`admin`, `manager`, `cashier`).
3. **Auth & Security Middleware:** Build authentication routes, password hashing with `bcryptjs`, session/JWT setup, and RBAC guards.
4. **Backend API Routes:** Implement transactional REST routes for products, inventory, POS sales, stock transfers, and purchase orders.
5. **Frontend Views & Integration:** Create clean, tablet-responsive HTML views connected via Vanilla JS Fetch API handlers. Ensure CSS print styles exist for POS receipts.

**Instructions:** Begin immediately by setting up the directory scaffolding, `package.json`, database schema, and seed script.


newbranch shit