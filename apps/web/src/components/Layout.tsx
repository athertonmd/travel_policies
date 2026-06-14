import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const navItems = [
  { path: '/dashboard', label: 'Dashboard', roles: ['SystemAdmin', 'TMCAdmin'] },
  { path: '/enterprises', label: 'Enterprises', roles: ['SystemAdmin', 'TMCAdmin'] },
  { path: '/reviews', label: 'Reviews', roles: ['SystemAdmin', 'TMCAdmin', 'Reviewer'] },
  { path: '/assistant', label: 'Policy Assistant', roles: ['SystemAdmin', 'TMCAdmin', 'Reviewer'] },
  { path: '/knowledge-base', label: 'Knowledge Base', roles: ['SystemAdmin', 'TMCAdmin', 'Reviewer'] },
  { path: '/admin', label: 'Administration', roles: ['SystemAdmin', 'TMCAdmin'] },
];

export function Layout({ children }: { children: React.ReactNode }) {
  const { user, logout } = useAuth();
  const location = useLocation();

  const visibleNav = navItems.filter(
    (item) => user && item.roles.includes(user.role),
  );

  return (
    <div className="min-h-screen bg-gray-50">
      <nav className="bg-white shadow-sm border-b" role="navigation" aria-label="Main navigation">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between h-16">
            <div className="flex items-center space-x-8">
              <Link to="/dashboard" className="text-xl font-bold text-indigo-600">TPIP</Link>
              {visibleNav.map((item) => (
                <Link
                  key={item.path}
                  to={item.path}
                  className={`text-sm font-medium ${location.pathname.startsWith(item.path) ? 'text-indigo-600 border-b-2 border-indigo-600' : 'text-gray-500 hover:text-gray-700'}`}
                >
                  {item.label}
                </Link>
              ))}
            </div>
            <div className="flex items-center space-x-4">
              {user && (
                <>
                  <span className="text-sm text-gray-600">{user.email}</span>
                  <span className="text-xs bg-indigo-100 text-indigo-800 px-2 py-1 rounded">{user.role}</span>
                  <button onClick={logout} className="text-sm text-gray-500 hover:text-gray-700">Logout</button>
                </>
              )}
            </div>
          </div>
        </div>
      </nav>
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8" role="main">
        {children}
      </main>
    </div>
  );
}
