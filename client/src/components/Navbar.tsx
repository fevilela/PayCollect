import { Link, useLocation } from "wouter";
import { ShoppingCart, LayoutDashboard, Store, ScanBarcode } from "lucide-react";
import { useCart } from "@/hooks/use-cart";
import { Button } from "@/components/ui/button";

export function Navbar() {
  const [location] = useLocation();
  const items = useCart((state) => state.items);
  const itemCount = items.reduce((acc, item) => acc + item.quantity, 0);

  // Don't show navbar on validation station or admin login
  if (location.startsWith("/station") || location === "/admin/login") return null;

  return (
    <nav className="sticky top-0 z-50 w-full border-b bg-background/80 backdrop-blur-md">
      <div className="container mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
            <span className="text-white font-bold text-xl">P</span>
          </div>
          <span className="text-xl font-display font-bold text-foreground">
            PayCollect
          </span>
        </Link>

        <div className="flex items-center gap-4">
          <Link href="/station">
            <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
              <ScanBarcode className="w-4 h-4" />
              <span>Station</span>
            </Button>
          </Link>

          <Link href="/admin">
            <Button variant="ghost" size="sm" className="hidden md:flex gap-2">
              <LayoutDashboard className="w-4 h-4" />
              <span>Admin</span>
            </Button>
          </Link>

          <Link href="/cart">
            <Button variant="default" size="sm" className="relative gap-2">
              <ShoppingCart className="w-4 h-4" />
              <span className="hidden sm:inline">Cart</span>
              {itemCount > 0 && (
                <span className="absolute -top-2 -right-2 w-5 h-5 rounded-full bg-accent text-accent-foreground text-xs font-bold flex items-center justify-center border-2 border-background">
                  {itemCount}
                </span>
              )}
            </Button>
          </Link>
        </div>
      </div>
    </nav>
  );
}
