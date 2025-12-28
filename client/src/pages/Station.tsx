import { useState, useRef, useEffect } from "react";
import { useOrderByCode, useUpdateOrderStatus } from "@/hooks/use-orders";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Check, Search, Package, AlertCircle, RefreshCw } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Loader2 } from "lucide-react";

export default function Station() {
  const [inputCode, setInputCode] = useState("");
  const [activeCode, setActiveCode] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { data: order, isLoading, error } = useOrderByCode(activeCode);
  const { mutate: updateStatus, isPending } = useUpdateOrderStatus();
  const { toast } = useToast();

  const handleSearch = (e?: React.FormEvent) => {
    e?.preventDefault();
    if (inputCode.length < 4) return;
    setActiveCode(inputCode);
  };

  const handleComplete = () => {
    if (!order) return;
    
    updateStatus(
      { id: order.id, status: "collected" },
      {
        onSuccess: () => {
          toast({ title: "Success", description: "Order marked as collected" });
          setInputCode("");
          setActiveCode("");
          inputRef.current?.focus();
        },
      }
    );
  };

  // Auto-focus input for barcode scanners
  useEffect(() => {
    inputRef.current?.focus();
    const interval = setInterval(() => inputRef.current?.focus(), 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <header className="bg-slate-900 text-white p-4 shadow-lg">
        <div className="container mx-auto flex justify-between items-center">
          <div className="flex items-center gap-3">
            <Package className="w-6 h-6 text-emerald-400" />
            <h1 className="font-bold text-xl tracking-tight">Pickup Station</h1>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            System Online
          </div>
        </div>
      </header>

      <main className="flex-1 container mx-auto p-4 md:p-8 max-w-4xl">
        <div className="bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
          <div className="p-8 border-b border-slate-100 bg-slate-50/50">
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 w-6 h-6" />
                <Input
                  ref={inputRef}
                  value={inputCode}
                  onChange={(e) => setInputCode(e.target.value)}
                  placeholder="Scan or type pickup code..."
                  className="pl-14 h-16 text-2xl font-mono tracking-widest uppercase bg-white border-2 border-slate-200 focus-visible:ring-emerald-500 focus-visible:border-emerald-500"
                  autoComplete="off"
                />
              </div>
              <Button type="submit" size="lg" className="h-16 px-8 text-lg bg-slate-900 hover:bg-slate-800">
                Verify
              </Button>
            </form>
          </div>

          <div className="p-8 min-h-[400px]">
            {isLoading ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-400 gap-4">
                <Loader2 className="w-12 h-12 animate-spin text-emerald-500" />
                <p>Retrieving order details...</p>
              </div>
            ) : !activeCode ? (
              <div className="flex flex-col items-center justify-center h-full text-slate-300 gap-4">
                <Package className="w-24 h-24" />
                <p className="text-xl">Waiting for scan...</p>
              </div>
            ) : !order ? (
              <div className="flex flex-col items-center justify-center h-full text-red-400 gap-4">
                <AlertCircle className="w-16 h-16" />
                <h3 className="text-xl font-bold text-red-600">Order Not Found</h3>
                <p className="text-slate-500">Code "{activeCode}" does not exist.</p>
                <Button variant="outline" onClick={() => setActiveCode("")}>Try Again</Button>
              </div>
            ) : (
              <div className="animate-enter">
                <div className="flex justify-between items-start mb-8">
                  <div>
                    <h2 className="text-3xl font-bold text-slate-900 mb-2">{order.customerName}</h2>
                    <div className="flex gap-3">
                      <span className="px-3 py-1 bg-slate-100 rounded-full text-sm font-medium text-slate-600 border border-slate-200">
                        Order #{order.id}
                      </span>
                      <span className={`px-3 py-1 rounded-full text-sm font-bold border ${
                        order.status === 'collected' 
                          ? 'bg-green-100 text-green-700 border-green-200' 
                          : 'bg-yellow-100 text-yellow-700 border-yellow-200'
                      }`}>
                        {order.status.toUpperCase()}
                      </span>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-slate-500 mb-1">Total Amount</p>
                    <p className="text-3xl font-bold text-emerald-600">${Number(order.totalAmount).toFixed(2)}</p>
                  </div>
                </div>

                <div className="bg-slate-50 rounded-xl border border-slate-200 p-6 mb-8">
                  <h3 className="font-bold text-slate-700 mb-4 flex items-center gap-2">
                    <Check className="w-5 h-5 text-emerald-500" />
                    Items to Verify
                  </h3>
                  <div className="space-y-4">
                    {order.items.map((item: any, i: number) => (
                      <div key={i} className="flex items-center gap-4 p-3 bg-white rounded-lg border border-slate-200 shadow-sm">
                        <div className="w-12 h-12 bg-slate-100 rounded-md flex items-center justify-center font-bold text-slate-400">
                          {item.quantity}x
                        </div>
                        <div className="flex-1">
                          <p className="font-bold text-slate-800">{item.product.name}</p>
                          <p className="text-sm text-slate-500">{item.product.barcode || "No barcode"}</p>
                        </div>
                        <div className="h-6 w-6 rounded-full border-2 border-slate-200" />
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button 
                    variant="outline" 
                    size="lg" 
                    className="flex-1 h-14"
                    onClick={() => {
                      setInputCode("");
                      setActiveCode("");
                    }}
                  >
                    Cancel
                  </Button>
                  <Button 
                    size="lg" 
                    className="flex-1 h-14 bg-emerald-600 hover:bg-emerald-700 text-lg font-bold shadow-lg shadow-emerald-200"
                    onClick={handleComplete}
                    disabled={order.status === 'collected' || isPending}
                  >
                    {isPending ? <Loader2 className="animate-spin mr-2" /> : <Check className="mr-2" />}
                    {order.status === 'collected' ? 'Already Collected' : 'Complete Pickup'}
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
