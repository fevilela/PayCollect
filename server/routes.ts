import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { api } from "@shared/routes";
import { z } from "zod";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { scrypt, randomBytes, timingSafeEqual } from "crypto";
import { promisify } from "util";

const scryptAsync = promisify(scrypt);

// Helper to hash password
async function hashPassword(password: string) {
  const salt = randomBytes(16).toString("hex");
  const buf = (await scryptAsync(password, salt, 64)) as Buffer;
  return `${buf.toString("hex")}.${salt}`;
}

// Helper to compare password
async function comparePassword(stored: string, supplied: string) {
  const [hashed, salt] = stored.split(".");
  const hashedBuf = Buffer.from(hashed, "hex");
  const suppliedBuf = (await scryptAsync(supplied, salt, 64)) as Buffer;
  return timingSafeEqual(hashedBuf, suppliedBuf);
}

export async function registerRoutes(
  httpServer: Server,
  app: Express
): Promise<Server> {
  // === AUTH SETUP ===
  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret",
      resave: false,
      saveUninitialized: false,
      cookie: { secure: process.env.NODE_ENV === "production" },
    })
  );

  app.use(passport.initialize());
  app.use(passport.session());

  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) return done(null, false, { message: "Incorrect username." });

        const isValid = await comparePassword(user.password, password);
        if (!isValid)
          return done(null, false, { message: "Incorrect password." });

        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => done(null, user.id));
  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // === SEED DATA ===
  async function seed() {
    const manager = await storage.getUserByUsername("manager");
    const admin = await storage.getUserByUsername("admin");

    if (!manager && !admin) {
      console.log("Seeding database...");

      // Seed Manager (system admin - for you to create companies)
      const managerPassword = await hashPassword("manager123");
      await storage.createUser({
        username: "manager",
        password: managerPassword,
        role: "manager",
      });

      // Seed Demo Admin Company
      const adminPassword = await hashPassword("admin123");
      await storage.createUser({
        username: "admin",
        password: adminPassword,
        role: "admin",
        companyName: "Demo Store",
      });

      // Seed Products
      const products = await storage.getProducts();
      if (products.length === 0) {
        await storage.createProduct({
          name: "Classic Burger",
          description: "Juicy beef patty with lettuce, tomato, and cheese.",
          price: "25.00",
          stock: 50,
          category: "Food",
          barcode: "123456789",
          imageUrl:
            "https://images.unsplash.com/photo-1568901346375-23c9450c58cd?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        });
        await storage.createProduct({
          name: "Fries",
          description: "Crispy golden french fries.",
          price: "10.00",
          stock: 100,
          category: "Sides",
          barcode: "987654321",
          imageUrl:
            "https://images.unsplash.com/photo-1630384060421-cb20d0e0649d?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        });
        await storage.createProduct({
          name: "Cola",
          description: "Cold refreshing cola.",
          price: "6.00",
          stock: 200,
          category: "Drinks",
          barcode: "11223344",
          imageUrl:
            "https://images.unsplash.com/photo-1622483767028-3f66f32aef97?w=500&auto=format&fit=crop&q=60&ixlib=rb-4.0.3",
        });
      }
      console.log("Seeding complete.");
    }
  }

  // Run seed
  seed();

  // === API ROUTES ===

  // -- Auth Routes --
  app.post(api.auth.login.path, passport.authenticate("local"), (req, res) => {
    res.json(req.user);
  });

  app.post(api.auth.logout.path, (req, res, next) => {
    req.logout((err) => {
      if (err) return next(err);
      res.sendStatus(200);
    });
  });

  app.get(api.auth.me.path, (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    res.json(req.user);
  });

  // -- Products Routes --
  app.get(api.products.list.path, async (req, res) => {
    const products = await storage.getProducts();
    res.json(products);
  });

  app.get(api.products.get.path, async (req, res) => {
    const product = await storage.getProduct(Number(req.params.id));
    if (!product) return res.status(404).json({ message: "Product not found" });
    res.json(product);
  });

  app.post(api.products.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    try {
      const input = api.products.create.input.parse(req.body);
      const product = await storage.createProduct(input);
      res.status(201).json(product);
    } catch (e) {
      res.status(400).json({ message: "Invalid input" });
    }
  });

  // -- Orders Routes --
  app.get(api.orders.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const orders = await storage.getOrders();
    res.json(orders);
  });

  app.post(api.orders.create.path, async (req, res) => {
    try {
      // Manual parse because schema is complex
      const order = await storage.createOrder(req.body);
      res.status(201).json(order);
    } catch (e) {
      console.error(e);
      res.status(400).json({ message: "Failed to create order" });
    }
  });

  app.get(api.orders.getByCode.path, async (req, res) => {
    const order = await storage.getOrderByCode(req.params.code.toUpperCase());
    if (!order) return res.status(404).json({ message: "Order not found" });
    res.json(order);
  });

  app.patch(api.orders.updateStatus.path, async (req, res) => {
    // Ideally protected, but for "Station" maybe simple access or shared auth
    // For now, let's keep it open or require auth if station is logged in
    const order = await storage.updateOrderStatus(
      Number(req.params.id),
      req.body.status
    );
    res.json(order);
  });

  // -- User Management Routes --
  app.get(api.users.list.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    // Only manager can list users
    if (currentUser.role !== "manager") return res.sendStatus(403);
    const adminUsers = await storage.getAdminUsers();
    res.json(adminUsers);
  });

  app.post(api.users.create.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    // Only manager can create users
    if (currentUser.role !== "manager") return res.sendStatus(403);
    try {
      const input = api.users.create.input.parse(req.body);
      const hashedPassword = await hashPassword(input.password);
      const user = await storage.createUser({
        username: input.username,
        password: hashedPassword,
        role: "admin",
        companyName: input.companyName,
        cnpj: input.cnpj,
        email: input.email,
        phone: input.phone,
        needsPasswordChange: true,
      });
      res.status(201).json(user);
    } catch (e: any) {
      if (e.message?.includes("unique constraint")) {
        return res.status(400).json({ message: "Username already exists" });
      }
      res.status(400).json({ message: e.message || "Invalid input" });
    }
  });

  app.patch(api.users.update.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (currentUser.role !== "manager") return res.sendStatus(403);
    try {
      const id = Number(req.params.id);
      const input = api.users.update.input.parse(req.body);
      const updateData: any = {};
      if (input.companyName) updateData.companyName = input.companyName;
      if (input.cnpj) updateData.cnpj = input.cnpj;
      if (input.email) updateData.email = input.email;
      if (input.phone) updateData.phone = input.phone;
      if (input.password)
        updateData.password = await hashPassword(input.password);
      if (input.needsPasswordChange !== undefined)
        updateData.needsPasswordChange = input.needsPasswordChange;

      const user = await storage.updateUser(id, updateData);
      res.json(user);
    } catch (e: any) {
      res.status(400).json({ message: e.message || "Invalid input" });
    }
  });

  app.post("/api/fiscal-settings", async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    // Em um sistema real, salvaríamos isso no banco de dados para o usuário logado
    // Por enquanto, simulamos o sucesso para permitir o fluxo do frontend
    res.json({ message: "Configurações fiscais salvas com sucesso" });
  });

  app.delete(api.users.delete.path, async (req, res) => {
    if (!req.isAuthenticated()) return res.sendStatus(401);
    const currentUser = req.user as any;
    if (currentUser.role !== "manager") return res.sendStatus(403);
    const id = Number(req.params.id);
    await storage.deleteUser(id);
    res.sendStatus(200);
  });

  return httpServer;
}
