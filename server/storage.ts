import { db } from "./db";
import {
  users,
  products,
  orders,
  orderItems,
  type User,
  type InsertUser,
  type Product,
  type InsertProduct,
  type Order,
  type InsertOrder,
  type OrderItem,
  type CreateOrderRequest,
  type UpdateOrderRequest,
  type OrderResponse,
} from "@shared/schema";
import { eq, desc } from "drizzle-orm";

export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getAdminUsers(): Promise<User[]>; // Get all admin users (created by manager)
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User>;
  deleteUser(id: number): Promise<void>;

  // Products
  getProducts(): Promise<Product[]>;
  getProduct(id: number): Promise<Product | undefined>;
  createProduct(product: InsertProduct): Promise<Product>;
  updateProduct(id: number, product: Partial<InsertProduct>): Promise<Product>;
  deleteProduct(id: number): Promise<void>;

  // Orders
  getOrders(): Promise<OrderResponse[]>; // Simplified for list
  getOrder(id: number): Promise<OrderResponse | undefined>;
  getOrderByCode(code: string): Promise<OrderResponse | undefined>;
  createOrder(order: CreateOrderRequest): Promise<OrderResponse>;
  updateOrderStatus(id: number, status: string): Promise<OrderResponse>;
}

export class DatabaseStorage implements IStorage {
  // === USERS ===
  async getUser(id: number): Promise<User | undefined> {
    const [user] = await db.select().from(users).where(eq(users.id, id));
    return user;
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.username, username));
    return user;
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const [user] = await db.insert(users).values(insertUser).returning();
    return user;
  }

  async getAdminUsers(): Promise<User[]> {
    return await db
      .select()
      .from(users)
      .where(eq(users.role, "admin"))
      .orderBy(users.id);
  }

  async updateUser(id: number, userUpdate: Partial<InsertUser>): Promise<User> {
    const [user] = await db
      .update(users)
      .set(userUpdate)
      .where(eq(users.id, id))
      .returning();
    return user;
  }

  async deleteUser(id: number): Promise<void> {
    await db.delete(users).where(eq(users.id, id));
  }

  // === PRODUCTS ===
  async getProducts(): Promise<Product[]> {
    return await db.select().from(products).orderBy(products.id);
  }

  async getProduct(id: number): Promise<Product | undefined> {
    const [product] = await db
      .select()
      .from(products)
      .where(eq(products.id, id));
    return product;
  }

  async createProduct(insertProduct: InsertProduct): Promise<Product> {
    const [product] = await db
      .insert(products)
      .values(insertProduct)
      .returning();
    return product;
  }

  async updateProduct(
    id: number,
    productUpdate: Partial<InsertProduct>
  ): Promise<Product> {
    const [product] = await db
      .update(products)
      .set(productUpdate)
      .where(eq(products.id, id))
      .returning();
    return product;
  }

  async deleteProduct(id: number): Promise<void> {
    await db.delete(products).where(eq(products.id, id));
  }

  // === ORDERS ===
  async getOrders(): Promise<OrderResponse[]> {
    const allOrders = await db
      .select()
      .from(orders)
      .orderBy(desc(orders.createdAt));

    // Efficiently fetch items for all orders could be better, but loop is fine for MVP scale
    const orderResponses: OrderResponse[] = [];

    for (const order of allOrders) {
      const items = await db
        .select()
        .from(orderItems)
        .where(eq(orderItems.orderId, order.id));

      const itemsWithProduct = await Promise.all(
        items.map(async (item) => {
          const [product] = await db
            .select()
            .from(products)
            .where(eq(products.id, item.productId));
          return { ...item, product };
        })
      );

      orderResponses.push({ ...order, items: itemsWithProduct });
    }

    return orderResponses;
  }

  async getOrder(id: number): Promise<OrderResponse | undefined> {
    const [order] = await db.select().from(orders).where(eq(orders.id, id));
    if (!order) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const itemsWithProduct = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));
        return { ...item, product };
      })
    );

    return { ...order, items: itemsWithProduct };
  }

  async getOrderByCode(code: string): Promise<OrderResponse | undefined> {
    const [order] = await db
      .select()
      .from(orders)
      .where(eq(orders.pickupCode, code));
    if (!order) return undefined;

    const items = await db
      .select()
      .from(orderItems)
      .where(eq(orderItems.orderId, order.id));

    const itemsWithProduct = await Promise.all(
      items.map(async (item) => {
        const [product] = await db
          .select()
          .from(products)
          .where(eq(products.id, item.productId));
        return { ...item, product };
      })
    );

    return { ...order, items: itemsWithProduct };
  }

  async createOrder(orderReq: CreateOrderRequest): Promise<OrderResponse> {
    // Generate unique 6-char pickup code
    const pickupCode = Math.random().toString(36).substring(2, 8).toUpperCase();

    // 1. Create Order
    const [newOrder] = await db
      .insert(orders)
      .values({
        customerName: orderReq.customerName,
        totalAmount: String(orderReq.totalAmount), // Cast to string for decimal
        paymentMethod: orderReq.paymentMethod,
        status: "paid", // MVP: Auto-approve payment mock
        pickupCode: pickupCode,
      })
      .returning();

    // 2. Create Order Items
    const itemsCreated = [];
    for (const item of orderReq.items) {
      const [product] = await db
        .select()
        .from(products)
        .where(eq(products.id, item.productId));

      const [newItem] = await db
        .insert(orderItems)
        .values({
          orderId: newOrder.id,
          productId: item.productId,
          quantity: item.quantity,
          priceAtTime: String(product.price),
        })
        .returning();

      itemsCreated.push({ ...newItem, product });
    }

    return { ...newOrder, items: itemsCreated };
  }

  async updateOrderStatus(id: number, status: string): Promise<OrderResponse> {
    const [updatedOrder] = await db
      .update(orders)
      .set({ status })
      .where(eq(orders.id, id))
      .returning();

    // Refetch full object
    return this.getOrder(id) as Promise<OrderResponse>;
  }
}

export const storage = new DatabaseStorage();
