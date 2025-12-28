import { useCart } from "@/hooks/use-cart";
import { useCreateOrder } from "@/hooks/use-orders";
import { Navbar } from "@/components/Navbar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { useToast } from "@/hooks/use-toast";
import { useLocation } from "wouter";
import { useState } from "react";
import { QRCodeSVG } from "qrcode.react";
import { CreditCard, Banknote, QrCode, Loader2 } from "lucide-react";

export default function Checkout() {
  const { items, total, clearCart } = useCart();
  const { mutate: createOrder, isPending } = useCreateOrder();
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const [step, setStep] = useState(1);
  const [formData, setFormData] = useState({
    name: "",
    paymentMethod: "credit",
  });

  const handleSubmit = () => {
    if (!formData.name) {
      toast({ title: "Name required", description: "Please enter your name", variant: "destructive" });
      return;
    }

    createOrder(
      {
        customerName: formData.name,
        totalAmount: total(),
        paymentMethod: formData.paymentMethod,
        items: items.map(i => ({ productId: i.id, quantity: i.quantity })),
      },
      {
        onSuccess: (order) => {
          clearCart();
          navigate(`/success/${order.pickupCode}`);
        },
        onError: () => {
          toast({ title: "Error", description: "Something went wrong", variant: "destructive" });
        },
      }
    );
  };

  if (items.length === 0) {
    navigate("/");
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />

      <main className="container mx-auto px-4 py-8 max-w-2xl">
        <div className="mb-8">
          <div className="flex items-center justify-between text-sm font-medium text-muted-foreground mb-2">
            <span>Information</span>
            <span>Payment</span>
            <span>Confirmation</span>
          </div>
          <div className="h-2 bg-muted rounded-full overflow-hidden">
            <div 
              className="h-full bg-primary transition-all duration-500"
              style={{ width: step === 1 ? "50%" : "100%" }}
            />
          </div>
        </div>

        {step === 1 && (
          <div className="space-y-6 animate-enter">
            <h1 className="text-3xl font-display font-bold">Your Details</h1>
            <div className="space-y-2">
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                placeholder="John Doe"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                className="h-12 text-lg"
              />
            </div>
            
            <h2 className="text-xl font-display font-bold pt-4">Payment Method</h2>
            <RadioGroup
              value={formData.paymentMethod}
              onValueChange={(val) => setFormData({ ...formData, paymentMethod: val })}
              className="grid grid-cols-1 gap-4"
            >
              <div className={`border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${formData.paymentMethod === 'credit' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}>
                <RadioGroupItem value="credit" id="credit" />
                <Label htmlFor="credit" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <div className="p-2 bg-background rounded-md shadow-sm">
                    <CreditCard className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Credit Card</span>
                </Label>
              </div>

              <div className={`border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${formData.paymentMethod === 'debit' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}>
                <RadioGroupItem value="debit" id="debit" />
                <Label htmlFor="debit" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <div className="p-2 bg-background rounded-md shadow-sm">
                    <Banknote className="w-5 h-5 text-primary" />
                  </div>
                  <span className="font-medium">Debit Card</span>
                </Label>
              </div>

              <div className={`border rounded-xl p-4 flex items-center gap-4 cursor-pointer transition-all ${formData.paymentMethod === 'pix' ? 'border-primary bg-primary/5 ring-1 ring-primary' : 'hover:border-primary/50'}`}>
                <RadioGroupItem value="pix" id="pix" />
                <Label htmlFor="pix" className="flex-1 flex items-center gap-3 cursor-pointer">
                  <div className="p-2 bg-background rounded-md shadow-sm">
                    <QrCode className="w-5 h-5 text-primary" />
                  </div>
                  <div className="flex flex-col">
                    <span className="font-medium">Pix</span>
                    <span className="text-xs text-muted-foreground">Instant approval</span>
                  </div>
                </Label>
              </div>
            </RadioGroup>

            <Button 
              className="w-full h-12 text-lg font-bold mt-8"
              onClick={() => {
                if (!formData.name) {
                  toast({ title: "Name required", variant: "destructive" });
                  return;
                }
                setStep(2);
              }}
            >
              Continue to Payment
            </Button>
          </div>
        )}

        {step === 2 && (
          <div className="animate-enter">
            {formData.paymentMethod === 'pix' ? (
              <div className="text-center space-y-6">
                <h2 className="text-2xl font-bold">Scan to Pay</h2>
                <div className="bg-white p-6 rounded-2xl shadow-lg w-fit mx-auto">
                  <QRCodeSVG value={`paycollect-order-${Date.now()}`} size={200} />
                </div>
                <p className="text-muted-foreground">
                  Open your bank app and scan the QR code to pay.
                </p>
                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1" 
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    I've Paid
                  </Button>
                </div>
              </div>
            ) : (
              <div className="space-y-6">
                <h2 className="text-2xl font-bold">Card Details</h2>
                <div className="grid gap-4 p-6 border rounded-xl bg-card">
                  <div className="space-y-2">
                    <Label>Card Number</Label>
                    <Input placeholder="0000 0000 0000 0000" />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Expiry Date</Label>
                      <Input placeholder="MM/YY" />
                    </div>
                    <div className="space-y-2">
                      <Label>CVV</Label>
                      <Input placeholder="123" />
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label>Cardholder Name</Label>
                    <Input placeholder="JOHN DOE" />
                  </div>
                </div>

                <div className="flex gap-4">
                  <Button variant="outline" className="flex-1" onClick={() => setStep(1)}>
                    Back
                  </Button>
                  <Button 
                    className="flex-1 bg-gradient-to-r from-primary to-blue-600" 
                    onClick={handleSubmit}
                    disabled={isPending}
                  >
                    {isPending ? <Loader2 className="animate-spin w-4 h-4 mr-2" /> : null}
                    Pay ${total().toFixed(2)}
                  </Button>
                </div>
              </div>
            )}
          </div>
        )}
      </main>
    </div>
  );
}
