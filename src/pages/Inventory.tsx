import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { 
  Search, 
  Plus, 
  Package, 
  AlertTriangle,
  TrendingUp,
  Edit,
  Trash2,
  Download,
  Upload
} from "lucide-react"
import { useState } from "react"
import { StatsCard } from "@/components/ui/stats-card"

// Mock inventory data
const inventoryItems = [
  { id: 1, name: "Organic Bananas", category: "Produce", price: 2.99, stock: 5, minimum: 20, maximum: 100, unit: "kg", status: "low" },
  { id: 2, name: "Whole Milk", category: "Dairy", price: 4.49, stock: 45, minimum: 50, maximum: 200, unit: "bottles", status: "normal" },
  { id: 3, name: "White Bread", category: "Bakery", price: 2.29, stock: 78, minimum: 25, maximum: 150, unit: "loaves", status: "normal" },
  { id: 4, name: "Chicken Breast", category: "Meat", price: 8.99, stock: 0, minimum: 30, maximum: 80, unit: "kg", status: "out" },
  { id: 5, name: "Apple Juice", category: "Beverages", price: 3.99, stock: 156, minimum: 40, maximum: 120, unit: "bottles", status: "over" },
  { id: 6, name: "Greek Yogurt", category: "Dairy", price: 5.99, stock: 34, minimum: 30, maximum: 100, unit: "containers", status: "normal" }
]

const inventoryStats = {
  totalItems: 1429,
  totalValue: 45678.90,
  lowStock: 23,
  outOfStock: 8
}

export default function Inventory() {
  const [searchQuery, setSearchQuery] = useState("")
  const [selectedCategory, setSelectedCategory] = useState("all")

  const categories = ["all", "Produce", "Dairy", "Bakery", "Meat", "Beverages"]

  const filteredItems = inventoryItems.filter(item => {
    const matchesSearch = item.name.toLowerCase().includes(searchQuery.toLowerCase())
    const matchesCategory = selectedCategory === "all" || item.category === selectedCategory
    return matchesSearch && matchesCategory
  })

  const getStatusColor = (status: string) => {
    switch (status) {
      case "low": return "warning"
      case "out": return "destructive"
      case "over": return "secondary"
      default: return "default"
    }
  }

  const getStatusLabel = (status: string) => {
    switch (status) {
      case "low": return "Low Stock"
      case "out": return "Out of Stock"
      case "over": return "Overstock"
      default: return "Normal"
    }
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
          <Button variant="outline">
            <Upload className="h-4 w-4 mr-2" />
            Import Items
          </Button>
          <Button variant="outline">
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Button className="bg-gradient-primary">
            <Plus className="h-4 w-4 mr-2" />
            Add Item
          </Button>
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
              {categories.map((category) => (
                <Button
                  key={category}
                  variant={selectedCategory === category ? "default" : "outline"}
                  size="sm"
                  onClick={() => setSelectedCategory(category)}
                  className="capitalize"
                >
                  {category}
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
                {filteredItems.map((item) => (
                  <tr key={item.id} className="border-b border-border hover:bg-muted/30 transition-colors">
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{item.name}</p>
                        <p className="text-sm text-muted-foreground">ID: {item.id}</p>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant="outline">{item.category}</Badge>
                    </td>
                    <td className="p-3">
                      <span className="font-medium">${item.price}</span>
                      <span className="text-sm text-muted-foreground ml-1">per {item.unit}</span>
                    </td>
                    <td className="p-3">
                      <div>
                        <p className="font-medium">{item.stock} {item.unit}</p>
                        <div className="flex items-center text-xs text-muted-foreground mt-1">
                          <span>Min: {item.minimum}</span>
                          <span className="mx-2">•</span>
                          <span>Max: {item.maximum}</span>
                        </div>
                      </div>
                    </td>
                    <td className="p-3">
                      <Badge variant={getStatusColor(item.status) as any}>
                        {getStatusLabel(item.status)}
                      </Badge>
                    </td>
                    <td className="p-3">
                      <div className="flex gap-2">
                        <Button size="sm" variant="outline">
                          <Edit className="h-4 w-4" />
                        </Button>
                        <Button size="sm" variant="outline">
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}