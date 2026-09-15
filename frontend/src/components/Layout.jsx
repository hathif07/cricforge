import React from 'react';
import { NavLink, Outlet, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import RoleBadge from './RoleBadge';

const NAV_ITEMS = [
  { to: '/dashboard', label: 'Dashboard', roles: null },
  { to: '/players', label: 'Players', roles: null },
  { to: '/teams', label: 'Teams', roles: null },
  { to: '/auction', label: 'Auction', roles: ['admin', 'team_owner', 'tournament_organizer'] },
  { to: '/matches', label: 'Matches', roles: null },
  { to: '/simulation', label: 'Simulation', roles: null },
  { to: '/admin/users', label: 'Admin', roles: ['admin'] }
];

const Layout = () => {
  const { user, logout, hasRole } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="app-shell">
      <nav className="nav">
        <div className="nav-inner">
          <NavLink to="/dashboard" className="nav-brand">🏏 CricForge</NavLink>
          <div className="nav-links">
            {NAV_ITEMS.filter((item) => !item.roles || hasRole(...item.roles)).map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                className={({ isActive }) => `nav-link${isActive ? ' active' : ''}`}
              >
                {item.label}
              </NavLink>
            ))}
          </div>
          <div className="nav-user">
            {user && (
              <>
                <RoleBadge role={user.roles[0]} />
                <NavLink to="/profile" className="nav-user-name">{user.name}</NavLink>
                <button className="btn btn-sm" onClick={handleLogout}>Logout</button>
              </>
            )}
          </div>
        </div>
      </nav>

      <main className="app-main">
        <Outlet />
      </main>

      <footer className="site-footer">
        CricForge — Build. Bid. Play. Score. Analyze. &middot;{' '}
        <NavLink to="/privacy">Privacy</NavLink> &middot; <NavLink to="/terms">Terms</NavLink>
      </footer>
    </div>
  );
};

export default Layout;
