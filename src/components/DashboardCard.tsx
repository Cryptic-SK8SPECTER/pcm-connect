import { LucideIcon } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface DashboardCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: LucideIcon;
  trend?: {
    value: string;
    isPositive: boolean;
  };
}

export function DashboardCard({ title, value, subtitle, icon: Icon, trend }: DashboardCardProps) {
  return (
    <Card className="hover:shadow-lg transition-all border-border/40">
      <CardContent className="p-6">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <p className="text-sm font-medium text-muted-foreground mb-2">{title}</p>
            <h3 className="text-4xl font-bold text-foreground">{value}</h3>
            {subtitle && <p className="text-sm text-muted-foreground mt-2">{subtitle}</p>}
            {trend && (
              <p className={`text-sm mt-2 font-medium ${trend.isPositive ? "text-green-600" : "text-red-600"}`}>
                {trend.value}
              </p>
            )}
          </div>
          <div className="rounded-lg bg-primary/5 p-3">
            <Icon className="h-7 w-7 text-primary" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
