import { useRoute } from "wouter";
import { Navbar } from "@/components/Navbar";
import { CheckCircle2, Copy } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";

export default function Success() {
  const [, params] = useRoute("/success/:code");
  const { toast } = useToast();
  const code = params?.code || "ERROR";

  const copyCode = () => {
    navigator.clipboard.writeText(code);
    toast({ title: "Copied!", description: "Pickup code copied to clipboard." });
  };

  return (
    <div className="min-h-screen bg-background flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col items-center justify-center p-4 text-center">
        <div className="w-full max-w-md space-y-8 animate-enter">
          <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto text-green-600">
            <CheckCircle2 className="w-10 h-10" />
          </div>

          <div>
            <h1 className="text-3xl font-display font-bold mb-2">Order Confirmed!</h1>
            <p className="text-muted-foreground">
              Your order has been successfully placed.
            </p>
          </div>

          <div className="bg-card border rounded-3xl p-8 shadow-xl">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wider mb-4">
              Your Pickup Code
            </p>
            <div 
              className="text-5xl font-mono font-bold tracking-widest text-primary mb-6 break-all"
            >
              {code}
            </div>
            <Button variant="outline" className="gap-2" onClick={copyCode}>
              <Copy className="w-4 h-4" />
              Copy Code
            </Button>
          </div>

          <div className="p-4 bg-blue-50 text-blue-700 rounded-lg text-sm">
            Please show this code at the pickup counter to collect your items.
          </div>
        </div>
      </main>
    </div>
  );
}
