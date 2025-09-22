import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Separator } from "@/components/ui/separator"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
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
  User,
  History
} from "lucide-react"
import { useState, useEffect, useRef } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { Html5QrcodeScanner } from "html5-qrcode"
import { formatCurrency } from "@/lib/currency"
import { InvoiceHistory } from "@/components/pos/invoice-history"

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
  const [paymentMethod, setPaymentMethod] = useState<"card" | "cash" | "digital_wallet">("cash")
  const [paymentReceived, setPaymentReceived] = useState<number>(0)
  const [activeTab, setActiveTab] = useState("pos")
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
    // Check if product is out of stock
    if (product.current_stock <= 0) {
      toast({
        title: "Out of Stock",
        description: `${product.name} is currently out of stock`,
        variant: "destructive"
      })
      return
    }

    const existingItem = cart.find(item => item.product_id === product.id)
    
    if (existingItem) {
      // Check if adding one more would exceed available stock
      if (existingItem.quantity >= product.current_stock) {
        toast({
          title: "Insufficient Stock",
          description: `Only ${product.current_stock} ${product.unit} available for ${product.name}`,
          variant: "destructive"
        })
        return
      }
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
    const item = cart.find(cartItem => cartItem.id === id)
    if (!item) return

    const product = products.find(p => p.id === item.product_id)
    if (!product) return

    const newQuantity = item.quantity + change

    // Check stock limits when increasing quantity
    if (change > 0 && newQuantity > product.current_stock) {
      toast({
        title: "Insufficient Stock",
        description: `Only ${product.current_stock} ${product.unit} available for ${product.name}`,
        variant: "destructive"
      })
      return
    }

    setCart(cart.map(cartItem => 
      cartItem.id === id 
        ? { ...cartItem, quantity: Math.max(0, newQuantity) }
        : cartItem
    ).filter(cartItem => cartItem.quantity > 0))
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

      // Get customer info for invoice
      const customer = selectedCustomer ? customers.find(c => c.id === selectedCustomer) : null

      // Create sale
      const { data: sale, error: saleError } = await supabase
        .from('sales')
        .insert({
          sale_number: saleNumberData,
          customer_id: selectedCustomer || null,
          customer_name: customer?.name || null,
          customer_phone: customer?.phone || null,
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
        title: "Sale completed successfully",
        description: `Invoice ${sale.sale_number} generated - PKR ${formatCurrency(total, { decimals: 0 })}`
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
          <p className="text-muted-foreground">Process customer transactions and manage invoices</p>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="space-y-6">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="pos" className="flex items-center gap-2">
            <CreditCard className="h-4 w-4" />
            POS Terminal
          </TabsTrigger>
          <TabsTrigger value="invoices" className="flex items-center gap-2">
            <History className="h-4 w-4" />
            Invoice History
          </TabsTrigger>
        </TabsList>

        <TabsContent value="pos" className="space-y-6">
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
                      <p className="text-primary font-semibold">{formatCurrency(product.unit_price)}</p>
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
                            placeholder="+92-xxx-xxxxxxx"
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
                        <p className="text-xs text-muted-foreground">{formatCurrency(item.price)} per {item.unit}</p>
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
                  {cart.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      No items in cart
                    </div>
                  )}
                </div>

                {/* Order Summary */}
                <div className="space-y-3 pt-4 border-t">
                  <div className="flex justify-between text-sm">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(subtotal)}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span>Tax (8%):</span>
                    <span>{formatCurrency(tax)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg">
                    <span>Total:</span>
                    <span>{formatCurrency(total)}</span>
                  </div>
                  {change > 0 && (
                    <div className="flex justify-between text-sm text-success">
                      <span>Change:</span>
                      <span>{formatCurrency(change)}</span>
                    </div>
                  )}
                </div>

                {/* Payment */}
                <div className="space-y-3">
                  <div>
                    <Label>Payment Method</Label>
                    <Select value={paymentMethod} onValueChange={(value: any) => setPaymentMethod(value)}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="cash">
                          <div className="flex items-center gap-2">
                            <Banknote className="h-4 w-4" />
                            Cash
                          </div>
                        </SelectItem>
                        <SelectItem value="card">
                          <div className="flex items-center gap-2">
                            <CreditCard className="h-4 w-4" />
                            Card
                          </div>
                        </SelectItem>
                        <SelectItem value="digital_wallet">
                          <div className="flex items-center gap-2">
                            <Smartphone className="h-4 w-4" />
                            EasyPaisa/JazzCash
                          </div>
                        </SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                   <div>
                     <Label>Payment Received ({formatCurrency(0, { showSymbol: true, decimals: 0 })})</Label>
                     <Input
                       type="number"
                       min="0"
                       step="1"
                       value={paymentReceived || ""}
                       onChange={(e) => setPaymentReceived(parseFloat(e.target.value) || 0)}
                       placeholder="Enter amount in PKR"
                       className="text-right"
                     />
                     {paymentReceived > 0 && (
                       <p className="text-sm text-muted-foreground mt-1">
                         Amount: {formatCurrency(paymentReceived, { decimals: 0 })}
                       </p>
                     )}
                   </div>
                </div>

                {/* Process Sale Button */}
                <Button 
                  onClick={processSale}
                  disabled={cart.length === 0 || paymentReceived < total}
                  className="w-full"
                  size="lg"
                >
                  <Receipt className="h-4 w-4 mr-2" />
                  Process Sale
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="invoices">
          <InvoiceHistory />
        </TabsContent>
      </Tabs>

      {/* Invoice Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-center">Sale Complete!</DialogTitle>
            <DialogDescription className="text-center">
              Transaction processed successfully
            </DialogDescription>
          </DialogHeader>
               {lastSale && (
                 <div className="space-y-4">
                   <div className="text-center">
                     <div className="text-2xl font-bold text-primary mb-2">
                       Invoice #{lastSale.sale_number}
                     </div>
                     <div className="space-y-2 text-sm">
                       <div className="grid grid-cols-2 gap-2">
                         <p><strong>Date:</strong></p>
                         <p className="text-right">{new Date(lastSale.created_at).toLocaleDateString('en-PK')}</p>
                         
                         <p><strong>Time:</strong></p>
                         <p className="text-right">{new Date(lastSale.created_at).toLocaleTimeString('en-PK')}</p>
                         
                         <p><strong>Payment:</strong></p>
                         <p className="text-right">{lastSale.payment_method.toUpperCase()}</p>
                         
                         <p><strong>Total:</strong></p>
                         <p className="text-right font-bold text-primary">{formatCurrency(lastSale.total_amount, { decimals: 0 })}</p>
                         
                         <p><strong>Paid:</strong></p>
                         <p className="text-right">{formatCurrency(lastSale.payment_received, { decimals: 0 })}</p>
                         
                         {lastSale.change_amount > 0 && (
                           <>
                             <p><strong>Change:</strong></p>
                             <p className="text-right text-success">{formatCurrency(lastSale.change_amount, { decimals: 0 })}</p>
                           </>
                         )}
                       </div>
                     </div>
                   </div>
                   
                   <Separator />
                   
                   <div className="flex gap-2">
                     <Button 
                       variant="outline" 
                       className="flex-1"
                       onClick={() => setActiveTab("invoices")}
                     >
                       View All Invoices
                     </Button>
                     <Button 
                       variant="default" 
                       className="flex-1"
                       onClick={() => setShowInvoiceDialog(false)}
                     >
                       New Sale
                     </Button>
                   </div>
                   
                   <div className="text-center">
                     <p className="text-sm text-muted-foreground">Thank you for your business!</p>
                     <p className="text-xs text-muted-foreground mt-1">Keep this receipt for your records</p>
                   </div>
                 </div>
               )}
        </DialogContent>
      </Dialog>
    </div>
  )
}