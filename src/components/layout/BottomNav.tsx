import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingCart, Package, Bell, Settings, Users } from 'lucide-react';
import { useAlerts } from '@/hooks/useAlerts';
import { useBusiness } from '@/contexts/BusinessContext';

interface NavItem {
  to: string;
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  roles?: ('owner' | 'clerk' | 'warehouse')[];
}

const navItems: NavItem[] = [
  { to: '/', icon: LayoutDashboard, label: 'Inicio', roles: ['owner'] },
  { to: '/sales', icon: ShoppingCart, label: 'Ventas', roles: ['owner', 'clerk'] },
  { to: '/inventory', icon: Package, label: 'Inventario', roles: ['owner', 'warehouse'] },
  { to: '/team', icon: Users, label: 'Equipo', roles: ['owner'] },
  { to: '/settings', icon: Settings, label: 'Ajustes' },
];

export default function BottomNav() {
  const { unreadCount } = useAlerts();
  const { currentBusiness, currentRole } = useBusiness();

  if (!currentBusiness) return null;

  // Filter nav items based on user role
  const visibleItems = navItems.filter((item) => {
    // If no roles specified, show to everyone
    if (!item.roles) return true;
    // Check if current role is in allowed roles
    return currentRole && item.roles.includes(currentRole);
  });

  return (
    <nav className="bottom-nav">
      {visibleItems.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          className={({ isActive }) =>
            `bottom-nav-item ${isActive ? 'active' : ''}`
          }
        >
          <div className="relative">
            <item.icon className="h-6 w-6" />
            {item.to === '/alerts' && unreadCount > 0 && (
              <span className="alert-badge">{unreadCount > 9 ? '9+' : unreadCount}</span>
            )}
          </div>
          <span className="text-xs">{item.label}</span>
        </NavLink>
      ))}
    </nav>
  );
}
