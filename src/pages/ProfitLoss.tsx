import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useToast } from "@/hooks/use-toast"
import { 
  TrendingUp,
  TrendingDown,
  DollarSign,
  Download,
  Calendar,
  BarChart3,
  Target,
  Activity
} from "lucide-react"
import { useState, useEffect } from "react"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
import { formatCurrency } from "@/lib/currency"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

type Expense = Tables<'expenses'>
type Sale = Tables<'sales'>
type SaleItem = Tables<'sale_items'>
type Product = Tables<'products'>

interface ProfitLossData {
  period: string
  revenue: number
  cogs: number
  grossProfit: number
  expenses: number
  netProfit: number
  grossMargin: number
  netMargin: number
}

interface RealtimeData {
  totalRevenue: number
  totalCOGS: number
  totalExpenses: number
  grossProfit: number
  netProfit: number
  grossMargin: number
  netMargin: number
  transactionCount: number
}

export default function ProfitLoss() {
  const [timeframe, setTimeframe] = useState("daily")
  const [period, setPeriod] = useState("7d")
  const [loading, setLoading] = useState(true)
  const [realtimeData, setRealtimeData] = useState<RealtimeData | null>(null)
  const [periodData, setPeriodData] = useState<ProfitLossData[]>([])
  const { toast } = useToast()

  useEffect(() => {
    fetchProfitLossData()
    const interval = setInterval(fetchRealtimeData, 30000) // Update every 30 seconds
    return () => clearInterval(interval)
  }, [period, timeframe])

  const getDateRange = () => {
    const now = new Date()
    const days = parseInt(period.replace('d', ''))
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return { startDate: startDate.toISOString(), endDate: now.toISOString() }
  }

  const fetchRealtimeData = async () => {
    try {
      const today = new Date().toISOString().split('T')[0]
      
      // Get today's sales and items
      const { data: sales } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (cost_price)
          )
        `)
        .gte('created_at', today)

      // Get today's expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', today)

      if (sales && expenses) {
        const totalRevenue = sales.reduce((sum, sale) => sum + sale.total_amount, 0)
        const totalCOGS = sales.reduce((sum, sale) => {
          return sum + (sale.sale_items || []).reduce((itemSum: number, item: any) => {
            const costPrice = item.products?.cost_price || 0
            return itemSum + (costPrice * item.quantity)
          }, 0)
        }, 0)
        const totalExpenses = expenses.reduce((sum, expense) => sum + expense.amount, 0)
        const grossProfit = totalRevenue - totalCOGS
        const netProfit = grossProfit - totalExpenses

        setRealtimeData({
          totalRevenue,
          totalCOGS,
          totalExpenses,
          grossProfit,
          netProfit,
          grossMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
          netMargin: totalRevenue > 0 ? (netProfit / totalRevenue) * 100 : 0,
          transactionCount: sales.length
        })
      }
    } catch (error) {
      console.error('Error fetching realtime data:', error)
    }
  }

  const fetchProfitLossData = async () => {
    try {
      setLoading(true)
      const { startDate } = getDateRange()
      
      // Get sales with items and product cost data
      const { data: sales } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            *,
            products (cost_price)
          )
        `)
        .gte('created_at', startDate)
        .order('created_at', { ascending: true })

      // Get expenses
      const { data: expenses } = await supabase
        .from('expenses')
        .select('*')
        .gte('expense_date', startDate)

      if (sales && expenses) {
        const data = generatePeriodData(sales, expenses)
        setPeriodData(data)
        await fetchRealtimeData()
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch profit & loss data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const generatePeriodData = (sales: any[], expenses: Expense[]): ProfitLossData[] => {
    const periods = getPeriods()
    
    return periods.map(periodInfo => {
      const periodSales = sales.filter(sale => 
        isInPeriod(sale.created_at, periodInfo.start, periodInfo.end)
      )
      const periodExpenses = expenses.filter(expense => 
        isInPeriod(expense.expense_date, periodInfo.start, periodInfo.end)
      )

      const revenue = periodSales.reduce((sum, sale) => sum + sale.total_amount, 0)
      const cogs = periodSales.reduce((sum, sale) => {
        return sum + (sale.sale_items || []).reduce((itemSum: number, item: any) => {
          const costPrice = item.products?.cost_price || 0
          return itemSum + (costPrice * item.quantity)
        }, 0)
      }, 0)
      const expenseTotal = periodExpenses.reduce((sum, expense) => sum + expense.amount, 0)
      const grossProfit = revenue - cogs
      const netProfit = grossProfit - expenseTotal

      return {
        period: periodInfo.label,
        revenue,
        cogs,
        grossProfit,
        expenses: expenseTotal,
        netProfit,
        grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
        netMargin: revenue > 0 ? (netProfit / revenue) * 100 : 0
      }
    })
  }

  const getPeriods = () => {
    const periods = []
    const now = new Date()
    const periodCount = timeframe === 'daily' ? 7 : timeframe === 'weekly' ? 4 : 12

    for (let i = periodCount - 1; i >= 0; i--) {
      let start, end, label

      if (timeframe === 'daily') {
        start = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000))
        end = new Date(start.getTime() + (24 * 60 * 60 * 1000))
        label = start.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
      } else if (timeframe === 'weekly') {
        start = new Date(now.getTime() - ((i + 1) * 7 * 24 * 60 * 60 * 1000))
        end = new Date(now.getTime() - (i * 7 * 24 * 60 * 60 * 1000))
        label = `Week ${i + 1}`
      } else { // monthly
        start = new Date(now.getFullYear(), now.getMonth() - i, 1)
        end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0)
        label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' })
      }

      periods.push({ start: start.toISOString(), end: end.toISOString(), label })
    }

    return periods
  }

  const isInPeriod = (dateStr: string, start: string, end: string) => {
    const date = new Date(dateStr).getTime()
    return date >= new Date(start).getTime() && date < new Date(end).getTime()
  }

  const exportReport = () => {
    const csvContent = [
      ['Period', 'Revenue', 'COGS', 'Gross Profit', 'Expenses', 'Net Profit', 'Gross Margin %', 'Net Margin %'].join(','),
      ...periodData.map(data => [
        data.period,
        data.revenue,
        data.cogs,
        data.grossProfit,
        data.expenses,
        data.netProfit,
        data.grossMargin.toFixed(2),
        data.netMargin.toFixed(2)
      ])
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `profit-loss-${timeframe}-${Date.now()}.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  if (loading) {
    return <div className="flex items-center justify-center h-64">Loading profit & loss data...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold text-foreground">Profit & Loss Statement</h1>
          <p className="text-muted-foreground">Real-time profitability analysis and reporting</p>
        </div>
        <div className="flex flex-col sm:flex-row gap-3">
          <Select value={timeframe} onValueChange={setTimeframe}>
            <SelectTrigger className="w-32">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="daily">Daily</SelectItem>
              <SelectItem value="weekly">Weekly</SelectItem>
              <SelectItem value="monthly">Monthly</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" onClick={exportReport}>
            <Download className="h-4 w-4 mr-2" />
            Export
          </Button>
        </div>
      </div>

      <Tabs defaultValue="realtime" className="space-y-6">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="realtime" className="flex items-center gap-2">
            <Activity className="h-4 w-4" />
            Real-time
          </TabsTrigger>
          <TabsTrigger value="trends" className="flex items-center gap-2">
            <BarChart3 className="h-4 w-4" />
            Trends
          </TabsTrigger>
          <TabsTrigger value="analysis" className="flex items-center gap-2">
            <Target className="h-4 w-4" />
            Analysis
          </TabsTrigger>
        </TabsList>

        <TabsContent value="realtime" className="space-y-6">
          {/* Real-time Stats */}
          {realtimeData && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Today's Revenue</CardTitle>
                  <TrendingUp className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-primary">{formatCurrency(realtimeData.totalRevenue)}</div>
                  <p className="text-xs text-muted-foreground">
                    {realtimeData.transactionCount} transactions
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Gross Profit</CardTitle>
                  <DollarSign className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-success">{formatCurrency(realtimeData.grossProfit)}</div>
                  <p className="text-xs text-muted-foreground">
                    {realtimeData.grossMargin.toFixed(1)}% margin
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Net Profit</CardTitle>
                  <Target className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${realtimeData.netProfit >= 0 ? 'text-success' : 'text-destructive'}`}>
                    {formatCurrency(realtimeData.netProfit)}
                  </div>
                  <p className="text-xs text-muted-foreground">
                    {realtimeData.netMargin.toFixed(1)}% margin
                  </p>
                </CardContent>
              </Card>

              <Card className="shadow-card">
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Expenses</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-destructive">{formatCurrency(realtimeData.totalExpenses)}</div>
                  <p className="text-xs text-muted-foreground">
                    COGS: {formatCurrency(realtimeData.totalCOGS)}
                  </p>
                </CardContent>
              </Card>
            </div>
          )}
        </TabsContent>

        <TabsContent value="trends" className="space-y-6">
          {/* Trend Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Revenue vs Profit Trend</CardTitle>
                <CardDescription>{timeframe.charAt(0).toUpperCase() + timeframe.slice(1)} analysis</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(value as number), name]} />
                    <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} name="Revenue" />
                    <Line type="monotone" dataKey="grossProfit" stroke="#82ca9d" strokeWidth={2} name="Gross Profit" />
                    <Line type="monotone" dataKey="netProfit" stroke="#ffc658" strokeWidth={2} name="Net Profit" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Cost Breakdown</CardTitle>
                <CardDescription>COGS vs Operating Expenses</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <BarChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [formatCurrency(value as number), name]} />
                    <Bar dataKey="cogs" fill="#ff7c7c" name="COGS" />
                    <Bar dataKey="expenses" fill="#ffc658" name="Operating Expenses" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="analysis" className="space-y-6">
          {/* Profitability Analysis */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <Card className="lg:col-span-2 shadow-card">
              <CardHeader>
                <CardTitle>Profit Margin Analysis</CardTitle>
                <CardDescription>Gross and net margin trends</CardDescription>
              </CardHeader>
              <CardContent>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={periodData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="period" />
                    <YAxis />
                    <Tooltip formatter={(value, name) => [`${(value as number).toFixed(1)}%`, name]} />
                    <Line type="monotone" dataKey="grossMargin" stroke="#8884d8" strokeWidth={2} name="Gross Margin" />
                    <Line type="monotone" dataKey="netMargin" stroke="#82ca9d" strokeWidth={2} name="Net Margin" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>

            <Card className="shadow-card">
              <CardHeader>
                <CardTitle>Performance Summary</CardTitle>
                <CardDescription>Key metrics overview</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {periodData.length > 0 && (
                  <>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm">Best Revenue Day:</span>
                        <span className="font-medium">
                          {formatCurrency(Math.max(...periodData.map(d => d.revenue)))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Best Profit Day:</span>
                        <span className="font-medium">
                          {formatCurrency(Math.max(...periodData.map(d => d.netProfit)))}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Gross Margin:</span>
                        <span className="font-medium">
                          {(periodData.reduce((sum, d) => sum + d.grossMargin, 0) / periodData.length).toFixed(1)}%
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm">Avg Net Margin:</span>
                        <span className="font-medium">
                          {(periodData.reduce((sum, d) => sum + d.netMargin, 0) / periodData.length).toFixed(1)}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="pt-4 border-t">
                      <h4 className="font-medium mb-2">Profitability Status</h4>
                      <div className="space-y-2">
                        {periodData.map((data, index) => (
                          <div key={index} className="flex items-center justify-between">
                            <span className="text-sm">{data.period}</span>
                            <Badge variant={data.netProfit >= 0 ? "default" : "destructive"}>
                              {data.netProfit >= 0 ? "Profitable" : "Loss"}
                            </Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
}