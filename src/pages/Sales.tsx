import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { 
  Search, 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Banknote,
  Smartphone
} from "lucide-react"
import { useState } from "react"

// Mock cart data
const initialCart = [
  { id: 1, name: "Organic Bananas", price: 2.99, quantity: 2, unit: "kg" },
  { id: 2, name: "Whole Milk", price: 4.49, quantity: 1, unit: "bottle" },
  { id: 3, name: "White Bread", price: 2.29, quantity: 1, unit: "loaf" }
]

export default function Sales() {
  const [cart, setCart] = useState(initialCart)
  const [searchQuery, setSearchQuery] = useState("")

  const updateQuantity = (id: number, change: number) => {
    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0))
  }

  const removeItem = (id: number) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * 0.08 // 8% tax
  const total = subtotal + tax

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Point of Sale</h1>
          <p className="text-muted-foreground">Process customer transactions quickly and efficiently</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Search & Selection */}
        <Card className="lg:col-span-2 shadow-card">
          <CardHeader>
            <CardTitle>Product Search</CardTitle>
            <CardDescription>Search and add items to cart</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Search Bar */}
            <div className="flex gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                <Input
                  placeholder="Search products by name or scan barcode..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Button variant="outline" size="icon">
                <Scan className="h-4 w-4" />
              </Button>
            </div>

            {/* Product Grid - Mock items */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
              {[
                { name: "Apple Juice", price: 3.99, stock: 45 },
                { name: "Chicken Breast", price: 8.99, stock: 23 },
                { name: "Brown Rice", price: 4.49, stock: 67 },
                { name: "Greek Yogurt", price: 5.99, stock: 34 },
                { name: "Pasta Sauce", price: 2.89, stock: 78 },
                { name: "Fresh Spinach", price: 3.49, stock: 12 }
              ].map((product, index) => (
                <div 
                  key={index}
                  className="p-3 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => {
                    const newId = Math.max(...cart.map(item => item.id), 0) + 1
                    setCart([...cart, { 
                      id: newId, 
                      name: product.name, 
                      price: product.price, 
                      quantity: 1, 
                      unit: "item" 
                    }])
                  }}
                >
                  <h4 className="font-medium text-sm">{product.name}</h4>
                  <p className="text-primary font-semibold">${product.price}</p>
                  <Badge variant={product.stock > 20 ? "default" : "destructive"} className="text-xs">
                    {product.stock} in stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shopping Cart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Shopping Cart</CardTitle>
            <CardDescription>{cart.length} items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Cart Items */}
            <div className="space-y-3 max-h-64 overflow-y-auto">
              {cart.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 rounded-lg bg-muted/30">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-sm truncate">{item.name}</p>
                    <p className="text-xs text-muted-foreground">${item.price} per {item.unit}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, -1)}
                      className="h-6 w-6 p-0"
                    >
                      <Minus className="h-3 w-3" />
                    </Button>
                    <span className="w-8 text-center text-sm font-medium">{item.quantity}</span>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateQuantity(item.id, 1)}
                      className="h-6 w-6 p-0"
                    >
                      <Plus className="h-3 w-3" />
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => removeItem(item.id)}
                      className="h-6 w-6 p-0 ml-1"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            <Separator />

            {/* Order Summary */}
            <div className="space-y-2 text-sm">
              <div className="flex justify-between">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between">
                <span>Tax (8%):</span>
                <span>${tax.toFixed(2)}</span>
              </div>
              <Separator />
              <div className="flex justify-between font-bold text-lg">
                <span>Total:</span>
                <span className="text-primary">${total.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Buttons */}
            <div className="space-y-2">
              <Button className="w-full bg-gradient-primary" disabled={cart.length === 0}>
                <CreditCard className="h-4 w-4 mr-2" />
                Card Payment
              </Button>
              <Button variant="outline" className="w-full" disabled={cart.length === 0}>
                <Banknote className="h-4 w-4 mr-2" />
                Cash Payment
              </Button>
              <Button variant="outline" className="w-full" disabled={cart.length === 0}>
                <Smartphone className="h-4 w-4 mr-2" />
                Digital Wallet
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}