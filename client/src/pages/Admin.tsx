import { useState } from "react";
import {
  useProducts,
  useCreateProduct,
  useDeleteProduct,
} from "@/hooks/use-products";
import { useOrders } from "@/hooks/use-orders";
import { useLogin, useUser, useLogout, useCreateUser } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
import {
  Loader2,
  Package,
  Plus,
  Trash2,
  DollarSign,
  ShoppingBag,
  Users,
  Search,
  ShoppingCart,
  CreditCard,
  FileText,
  AlertCircle,
  CheckCircle,
  TrendingUp,
} from "lucide-react";
import { useToast } from "@/hooks/use-toast";

// Admin Login Component
function AdminLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending, error } = useLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Admin Portal</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
          </div>
          {error && (
            <p className="text-destructive text-sm font-medium">
              {error.message}
            </p>
          )}
          <Button
            className="w-full"
            onClick={() => login({ username, password })}
            disabled={isPending}
          >
            {isPending && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Login
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}

// User Management
function UsersManager() {
  const { mutate: createUser, isPending } = useCreateUser();
  const { toast } = useToast();
  const [isAdding, setIsAdding] = useState(false);
  const [newUser, setNewUser] = useState({
    username: "",
    password: "",
  });

  const handleSubmit = () => {
    if (!newUser.username.trim() || !newUser.password.trim()) {
      toast({
        title: "Error",
        description: "Please fill in all fields",
        variant: "destructive",
      });
      return;
    }

    createUser(
      {
        username: newUser.username,
        password: newUser.password,
        companyName: "",
        cnpj: "",
        email: "",
        phone: "",
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewUser({ username: "", password: "" });
          toast({
            title: "Success",
            description: "User created successfully",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create user",
            variant: "destructive",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">User Management</h2>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Create User
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New User</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Username</Label>
                <Input
                  value={newUser.username}
                  onChange={(e) =>
                    setNewUser({ ...newUser, username: e.target.value })
                  }
                  placeholder="Enter username (min 3 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label>Password</Label>
                <Input
                  type="password"
                  value={newUser.password}
                  onChange={(e) =>
                    setNewUser({ ...newUser, password: e.target.value })
                  }
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? "Creating..." : "Create User"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            <Users className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            Users created will be able to login to this admin panel
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Product Management
function ProductsManager() {
  const { data: products } = useProducts();
  const { mutate: deleteProduct } = useDeleteProduct();
  const { mutate: createProduct, isPending } = useCreateProduct();
  const [isAdding, setIsAdding] = useState(false);

  // New product form state
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    origin: "0",
    price: "",
    category: "",
    stock: "0",
    description: "",
    imageUrl: "",
    barcode: "",
    ncm: "",
    cfop: "",
    cst: "",
    icms: "0",
    pis: "0",
    cofins: "0",
    ipi: "0",
    icmsSt: "0",
    unitOfMeasure: "",
  });

  // Enhanced automatic tax calculation
  const calculateTaxes = (field: string, value: string) => {
    let updates: any = { [field]: value };

    if (field === "price" && value) {
      const price = parseFloat(value);
      if (!isNaN(price)) {
        updates.icms = "18.00";
        updates.pis = "1.65";
        updates.cofins = "7.60";
        updates.ipi = price > 100 ? "5.00" : "0.00";
        updates.icmsSt = "0.00";
        updates.cfop = "5102";
        updates.cst = "102";
      }
    }

    if (field === "ncm" && value) {
      if (value.startsWith("22")) {
        // Example: Beverages
        updates.ipi = "15.00";
        updates.cfop = "5405"; // Substituição Tributária example
      }
    }

    setNewProduct((prev) => ({ ...prev, ...updates }));
  };

  const handleSubmit = () => {
    createProduct(
      {
        ...newProduct,
        price: parseFloat(newProduct.price).toString(),
        stock: parseInt(newProduct.stock),
        icms: newProduct.icms ? parseFloat(newProduct.icms).toString() : "0",
        pis: newProduct.pis ? parseFloat(newProduct.pis).toString() : "0",
        cofins: newProduct.cofins
          ? parseFloat(newProduct.cofins).toString()
          : "0",
        ipi: newProduct.ipi ? parseFloat(newProduct.ipi).toString() : "0",
        icmsSt: newProduct.icmsSt
          ? parseFloat(newProduct.icmsSt).toString()
          : "0",
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewProduct({
            name: "",
            sku: "",
            origin: "0",
            price: "",
            category: "",
            stock: "0",
            description: "",
            imageUrl: "",
            barcode: "",
            ncm: "",
            cfop: "",
            cst: "",
            icms: "0",
            pis: "0",
            cofins: "0",
            ipi: "0",
            icmsSt: "0",
            unitOfMeasure: "",
          });
        },
      }
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Products Inventory</h2>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Add Product
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Add New Product</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Name</Label>
                  <Input
                    value={newProduct.name}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>SKU / Código Interno</Label>
                  <Input
                    value={newProduct.sku}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, sku: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Origem da Mercadoria</Label>
                  <select
                    className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                    value={newProduct.origin}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, origin: e.target.value })
                    }
                  >
                    <option value="0">0 - Nacional</option>
                    <option value="1">
                      1 - Estrangeira (Importação Direta)
                    </option>
                    <option value="2">
                      2 - Estrangeira (Adquirida no Mercado Interno)
                    </option>
                  </select>
                </div>
                <div className="space-y-2">
                  <Label>Category</Label>
                  <Input
                    value={newProduct.category}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, category: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>Preço de Venda</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.price}
                    onChange={(e) => calculateTaxes("price", e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Stock</Label>
                  <Input
                    type="number"
                    value={newProduct.stock}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, stock: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit of Measure</Label>
                  <Input
                    placeholder="UN, KG, LT..."
                    value={newProduct.unitOfMeasure}
                    onChange={(e) =>
                      setNewProduct({
                        ...newProduct,
                        unitOfMeasure: e.target.value,
                      })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Barcode</Label>
                  <Input
                    value={newProduct.barcode}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, barcode: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>NCM</Label>
                  <Input
                    value={newProduct.ncm}
                    onChange={(e) => calculateTaxes("ncm", e.target.value)}
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>CFOP</Label>
                  <Input
                    value={newProduct.cfop}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, cfop: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CST / CSOSN</Label>
                  <Input
                    value={newProduct.cst}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, cst: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-5 gap-4">
                <div className="space-y-2">
                  <Label>ICMS %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.icms}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, icms: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIS %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.pis}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, pis: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>COFINS %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.cofins}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, cofins: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>IPI %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.ipi}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, ipi: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>ICMS-ST %</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newProduct.icmsSt}
                    onChange={(e) =>
                      setNewProduct({ ...newProduct, icmsSt: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Description</Label>
                <Input
                  value={newProduct.description}
                  onChange={(e) =>
                    setNewProduct({
                      ...newProduct,
                      description: e.target.value,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Image URL</Label>
                <Input
                  value={newProduct.imageUrl}
                  onChange={(e) =>
                    setNewProduct({ ...newProduct, imageUrl: e.target.value })
                  }
                />
              </div>
              <Button
                onClick={handleSubmit}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? "Creating..." : "Create Product"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4">
        {products?.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-4 bg-white border rounded-lg shadow-sm"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 bg-slate-100 rounded-md overflow-hidden">
                {product.imageUrl && (
                  <img
                    src={product.imageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                )}
              </div>
              <div>
                <h4 className="font-bold">{product.name}</h4>
                <div className="text-xs text-muted-foreground flex gap-2">
                  <span>${Number(product.price).toFixed(2)}</span>
                  <span>•</span>
                  <span>
                    {product.stock} in stock ({product.unitOfMeasure || "UN"})
                  </span>
                  {product.ncm && (
                    <>
                      <span>•</span>
                      <span>NCM: {product.ncm}</span>
                    </>
                  )}
                </div>
              </div>
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => deleteProduct(product.id)}
            >
              <Trash2 className="h-4 w-4 text-destructive" />
            </Button>
          </div>
        ))}
      </div>
    </div>
  );
}

// Dashboard
function Dashboard() {
  const { data: orders } = useOrders();
  const { data: products } = useProducts();

  const totalSales =
    orders?.reduce(
      (sum: number, order: any) => sum + Number(order.totalAmount),
      0
    ) || 0;

  const totalTaxes = totalSales * 0.18; // Simulated 18% tax
  const totalOrders = orders?.length || 0;

  // Mock SEFAZ status and alerts
  const sefazStatus = "online";
  const fiscalAlerts = [
    { id: 1, type: "error", message: "NCM inválido no produto ID #45" },
    {
      id: 2,
      type: "warning",
      message: "Certificado Digital expira em 15 dias",
    },
  ];

  const data = [
    { name: "Mon", sales: 400 },
    { name: "Tue", sales: 300 },
    { name: "Wed", sales: 600 },
    { name: "Thu", sales: 800 },
    { name: "Fri", sales: 500 },
    { name: "Sat", sales: 900 },
    { name: "Sun", sales: 700 },
  ];

  return (
    <div className="space-y-6">
      {/* SEFAZ Status & Alerts */}
      <div className="grid md:grid-cols-2 gap-4">
        <Card className="border-l-4 border-l-green-500">
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium">Status SEFAZ</CardTitle>
            <div
              className={`h-3 w-3 rounded-full ${
                sefazStatus === "online" ? "bg-green-500" : "bg-red-500"
              } animate-pulse`}
            />
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold uppercase">{sefazStatus}</div>
            <p className="text-xs text-muted-foreground">
              Conexão estável com os servidores
            </p>
          </CardContent>
        </Card>
        <Card className="border-l-4 border-l-amber-500">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Alertas Fiscais
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2">
            {fiscalAlerts.map((alert) => (
              <div key={alert.id} className="flex items-center gap-2 text-xs">
                <span
                  className={`h-2 w-2 rounded-full ${
                    alert.type === "error" ? "bg-red-500" : "bg-amber-500"
                  }`}
                />
                <span className="font-medium">{alert.message}</span>
              </div>
            ))}
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">Vendas (Mês)</CardTitle>
            <DollarSign className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {totalSales.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              +{totalOrders} pedidos realizados
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Impostos Gerados
            </CardTitle>
            <ShoppingBag className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {totalTaxes.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Provisionamento (18%)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium">
              Produtos em Linha
            </CardTitle>
            <Package className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">+{products?.length || 0}</div>
            <p className="text-xs text-muted-foreground">Itens no inventário</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Últimos Cupons Gerados</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {orders?.slice(0, 5).map((order) => (
                <div
                  key={order.id}
                  className="flex items-center justify-between border-b pb-2 last:border-0"
                >
                  <div className="flex flex-col">
                    <span className="text-sm font-bold">
                      Cupom #{order.pickupCode}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(order.createdAt!).toLocaleDateString()}
                    </span>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-bold">
                      R$ {Number(order.totalAmount).toFixed(2)}
                    </div>
                    <span className="text-[10px] text-green-600 font-bold uppercase">
                      AUTORIZADO
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Faturamento Semanal</CardTitle>
          </CardHeader>
          <CardContent className="pl-2">
            <div className="h-[250px]">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={data}>
                  <XAxis
                    dataKey="name"
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                  />
                  <YAxis
                    stroke="#888888"
                    fontSize={12}
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(value) => `R$${value}`}
                  />
                  <Tooltip />
                  <Bar
                    dataKey="sales"
                    fill="hsl(var(--primary))"
                    radius={[4, 4, 0, 0]}
                  />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Fiscal Reports Manager
function FiscalReportsManager() {
  const { data: orders } = useOrders();
  const { data: products } = useProducts();
  const { toast } = useToast();

  const totalSales =
    orders?.reduce((acc, o) => acc + Number(o.totalAmount), 0) || 0;
  const totalTax = totalSales * 0.18; // 18% ICMS simulation

  const topProducts =
    products?.slice(0, 5).map((p) => ({
      name: p.name,
      sales: Math.floor(Math.random() * 50) + 10,
    })) || [];

  const handleExport = (type: "XML" | "CSV") => {
    toast({
      title: "Exportação Iniciada",
      description: `Gerando arquivo ${type} para o contador...`,
    });
  };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-4 gap-4">
        <Card className="bg-blue-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Vendas Total</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ {totalSales.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-orange-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ICMS Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ {totalTax.toFixed(2)}</div>
          </CardContent>
        </Card>
        <Card className="bg-green-50/50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">ISS Estimado</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">R$ 0,00</div>
          </CardContent>
        </Card>
        <Card className="bg-slate-50">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Documentos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-xl font-bold">{orders?.length || 0}</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <CardTitle>Produtos Mais Vendidos</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {topProducts.map((p, i) => (
                <div key={i} className="flex justify-between items-center">
                  <span className="text-sm font-medium">{p.name}</span>
                  <span className="text-xs bg-slate-100 px-2 py-1 rounded-full">
                    {p.sales} un
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Exportação para Contabilidade</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <p className="text-sm text-muted-foreground">
              Selecione o período e o formato para enviar ao seu contador.
            </p>
            <div className="flex gap-4">
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport("XML")}
              >
                <FileText className="mr-2 h-4 w-4" /> Exportar XMLs
              </Button>
              <Button
                variant="outline"
                className="flex-1"
                onClick={() => handleExport("CSV")}
              >
                <FileText className="mr-2 h-4 w-4" /> Exportar CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Financial Management UI
function FinancialManagerUI() {
  const { data: orders } = useOrders();

  const transactions =
    orders?.map((order) => ({
      id: order.id,
      date: order.createdAt,
      description: `Venda #${order.pickupCode}`,
      amount: Number(order.totalAmount),
      method: order.paymentMethod,
      status: "received",
      fee:
        order.paymentMethod === "credit" ? Number(order.totalAmount) * 0.03 : 0,
    })) || [];

  const totalReceived = transactions.reduce((acc, t) => acc + t.amount, 0);
  const totalFees = transactions.reduce((acc, t) => acc + t.fee, 0);

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Contas a Receber
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {totalReceived.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Taxas de Cartão
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              R$ {totalFees.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">
              Líquido Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              R$ {(totalReceived - totalFees).toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Fluxo de Caixa</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {transactions.map((t) => (
              <div
                key={t.id}
                className="flex items-center justify-between border-b pb-2 last:border-0"
              >
                <div className="flex flex-col">
                  <span className="font-medium">{t.description}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(t.date!).toLocaleDateString()} -{" "}
                    {t.method.toUpperCase()}
                  </span>
                </div>
                <div className="text-right">
                  <div className="font-bold text-green-600">
                    R$ {t.amount.toFixed(2)}
                  </div>
                  {t.fee > 0 && (
                    <div className="text-[10px] text-red-500">
                      - R$ {t.fee.toFixed(2)} (taxa)
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Checkout / Sales Management
function CheckoutManager() {
  const { data: products } = useProducts();
  const [cart, setCart] = useState<any[]>([]);
  const [paymentMethod, setPaymentMethod] = useState("pix");
  const [discount, setDiscount] = useState("0");
  const [customer, setCustomer] = useState({ name: "", taxId: "" });
  const { toast } = useToast();

  const addToCart = (product: any) => {
    setCart([...cart, { ...product, quantity: 1 }]);
    toast({ title: "Adicionado", description: `${product.name} no carrinho` });
  };

  const subtotal = cart.reduce(
    (acc, item) => acc + Number(item.price) * item.quantity,
    0
  );
  const totalTax = cart.reduce((acc, item) => {
    const icms = (Number(item.price) * Number(item.icms || 0)) / 100;
    const pis = (Number(item.price) * Number(item.pis || 0)) / 100;
    const cofins = (Number(item.price) * Number(item.cofins || 0)) / 100;
    return acc + (icms + pis + cofins) * item.quantity;
  }, 0);

  const total = subtotal - Number(discount);

  const handleFinishSale = () => {
    toast({
      title: "Venda Finalizada",
      description: `Documento fiscal emitido com sucesso! Total: R$ ${total.toFixed(
        2
      )}`,
    });
    setCart([]);
  };

  return (
    <div className="grid md:grid-cols-3 gap-6">
      <div className="md:col-span-2 space-y-6">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <ShoppingCart className="h-5 w-5" /> Seleção de Itens
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input placeholder="Buscar produtos..." className="pl-8" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              {products?.map((product) => (
                <div
                  key={product.id}
                  className="p-3 border rounded-lg flex justify-between items-center hover:bg-slate-50 cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <div>
                    <div className="font-medium">{product.name}</div>
                    <div className="text-xs text-muted-foreground">
                      R$ {Number(product.price).toFixed(2)}
                    </div>
                  </div>
                  <Plus className="h-4 w-4" />
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" /> Dados do Cliente (Opcional)
            </CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome / Razão Social</Label>
              <Input
                value={customer.name}
                onChange={(e) =>
                  setCustomer({ ...customer, name: e.target.value })
                }
              />
            </div>
            <div className="space-y-2">
              <Label>CPF / CNPJ</Label>
              <Input
                value={customer.taxId}
                onChange={(e) =>
                  setCustomer({ ...customer, taxId: e.target.value })
                }
              />
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="space-y-6">
        <Card className="bg-slate-50 border-2 border-primary/20">
          <CardHeader>
            <CardTitle>Resumo da Venda</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2 max-h-40 overflow-y-auto">
              {cart.map((item, idx) => (
                <div key={idx} className="flex justify-between text-sm">
                  <span>{item.name} x1</span>
                  <span>R$ {Number(item.price).toFixed(2)}</span>
                </div>
              ))}
            </div>

            <div className="border-t pt-4 space-y-2">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span>R$ {subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm text-muted-foreground">
                <span>Impostos (Auto)</span>
                <span>R$ {totalTax.toFixed(2)}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label className="text-sm">Desconto</Label>
                <Input
                  type="number"
                  className="h-8 w-24 text-right"
                  value={discount}
                  onChange={(e) => setDiscount(e.target.value)}
                />
              </div>
              <div className="flex justify-between text-lg font-bold border-t pt-2 text-primary">
                <span>TOTAL</span>
                <span>R$ {total.toFixed(2)}</span>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Forma de Pagamento</Label>
              <select
                className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
                value={paymentMethod}
                onChange={(e) => setPaymentMethod(e.target.value)}
              >
                <option value="pix">PIX (NFC-e)</option>
                <option value="credit">Cartão de Crédito</option>
                <option value="debit">Cartão de Débito</option>
                <option value="cash">Dinheiro</option>
              </select>
            </div>

            <Button
              className="w-full h-12 text-lg"
              onClick={handleFinishSale}
              disabled={cart.length === 0}
            >
              <CreditCard className="mr-2 h-5 w-5" /> Finalizar & Emitir
            </Button>
            <p className="text-[10px] text-center text-muted-foreground">
              Simulação de envio para SEFAZ e geração de XML/DANFE inclusa.
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

// Services Management
function ServicesManager() {
  const [isAdding, setIsAdding] = useState(false);
  const [newService, setNewService] = useState({
    name: "",
    description: "",
    serviceCode: "",
    cnae: "",
    issRate: "0",
    cityOfService: "",
    issRetention: false,
    pis: "0",
    cofins: "0",
    csosn: "",
    price: "",
  });

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h2 className="text-2xl font-bold">Gestão de Serviços</h2>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" /> Novo Serviço
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Cadastro de Serviço (NFS-e)</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Nome do Serviço</Label>
                  <Input
                    value={newService.name}
                    onChange={(e) =>
                      setNewService({ ...newService, name: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>Preço do Serviço</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.price}
                    onChange={(e) =>
                      setNewService({ ...newService, price: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Código do Serviço (LC 116)</Label>
                  <Input
                    placeholder="Ex: 01.01"
                    value={newService.serviceCode}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        serviceCode: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CNAE</Label>
                  <Input
                    placeholder="0000-0/00"
                    value={newService.cnae}
                    onChange={(e) =>
                      setNewService({ ...newService, cnae: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label>ISS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.issRate}
                    onChange={(e) =>
                      setNewService({ ...newService, issRate: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>PIS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.pis}
                    onChange={(e) =>
                      setNewService({ ...newService, pis: e.target.value })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>COFINS (%)</Label>
                  <Input
                    type="number"
                    step="0.01"
                    value={newService.cofins}
                    onChange={(e) =>
                      setNewService({ ...newService, cofins: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Município de Prestação</Label>
                  <Input
                    value={newService.cityOfService}
                    onChange={(e) =>
                      setNewService({
                        ...newService,
                        cityOfService: e.target.value,
                      })
                    }
                  />
                </div>
                <div className="space-y-2">
                  <Label>CSOSN</Label>
                  <Input
                    value={newService.csosn}
                    onChange={(e) =>
                      setNewService({ ...newService, csosn: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="issRetention"
                  checked={newService.issRetention}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      issRetention: e.target.checked,
                    })
                  }
                />
                <Label htmlFor="issRetention">Possui Retenção de ISS?</Label>
              </div>

              <div className="space-y-2">
                <Label>Descrição</Label>
                <Input
                  value={newService.description}
                  onChange={(e) =>
                    setNewService({
                      ...newService,
                      description: e.target.value,
                    })
                  }
                />
              </div>

              <Button className="w-full">Cadastrar Serviço</Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <Card>
        <CardContent className="pt-6">
          <p className="text-muted-foreground text-center py-8">
            <Package className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
            Nenhum serviço cadastrado ainda.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}

// Fiscal Settings & Certificate Manager
function FiscalSettingsManager() {
  const [certType, setCertType] = useState<"A1" | "A3">("A1");
  const [certData, setCertData] = useState({
    password: "",
    fileName: "",
    tokenSerial: "",
    tokenModel: "",
  });
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Configurações Salvas",
      description: `Certificado ${certType} configurado para emissão fiscal.`,
    });
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <FileText className="h-5 w-5" /> Configuração de Certificado Digital
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="flex gap-4 p-1 bg-slate-100 rounded-md w-fit">
          <Button
            variant={certType === "A1" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCertType("A1")}
            className="no-default-hover-elevate"
          >
            Certificado A1 (Arquivo)
          </Button>
          <Button
            variant={certType === "A3" ? "default" : "ghost"}
            size="sm"
            onClick={() => setCertType("A3")}
            className="no-default-hover-elevate"
          >
            Certificado A3 (Cartão/Token)
          </Button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          {certType === "A1" ? (
            <>
              <div className="space-y-2">
                <Label>Arquivo do Certificado (.pfx / .p12)</Label>
                <div
                  className="border-2 border-dashed rounded-md p-4 text-center cursor-pointer hover:bg-slate-50 transition-colors"
                  onClick={() =>
                    document.getElementById("cert-upload")?.click()
                  }
                >
                  <Plus className="h-6 w-6 mx-auto mb-2 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    {certData.fileName ||
                      "Clique para selecionar ou arraste o arquivo"}
                  </span>
                  <input
                    id="cert-upload"
                    type="file"
                    className="hidden"
                    accept=".pfx,.p12"
                    onChange={(e) => {
                      const file = e.target.files?.[0];
                      if (file) {
                        setCertData({ ...certData, fileName: file.name });
                        toast({
                          title: "Arquivo Selecionado",
                          description: file.name,
                        });
                      }
                    }}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Senha do Certificado</Label>
                <Input
                  type="password"
                  placeholder="Digite a senha do PFX"
                  value={certData.password}
                  onChange={(e) =>
                    setCertData({ ...certData, password: e.target.value })
                  }
                />
              </div>
            </>
          ) : (
            <>
              <div className="space-y-2">
                <Label>Série do Token/Cartão</Label>
                <Input
                  placeholder="Ex: 12345678"
                  value={certData.tokenSerial}
                  onChange={(e) =>
                    setCertData({ ...certData, tokenSerial: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label>Modelo da Leitora/Token</Label>
                <Input
                  placeholder="Ex: SafeNet, Gemalto"
                  value={certData.tokenModel}
                  onChange={(e) =>
                    setCertData({ ...certData, tokenModel: e.target.value })
                  }
                />
              </div>
              <div className="space-y-2 md:col-span-2">
                <AlertCircle className="h-4 w-4 inline mr-2 text-amber-500" />
                <span className="text-xs text-muted-foreground">
                  Nota: Certificados A3 exigem o driver do fabricante e
                  integração via componente local (DLL/Applet) para assinatura
                  no navegador.
                </span>
              </div>
            </>
          )}
        </div>

        <Button onClick={handleSave} className="w-full">
          Salvar Configurações Fiscais
        </Button>
      </CardContent>
    </Card>
  );
}

// Fiscal Management
function FiscalManager() {
  const { data: orders } = useOrders();

  const taxStats = orders?.reduce(
    (acc, order) => {
      const amount = Number(order.totalAmount);
      // Simulation: average 18% tax
      acc.totalTax += amount * 0.18;
      acc.icms += amount * 0.12;
      acc.pisCofins += amount * 0.06;
      return acc;
    },
    { totalTax: 0, icms: 0, pisCofins: 0 }
  ) || { totalTax: 0, icms: 0, pisCofins: 0 };

  return (
    <div className="space-y-6">
      <div className="grid md:grid-cols-3 gap-6">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Provisionamento de Impostos
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-blue-600">
              R$ {taxStats.totalTax.toFixed(2)}
            </div>
            <p className="text-xs text-muted-foreground">
              Estimado (18% sobre vendas)
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              ICMS Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">
              R$ {taxStats.icms.toFixed(2)}
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              PIS/COFINS Estimado
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">
              R$ {taxStats.pisCofins.toFixed(2)}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Configurações Fiscais da Empresa</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>CNPJ</Label>
              <Input placeholder="00.000.000/0000-00" />
            </div>
            <div className="space-y-2">
              <Label>Razão Social</Label>
              <Input placeholder="Nome oficial da empresa" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Nome Fantasia</Label>
              <Input placeholder="Nome comercial" />
            </div>
            <div className="space-y-2">
              <Label>Ambiente</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option>Homologação</option>
                <option>Produção</option>
              </select>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-4">
            <div className="space-y-2">
              <Label>Inscrição Estadual</Label>
              <Input placeholder="000.000.000-000" />
            </div>
            <div className="space-y-2">
              <Label>Inscrição Municipal</Label>
              <Input placeholder="000.000" />
            </div>
            <div className="space-y-2">
              <Label>CNAE Principal</Label>
              <Input placeholder="0000-0/00" />
            </div>
          </div>
          <div className="space-y-2">
            <Label>Regime Tributário</Label>
            <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <option>Simples Nacional</option>
              <option>Lucro Presumido</option>
              <option>Lucro Real</option>
            </select>
          </div>
          <div className="space-y-2">
            <Label>Endereço Fiscal</Label>
            <Input placeholder="Rua, Número, Bairro, Cidade, UF" />
          </div>
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Certificado</Label>
              <select className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
                <option>Certificado A1 (Arquivo)</option>
                <option>Certificado A3 (Token/Cartão)</option>
              </select>
            </div>
            <div className="space-y-2">
              <Label>Arquivo/Upload Certificado</Label>
              <Input type="file" className="text-xs" />
            </div>
          </div>
          <div className="grid grid-cols-2 gap-4 border-t pt-4">
            <div className="space-y-2">
              <Label>CFOP Padrão (Vendas)</Label>
              <Input placeholder="5102" />
            </div>
            <div className="space-y-2">
              <Label>CST Padrão</Label>
              <Input placeholder="102" />
            </div>
          </div>
          <Button className="w-full">Salvar Dados da Empresa</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Histórico de Vendas Fiscais</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="relative w-full overflow-auto">
            <table className="w-full caption-bottom text-sm">
              <thead className="[&_tr]:border-b">
                <tr className="border-b transition-colors hover:bg-muted/50 data-[state=selected]:bg-muted">
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Pedido
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Valor Bruto
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Imposto Estimado
                  </th>
                  <th className="h-12 px-4 text-left align-middle font-medium text-muted-foreground">
                    Status Fiscal
                  </th>
                </tr>
              </thead>
              <tbody className="[&_tr:last-child]:border-0">
                {orders?.map((order) => (
                  <tr
                    key={order.id}
                    className="border-b transition-colors hover:bg-muted/50"
                  >
                    <td className="p-4 align-middle">#{order.pickupCode}</td>
                    <td className="p-4 align-middle">
                      R$ {Number(order.totalAmount).toFixed(2)}
                    </td>
                    <td className="p-4 align-middle">
                      R$ {(Number(order.totalAmount) * 0.18).toFixed(2)}
                    </td>
                    <td className="p-4 align-middle">
                      <span className="inline-flex items-center rounded-full bg-green-100 px-2.5 py-0.5 text-xs font-medium text-green-800">
                        Processado
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Main Admin Page
export default function Admin() {
  const { data: user, isLoading } = useUser();
  const { mutate: logout } = useLogout();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user) return <AdminLogin />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold font-display">Admin Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.username}
            </span>
            <Button variant="outline" size="sm" onClick={() => logout()}>
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <Tabs defaultValue="dashboard" className="space-y-6">
          <TabsList>
            <TabsTrigger value="dashboard">Dashboard</TabsTrigger>
            <TabsTrigger value="products">Products</TabsTrigger>
            <TabsTrigger value="services">Services</TabsTrigger>
            <TabsTrigger value="checkout">Vendas/NFC-e</TabsTrigger>
            <TabsTrigger value="financial">Financeiro</TabsTrigger>
            <TabsTrigger value="fiscal">Fiscal</TabsTrigger>
            <TabsTrigger value="reports">Relatórios</TabsTrigger>
            <TabsTrigger value="users">Users</TabsTrigger>
          </TabsList>

          <TabsContent value="dashboard">
            <Dashboard />
          </TabsContent>

          <TabsContent value="products">
            <ProductsManager />
          </TabsContent>

          <TabsContent value="services">
            <ServicesManager />
          </TabsContent>

          <TabsContent value="checkout">
            <CheckoutManager />
          </TabsContent>

          <TabsContent value="financial">
            <FinancialManagerUI />
          </TabsContent>

          <TabsContent value="fiscal">
            <FiscalSettingsManager />
            <div className="mt-8">
              <FiscalManager />
            </div>
          </TabsContent>

          <TabsContent value="reports">
            <FiscalReportsManager />
          </TabsContent>

          <TabsContent value="users">
            <UsersManager />
          </TabsContent>
        </Tabs>
      </main>
    </div>
  );
}
