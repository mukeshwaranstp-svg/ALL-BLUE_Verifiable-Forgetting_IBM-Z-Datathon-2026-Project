import React from 'react';

interface BottomNavProps {
  activeView: string;
  onNavigate: (view: string) => void;
  onOpenMenu: () => void;
}

export const BottomNav: React.FC<BottomNavProps> = ({
  activeView,
  onNavigate,
  onOpenMenu,
}) => {
  const navItems = [
    { id: 'dashboard', label: 'Dashboard', icon: 'grid_view' },
    { id: 'deletion-requests', label: 'Requests', icon: 'playlist_remove' },
    { id: 'workflow-progress', label: 'Workflow', icon: 'account_tree' },
    { id: 'ml-models', label: 'ML Models', icon: 'model_training' },
    { id: 'verification-evidence', label: 'Evidence', icon: 'verified' },
  ];

  return (
    <nav className="fixed bottom-0 w-full z-40 pb-safe bg-surface/90 backdrop-blur-xl shadow-[0_-2px_12px_rgba(0,0,0,0.05)] border-t border-outline-variant/30 lg:hidden">
      <div className="flex justify-around items-center h-16 px-space-xs">
        {navItems.map((item) => {
          const isActive = activeView === item.id;
          return (
            <button
              key={item.id}
              onClick={() => onNavigate(item.id)}
              className={`flex flex-col items-center justify-center min-w-[56px] h-12 transition-colors ${
                isActive ? 'text-primary font-semibold' : 'text-on-surface-variant hover:text-on-surface'
              }`}
            >
              <span className="material-symbols-outlined text-[20px]">{item.icon}</span>
              <span className="font-label-sm text-label-sm mt-0.5">{item.label}</span>
            </button>
          );
        })}

        <button
          onClick={onOpenMenu}
          className="flex flex-col items-center justify-center min-w-[56px] h-12 text-on-surface-variant hover:text-on-surface transition-colors"
        >
          <span className="material-symbols-outlined text-[20px]">menu</span>
          <span className="font-label-sm text-label-sm mt-0.5">Menu</span>
        </button>
      </div>
    </nav>
  );
};
