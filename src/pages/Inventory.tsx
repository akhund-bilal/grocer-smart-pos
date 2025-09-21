import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Edit,
  Trash2,
  Download,
  Upload,
  Minus,
  RefreshCw
} from "lucide-react"
import ImportExportDialog from "@/components/import-export/ImportExportDialog"
import { useState, useEffect } from "react"
import { StatsCard } from "@/components/ui/stats-card"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"

type Product = Tables<'products'>
type Category = Tables<'categories'>
type Supplier = Tables<'suppliers'>

export default function Inventory() {
  const [products, setProducts] = useState<Product[]>([])
  const [categories, setCategories] = useState<Category[]>([])
  const [suppliers, setSuppliers] = useState<Supplier[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isStockDialogOpen, setIsStockDialogOpen] = useState(false)
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null)
  const [loading, setLoading] = useState(true)
  const [isImportExportOpen, setIsImportExportOpen] = useState(false)
  const { toast } = useToast()

  const [newProduct, setNewProduct] = useState({
    name: "",
    description: "",
    category_id: "",
    supplier_id: "",
    unit_price: "",
    cost_price: "",
    current_stock: "",
    min_stock_threshold: "10",
    max_stock_threshold: "1000",
    unit: "pcs",
    barcode: ""
  })

  const [stockAdjustment, setStockAdjustment] = useState({
    type: "add",
    quantity: "",
    notes: ""
  })

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    try {
      const [productsResult, categoriesResult, suppliersResult] = await Promise.all([
        supabase.from('products').select('*').order('name'),
        supabase.from('categories').select('*').order('name'),
        supabase.from('suppliers').select('*').order('name')
      ])

      if (productsResult.data) setProducts(productsResult.data)
      if (categoriesResult.data) setCategories(categoriesResult.data)
      if (suppliersResult.data) setSuppliers(suppliersResult.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch inventory data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddProduct = async () => {
    try {
      const { error } = await supabase.from('products').insert([{
        ...newProduct,
        unit_price: parseFloat(newProduct.unit_price),
        cost_price: parseFloat(newProduct.cost_price),
        current_stock: parseInt(newProduct.current_stock),
        min_stock_threshold: parseInt(newProduct.min_stock_threshold),
        max_stock_threshold: parseInt(newProduct.max_stock_threshold),
        category_id: newProduct.category_id || null,
        supplier_id: newProduct.supplier_id || null,
        barcode: newProduct.barcode || null
      }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Product added successfully"
      })
      
      setIsAddDialogOpen(false)
      setNewProduct({
        name: "",
        description: "",
        category_id: "",
        supplier_id: "",
        unit_price: "",
        cost_price: "",
        current_stock: "",
        min_stock_threshold: "10",
        max_stock_threshold: "1000",
        unit: "pcs",
        barcode: ""
      })
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add product",
        variant: "destructive"
      })
    }
  }

  const handleStockAdjustment = async () => {
    if (!selectedProduct) return

    try {
      const quantity = parseInt(stockAdjustment.quantity)
      const adjustmentQuantity = stockAdjustment.type === 'add' ? quantity : -quantity

      const { error } = await supabase.rpc('update_product_stock', {
        product_id: selectedProduct.id,
        quantity_change: adjustmentQuantity,
        movement_type: stockAdjustment.type === 'add' ? 'stock_in' : 'stock_out',
        notes: stockAdjustment.notes || null
      })

      if (error) throw error

      toast({
        title: "Success",
        description: "Stock updated successfully"
      })
      
      setIsStockDialogOpen(false)
      setStockAdjustment({ type: "add", quantity: "", notes: "" })
      setSelectedProduct(null)
      fetchData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update stock",
        variant: "destructive"
      })
    }
  }

  const filteredProducts = products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || product.category_id === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStockStatus = (product: Product) => {
    if (product.current_stock === 0) return { status: 'out', label: 'Out of Stock', color: 'destructive' }
    if (product.current_stock <= product.min_stock_threshold) return { status: 'low', label: 'Low Stock', color: 'warning' }
    if (product.current_stock >= product.max_stock_threshold) return { status: 'over', label: 'Overstock', color: 'secondary' }
    return { status: 'normal', label: 'Normal', color: 'default' }
  }

  const inventoryStats = {
    totalItems: products.length,
    totalValue: products.reduce((sum, p) => sum + (p.unit_price * p.current_stock), 0),
    lowStock: products.filter(p => p.current_stock <= p.min_stock_threshold && p.current_stock > 0).length,
    outOfStock: products.filter(p => p.current_stock === 0).length
  }

  const exportInventory = () => {
    const csvContent = [
      ['Name', 'Category', 'Unit Price', 'Cost Price', 'Current Stock', 'Unit', 'Status'].join(','),
      ...filteredProducts.map(product => [
        product.name,
        categories.find(c => c.id === product.category_id)?.name || 'N/A',
        product.unit_price,
        product.cost_price,
        product.current_stock,
        product.unit,
        getStockStatus(product).label
      ].join(','))
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'inventory-report.csv'
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Inventory Management</h1>
          <p className="text-muted-foreground">Track and manage your store's inventory</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button variant="outline" onClick={() => setIsImportExportOpen(true)}>
            <Upload className="h-4 w-4 mr-2" />
            Import/Export
          </Button>
          <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle>Add New Product</DialogTitle>
              </DialogHeader>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Product Name</Label>
                  <Input
                    id="name"
                    value={newProduct.name}
                    onChange={(e) => setNewProduct({...newProduct, name: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="barcode">Barcode</Label>
                  <Input
                    id="barcode"
                    value={newProduct.barcode}
                    onChange={(e) => setNewProduct({...newProduct, barcode: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newProduct.category_id} onValueChange={(value) => setNewProduct({...newProduct, category_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {categories.map(category => (
                        <SelectItem key={category.id} value={category.id}>{category.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="supplier">Supplier</Label>
                  <Select value={newProduct.supplier_id} onValueChange={(value) => setNewProduct({...newProduct, supplier_id: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers.map(supplier => (
                        <SelectItem key={supplier.id} value={supplier.id}>{supplier.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit_price">Unit Price</Label>
                  <Input
                    id="unit_price"
                    type="number"
                    step="0.01"
                    value={newProduct.unit_price}
                    onChange={(e) => setNewProduct({...newProduct, unit_price: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="cost_price">Cost Price</Label>
                  <Input
                    id="cost_price"
                    type="number"
                    step="0.01"
                    value={newProduct.cost_price}
                    onChange={(e) => setNewProduct({...newProduct, cost_price: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="current_stock">Initial Stock</Label>
                  <Input
                    id="current_stock"
                    type="number"
                    value={newProduct.current_stock}
                    onChange={(e) => setNewProduct({...newProduct, current_stock: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="unit">Unit</Label>
                  <Input
                    id="unit"
                    value={newProduct.unit}
                    onChange={(e) => setNewProduct({...newProduct, unit: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="min_threshold">Min Threshold</Label>
                  <Input
                    id="min_threshold"
                    type="number"
                    value={newProduct.min_stock_threshold}
                    onChange={(e) => setNewProduct({...newProduct, min_stock_threshold: e.target.value})}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="max_threshold">Max Threshold</Label>
                  <Input
                    id="max_threshold"
                    type="number"
                    value={newProduct.max_stock_threshold}
                    onChange={(e) => setNewProduct({...newProduct, max_stock_threshold: e.target.value})}
                  />
                </div>
                <div className="col-span-2 space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newProduct.description}
                    onChange={(e) => setNewProduct({...newProduct, description: e.target.value})}
                  />
                </div>
              </div>
              <Button onClick={handleAddProduct} className="w-full">Add Product</Button>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          variant="primary"
          title="Total Items"
          value={inventoryStats.totalItems.toLocaleString()}
          subtitle="In inventory"
          icon={<Package className="h-6 w-6" />}
        />
        <StatsCard
          variant="secondary"
          title="Inventory Value"
          value={`$${inventoryStats.totalValue.toLocaleString()}`}
          subtitle="Total value"
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          variant="warning"
          title="Low Stock"
          value={inventoryStats.lowStock}
          subtitle="Items below minimum"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <StatsCard
          variant="destructive"
          title="Out of Stock"
          value={inventoryStats.outOfStock}
          subtitle="Items unavailable"
          icon={<Package className="h-6 w-6" />}
        />
      </div>

      {/* Inventory Table */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Inventory Items</CardTitle>
          <CardDescription>Manage your product inventory and stock levels</CardDescription>
          
          {/* Search and Filters */}
          <div className="flex flex-col sm:flex-row gap-4 pt-4">
            <div className="relative flex-1">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search inventory items..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-10"
              />
            </div>
            <div className="flex gap-2 flex-wrap">
              <Button
                variant={selectedCategory === "all" ? "default" : "outline"}
                size="sm"
                onClick={() => setSelectedCategory("all")}
              >
                All
              </Button>
              {categories.map((category) => (
                <Button
                  key={category.id}
                  variant={selectedCategory === category.id ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category.id)}
                >
                  {category.name}
                </Button>
              ))}
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left p-3 font-medium">Item</th>
                  <th className="text-left p-3 font-medium">Category</th>
                  <th className="text-left p-3 font-medium">Price</th>
                  <th className="text-left p-3 font-medium">Stock</th>
                  <th className="text-left p-3 font-medium">Status</th>
                  <th className="text-left p-3 font-medium">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredProducts.map((product) => {
                  const status = getStockStatus(product)
                  const category = categories.find(c => c.id === product.category_id)
                  
                  return (
                    <tr key={product.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{product.name}</p>
                          <p className="text-sm text-muted-foreground">{product.barcode || 'No barcode'}</p>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant="outline">{category?.name || 'N/A'}</Badge>
                      </td>
                      <td className="p-3">
                        <span className="font-medium">${product.unit_price}</span>
                        <span className="text-sm text-muted-foreground ml-1">per {product.unit}</span>
                      </td>
                      <td className="p-3">
                        <div>
                          <p className="font-medium">{product.current_stock} {product.unit}</p>
                          <div className="flex items-center text-xs text-muted-foreground mt-1">
                            <span>Min: {product.min_stock_threshold}</span>
                            <span className="mx-2">•</span>
                            <span>Max: {product.max_stock_threshold}</span>
                          </div>
                        </div>
                      </td>
                      <td className="p-3">
                        <Badge variant={status.color as any}>
                          {status.label}
                        </Badge>
                      </td>
                      <td className="p-3">
                        <div className="flex gap-2">
                          <Button 
                            size="sm" 
                            variant="outline"
                            onClick={() => {
                              setSelectedProduct(product)
                              setIsStockDialogOpen(true)
                            }}
                          >
                            <Package className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Stock Adjustment Dialog */}
      <Dialog open={isStockDialogOpen} onOpenChange={setIsStockDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Adjust Stock - {selectedProduct?.name}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label>Current Stock: {selectedProduct?.current_stock} {selectedProduct?.unit}</Label>
            </div>
            <div className="space-y-2">
              <Label htmlFor="adjustment_type">Adjustment Type</Label>
              <Select value={stockAdjustment.type} onValueChange={(value) => setStockAdjustment({...stockAdjustment, type: value})}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="add">Add Stock</SelectItem>
                  <SelectItem value="remove">Remove Stock</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="quantity">Quantity</Label>
              <Input
                id="quantity"
                type="number"
                value={stockAdjustment.quantity}
                onChange={(e) => setStockAdjustment({...stockAdjustment, quantity: e.target.value})}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea
                id="notes"
                value={stockAdjustment.notes}
                onChange={(e) => setStockAdjustment({...stockAdjustment, notes: e.target.value})}
                placeholder="Optional notes for this adjustment"
              />
            </div>
            <Button onClick={handleStockAdjustment} className="w-full">
              {stockAdjustment.type === 'add' ? 'Add' : 'Remove'} Stock
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Import/Export Dialog */}
      <ImportExportDialog
        open={isImportExportOpen}
        onOpenChange={setIsImportExportOpen}
        type="products"
      />
    </div>
  )
}