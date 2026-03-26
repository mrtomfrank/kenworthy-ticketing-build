import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { DollarSign, ShoppingCart, RotateCcw } from 'lucide-react';

interface DailySalesProps {
  revenue: number;
  ticketCount: number;
  refundCount: number;
}

export function DailySalesSummary({ revenue, ticketCount, refundCount }: DailySalesProps) {
  return (
    <div className="grid grid-cols-3 gap-4 mb-8">
      <Card className="glass">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <DollarSign className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Today's Revenue</p>
            <p className="text-xl font-bold">${revenue.toFixed(2)}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="glass">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="rounded-full bg-primary/10 p-2.5">
            <ShoppingCart className="h-5 w-5 text-primary" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Tickets Sold</p>
            <p className="text-xl font-bold">{ticketCount}</p>
          </div>
        </CardContent>
      </Card>
      <Card className="glass">
        <CardContent className="pt-5 pb-4 flex items-center gap-3">
          <div className="rounded-full bg-destructive/10 p-2.5">
            <RotateCcw className="h-5 w-5 text-destructive" />
          </div>
          <div>
            <p className="text-xs text-muted-foreground">Refunds</p>
            <p className="text-xl font-bold">{refundCount}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
