import { ChevronDown, Store } from 'lucide-react';
import { useBusiness } from '@/contexts/BusinessContext';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

interface AppHeaderProps {
  title?: string;
}

export default function AppHeader({ title }: AppHeaderProps) {
  const { currentBusiness, businesses, setCurrentBusiness } = useBusiness();

  if (!currentBusiness) return null;

  return (
    <header className="app-header">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-lg gradient-primary flex items-center justify-center">
            <Store className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            {businesses.length > 1 ? (
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" className="h-auto p-0 font-semibold">
                    {currentBusiness.name}
                    <ChevronDown className="ml-1 h-4 w-4" />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="start">
                  {businesses.map((business) => (
                    <DropdownMenuItem
                      key={business.id}
                      onClick={() => setCurrentBusiness(business)}
                    >
                      {business.name}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuContent>
              </DropdownMenu>
            ) : (
              <h1 className="font-semibold">{currentBusiness.name}</h1>
            )}
            {title && <p className="text-sm text-muted-foreground">{title}</p>}
          </div>
        </div>
      </div>
    </header>
  );
}
