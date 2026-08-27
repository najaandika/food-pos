'use client';

import { Pencil, Search, UserX } from 'lucide-react';

import { AdminTitle, MockSelect } from '..';

export function OwnerStaffView() {
  const staff = [
    { name: 'Nadia Putri', role: 'Owner', status: 'Active', shift: 'All access', activity: 'Today, 18:40', email: 'owner@blocbarat.local', area: 'Full access', avatar: 'https://images.unsplash.com/photo-1531123897727-8f129e1688ce?auto=format&fit=crop&w=96&q=80' },
    { name: 'Gladina Samantha', role: 'Waiters', status: 'Active', shift: 'Evening', activity: 'Today, 18:32', email: 'gladina@blocbarat.local', area: 'Indoor floor', avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=96&q=80' },
    { name: 'Rafi Alamsyah', role: 'Kasir', status: 'Active', shift: 'Evening', activity: 'Today, 18:20', email: 'rafi@blocbarat.local', area: 'Cashier desk', avatar: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=96&q=80' },
    { name: 'Mira Santika', role: 'Waiters', status: 'Inactive', shift: 'Morning', activity: 'Yesterday, 14:08', email: 'mira@blocbarat.local', area: 'Outdoor floor', avatar: 'https://images.unsplash.com/photo-1544005313-94ddf0286df2?auto=format&fit=crop&w=96&q=80' },
  ];
  const staffStats = [
    { label: 'Total Staff', value: '12', hint: '4 roles configured' },
    { label: 'On Shift', value: '7', hint: 'Evening team active' },
    { label: 'Inactive', value: '2', hint: 'Access disabled' },
  ];

  return (
    <section className="app-view active">
      <header className="topbar">
        <AdminTitle title="Staff Management" subtitle="Control staff access, role permissions, and shift status." />
        <button className="owner-primary-btn" type="button">Invite Staff</button>
      </header>

      <div className="staff-layout">
        <section className="staff-main">
          <div className="staff-summary">
            {staffStats.map((stat) => (
              <article key={stat.label}>
                <span>{stat.label}</span>
                <strong>{stat.value}</strong>
                <small>{stat.hint}</small>
              </article>
            ))}
          </div>

          <div className="staff-panel">
            <div className="table-tools">
              <label className="search-wrap"><input type="search" placeholder="Search staff name or role" /><Search aria-hidden="true" /></label>
              <div className="owner-filter-tabs">
                <button className="active" type="button">All</button>
                <button type="button">Owner</button>
                <button type="button">Kasir</button>
                <button type="button">Waiters</button>
              </div>
            </div>

            <div className="staff-list">
              {staff.map((person) => (
                <article className="staff-row" key={person.name}>
                  <div className="staff-person">
                    <span><img src={person.avatar} alt={person.name} /></span>
                    <div><strong>{person.name}</strong><small>{person.email}</small><em>{person.activity}</em></div>
                  </div>
                  <span className={`staff-role ${person.role.toLowerCase()}`}>{person.role}</span>
                  <span className="staff-shift"><strong>{person.shift}</strong><small>{person.area}</small></span>
                  <b className={person.status === 'Active' ? 'active' : 'inactive'}>{person.status}</b>
                  <div className="staff-actions">
                    <button type="button" aria-label={`Edit ${person.name}`}><Pencil aria-hidden="true" /></button>
                    <button type="button" aria-label={`Disable ${person.name}`}><UserX aria-hidden="true" /></button>
                  </div>
                </article>
              ))}
            </div>
          </div>
        </section>

        <aside className="staff-editor-panel">
          <div className="staff-panel-top">
            <span className="mini-status ready">New Access</span>
            <button type="button">Send Invite</button>
          </div>
          <div className="staff-editor-head">
            <span className="staff-avatar-large"><img src="https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=160&q=80" alt="Gladina Samantha" /></span>
            <h2>Add Staff</h2>
            <p>Create account access for cashier or waiters.</p>
          </div>
          <div className="editor-fields">
            <label><span>Full Name</span><input defaultValue="Gladina Samantha" /></label>
            <label><span>Email</span><input defaultValue="gladina@blocbarat.local" /></label>
            <div className="editor-field"><span>Role</span><MockSelect value="Waiters" options={['Owner', 'Kasir', 'Waiters']} /></div>
            <div className="editor-field"><span>Shift</span><MockSelect value="Evening" options={['Morning', 'Evening', 'Full Day']} /></div>
          </div>
          <div className="permission-card">
            <h3>Permission Preview</h3>
            <div className="permission-list">
              <p><span />View table status</p>
              <p><span />Confirm customer orders</p>
              <p><span />Update service progress</p>
              <p><span />Mark order as served</p>
            </div>
          </div>
          <div className="editor-actions">
            <button type="button">Cancel</button>
            <button type="button">Save Staff</button>
          </div>
        </aside>
      </div>
    </section>
  );
}

