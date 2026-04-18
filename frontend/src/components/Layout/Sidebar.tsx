import { NavLink, useNavigate } from 'react-router-dom';
import { useStore } from '../../store/useStore';

const links = [
  { to: '/', label: 'Dashboard', icon: '📊' },
  { to: '/transactions', label: 'Transactions', icon: '💳' },
  { to: '/upload', label: 'Upload PDF', icon: '📄' },
  { to: '/chat', label: 'AI Chat', icon: '🤖' },
];

export default function Sidebar() {
  const { user, logout } = useStore();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <aside className="w-64 bg-dark-800 border-r border-dark-600 flex flex-col h-screen fixed left-0 top-0">
      <div className="p-6 border-b border-dark-600">
        <h1 className="text-xl font-bold text-white">💰 Finance AI</h1>
        <p className="text-xs text-gray-500 mt-1">Powered by Groq + LangChain</p>
      </div>

      <nav className="flex-1 p-4 space-y-1">
        {links.map((link) => (
          <NavLink
            key={link.to}
            to={link.to}
            end={link.to === '/'}
            className={({ isActive }) =>
              `flex items-center gap-3 px-4 py-3 rounded-lg text-sm font-medium transition-all ${
                isActive
                  ? 'bg-accent-500 text-white'
                  : 'text-gray-400 hover:bg-dark-700 hover:text-white'
              }`
            }
          >
            <span>{link.icon}</span>
            {link.label}
          </NavLink>
        ))}
      </nav>

      <div className="p-4 border-t border-dark-600">
        <div className="flex items-center gap-3 mb-3">
          <div className="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center text-white text-sm font-bold">
            {user?.name?.[0]?.toUpperCase() || 'U'}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-white font-medium truncate">{user?.name}</p>
            <p className="text-xs text-gray-500 truncate">{user?.email}</p>
          </div>
        </div>
        <button
          onClick={handleLogout}
          className="w-full text-sm text-gray-400 hover:text-red-400 text-left px-2 py-1 transition-colors"
        >
          Sign out →
        </button>
      </div>
    </aside>
  );
}
