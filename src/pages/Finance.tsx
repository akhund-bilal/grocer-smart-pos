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
  DollarSign, 
  TrendingUp,
  TrendingDown,
  Receipt,
  Plus,
  Download,
  Calendar,
  PieChart,
  BarChart3
} from "lucide-react"
import { useState, useEffect } from "react"
import { StatsCard } from "@/components/ui/stats-card"
import { supabase } from "@/integrations/supabase/client"
import { Tables } from "@/integrations/supabase/types"
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart as RechartsPieChart, Pie, Cell } from 'recharts'

type Expense = Tables<'expenses'>
type Sale = Tables<'sales'>

export default function Finance() {
  const [expenses, setExpenses] = useState<Expense[]>([])
  const [sales, setSales] = useState<Sale[]>([])
  const [isAddExpenseDialogOpen, setIsAddExpenseDialogOpen] = useState(false)
  const [dateRange, setDateRange] = useState("7d")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  const [newExpense, setNewExpense] = useState({
    description: "",
    amount: "",
    category: "",
    expense_date: new Date().toISOString().split('T')[0]
  })

  const expenseCategories = [
    "Office Supplies",
    "Utilities",
    "Rent",
    "Marketing",
    "Equipment",
    "Maintenance",
    "Insurance",
    "Professional Services",
    "Travel",
    "Other"
  ]

  useEffect(() => {
    fetchFinanceData()
  }, [dateRange])

  const getDateFilter = () => {
    const now = new Date()
    const days = parseInt(dateRange.replace('d', ''))
    const startDate = new Date(now.getTime() - (days * 24 * 60 * 60 * 1000))
    return startDate.toISOString()
  }

  const fetchFinanceData = async () => {
    try {
      const dateFilter = getDateFilter()
      
      const [expensesResult, salesResult] = await Promise.all([
        supabase
          .from('expenses')
          .select('*')
          .gte('expense_date', dateFilter)
          .order('expense_date', { ascending: false }),
        supabase
          .from('sales')
          .select('*')
          .gte('created_at', dateFilter)
          .order('created_at', { ascending: false })
      ])

      if (expensesResult.data) setExpenses(expensesResult.data)
      if (salesResult.data) setSales(salesResult.data)
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch finance data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAddExpense = async () => {
    try {
      const { error } = await supabase.from('expenses').insert([{
        ...newExpense,
        amount: parseFloat(newExpense.amount),
        created_by: (await supabase.auth.getUser()).data.user?.id!
      }])

      if (error) throw error

      toast({
        title: "Success",
        description: "Expense added successfully"
      })
      
      setIsAddExpenseDialogOpen(false)
      setNewExpense({
        description: "",
        amount: "",
        category: "",
        expense_date: new Date().toISOString().split('T')[0]
      })
      fetchFinanceData()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to add expense",
        variant: "destructive"
      })
    }
  }

  const financeStats = {
    totalRevenue: sales.reduce((sum, sale) => sum + sale.total_amount, 0),
    totalExpenses: expenses.reduce((sum, expense) => sum + expense.amount, 0),
    netProfit: sales.reduce((sum, sale) => sum + sale.total_amount, 0) - expenses.reduce((sum, expense) => sum + expense.amount, 0),
    transactionCount: sales.length
  }

  // Prepare chart data
  const dailyData = Array.from({ length: 7 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (6 - i))
    const dateStr = date.toISOString().split('T')[0]
    
    const dayRevenue = sales
      .filter(sale => sale.created_at.split('T')[0] === dateStr)
      .reduce((sum, sale) => sum + sale.total_amount, 0)
    
    const dayExpenses = expenses
      .filter(expense => expense.expense_date === dateStr)
      .reduce((sum, expense) => sum + expense.amount, 0)

    return {
      date: date.toLocaleDateString('en-US', { weekday: 'short' }),
      revenue: dayRevenue,
      expenses: dayExpenses,
      profit: dayRevenue - dayExpenses
    }
  })

  const expensesByCategory = expenseCategories.map(category => ({
    name: category,
    value: expenses
      .filter(expense => expense.category === category)
      .reduce((sum, expense) => sum + expense.amount, 0)
  })).filter(item => item.value > 0)

  const COLORS = ['#8884d8', '#82ca9d', '#ffc658', '#ff7c7c', '#8dd1e1', '#d084d0']

  const exportFinanceReport = () => {
    const csvContent = [
      ['Date', 'Type', 'Description', 'Amount', 'Category'].join(','),
      ...sales.map(sale => [
        sale.created_at.split('T')[0],
        'Revenue',
        `Sale ${sale.sale_number}`,
        sale.total_amount,
        'Sales'
      ]),
      ...expenses.map(expense => [
        expense.expense_date,
        'Expense',
        expense.description,
        expense.amount,
        expense.category
      ])
    ].join('\n')

    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `finance-report-${dateRange}.csv`
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
          <h1 className="text-3xl font-bold text-foreground">Finance & Accounting</h1>
          <p className="text-muted-foreground">Track revenue, expenses, and profitability</p>
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
          <Button variant="outline" onClick={exportFinanceReport}>
            <Download className="h-4 w-4 mr-2" />
            Export Report
          </Button>
          <Dialog open={isAddExpenseDialogOpen} onOpenChange={setIsAddExpenseDialogOpen}>
            <DialogTrigger asChild>
              <Button className="bg-gradient-primary">
                <Plus className="h-4 w-4 mr-2" />
                Add Expense
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add New Expense</DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Input
                    id="description"
                    value={newExpense.description}
                    onChange={(e) => setNewExpense({...newExpense, description: e.target.value})}
                    placeholder="Expense description"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    step="0.01"
                    value={newExpense.amount}
                    onChange={(e) => setNewExpense({...newExpense, amount: e.target.value})}
                    placeholder="0.00"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="category">Category</Label>
                  <Select value={newExpense.category} onValueChange={(value) => setNewExpense({...newExpense, category: value})}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select category" />
                    </SelectTrigger>
                    <SelectContent>
                      {expenseCategories.map(category => (
                        <SelectItem key={category} value={category}>{category}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="expense_date">Date</Label>
                  <Input
                    id="expense_date"
                    type="date"
                    value={newExpense.expense_date}
                    onChange={(e) => setNewExpense({...newExpense, expense_date: e.target.value})}
                  />
                </div>
                <Button onClick={handleAddExpense} className="w-full">Add Expense</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatsCard
          variant="success"
          title="Total Revenue"
          value={`$${financeStats.totalRevenue.toLocaleString()}`}
          subtitle={`${dateRange} period`}
          icon={<TrendingUp className="h-6 w-6" />}
        />
        <StatsCard
          variant="destructive"
          title="Total Expenses"
          value={`$${financeStats.totalExpenses.toLocaleString()}`}
          subtitle={`${dateRange} period`}
          icon={<TrendingDown className="h-6 w-6" />}
        />
        <StatsCard
          variant={financeStats.netProfit >= 0 ? "primary" : "warning"}
          title="Net Profit"
          value={`$${financeStats.netProfit.toLocaleString()}`}
          subtitle={`${dateRange} period`}
          icon={<DollarSign className="h-6 w-6" />}
        />
        <StatsCard
          variant="secondary"
          title="Transactions"
          value={financeStats.transactionCount}
          subtitle={`${dateRange} period`}
          icon={<Receipt className="h-6 w-6" />}
        />
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Daily Revenue/Expenses Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              Daily Performance
            </CardTitle>
            <CardDescription>Revenue vs Expenses over time</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={dailyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="date" />
                <YAxis />
                <Tooltip formatter={(value) => [`$${value}`, '']} />
                <Line type="monotone" dataKey="revenue" stroke="#8884d8" strokeWidth={2} />
                <Line type="monotone" dataKey="expenses" stroke="#ff7c7c" strokeWidth={2} />
                <Line type="monotone" dataKey="profit" stroke="#82ca9d" strokeWidth={2} />
              </LineChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Expense Categories Chart */}
        <Card className="shadow-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <PieChart className="h-5 w-5 text-primary" />
              Expense Categories
            </CardTitle>
            <CardDescription>Breakdown of expenses by category</CardDescription>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <RechartsPieChart>
                <Pie
                  data={expensesByCategory}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {expensesByCategory.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip formatter={(value) => [`$${value}`, 'Amount']} />
              </RechartsPieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Expenses */}
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle>Recent Expenses</CardTitle>
          <CardDescription>Latest expense entries</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {expenses.slice(0, 10).map((expense) => (
              <div key={expense.id} className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-muted/30 transition-colors">
                <div className="flex-1">
                  <p className="font-medium">{expense.description}</p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline">{expense.category}</Badge>
                    <span className="text-sm text-muted-foreground">{expense.expense_date}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-destructive">-${expense.amount}</p>
                </div>
              </div>
            ))}
            {expenses.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No expenses recorded for this period
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}