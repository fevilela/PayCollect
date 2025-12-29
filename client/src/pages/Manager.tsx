import { useState } from "react";
import { useLogin, useUser, useLogout, useCreateUser } from "@/hooks/use-auth";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Label } from "@/components/ui/label";
import { Loader2, Plus, Building2, Trash2, Edit2, Search } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useMutation } from "@tanstack/react-query";
import { queryClient } from "@/lib/queryClient";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

function ManagerLogin() {
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const { mutate: login, isPending, error } = useLogin();

  return (
    <div className="min-h-screen flex items-center justify-center bg-slate-100 p-4">
      <Card className="w-full max-w-md shadow-xl">
        <CardHeader className="text-center">
          <CardTitle className="text-2xl font-bold">Manager Portal</CardTitle>
          <p className="text-sm text-muted-foreground mt-2">
            Create and manage company accounts
          </p>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Username</Label>
            <Input
              data-testid="input-username"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <Label>Password</Label>
            <Input
              data-testid="input-password"
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
            data-testid="button-login"
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

interface Company {
  id: number;
  username: string;
  companyName: string;
  cnpj: string;
  email: string;
  phone: string;
}

function CompanyList() {
  const { data: companies, isLoading } = useQuery({
    queryKey: ["/api/users"],
    queryFn: async () => {
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch");
      return res.json() as Promise<Company[]>;
    },
  });

  const { mutate: deleteCompany } = useMutation({
    mutationFn: async (id: number) => {
      const res = await fetch(`/api/users/${id}`, { method: "DELETE" });
      if (!res.ok) throw new Error("Failed to delete");
      return res;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const { mutate: updateCompany } = useMutation({
    mutationFn: async (data: { id: number; company: Partial<Company> }) => {
      const res = await fetch(`/api/users/${data.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data.company),
      });
      if (!res.ok) throw new Error("Failed to update");
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/users"] });
    },
  });

  const { toast } = useToast();
  const [searchTerm, setSearchTerm] = useState("");
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<number | null>(null);
  const [newCompany, setNewCompany] = useState({
    companyName: "",
    username: "",
    password: "",
    cnpj: "",
    email: "",
    phone: "",
  });
  const [editingCompany, setEditingCompany] = useState<Company | null>(null);

  const { mutate: createUser, isPending } = useCreateUser();

  const filteredCompanies =
    companies?.filter(
      (c) =>
        c.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.cnpj?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        c.username.toLowerCase().includes(searchTerm.toLowerCase())
    ) || [];

  const handleCreate = () => {
    if (
      !newCompany.companyName.trim() ||
      !newCompany.username.trim() ||
      !newCompany.password.trim() ||
      !newCompany.cnpj.trim() ||
      !newCompany.email.trim()
    ) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    createUser(
      {
        username: newCompany.username,
        password: newCompany.password,
        companyName: newCompany.companyName,
        cnpj: newCompany.cnpj,
        email: newCompany.email,
        phone: newCompany.phone,
      },
      {
        onSuccess: () => {
          setIsAdding(false);
          setNewCompany({
            companyName: "",
            username: "",
            password: "",
            cnpj: "",
            email: "",
            phone: "",
          });
          toast({
            title: "Success",
            description: `Company "${newCompany.companyName}" created successfully!`,
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to create company",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleUpdate = () => {
    if (!editingCompany) return;
    updateCompany(
      { id: editingCompany.id, company: editingCompany },
      {
        onSuccess: () => {
          setEditingId(null);
          setEditingCompany(null);
          toast({
            title: "Success",
            description: "Company updated successfully!",
          });
        },
        onError: (error: any) => {
          toast({
            title: "Error",
            description: error.message || "Failed to update company",
            variant: "destructive",
          });
        },
      }
    );
  };

  const handleDelete = (id: number, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"?`)) {
      deleteCompany(id, {
        onSuccess: () => {
          toast({
            title: "Success",
            description: "Company deleted successfully",
          });
        },
        onError: () => {
          toast({
            title: "Error",
            description: "Failed to delete company",
            variant: "destructive",
          });
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center gap-4">
        <h2 className="text-2xl font-bold">Companies</h2>
        <Dialog open={isAdding} onOpenChange={setIsAdding}>
          <DialogTrigger asChild>
            <Button data-testid="button-create-company">
              <Plus className="mr-2 h-4 w-4" /> New Company
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Create New Company</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-4 max-h-[80vh] overflow-y-auto">
              <div className="space-y-2">
                <Label>Company Name *</Label>
                <Input
                  data-testid="input-company-name"
                  value={newCompany.companyName}
                  onChange={(e) =>
                    setNewCompany({
                      ...newCompany,
                      companyName: e.target.value,
                    })
                  }
                  placeholder="e.g., My Supermarket"
                />
              </div>
              <div className="space-y-2">
                <Label>CNPJ *</Label>
                <Input
                  data-testid="input-cnpj"
                  value={newCompany.cnpj}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, cnpj: e.target.value })
                  }
                  placeholder="00.000.000/0000-00"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  data-testid="input-email"
                  type="email"
                  value={newCompany.email}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, email: e.target.value })
                  }
                  placeholder="contact@company.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Phone</Label>
                <Input
                  data-testid="input-phone"
                  value={newCompany.phone}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, phone: e.target.value })
                  }
                  placeholder="+55 11 9999-9999"
                />
              </div>
              <div className="space-y-2">
                <Label>Admin Username *</Label>
                <Input
                  data-testid="input-admin-username"
                  value={newCompany.username}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, username: e.target.value })
                  }
                  placeholder="Enter username (min 3 characters)"
                />
              </div>
              <div className="space-y-2">
                <Label>Admin Password *</Label>
                <Input
                  data-testid="input-admin-password"
                  type="password"
                  value={newCompany.password}
                  onChange={(e) =>
                    setNewCompany({ ...newCompany, password: e.target.value })
                  }
                  placeholder="Enter password (min 6 characters)"
                />
              </div>
              <Button
                data-testid="button-create"
                onClick={handleCreate}
                disabled={isPending}
                className="w-full"
              >
                {isPending ? "Creating..." : "Create Company"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="flex gap-2 items-center">
        <Search className="h-5 w-5 text-muted-foreground" />
        <Input
          data-testid="input-search"
          placeholder="Search by name, CNPJ, email, or username..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="flex-1"
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center py-8">
          <Loader2 className="animate-spin" />
        </div>
      ) : filteredCompanies.length > 0 ? (
        <Card>
          <CardContent className="pt-6">
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Company Name</TableHead>
                    <TableHead>CNPJ</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Username</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredCompanies.map((company) => (
                    <TableRow
                      key={company.id}
                      data-testid={`row-company-${company.id}`}
                    >
                      <TableCell className="font-medium">
                        {company.companyName}
                      </TableCell>
                      <TableCell data-testid={`text-cnpj-${company.id}`}>
                        {company.cnpj}
                      </TableCell>
                      <TableCell data-testid={`text-email-${company.id}`}>
                        {company.email}
                      </TableCell>
                      <TableCell data-testid={`text-phone-${company.id}`}>
                        {company.phone}
                      </TableCell>
                      <TableCell>{company.username}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex gap-2 justify-end">
                          <Dialog
                            open={editingId === company.id}
                            onOpenChange={(open) => !open && setEditingId(null)}
                          >
                            <DialogTrigger asChild>
                              <Button
                                data-testid={`button-edit-${company.id}`}
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                  setEditingId(company.id);
                                  setEditingCompany(company);
                                }}
                              >
                                <Edit2 className="h-4 w-4" />
                              </Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-md">
                              <DialogHeader>
                                <DialogTitle>Edit Company</DialogTitle>
                              </DialogHeader>
                              {editingCompany && (
                                <div className="space-y-3 py-4 max-h-[80vh] overflow-y-auto">
                                  <div className="space-y-2">
                                    <Label>Company Name</Label>
                                    <Input
                                      value={editingCompany.companyName}
                                      onChange={(e) =>
                                        setEditingCompany({
                                          ...editingCompany,
                                          companyName: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>CNPJ</Label>
                                    <Input
                                      value={editingCompany.cnpj}
                                      onChange={(e) =>
                                        setEditingCompany({
                                          ...editingCompany,
                                          cnpj: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Email</Label>
                                    <Input
                                      type="email"
                                      value={editingCompany.email}
                                      onChange={(e) =>
                                        setEditingCompany({
                                          ...editingCompany,
                                          email: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Phone</Label>
                                    <Input
                                      value={editingCompany.phone}
                                      onChange={(e) =>
                                        setEditingCompany({
                                          ...editingCompany,
                                          phone: e.target.value,
                                        })
                                      }
                                    />
                                  </div>
                                  <Button
                                    onClick={handleUpdate}
                                    className="w-full"
                                  >
                                    Save Changes
                                  </Button>
                                </div>
                              )}
                            </DialogContent>
                          </Dialog>
                          <Button
                            data-testid={`button-delete-${company.id}`}
                            variant="destructive"
                            size="sm"
                            onClick={() =>
                              handleDelete(company.id, company.companyName)
                            }
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="pt-6">
            <p className="text-muted-foreground text-center py-8">
              <Building2 className="h-8 w-8 mx-auto mb-2 text-muted-foreground" />
              {companies?.length === 0
                ? 'No companies yet. Click "New Company" to create one.'
                : "No companies match your search."}
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

export default function Manager() {
  const { data: user, isLoading } = useUser();
  const { mutate: logout } = useLogout();

  if (isLoading)
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="animate-spin" />
      </div>
    );
  if (!user || user.role !== "manager") return <ManagerLogin />;

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="container mx-auto px-6 h-16 flex items-center justify-between">
          <h1 className="text-xl font-bold">Manager Dashboard</h1>
          <div className="flex items-center gap-4">
            <span className="text-sm text-muted-foreground">
              Welcome, {user.username}
            </span>
            <Button
              data-testid="button-logout"
              variant="outline"
              size="sm"
              onClick={() => logout()}
            >
              Logout
            </Button>
          </div>
        </div>
      </header>

      <main className="container mx-auto p-6">
        <CompanyList />
      </main>
    </div>
  );
}
