import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Upload, Download, FileText, Package, DollarSign, Users } from "lucide-react"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"

interface ImportExportDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  type: 'products' | 'sales' | 'expenses' | 'categories'
}

export default function ImportExportDialog({ open, onOpenChange, type }: ImportExportDialogProps) {
  const [importFile, setImportFile] = useState<File | null>(null)
  const [importing, setImporting] = useState(false)
  const [exporting, setExporting] = useState(false)
  const { toast } = useToast()

  const getTypeConfig = () => {
    switch (type) {
      case 'products':
        return {
          title: 'Products',
          icon: <Package className="h-5 w-5" />,
          sampleHeaders: ['name', 'description', 'unit_price', 'cost_price', 'current_stock', 'unit', 'barcode'],
          table: 'products'
        }
      case 'sales':
        return {
          title: 'Sales',
          icon: <DollarSign className="h-5 w-5" />,
          sampleHeaders: ['sale_number', 'total_amount', 'payment_method', 'customer_name'],
          table: 'sales'
        }
      case 'expenses':
        return {
          title: 'Expenses',
          icon: <FileText className="h-5 w-5" />,
          sampleHeaders: ['description', 'amount', 'category', 'expense_date'],
          table: 'expenses'
        }
      case 'categories':
        return {
          title: 'Categories',
          icon: <Users className="h-5 w-5" />,
          sampleHeaders: ['name', 'description'],
          table: 'categories'
        }
    }
  }

  const config = getTypeConfig()

  const handleImport = async () => {
    if (!importFile) {
      toast({
        title: "Error",
        description: "Please select a file to import",
        variant: "destructive"
      })
      return
    }

    setImporting(true)
    try {
      const text = await importFile.text()
      const lines = text.split('\n').filter(line => line.trim())
      
      if (lines.length < 2) {
        throw new Error('File must contain at least a header and one data row')
      }

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase())
      const data = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim())
        const row: any = {}
        headers.forEach((header, index) => {
          if (values[index] !== undefined) {
            row[header] = values[index]
          }
        })
        return row
      })

      // Get current user for expenses
      const user = await supabase.auth.getUser()
      
      // Validate and transform data based on type
      const transformedData = data.map(row => {
        switch (type) {
          case 'products':
            return {
              name: row.name,
              description: row.description || null,
              unit_price: parseFloat(row.unit_price) || 0,
              cost_price: parseFloat(row.cost_price) || 0,
              current_stock: parseInt(row.current_stock) || 0,
              unit: row.unit || 'pcs',
              barcode: row.barcode || null,
              min_stock_threshold: parseInt(row.min_stock_threshold) || 10,
              max_stock_threshold: parseInt(row.max_stock_threshold) || 1000
            }
          case 'expenses':
            return {
              description: row.description,
              amount: parseFloat(row.amount) || 0,
              category: row.category,
              expense_date: row.expense_date || new Date().toISOString().split('T')[0],
              created_by: user.data.user?.id
            }
          case 'categories':
            return {
              name: row.name,
              description: row.description || null
            }
          default:
            return row
        }
      })

      const { error } = await supabase.from(config.table as any).insert(transformedData)
      
      if (error) throw error

      toast({
        title: "Success",
        description: `Successfully imported ${transformedData.length} ${config.title.toLowerCase()}`
      })

      setImportFile(null)
      onOpenChange(false)
    } catch (error: any) {
      toast({
        title: "Import Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setImporting(false)
    }
  }

  const handleExport = async () => {
    setExporting(true)
    try {
      let data, error
      
      // Add specific selections for each type
      if (type === 'products') {
        const result = await supabase.from('products').select(`
          name,
          description,
          unit_price,
          cost_price,
          current_stock,
          unit,
          barcode,
          min_stock_threshold,
          max_stock_threshold,
          created_at
        `)
        data = result.data
        error = result.error
      } else {
        const result = await supabase.from(config.table as any).select('*')
        data = result.data
        error = result.error
      }

      if (error) throw error

      if (!data || data.length === 0) {
        toast({
          title: "No Data",
          description: `No ${config.title.toLowerCase()} found to export`,
          variant: "destructive"
        })
        return
      }

      // Create CSV content
      const headers = Object.keys(data[0])
      const csvContent = [
        headers.join(','),
        ...data.map(row => 
          headers.map(header => {
            const value = (row as any)[header]
            return typeof value === 'string' && value.includes(',') 
              ? `"${value}"` 
              : value || ''
          }).join(',')
        )
      ].join('\n')

      // Download file
      const blob = new Blob([csvContent], { type: 'text/csv' })
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${config.title.toLowerCase()}-export-${new Date().toISOString().split('T')[0]}.csv`
      a.click()
      window.URL.revokeObjectURL(url)

      toast({
        title: "Success",
        description: `Exported ${data.length} ${config.title.toLowerCase()}`
      })
    } catch (error: any) {
      toast({
        title: "Export Failed",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setExporting(false)
    }
  }

  const downloadTemplate = () => {
    const csvContent = config.sampleHeaders.join(',')
    const blob = new Blob([csvContent], { type: 'text/csv' })
    const url = window.URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${config.title.toLowerCase()}-template.csv`
    a.click()
    window.URL.revokeObjectURL(url)
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            {config.icon}
            Import/Export {config.title}
          </DialogTitle>
        </DialogHeader>

        <Tabs defaultValue="import" className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="import">Import</TabsTrigger>
            <TabsTrigger value="export">Export</TabsTrigger>
          </TabsList>

          <TabsContent value="import" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Upload className="h-4 w-4" />
                  Import Data
                </CardTitle>
                <CardDescription>
                  Upload a CSV file to import {config.title.toLowerCase()} data
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="import-file">Select CSV File</Label>
                  <Input
                    id="import-file"
                    type="file"
                    accept=".csv"
                    onChange={(e) => setImportFile(e.target.files?.[0] || null)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Required Columns</Label>
                  <div className="flex flex-wrap gap-2">
                    {config.sampleHeaders.map(header => (
                      <Badge key={header} variant="outline">{header}</Badge>
                    ))}
                  </div>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={downloadTemplate}
                    className="flex-1"
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Download Template
                  </Button>
                  <Button
                    onClick={handleImport}
                    disabled={!importFile || importing}
                    className="flex-1"
                  >
                    <Upload className="h-4 w-4 mr-2" />
                    {importing ? 'Importing...' : 'Import Data'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="export" className="space-y-4">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Download className="h-4 w-4" />
                  Export Data
                </CardTitle>
                <CardDescription>
                  Download all {config.title.toLowerCase()} data as a CSV file
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Button
                  onClick={handleExport}
                  disabled={exporting}
                  className="w-full"
                >
                  <Download className="h-4 w-4 mr-2" />
                  {exporting ? 'Exporting...' : `Export All ${config.title}`}
                </Button>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </DialogContent>
    </Dialog>
  )
}