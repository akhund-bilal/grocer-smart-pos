import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  BarChart3, 
  TrendingUp,
  Users,
  ShoppingCart,
  Package,
  Calendar,
  Download,
  Eye
} from "lucide-react"
import { useState, useEffect } from "react"
import { StatsCard } from "@/components/ui/stats-card"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell
} from 'recharts'

type Sale = Tables<'sales'>
type Product = Tables<'products'>

export default function Analytics() {
  const [sales, setSales] = useState<Sale[]>([])
  const [products, setProducts] = useState<Product[]>([])
  const [saleItems, setSaleItems] = useState<any[]>([])
  const [dateRange, setDateRange] = useState("30d")
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAnalyticsData()
  }, [dateRange])

  const getDateFilter = () => {
    const now = new Date()
    const days = parseInt(dateRange.replace('d', ''))
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString()
  }

  const fetchAnalyticsData = async () => {
    try {
      const dateFilter = getDateFilter()
      
      const [salesResult, productsResult, saleItemsResult] = await Promise.all([
        supabase
          .from('sales')
          .select('*')
          .gte('created_at', dateFilter)
          .order('created_at', { ascending: false }),
        supabase
          .from('products')
          .select('*'),
        supabase
          .from('sale_items')
          .select(`
            *,
            sales!inner(created_at)
          `)
          .gte('sales.created_at', dateFilter)
      ])

      if (salesResult.data) setSales(salesResult.data)
      if (productsResult.data) setProducts(productsResult.data)
      if (saleItemsResult.data) setSaleItems(saleItemsResult.data)
    } catch (error) {
      console.error('Failed to fetch analytics data:', error)
    } finally {
      setLoading(false)
    }
  }

  // Calculate analytics stats
  const analyticsStats = {
    totalRevenue: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
    totalTransactions: sales.length,
    averageTransactionValue: sales.length > 0 ? sales.reduce((sum, sale) => sum + sale.total_amount, 0) / sales.length : 0,
    totalItemsSold: saleItems.reduce((sum, item) => sum + item.quantity, 0)
  }

  // Daily sales data for chart
  const dailySalesData = Array.from({ length: parseInt(dateRange.replace('d', '')) }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (parseInt(dateRange.replace('d', '')) - 1 - i))
    const dateStr = date.toISOString().split('T')[0]
    
    const daySales = sales.filter(sale => sale.created_at.split('T')[0] === dateStr)
    const dayRevenue = daySales.reduce((sum, sale) => sum + sale.total_amount, 0)
    const dayTransactions = daySales.length
    
    return {
      date: date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      revenue: dayRevenue,
      transactions: dayTransactions
    }
  })

  // Top selling products
  const productSales = saleItems.reduce((acc, item) => {
    if (!acc[item.product_id]) {
      acc[item.product_id] = {
        product_name: item.product_name,
        quantity: 0,
        revenue: 0
      }
    }
    acc[item.product_id].quantity += item.quantity
    acc[item.product_id].revenue += item.total_price
    return acc
  }, {} as Record<string, { product_name: string; quantity: number; revenue: number }>)

  const topProducts = Object.values(productSales)
    .sort((a, b) => (b as any).quantity - (a as any).quantity)
    .slice(0, 10)

  // Payment method breakdown
  const paymentMethods = sales.reduce((acc, sale) => {
    if (!acc[sale.payment_method]) {
      acc[sale.payment_method] = 0
    }
    acc[sale.payment_method] += 1
    return acc
  }, {} as Record<string, number>)

  const paymentMethodData = Object.entries(paymentMethods).map(([method, count]) => ({
    name: method.charAt(0).toUpperCase() + method.slice(1).replace('_', ' '),
    value: count
  }))

  // Hourly sales pattern
  const hourlySales = Array.from({ length: 24 }, (_, hour) => {
    const hourSales = sales.filter(sale => {
      const saleHour = new Date(sale.created_at).getHours()
      return saleHour === hour
    })
    
    return {
      hour: `${hour}:00`,
      transactions: hourSales.length,
      revenue: hourSales.reduce((sum, sale) => sum + sale.total_amount, 0)
    }
  })

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1']

  const exportAnalyticsReport = () => {
    const report = {
      period: dateRange,
      stats: analyticsStats,
      topProducts: topProducts.slice(0, 5),
      paymentMethods: paymentMethodData,
      generatedAt: new Date().toISOString()
    }

    const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `analytics-report-${dateRange}.json`
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
          <h1 className="text-3xl font-bold text-foreground">Analytics & Intelligence</h1>
          <p className="text-muted-foreground">Business insights and data analytics</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={dateRange} onValueChange={setDateRange}>
            <SelectTrigger className="w-40">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="7d">Last 7 days</SelectItem>
              <SelectItem value="30d">Last 30 days</SelectItem>
              <SelectItem value="90d">Last 90 days</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportAnalyticsReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          variant="primary"
          title="Total Revenue"
          value={`$${analyticsStats.totalRevenue.toLocaleString()}`}
          subtitle={`${dateRange} period`}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          variant="secondary"
          title="Transactions"
          value={analyticsStats.totalTransactions.toLocaleString()}
          subtitle={`${dateRange} period`}
          icon={<ShoppingCart className="h-6 w-6" />}
        />
        <StatsCard
          variant="success"
          title="Avg Transaction"
          value={`$${analyticsStats.averageTransactionValue.toFixed(2)}`}
          subtitle="Per transaction"
          icon={<Users className="h-6 w-6" />}
        />
        <StatsCard
          variant="warning"
          title="Items Sold"
          value={analyticsStats.totalItemsSold.toLocaleString()}
          subtitle={`${dateRange} period`}
          icon={<Package className="h-6 w-6" />}
        />
      </div>

      {/* Charts Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Sales Trend */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Sales Trend
            </CardTitle>
            <CardDescription>Revenue and transaction count over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailySalesData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis yAxisId="left" />
                <YAxis yAxisId="right" orientation="right" />
                <Tooltip />
                <Line yAxisId="left" type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                <Line yAxisId="right" type="monotone" dataKey="transactions" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Payment Methods */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Eye className="h-5 w-5 text-primary" />
              Payment Methods
            </CardTitle>
            <CardDescription>Transaction breakdown by payment type</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={paymentMethodData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {paymentMethodData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Top Selling Products */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Package className="h-5 w-5 text-primary" />
              Top Selling Products
            </CardTitle>
            <CardDescription>Most popular products by quantity sold</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={topProducts.slice(0, 5)} layout="horizontal">
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis type="number" />
                <YAxis dataKey="product_name" type="category" width={120} />
                <Tooltip />
                <Bar dataKey="quantity" fill="#8884d8" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Hourly Sales Pattern */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5 text-primary" />
              Hourly Sales Pattern
            </CardTitle>
            <CardDescription>Transaction activity throughout the day</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={hourlySales}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="hour" />
                <YAxis />
                <Tooltip />
                <Bar dataKey="transactions" fill="#82ca9d" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Detailed Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Products Table */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Top Products Performance</CardTitle>
            <CardDescription>Detailed breakdown of best-selling products</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {topProducts.slice(0, 8).map((product: any, index) => (
                <div key={index} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                  <div className="flex-1">
                    <p className="font-medium">{product.product_name}</p>
                    <p className="text-sm text-muted-foreground">{product.quantity} units sold</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-primary">${product.revenue.toFixed(2)}</p>
                    <p className="text-xs text-muted-foreground">Revenue</p>
                  </div>
                </div>
              ))}
              {topProducts.length === 0 && (
                <div className="text-center py-8 text-muted-foreground">
                  No sales data available for this period
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Performance Summary */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle>Performance Summary</CardTitle>
            <CardDescription>Key insights and metrics</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="p-4 rounded-lg bg-primary/5 border border-primary/20">
                <div className="flex items-center gap-2 mb-2">
                  <TrendingUp className="h-5 w-5 text-primary" />
                  <h4 className="font-semibold">Revenue Growth</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  Total revenue for this period: ${analyticsStats.totalRevenue.toLocaleString()}
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-success/5 border border-success/20">
                <div className="flex items-center gap-2 mb-2">
                  <ShoppingCart className="h-5 w-5 text-success" />
                  <h4 className="font-semibold">Transaction Volume</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {analyticsStats.totalTransactions} transactions completed
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-secondary/5 border border-secondary/20">
                <div className="flex items-center gap-2 mb-2">
                  <Package className="h-5 w-5 text-secondary" />
                  <h4 className="font-semibold">Product Performance</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  {topProducts.length} products sold, {analyticsStats.totalItemsSold} total items
                </p>
              </div>
              
              <div className="p-4 rounded-lg bg-warning/5 border border-warning/20">
                <div className="flex items-center gap-2 mb-2">
                  <Users className="h-5 w-5 text-warning" />
                  <h4 className="font-semibold">Average Value</h4>
                </div>
                <p className="text-sm text-muted-foreground">
                  ${analyticsStats.averageTransactionValue.toFixed(2)} per transaction
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}