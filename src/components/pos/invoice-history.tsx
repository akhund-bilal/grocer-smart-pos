import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Receipt, Eye, Calendar, User, CreditCard } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { formatCurrency } from "@/lib/currency"

interface Sale {
  id: string
  sale_number: string
  total_amount: number
  subtotal: number
  tax_amount: number
  payment_method: string
  payment_received: number
  change_amount: number
  customer_name?: string
  customer_phone?: string
  created_at: string
  cashier_id: string
  sale_items?: {
    product_name: string
    quantity: number
    unit_price: number
    total_price: number
  }[]
}

export function InvoiceHistory() {
  const [sales, setSales] = useState<Sale[]>([])
  const [selectedSale, setSelectedSale] = useState<Sale | null>(null)
  const [showInvoiceDialog, setShowInvoiceDialog] = useState(false)
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    fetchSales()
  }, [])

  const fetchSales = async () => {
    try {
      const { data, error } = await supabase
        .from('sales')
        .select(`
          *,
          sale_items (
            product_name,
            quantity,
            unit_price,
            total_price
          )
        `)
        .order('created_at', { ascending: false })
        .limit(50)

      if (error) throw error
      setSales(data || [])
    } catch (error: any) {
      toast({
        title: "Error fetching sales",
        description: error.message,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const viewInvoice = (sale: Sale) => {
    setSelectedSale(sale)
    setShowInvoiceDialog(true)
  }

  const printInvoice = () => {
    if (!selectedSale) return
    
    const printWindow = window.open('', '_blank')
    if (!printWindow) return

    const invoiceHTML = `
      <!DOCTYPE html>
      <html>
        <head>
          <title>Invoice ${selectedSale.sale_number}</title>
          <style>
            @media print {
              body { margin: 0; }
              .no-print { display: none; }
            }
            body { 
              font-family: 'Courier New', monospace; 
              margin: 20px; 
              line-height: 1.4;
              color: #333;
            }
            .header { 
              text-align: center; 
              margin-bottom: 30px; 
              border-bottom: 2px solid #333;
              padding-bottom: 15px;
            }
            .company-info {
              text-align: center;
              margin-bottom: 20px;
              font-size: 14px;
            }
            .invoice-details { 
              margin-bottom: 20px; 
              font-size: 14px;
            }
            .items-table { 
              width: 100%; 
              border-collapse: collapse; 
              margin: 20px 0; 
              font-size: 13px;
            }
            .items-table th, .items-table td { 
              border: 1px solid #333; 
              padding: 8px; 
              text-align: left; 
            }
            .items-table th { 
              background-color: #f0f0f0; 
              font-weight: bold;
            }
            .items-table td:nth-child(2),
            .items-table td:nth-child(3),
            .items-table td:nth-child(4) {
              text-align: right;
            }
            .totals { 
              margin: 20px 0; 
              float: right;
              width: 250px;
              font-size: 14px;
            }
            .total-row { 
              display: flex; 
              justify-content: space-between; 
              margin: 8px 0; 
              padding: 4px 0;
            }
            .total-final { 
              font-weight: bold; 
              border-top: 2px solid #333; 
              padding-top: 8px; 
              font-size: 16px;
            }
            .footer {
              clear: both;
              margin-top: 40px;
              text-align: center;
              border-top: 1px solid #ccc;
              padding-top: 15px;
              font-size: 12px;
            }
          </style>
        </head>
        <body>
          <div class="company-info">
            <h2>POS SYSTEM</h2>
            <p>Point of Sale Terminal</p>
          </div>
          
          <div class="header">
            <h1>SALES INVOICE</h1>
            <h2>Invoice # ${selectedSale.sale_number}</h2>
          </div>
          
          <div class="invoice-details">
            <div style="display: flex; justify-content: space-between;">
              <div>
                <p><strong>Date:</strong> ${new Date(selectedSale.created_at).toLocaleDateString('en-PK')}</p>
                <p><strong>Time:</strong> ${new Date(selectedSale.created_at).toLocaleTimeString('en-PK')}</p>
                <p><strong>Payment Method:</strong> ${selectedSale.payment_method.toUpperCase()}</p>
              </div>
              <div style="text-align: right;">
                ${selectedSale.customer_name ? `<p><strong>Customer:</strong> ${selectedSale.customer_name}</p>` : '<p><strong>Customer:</strong> Walk-in Customer</p>'}
                ${selectedSale.customer_phone ? `<p><strong>Phone:</strong> ${selectedSale.customer_phone}</p>` : ''}
              </div>
            </div>
          </div>

          <table class="items-table">
            <thead>
              <tr>
                <th style="width: 50%">Item Description</th>
                <th style="width: 15%">Qty</th>
                <th style="width: 20%">Unit Price (PKR)</th>
                <th style="width: 15%">Total (PKR)</th>
              </tr>
            </thead>
            <tbody>
              ${selectedSale.sale_items?.map(item => `
                <tr>
                  <td>${item.product_name}</td>
                  <td>${item.quantity}</td>
                  <td>${formatCurrency(item.unit_price, { decimals: 2 })}</td>
                  <td>${formatCurrency(item.total_price, { decimals: 2 })}</td>
                </tr>
              `).join('') || ''}
            </tbody>
          </table>

          <div class="totals">
            <div class="total-row">
              <span>Subtotal:</span>
              <span>${formatCurrency(selectedSale.subtotal, { decimals: 2 })}</span>
            </div>
            <div class="total-row">
              <span>Tax (8%):</span>
              <span>${formatCurrency(selectedSale.tax_amount, { decimals: 2 })}</span>
            </div>
            <div class="total-row total-final">
              <span>TOTAL AMOUNT:</span>
              <span>${formatCurrency(selectedSale.total_amount, { decimals: 2 })}</span>
            </div>
            <div class="total-row">
              <span>Amount Paid:</span>
              <span>${formatCurrency(selectedSale.payment_received, { decimals: 2 })}</span>
            </div>
            ${selectedSale.change_amount > 0 ? `
              <div class="total-row">
                <span>Change:</span>
                <span>${formatCurrency(selectedSale.change_amount, { decimals: 2 })}</span>
              </div>
            ` : ''}
          </div>

          <div class="footer">
            <p><strong>Thank you for your business!</strong></p>
            <p>This is a computer generated invoice.</p>
            <p>For any queries, please contact us.</p>
          </div>
        </body>
      </html>
    `

    printWindow.document.write(invoiceHTML)
    printWindow.document.close()
    printWindow.print()
  }

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center h-48">
          <div className="text-muted-foreground">Loading invoices...</div>
        </CardContent>
      </Card>
    )
  }

  return (
    <>
      <Card className="shadow-card">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Receipt className="h-5 w-5" />
            Recent Invoices
          </CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-96">
            <div className="space-y-3">
              {sales.map((sale) => (
                <div 
                  key={sale.id}
                  className="flex items-center justify-between p-3 rounded-lg border border-border hover:bg-accent/50 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="font-mono font-medium">{sale.sale_number}</span>
                      <Badge variant="outline" className="text-xs">
                        {sale.payment_method.toUpperCase()}
                      </Badge>
                    </div>
                    <div className="flex items-center gap-4 text-sm text-muted-foreground">
                      <div className="flex items-center gap-1">
                        <Calendar className="h-3 w-3" />
                        {new Date(sale.created_at).toLocaleDateString()}
                      </div>
                      {sale.customer_name && (
                        <div className="flex items-center gap-1">
                          <User className="h-3 w-3" />
                          {sale.customer_name}
                        </div>
                      )}
                       <div className="flex items-center gap-1">
                         <CreditCard className="h-3 w-3" />
                         <span className="font-medium text-primary">
                           {formatCurrency(sale.total_amount, { decimals: 0 })}
                         </span>
                       </div>
                    </div>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => viewInvoice(sale)}
                  >
                    <Eye className="h-4 w-4" />
                  </Button>
                </div>
              ))}
              {sales.length === 0 && (
                <div className="text-center text-muted-foreground py-8">
                  No invoices found
                </div>
              )}
            </div>
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Invoice Detail Dialog */}
      <Dialog open={showInvoiceDialog} onOpenChange={setShowInvoiceDialog}>
        <DialogContent className="max-w-2xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>Invoice {selectedSale?.sale_number}</span>
              <Button onClick={printInvoice} variant="outline" size="sm">
                <Receipt className="h-4 w-4 mr-2" />
                Print
              </Button>
            </DialogTitle>
          </DialogHeader>
          
          {selectedSale && (
            <div className="space-y-4">
              {/* Invoice Header */}
              <div className="grid grid-cols-2 gap-4 p-4 bg-muted/30 rounded-lg">
                <div>
                  <h3 className="font-semibold mb-2">Invoice Details</h3>
                  <p className="text-sm"><strong>Date:</strong> {new Date(selectedSale.created_at).toLocaleDateString()}</p>
                  <p className="text-sm"><strong>Time:</strong> {new Date(selectedSale.created_at).toLocaleTimeString()}</p>
                  <p className="text-sm"><strong>Payment:</strong> {selectedSale.payment_method.toUpperCase()}</p>
                </div>
                {(selectedSale.customer_name || selectedSale.customer_phone) && (
                  <div>
                    <h3 className="font-semibold mb-2">Customer Details</h3>
                    {selectedSale.customer_name && (
                      <p className="text-sm"><strong>Name:</strong> {selectedSale.customer_name}</p>
                    )}
                    {selectedSale.customer_phone && (
                      <p className="text-sm"><strong>Phone:</strong> {selectedSale.customer_phone}</p>
                    )}
                  </div>
                )}
              </div>

              {/* Items */}
              <div>
                <h3 className="font-semibold mb-3">Items</h3>
                <div className="space-y-2">
                  {selectedSale.sale_items?.map((item, index) => (
                    <div key={index} className="flex justify-between items-center p-2 rounded border border-border">
                      <div className="flex-1">
                        <p className="font-medium">{item.product_name}</p>
                        <p className="text-sm text-muted-foreground">
                          {item.quantity} × {formatCurrency(item.unit_price)}
                        </p>
                      </div>
                      <p className="font-semibold">{formatCurrency(item.total_price)}</p>
                    </div>
                  ))}
                </div>
              </div>

              {/* Totals */}
              <div className="border-t pt-4">
                <div className="space-y-2 max-w-sm ml-auto">
                  <div className="flex justify-between">
                    <span>Subtotal:</span>
                    <span>{formatCurrency(selectedSale.subtotal)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Tax (8%):</span>
                    <span>{formatCurrency(selectedSale.tax_amount)}</span>
                  </div>
                  <div className="flex justify-between font-bold text-lg border-t pt-2">
                    <span>Total:</span>
                    <span>{formatCurrency(selectedSale.total_amount)}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}