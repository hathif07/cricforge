import React, { useEffect, useState } from 'react';
import api from '../services/api';
import RoleBadge from '../components/RoleBadge';

const ALL_ROLES = ['admin', 'team_owner', 'scorer', 'tournament_organizer', 'spectator'];

const AdminUsers = () => {
  const [users, setUsers] = useState([]);
  const [search, setSearch] = useState('');
  const [error, setError] = useState('');

  const load = async () => {
    try {
      const { data } = await api.get('/users', { params: { search } });
      setUsers(data.data.users);
    } catch (err) {
      setError(err.response?.data?.message || 'Could not load users.');
    }
  };

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggleRole = async (userItem, role) => {
    const hasRole = userItem.roles.includes(role);
    const newRoles = hasRole ? userItem.roles.filter((r) => r !== role) : [...userItem.roles, role];
    if (newRoles.length === 0) return;
    try {
      await api.put(`/users/${userItem._id}/roles`, { roles: newRoles });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update roles.');
    }
  };

  const toggleStatus = async (userItem) => {
    try {
      await api.patch(`/users/${userItem._id}/status`, { is_active: !userItem.is_active });
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Could not update status.');
    }
  };

  return (
    <div>
      <div className="section-header">
        <h1>User Administration</h1>
      </div>
      {error && <div className="alert alert-error">{error}</div>}

      <form onSubmit={(e) => { e.preventDefault(); load(); }} className="form-row" style={{ marginBottom: 18 }}>
        <input className="form-input" placeholder="Search by name or email" value={search} onChange={(e) => setSearch(e.target.value)} />
        <button className="btn">Search</button>
      </form>

      <div className="table-wrap">
        <table className="data-table">
          <thead>
            <tr>
              <th>Name</th><th>Email</th><th>Roles</th><th>Status</th><th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map((u) => (
              <tr key={u._id}>
                <td>{u.name}</td>
                <td>{u.email}</td>
                <td>{u.roles.map((r) => <RoleBadge key={r} role={r} />)}</td>
                <td>{u.is_active ? <span className="badge badge-solid">Active</span> : <span className="badge badge-outline">Inactive</span>}</td>
                <td>
                  <div className="pill-nav">
                    {ALL_ROLES.map((role) => (
                      <span
                        key={role}
                        className={`pill ${u.roles.includes(role) ? 'active' : ''}`}
                        onClick={() => toggleRole(u, role)}
                      >
                        {role}
                      </span>
                    ))}
                    <button className="btn btn-sm btn-danger" onClick={() => toggleStatus(u)}>
                      {u.is_active ? 'Deactivate' : 'Activate'}
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

export default AdminUsers;
