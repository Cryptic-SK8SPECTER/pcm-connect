import { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
interface PageHeaderProps {
  icon?: LucideIcon;
  title: string;
  subtitle?: string;
  action?: {
    label: string;
    onClick: () => void;
    icon?: LucideIcon;
    disabled?: boolean;
    title?: string;
  };
}
export function PageHeader({
  icon: Icon,
  title,
  subtitle,
  action
}: PageHeaderProps) {
  return <div className="flex items-start justify-between mb-6">
      
      {action && <Button onClick={action.onClick} disabled={action.disabled} title={action.title} className="gap-2">
          {action.icon && <action.icon className="h-4 w-4" />}
          {action.label}
        </Button>}
    </div>;
}