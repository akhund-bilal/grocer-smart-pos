import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { 
  Search, 
  Scan, 
  Plus, 
  Minus, 
  Trash2, 
  CreditCard,
  Banknote,
  Smartphone,
  UserPlus,
  Receipt,
  User
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Html5QrcodeScanner } from "html5-qrcode"

interface Product {
  id: string
  name: string
  unit_price: number
  current_stock: number
  barcode?: string
  unit: string
}

interface Customer {
  id: string
  name: string
  email?: string
  phone?: string
  address?: string
}

interface CartItem {
  id: string
  name: string
  price: number
  quantity: number
  unit: string
  product_id: string
}

export default function Sales() {
  const [cart, setCart] = useState<CartItem[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [products, setProducts] = useState<Product[]>([])
  const [customers, setCustomers] = useState<Customer[]>([])
  const [selectedCustomer, setSelectedCustomer] = useState<string>("")
  const [newCustomer, setNewCustomer] = useState({ name: "", email: "", phone: "", address: "" })
  const [showScanner, setShowScanner] = useState(false)
  const [showCustomerDialog, setShowCustomerDialog] = useState(false)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [lastSale, setLastSale] = useState<any>(null)
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "digital_wallet">("card")
  const [paymentReceived, setPaymentReceived] = useState<number>(0)
  const scannerRef = useRef<any>(null)
  const { toast } = useToast()

  useEffect(() => {
    fetchProducts()
    fetchCustomers()
  }, [])

  const fetchProducts = async () => {
    const { data, error } = await supabase
      .from('products_public')
      .select('*')
      .order('name')

    if (error) {
      toast({
        title: "Error fetching products",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    setProducts(data || [])
  }

  const fetchCustomers = async () => {
    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .order('name')

    if (error) {
      toast({
        title: "Error fetching customers",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    setCustomers(data || [])
  }

  const startScanner = () => {
    setShowScanner(true)
    setTimeout(() => {
      if (scannerRef.current) {
        const scanner = new Html5QrcodeScanner(
          "qr-reader",
          { fps: 10, qrbox: { width: 250, height: 250 } },
          false
        )

        scanner.render(
          (decodedText) => {
            handleBarcodeScanned(decodedText)
            scanner.clear()
            setShowScanner(false)
          },
          (error) => {
            console.log("Scanner error:", error)
          }
        )

        scannerRef.current = scanner
      }
    }, 100)
  }

  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.clear()
      scannerRef.current = null
    }
    setShowScanner(false)
  }

  const handleBarcodeScanned = (barcode: string) => {
    const product = products.find(p => p.barcode === barcode)
    if (product) {
      addToCart(product)
      toast({
        title: "Product found!",
        description: `${product.name} added to cart`
      })
    } else {
      toast({
        title: "Product not found",
        description: `No product found with barcode: ${barcode}`,
        variant: "destructive"
      })
    }
  }

  const addToCart = (product: Product) => {
    const existingItem = cart.find(item => item.product_id === product.id)
    
    if (existingItem) {
      updateQuantity(existingItem.id, 1)
    } else {
      const newItem: CartItem = {
        id: Math.random().toString(),
        name: product.name,
        price: product.unit_price,
        quantity: 1,
        unit: product.unit,
        product_id: product.id
      }
      setCart([...cart, newItem])
    }
  }

  const updateQuantity = (id: string, change: number) => {
    setCart(cart.map(item => 
      item.id === id 
        ? { ...item, quantity: Math.max(0, item.quantity + change) }
        : item
    ).filter(item => item.quantity > 0))
  }

  const removeItem = (id: string) => {
    setCart(cart.filter(item => item.id !== id))
  }

  const addCustomer = async () => {
    if (!newCustomer.name) {
      toast({
        title: "Name required",
        description: "Customer name is required",
        variant: "destructive"
      })
      return
    }

    const { data, error } = await supabase
      .from('customers')
      .insert(newCustomer)
      .select()
      .single()

    if (error) {
      toast({
        title: "Error adding customer",
        description: error.message,
        variant: "destructive"
      })
      return
    }

    setCustomers([...customers, data])
    setSelectedCustomer(data.id)
    setNewCustomer({ name: "", email: "", phone: "", address: "" })
    setShowCustomerDialog(false)
    toast({
      title: "Customer added",
      description: "Customer has been added successfully"
    })
  }

  const processSale = async () => {
    if (cart.length === 0) return

    try {
      // Generate sale number
      const { data: saleNumberData, error: saleNumberError } = await supabase
        .rpc('generate_sale_number')

      if (saleNumberError) throw saleNumberError

      const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
      const tax = subtotal * 0.08
      const total = subtotal + tax
      const change = paymentReceived - total

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumberData,
          customer_id: selectedCustomer || null,
          subtotal,
          tax_amount: tax,
          total_amount: total,
          payment_method: paymentMethod,
          payment_received: paymentReceived,
          change_amount: change,
          cashier_id: (await supabase.auth.getUser()).data.user?.id
        })
        .select()
        .single()

      if (saleError) throw saleError

      // Create sale items
      const saleItems = cart.map(item => ({
        sale_id: sale.id,
        product_id: item.product_id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.price,
        total_price: item.price * item.quantity
      }))

      const { error: itemsError } = await supabase
        .from('sale_items')
        .insert(saleItems)

      if (itemsError) throw itemsError

      // Update stock
      for (const item of cart) {
        await supabase.rpc('update_product_stock', {
          product_id: item.product_id,
          quantity_change: -item.quantity,
          movement_type: 'sale',
          reference_type: 'sale',
          reference_id: sale.id
        })
      }

      setLastSale(sale)
      setCart([])
      setSelectedCustomer("")
      setPaymentReceived(0)
      setShowInvoiceDialog(true)
      fetchProducts() // Refresh products to update stock

      toast({
        title: "Sale completed",
        description: `Sale ${sale.sale_number} processed successfully`
      })

    } catch (error: any) {
      toast({
        title: "Error processing sale",
        description: error.message,
        variant: "destructive"
      })
    }
  }

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (product.barcode && product.barcode.includes(searchQuery))
  )

  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0)
  const tax = subtotal * 0.08
  const total = subtotal + tax
  const change = paymentReceived - total

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
              <Button variant="outline" size="icon" onClick={startScanner}>
                <Scan className="h-4 w-4" />
              </Button>
            </div>

            {/* Scanner Dialog */}
            {showScanner && (
              <Dialog open={showScanner} onOpenChange={stopScanner}>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Scan Barcode</DialogTitle>
                    <DialogDescription>Point the camera at a barcode to scan</DialogDescription>
                  </DialogHeader>
                  <div id="qr-reader" style={{ width: "100%" }}></div>
                </DialogContent>
              </Dialog>
            )}

            {/* Product Grid */}
            <div className="grid grid-cols-2 md:grid-cols-3 gap-3 max-h-96 overflow-y-auto">
              {filteredProducts.map((product) => (
                <div 
                  key={product.id}
                  className="p-3 border border-border rounded-lg hover:bg-accent transition-colors cursor-pointer"
                  onClick={() => addToCart(product)}
                >
                  <h4 className="font-medium text-sm">{product.name}</h4>
                  <p className="text-primary font-semibold">${product.unit_price}</p>
                  <Badge variant={product.current_stock > 20 ? "default" : "destructive"} className="text-xs">
                    {product.current_stock} in stock
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Shopping Cart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center justify-between">
              Shopping Cart
              <Dialog open={showCustomerDialog} onOpenChange={setShowCustomerDialog}>
                <DialogTrigger asChild>
                  <Button variant="outline" size="sm">
                    <UserPlus className="h-4 w-4 mr-1" />
                    Customer
                  </Button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Add Customer</DialogTitle>
                    <DialogDescription>Add a new customer to the system</DialogDescription>
                  </DialogHeader>
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="customer-name">Name *</Label>
                      <Input
                        id="customer-name"
                        value={newCustomer.name}
                        onChange={(e) => setNewCustomer({...newCustomer, name: e.target.value})}
                        placeholder="Customer name"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-email">Email</Label>
                      <Input
                        id="customer-email"
                        type="email"
                        value={newCustomer.email}
                        onChange={(e) => setNewCustomer({...newCustomer, email: e.target.value})}
                        placeholder="customer@example.com"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-phone">Phone</Label>
                      <Input
                        id="customer-phone"
                        value={newCustomer.phone}
                        onChange={(e) => setNewCustomer({...newCustomer, phone: e.target.value})}
                        placeholder="+1234567890"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-address">Address</Label>
                      <Textarea
                        id="customer-address"
                        value={newCustomer.address}
                        onChange={(e) => setNewCustomer({...newCustomer, address: e.target.value})}
                        placeholder="Customer address"
                      />
                    </div>
                    <Button onClick={addCustomer} className="w-full">
                      Add Customer
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </CardTitle>
            <CardDescription>{cart.length} items</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {/* Customer Selection */}
            <div className="space-y-2">
              <Label>Customer</Label>
              <Select value={selectedCustomer} onValueChange={setSelectedCustomer}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a customer (optional)" />
                </SelectTrigger>
                <SelectContent>
                  {customers.map((customer) => (
                    <SelectItem key={customer.id} value={customer.id}>
                      <div className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {customer.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

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

            {/* Payment Method */}
            <div className="space-y-2">
              <Label>Payment Method</Label>
              <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="card">Card Payment</SelectItem>
                  <SelectItem value="cash">Cash Payment</SelectItem>
                  <SelectItem value="digital_wallet">Digital Wallet</SelectItem>
                </SelectContent>
              </Select>
            </div>

            {/* Payment Received */}
            <div className="space-y-2">
              <Label>Payment Received</Label>
              <Input
                type="number"
                step="0.01"
                value={paymentReceived}
                onChange={(e) => setPaymentReceived(Number(e.target.value))}
                placeholder="0.00"
              />
              {paymentReceived > 0 && (
                <p className="text-sm text-muted-foreground">
                  Change: ${change.toFixed(2)}
                </p>
              )}
            </div>

            {/* Process Sale Button */}
            <Button 
              className="w-full bg-gradient-primary" 
              disabled={cart.length === 0 || paymentReceived < total}
              onClick={processSale}
            >
              <Receipt className="h-4 w-4 mr-2" />
              Process Sale (${total.toFixed(2)})
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Sale Invoice</DialogTitle>
            <DialogDescription>Transaction completed successfully</DialogDescription>
          </DialogHeader>
          {lastSale && (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              <div className="text-center border-b pb-4">
                <h2 className="text-xl font-bold">POS System</h2>
                <p className="text-sm text-muted-foreground">Sales Receipt</p>
                <p className="text-sm">Sale #{lastSale.sale_number}</p>
                <p className="text-xs">{new Date(lastSale.created_at).toLocaleString()}</p>
              </div>

              {selectedCustomer && (
                <div className="border-b pb-2">
                  <h3 className="font-semibold">Customer:</h3>
                  <p className="text-sm">{customers.find(c => c.id === selectedCustomer)?.name}</p>
                </div>
              )}

              <div className="space-y-2">
                <h3 className="font-semibold">Items:</h3>
                {cart.map((item) => (
                  <div key={item.id} className="flex justify-between text-sm">
                    <span>{item.name} (×{item.quantity})</span>
                    <span>${(item.price * item.quantity).toFixed(2)}</span>
                  </div>
                ))}
              </div>

              <div className="border-t pt-2 space-y-1">
                <div className="flex justify-between">
                  <span>Subtotal:</span>
                  <span>${lastSale.subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Tax:</span>
                  <span>${lastSale.tax_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between font-bold">
                  <span>Total:</span>
                  <span>${lastSale.total_amount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Payment Received:</span>
                  <span>${lastSale.payment_received.toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span>Change:</span>
                  <span>${lastSale.change_amount.toFixed(2)}</span>
                </div>
              </div>

              <div className="text-center pt-4 border-t">
                <p className="text-sm">Thank you for your business!</p>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  )
}