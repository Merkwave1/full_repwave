import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import {
  HomeIcon,
  BuildingOffice2Icon,
  ArrowRightOnRectangleIcon,
  ShieldCheckIcon,
} from '@heroicons/react/24/outline';
import { useAuth } from '../context/AuthContext';

const nav = [
  { to: '/', label: 'Overview', icon: HomeIcon, end: true },
  { to: '/tenants', label: 'Tenants', icon: BuildingOffice2Icon },
];

export default function Layout() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-brand-50 via-white to-brand-100/40">
      <header className="sticky top-0 z-40 border-b border-brand-100/80 bg-white/70 backdrop-blur-xl">
        <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-br from-brand-400 to-brand-600 text-sm font-bold text-white shadow-glow">
              R
            </div>
            <div>
              <p className="text-sm font-bold text-brand-800">RepWave Admin</p>
              <p className="text-xs text-brand-500">Super-admin console</p>
            </div>
          </div>
          <div className="flex items-center gap-4">
            <div className="hidden items-center gap-2 rounded-xl bg-brand-50 px-3 py-1.5 sm:flex">
              <ShieldCheckIcon className="h-4 w-4 text-brand-500" />
              <span className="text-sm font-medium text-brand-700">{user?.name}</span>
            </div>
            <button type="button" onClick={handleLogout} className="rw-btn-secondary !py-2 !px-3">
              <ArrowRightOnRectangleIcon className="h-4 w-4" />
              <span className="hidden sm:inline">Logout</span>
            </button>
          </div>
        </div>
        <nav className="flex gap-1 border-t border-brand-100/80 px-4 py-2 lg:hidden">
          {nav.map(({ to, label, icon: Icon, end }) => (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={({ isActive }) =>
                `flex flex-1 items-center justify-center gap-1.5 rounded-lg py-2 text-xs font-semibold ${
                  isActive ? 'bg-brand-500 text-white' : 'text-brand-600'
                }`
              }
            >
              <Icon className="h-4 w-4" />
              {label}
            </NavLink>
          ))}
        </nav>
      </header>

      <div className="mx-auto flex max-w-7xl gap-6 px-4 py-6 sm:px-6">
        <aside className="hidden w-48 shrink-0 lg:block">
          <nav className="rw-glass sticky top-24 space-y-1 rounded-2xl p-3">
            {nav.map(({ to, label, icon: Icon, end }) => (
              <NavLink
                key={to}
                to={to}
                end={end}
                className={({ isActive }) =>
                  `flex items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm font-medium transition ${
                    isActive
                      ? 'bg-gradient-to-r from-brand-400 to-brand-500 text-white shadow-md'
                      : 'text-brand-600 hover:bg-brand-50'
                  }`
                }
              >
                <Icon className="h-5 w-5" />
                {label}
              </NavLink>
            ))}
          </nav>
        </aside>

        <main className="min-w-0 flex-1">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
