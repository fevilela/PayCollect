import {
  pgTable,
  text,
  serial,
  integer,
  boolean,
  timestamp,
  decimal,
  varchar,
} from "drizzle-orm/pg-core";
import { relations } from "drizzle-orm";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// === TABLE DEFINITIONS ===

export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  username: text("username").notNull().unique(),
  password: text("password").notNull(),
  role: text("role").default("admin").notNull(), // manager, admin
  companyName: text("company_name"), // Name of the company (for admin users)
  cnpj: text("cnpj"), // Company CNPJ
  email: text("email"),
  phone: text("phone"),
  needsPasswordChange: boolean("needs_password_change").default(false), // Force password change on first login
});

export const products = pgTable("products", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  barcode: text("barcode").unique(), // EAN/UPC
  category: text("category").notNull(),
  imageUrl: text("image_url"),
});

export const orders = pgTable("orders", {
  id: serial("id").primaryKey(),
  customerName: text("customer_name").notNull(),
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(), // pix, credit, debit
  status: text("status").notNull().default("pending"), // pending, paid, collected, cancelled
  pickupCode: varchar("pickup_code", { length: 8 }).unique().notNull(), // Unique 8-char code
  createdAt: timestamp("created_at").defaultNow(),
});

export const orderItems = pgTable("order_items", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  productId: integer("product_id")
    .references(() => products.id)
    .notNull(),
  quantity: integer("quantity").notNull(),
  priceAtTime: decimal("price_at_time", { precision: 10, scale: 2 }).notNull(),
});

// === RELATIONS ===

export const orderItemsRelations = relations(orderItems, ({ one }) => ({
  order: one(orders, {
    fields: [orderItems.orderId],
    references: [orders.id],
  }),
  product: one(products, {
    fields: [orderItems.productId],
    references: [products.id],
  }),
}));

export const ordersRelations = relations(orders, ({ many }) => ({
  items: many(orderItems),
}));

// === BASE SCHEMAS ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products).omit({
  id: true,
});
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  pickupCode: true,
  status: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// === EXPLICIT API CONTRACT TYPES ===

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Request types
export type CreateOrderRequest = InsertOrder & {
  items: { productId: number; quantity: number }[];
};

export type UpdateOrderRequest = Partial<InsertOrder> & {
  status?: string;
};

// Response types
export type OrderResponse = Order & {
  items: (OrderItem & { product: Product })[];
};

// Validation Station Types
export type ValidationResponse = {
  valid: boolean;
  order?: OrderResponse;
  message?: string;
};
