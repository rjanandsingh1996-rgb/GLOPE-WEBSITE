PRAGMA foreign_keys = ON;

CREATE TABLE IF NOT EXISTS leads (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 customer_name TEXT NOT NULL CHECK(length(trim(customer_name)) BETWEEN 1 AND 120),
 phone TEXT NOT NULL CHECK(length(trim(phone)) BETWEEN 7 AND 20),
 product_interest TEXT NOT NULL DEFAULT 'GLOPE Honey',
 source TEXT NOT NULL DEFAULT 'WhatsApp',
 status TEXT NOT NULL DEFAULT 'new' CHECK(status IN ('new','contacted','interested','order_confirmed','not_interested','follow_up')),
 follow_up_at TEXT,
 notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 2000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status);
CREATE INDEX IF NOT EXISTS idx_leads_follow_up ON leads(follow_up_at);
CREATE INDEX IF NOT EXISTS idx_leads_created_at ON leads(created_at);

CREATE TABLE IF NOT EXISTS orders (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 lead_id INTEGER REFERENCES leads(id) ON DELETE SET NULL,
 product_name TEXT NOT NULL DEFAULT 'GLOPE Honey',
 pack_size_g INTEGER NOT NULL CHECK(pack_size_g IN (250,500,1000)),
 quantity INTEGER NOT NULL CHECK(quantity BETWEEN 1 AND 10000),
 unit_price_paise INTEGER NOT NULL CHECK(unit_price_paise >= 0),
 shipping_fee_paise INTEGER NOT NULL DEFAULT 0 CHECK(shipping_fee_paise >= 0),
 total_paise INTEGER NOT NULL CHECK(total_paise >= 0),
 payment_status TEXT NOT NULL DEFAULT 'pending' CHECK(payment_status IN ('pending','paid','partially_paid','refunded')),
 order_status TEXT NOT NULL DEFAULT 'confirmed' CHECK(order_status IN ('confirmed','packed','dispatched','delivered','cancelled','returned')),
 payment_method TEXT NOT NULL DEFAULT 'UPI' CHECK(payment_method IN ('UPI','COD','Bank Transfer','Other')),
 notes TEXT NOT NULL DEFAULT '' CHECK(length(notes) <= 2000),
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now')),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_orders_status ON orders(order_status);
CREATE INDEX IF NOT EXISTS idx_orders_payment_status ON orders(payment_status);
CREATE INDEX IF NOT EXISTS idx_orders_created_at ON orders(created_at);

CREATE TABLE IF NOT EXISTS inventory (
 pack_size_g INTEGER PRIMARY KEY CHECK(pack_size_g IN (250,500,1000)),
 product_name TEXT NOT NULL DEFAULT 'GLOPE Honey',
 stock_qty INTEGER NOT NULL DEFAULT 0 CHECK(stock_qty >= 0),
 updated_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
INSERT OR IGNORE INTO inventory(pack_size_g,product_name,stock_qty) VALUES (250,'GLOPE Honey',0),(500,'GLOPE Honey',0),(1000,'GLOPE Honey',0);

CREATE TABLE IF NOT EXISTS admin_audit_log (
 id INTEGER PRIMARY KEY AUTOINCREMENT,
 actor_email TEXT NOT NULL,
 action TEXT NOT NULL,
 record_type TEXT NOT NULL,
 record_id INTEGER,
 created_at TEXT NOT NULL DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ','now'))
);
CREATE INDEX IF NOT EXISTS idx_audit_created_at ON admin_audit_log(created_at);

CREATE TABLE IF NOT EXISTS admin_login_attempts (
 bucket_key TEXT PRIMARY KEY,
 window_started_at INTEGER NOT NULL,
 attempts INTEGER NOT NULL DEFAULT 0 CHECK(attempts >= 0),
 blocked_until INTEGER
);
