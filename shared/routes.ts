import { z } from "zod";
import {
  insertProductSchema,
  insertUserSchema,
  products,
  orders,
  users,
} from "./schema";

// ============================================
// SHARED ERROR SCHEMAS
// ============================================
export const errorSchemas = {
  validation: z.object({
    message: z.string(),
    field: z.string().optional(),
  }),
  notFound: z.object({
    message: z.string(),
  }),
  unauthorized: z.object({
    message: z.string(),
  }),
};

// ============================================
// API CONTRACT
// ============================================
export const api = {
  products: {
    list: {
      method: "GET" as const,
      path: "/api/products",
      responses: {
        200: z.array(z.custom<typeof products.$inferSelect>()),
      },
    },
    get: {
      method: "GET" as const,
      path: "/api/products/:id",
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        404: errorSchemas.notFound,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/products",
      input: insertProductSchema,
      responses: {
        201: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
      },
    },
    update: {
      method: "PUT" as const,
      path: "/api/products/:id",
      input: insertProductSchema.partial(),
      responses: {
        200: z.custom<typeof products.$inferSelect>(),
        400: errorSchemas.validation,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/products/:id",
      responses: {
        204: z.void(),
        404: errorSchemas.notFound,
      },
    },
  },
  orders: {
    list: {
      method: "GET" as const,
      path: "/api/orders",
      responses: {
        200: z.array(z.any()), // Complex nested type, using any for now in contract
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/orders",
      input: z.object({
        customerName: z.string(),
        totalAmount: z.number().or(z.string()),
        paymentMethod: z.string(),
        items: z.array(
          z.object({
            productId: z.number(),
            quantity: z.number(),
          })
        ),
      }),
      responses: {
        201: z.any(),
        400: errorSchemas.validation,
      },
    },
    getByCode: {
      method: "GET" as const,
      path: "/api/orders/code/:code",
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
    updateStatus: {
      method: "PATCH" as const,
      path: "/api/orders/:id/status",
      input: z.object({ status: z.string() }),
      responses: {
        200: z.any(),
        404: errorSchemas.notFound,
      },
    },
  },
  auth: {
    login: {
      method: "POST" as const,
      path: "/api/login",
      input: z.object({
        username: z.string(),
        password: z.string(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
    logout: {
      method: "POST" as const,
      path: "/api/logout",
      responses: {
        200: z.void(),
      },
    },
    me: {
      method: "GET" as const,
      path: "/api/user",
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        401: errorSchemas.unauthorized,
      },
    },
  },
  users: {
    list: {
      method: "GET" as const,
      path: "/api/users",
      responses: {
        200: z.array(z.custom<typeof users.$inferSelect>()),
        401: errorSchemas.unauthorized,
      },
    },
    create: {
      method: "POST" as const,
      path: "/api/users",
      input: z.object({
        username: z.string().min(3, "Username must be at least 3 characters"),
        password: z.string().min(6, "Password must be at least 6 characters"),
        companyName: z.string(),
        cnpj: z.string(),
        email: z.string().email("Invalid email"),
        phone: z.string(),
      }),
      responses: {
        201: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
      },
    },
    update: {
      method: "PATCH" as const,
      path: "/api/users/:id",
      input: z.object({
        companyName: z.string().optional(),
        cnpj: z.string().optional(),
        email: z.string().email("Invalid email").optional(),
        phone: z.string().optional(),
        password: z
          .string()
          .min(6, "Password must be at least 6 characters")
          .optional(),
        needsPasswordChange: z.boolean().optional(),
      }),
      responses: {
        200: z.custom<typeof users.$inferSelect>(),
        400: errorSchemas.validation,
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
    delete: {
      method: "DELETE" as const,
      path: "/api/users/:id",
      responses: {
        200: z.void(),
        401: errorSchemas.unauthorized,
        404: errorSchemas.notFound,
      },
    },
  },
};

export function buildUrl(
  path: string,
  params?: Record<string, string | number>
): string {
  let url = path;
  if (params) {
    Object.entries(params).forEach(([key, value]) => {
      if (url.includes(`:${key}`)) {
        url = url.replace(`:${key}`, String(value));
      }
    });
  }
  return url;
}
