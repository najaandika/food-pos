'use client';

import {
  ChartColumn,
  ConciergeBell,
  CreditCard,
  LayoutDashboard,
  List,
  LogOut,
  PanelLeftClose,
  PanelLeftOpen,
  QrCode,
  ReceiptText,
  Settings,
  SlidersHorizontal,
  UserRoundPlus,
  type LucideIcon,
} from 'lucide-react';
import { navGroups, type View } from '.';

type AdminSidebarProps = {
  activeView: View;
  collapsed: boolean;
  onToggleCollapsed: () => void;
  onChangeView: (view: View) => void;
  onLogout: () => void;
};

const navIcons: Record<View, LucideIcon> = {
  dashboard: LayoutDashboard,
  report: ChartColumn,
  menu: List,
  orders: ReceiptText,
  cashier: CreditCard,
  waiters: ConciergeBell,
  'owner-menu': SlidersHorizontal,
  'owner-tables': QrCode,
  'owner-staff': UserRoundPlus,
  settings: Settings,
};

export function AdminSidebar({ activeView, collapsed, onToggleCollapsed, onChangeView, onLogout }: AdminSidebarProps) {
  const ToggleIcon = collapsed ? PanelLeftOpen : PanelLeftClose;
  const SettingsIcon = navIcons.settings;

  const handleChangeView = (view: View) => {
    onChangeView(view);
  };

  return (
    <aside className="sidebar">
      <div className="brand-wrap">
        <div className="brand-lockup">
          <div className="brand-mark" aria-hidden="true"><span /><span /><span /></div>
          <div className="brand-name">Bloc POS</div>
        </div>
        <button className="sidebar-toggle" type="button" onClick={onToggleCollapsed} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          <ToggleIcon />
        </button>
      </div>

      <nav className="nav" aria-label="Sidebar navigation">
        {navGroups.map((group) => (
          <div className={`nav-group nav-group-${group.label.toLowerCase()}`} key={group.label}>
            <div className="nav-label">{group.label}</div>
            {group.items.map((item) => (
              <NavButton
                active={activeView === item.view}
                icon={navIcons[item.view]}
                label={item.label}
                key={item.view}
                onClick={() => handleChangeView(item.view)}
              />
            ))}
          </div>
        ))}
        <div className="nav-group nav-group-system">
          <div className="nav-label">System</div>
          <NavButton active={activeView === 'settings'} icon={SettingsIcon} label="Settings" onClick={() => handleChangeView('settings')} />
        </div>
      </nav>

      <div className="profile-box">
        <div className="profile-avatar">
          <img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80" alt="Gladina Samantha" />
          <span aria-hidden="true" />
        </div>
        <div className="profile-meta"><strong>Gladina Samantha</strong><span>Waiters</span></div>
      </div>
      <button className="logout-btn" type="button" onClick={onLogout}><LogOut /><span>Logout</span></button>
    </aside>
  );
}

type NavButtonProps = {
  active: boolean;
  icon: LucideIcon;
  label: string;
  onClick: () => void;
};

function NavButton({ active, icon: NavIcon, label, onClick }: NavButtonProps) {
  return (
    <button
      aria-label={label}
      className={`nav-item ${active ? 'active' : ''}`}
      data-tooltip={label}
      type="button"
      onClick={onClick}
    >
      <NavIcon />
      <span>{label}</span>
    </button>
  );
}

type CreateOrderModalProps = {
  guestTotal: number;
  onClose: () => void;
  onCreate: () => void;
  onChangeGuestTotal: (guestTotal: number) => void;
};

export function CreateOrderModal({ guestTotal, onClose, onCreate, onChangeGuestTotal }: CreateOrderModalProps) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-box" role="dialog" aria-modal="true" aria-labelledby="create-order-title" onClick={(event) => event.stopPropagation()}>
        <div className="modal-top">
          <h2 id="create-order-title">Create New Order</h2>
          <button className="close-btn" type="button" onClick={onClose} aria-label="Close">x</button>
        </div>
        <div className="segmented"><button className="segment active" type="button">Dine In</button><button className="segment" type="button">Takeaway</button></div>
        <label className="field-label" htmlFor="customer-name">Customer Name</label>
        <input className="text-field" id="customer-name" type="text" defaultValue="Ariel Hikmat" />
        <div className="field-label">Guest</div>
        <div className="counter-box">
          <button type="button" onClick={() => onChangeGuestTotal(Math.max(1, guestTotal - 1))}>-</button>
          <span>{guestTotal} Person</span>
          <button type="button" onClick={() => onChangeGuestTotal(guestTotal + 1)}>+</button>
        </div>
        <div className="field-label">Choose Table</div>
        <button className="table-box" type="button"><span>A4</span><span>&gt;</span></button>
        <button className="submit-btn" type="button" onClick={onCreate}>Create Order</button>
      </div>
    </div>
  );
}
