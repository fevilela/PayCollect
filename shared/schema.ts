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

// === CUSTOM ZOD VALIDATIONS (Adicionado para compliance fiscal) ===
const cnpjRegex = /^\d{2}\.\d{3}\.\d{3}\/\d{4}-\d{2}$/; // Regex básico para CNPJ formatado
const ncmRegex = /^\d{8}$/; // NCM tem 8 dígitos
const cpfRegex = /^\d{3}\.\d{3}\.\d{3}-\d{2}$/; // Para taxId em customers

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
  sku: text("sku").unique(), // Internal code
  origin: text("origin").default("0"), // 0 - Nacional, 1 - Estrangeira, etc.
  description: text("description"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
  stock: integer("stock").notNull().default(0),
  barcode: text("barcode").unique(), // EAN/UPC
  category: text("category").notNull(),
  imageUrl: text("image_url"),
  ncm: text("ncm"), // Adicionado validação customizada abaixo
  cfop: text("cfop"),
  cst: text("cst"), // CST or CSOSN
  icms: decimal("icms", { precision: 5, scale: 2 }),
  pis: decimal("pis", { precision: 5, scale: 2 }),
  cofins: decimal("cofins", { precision: 5, scale: 2 }),
  ipi: decimal("ipi", { precision: 5, scale: 2 }),
  icmsSt: decimal("icms_st", { precision: 5, scale: 2 }),
  unitOfMeasure: text("unit_of_measure"), // e.g., UN, KG, LT
});

export const fiscalSettings = pgTable("fiscalSettings", {
  id: serial().primaryKey(),
  cnpj: text(),
  companyName: text("company_name"),
  tradingName: text("trading_name"),
  stateRegistration: text("state_registration"),
  municipalRegistration: text("municipal_registration"),
  taxRegime: text("tax_regime").notNull(), // Simples Nacional, Lucro Presumido, Lucro Real
  privateKey: text(),
  mainCnae: text("main_cnae"),
  certificateType: text("certificate_type"), // Novo campo
  fiscalAddress: text("fiscal_address"), // Novo campo
  digitalCertificate: text("digital_certificate"), // Simulation (A1/A3)
  environment: text("environment").default("homologation"), // homologation / production
  defaultCst: text("default_cst"),
  defaultCfop: text("default_cfop"),
});

export const salesTaxSummary = pgTable("sales_tax_summary", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id")
    .references(() => orders.id)
    .notNull(),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }).notNull(),
  icmsAmount: decimal("icms_amount", { precision: 10, scale: 2 }),
  pisAmount: decimal("pis_amount", { precision: 10, scale: 2 }),
  cofinsAmount: decimal("cofins_amount", { precision: 10, scale: 2 }),
  createdAt: timestamp("created_at").defaultNow(),
});

// Nova tabela: Cálculos detalhados de impostos por item (para auditoria e NF-e)
export const taxCalculations = pgTable("tax_calculations", {
  id: serial("id").primaryKey(),
  orderItemId: integer("order_item_id")
    .references(() => orderItems.id)
    .notNull(),
  baseIcms: decimal("base_icms", { precision: 10, scale: 2 }).notNull(),
  aliquotaIcms: decimal("aliquota_icms", { precision: 5, scale: 2 }).notNull(),
  valorIcms: decimal("valor_icms", { precision: 10, scale: 2 }).notNull(),
  basePis: decimal("base_pis", { precision: 10, scale: 2 }),
  aliquotaPis: decimal("aliquota_pis", { precision: 5, scale: 2 }),
  valorPis: decimal("valor_pis", { precision: 10, scale: 2 }),
  // Adicione mais campos se necessário (COFINS, IPI, etc.)
  createdAt: timestamp("created_at").defaultNow(),
});

// Nova tabela: Logs de auditoria fiscal (obrigatório para compliance, imutável)
export const auditLogs = pgTable("audit_logs", {
  id: serial("id").primaryKey(),
  userId: integer("user_id").references(() => users.id),
  action: text("action").notNull(), // e.g., 'issued_nfe', 'updated_product'
  entity: text("entity").notNull(), // e.g., 'fiscal_documents', 'products'
  entityId: integer("entity_id"), // ID do registro afetado
  oldValue: text("old_value"), // JSON string do valor antigo
  newValue: text("new_value"), // JSON string do valor novo
  ipAddress: text("ip_address"),
  timestamp: timestamp("timestamp").defaultNow().notNull(),
});

export const services = pgTable("services", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  description: text("description"),
  serviceCode: text("service_code"), // LC 116
  cnae: text("cnae"),
  issRate: decimal("iss_rate", { precision: 5, scale: 2 }),
  cityOfService: text("city_of_service"),
  issRetention: boolean("iss_retention").default(false),
  pis: decimal("pis", { precision: 5, scale: 2 }),
  cofins: decimal("cofins", { precision: 5, scale: 2 }),
  csosn: text("csosn"),
  price: decimal("price", { precision: 10, scale: 2 }).notNull(),
});

export const customers = pgTable("customers", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  taxId: text("tax_id").unique(), // CPF or CNPJ - Adicionado validação customizada abaixo
  email: text("email"),
  phone: text("phone"),
  address: text("address"),
});

export const fiscalDocuments = pgTable("fiscal_documents", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  type: text("type").notNull(), // 'NFCe', 'NFe', 'NFSe'
  number: integer("number").notNull(),
  series: integer("series").notNull(),
  status: text("status").default("pending"), // 'pending', 'authorized', 'cancelled', 'transmitted'
  xmlContent: text("xml_content"),
  accessKey: text("access_key"),
  qrCode: text("qr_code"), // Adicionado: Para NFC-e (link para consulta)
  transmissionStatus: text("transmission_status"), // Adicionado: 'success', 'error', 'retry'
  totalAmount: decimal("total_amount", { precision: 10, scale: 2 }).notNull(),
  totalTax: decimal("total_tax", { precision: 10, scale: 2 }).notNull(),
  issuedAt: timestamp("issued_at").defaultNow(),
});

export const financialTransactions = pgTable("financial_transactions", {
  id: serial("id").primaryKey(),
  orderId: integer("order_id").references(() => orders.id),
  type: text("type").notNull(), // 'income', 'expense'
  category: text("category").notNull(), // 'sale', 'refund', 'fee'
  amount: decimal("amount", { precision: 10, scale: 2 }).notNull(),
  paymentMethod: text("payment_method").notNull(),
  installments: integer("installments").default(1),
  cardFee: decimal("card_fee", { precision: 10, scale: 2 }).default("0"),
  status: text("status").default("pending"), // 'pending', 'received', 'cancelled'
  dueDate: timestamp("due_date"),
  receivedAt: timestamp("received_at"),
  createdAt: timestamp("created_at").defaultNow(),
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

// Novas relações para tabelas fiscais
export const taxCalculationsRelations = relations(
  taxCalculations,
  ({ one }) => ({
    orderItem: one(orderItems, {
      fields: [taxCalculations.orderItemId],
      references: [orderItems.id],
    }),
  })
);

export const auditLogsRelations = relations(auditLogs, ({ one }) => ({
  user: one(users, {
    fields: [auditLogs.userId],
    references: [users.id],
  }),
}));

// === BASE SCHEMAS (Refinados com validações customizadas) ===

export const insertUserSchema = createInsertSchema(users).omit({ id: true });
export const insertProductSchema = createInsertSchema(products, {
  ncm: z.string().regex(ncmRegex, "NCM deve ter 8 dígitos").optional(),
}).omit({ id: true });
export const insertOrderSchema = createInsertSchema(orders).omit({
  id: true,
  createdAt: true,
  pickupCode: true,
  status: true,
});
export const insertOrderItemSchema = createInsertSchema(orderItems).omit({
  id: true,
});

// Novos schemas para tabelas adicionadas
export const insertTaxCalculationSchema = createInsertSchema(
  taxCalculations
).omit({ id: true, createdAt: true });
export const insertAuditLogSchema = createInsertSchema(auditLogs).omit({
  id: true,
  timestamp: true,
});
export const insertFiscalSettingsSchema = createInsertSchema(fiscalSettings, {
  cnpj: z
    .string()
    .regex(cnpjRegex, "CNPJ deve estar no formato XX.XXX.XXX/XXXX-XX")
    .optional(),
}).omit({ id: true });
export const insertCustomerSchema = createInsertSchema(customers, {
  taxId: z
    .string()
    .regex(cpfRegex, "CPF deve estar no formato XXX.XXX.XXX-XX")
    .optional(),
}).omit({ id: true });

// === EXPLICIT API CONTRACT TYPES ===

export type Product = typeof products.$inferSelect;
export type InsertProduct = z.infer<typeof insertProductSchema>;

export type Order = typeof orders.$inferSelect;
export type InsertOrder = z.infer<typeof insertOrderSchema>;

export type OrderItem = typeof orderItems.$inferSelect;

export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;

// Novos tipos para tabelas adicionadas
export type TaxCalculation = typeof taxCalculations.$inferSelect;
export type InsertTaxCalculation = z.infer<typeof insertTaxCalculationSchema>;

export type AuditLog = typeof auditLogs.$inferSelect;
export type InsertAuditLog = z.infer<typeof insertAuditLogSchema>;

export type FiscalSettings = typeof fiscalSettings.$inferSelect;
export type InsertFiscalSettings = z.infer<typeof insertFiscalSettingsSchema>;

export type Customer = typeof customers.$inferSelect;
export type InsertCustomer = z.infer<typeof insertCustomerSchema>;

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
