import { StatsCard } from "@/components/ui/stats-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { 
  DollarSign, 
  Package, 
  ShoppingCart, 
  TrendingUp,
  AlertTriangle,
  Plus,
  Scan
} from "lucide-react"
import { formatCurrency } from "@/lib/currency"

// Mock data - will be replaced with real data later
const stats = {
  dailySales: { value: 2847, change: 12.5 },
  totalItems: { value: 1429, change: -2.1 },
  lowStock: { value: 23, change: 0 },
  transactions: { value: 156, change: 8.3 }
}

const recentTransactions = [
  { id: "TXN001", customer: "Walk-in Customer", amount: 45.67, time: "2 min ago" },
  { id: "TXN002", customer: "John Smith", amount: 123.45, time: "5 min ago" },
  { id: "TXN003", customer: "Walk-in Customer", amount: 67.89, time: "12 min ago" },
  { id: "TXN004", customer: "Sarah Johnson", amount: 234.56, time: "18 min ago" }
]

const lowStockItems = [
  { name: "Organic Bananas", current: 5, minimum: 20, unit: "kg" },
  { name: "Whole Milk", current: 12, minimum: 50, unit: "bottles" },
  { name: "White Bread", current: 8, minimum: 25, unit: "loaves" },
  { name: "Chicken Eggs", current: 15, minimum: 30, unit: "dozen" }
]

export function DashboardOverview() {
  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Dashboard</h1>
          <p className="text-muted-foreground">Welcome back! Here's your store overview.</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Button className="bg-gradient-primary border-0 shadow-soft hover:shadow-float transition-all">
            <Plus className="h-4 w-4 mr-2" />
            Quick Sale
          </Button>
          <Button variant="outline" className="border-primary/20 hover:bg-primary/5">
            <Scan className="h-4 w-4 mr-2" />
            Scan Item
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          variant="primary"
          title="Daily Sales"
          value={formatCurrency(stats.dailySales.value, { decimals: 0 })}
          subtitle="Today's revenue"
          icon={<DollarSign className="h-6 w-6" />}
          trend={{ value: stats.dailySales.change, label: "from yesterday" }}
        />
        <StatsCard
          variant="secondary"
          title="Total Items"
          value={stats.totalItems.value.toLocaleString()}
          subtitle="In inventory"
          icon={<Package className="h-6 w-6" />}
          trend={{ value: stats.totalItems.change, label: "from last week" }}
        />
        <StatsCard
          variant="warning"
          title="Low Stock Items"
          value={stats.lowStock.value}
          subtitle="Need attention"
          icon={<AlertTriangle className="h-6 w-6" />}
        />
        <StatsCard
          variant="success"
          title="Transactions"
          value={stats.transactions.value}
          subtitle="Today's count"
          icon={<ShoppingCart className="h-6 w-6" />}
          trend={{ value: stats.transactions.change, label: "from yesterday" }}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Recent Transactions */}
        <Card className="lg:col-span-2 shadow-card hover:shadow-float transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-primary" />
              Recent Transactions
            </CardTitle>
            <CardDescription>Latest sales activity in your store</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors">
                  <div>
                    <p className="font-medium text-foreground">{transaction.id}</p>
                    <p className="text-sm text-muted-foreground">{transaction.customer}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">{formatCurrency(transaction.amount)}</p>
                    <p className="text-xs text-muted-foreground">{transaction.time}</p>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Low Stock Alert */}
        <Card className="shadow-card hover:shadow-float transition-shadow">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-warning" />
              Low Stock Alert
            </CardTitle>
            <CardDescription>Items running low</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {lowStockItems.map((item, index) => (
                <div key={index} className="p-3 rounded-lg border border-warning/20 bg-warning/5">
                  <div className="flex items-center justify-between mb-1">
                    <p className="font-medium text-sm">{item.name}</p>
                    <span className="text-xs font-medium text-warning">
                      {item.current} {item.unit}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-warning h-2 rounded-full transition-all" 
                      style={{ width: `${(item.current / item.minimum) * 100}%` }}
                    />
                  </div>
                  <p className="text-xs text-muted-foreground mt-1">
                    Min: {item.minimum} {item.unit}
                  </p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}