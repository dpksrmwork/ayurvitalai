import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Activity, CheckCircle, Users, Briefcase, Calendar } from 'lucide-react';

interface UserItem {
  id: number;
  email: string;
  role: string;
  full_name: string;
  doctor_profile_id?: number;
  is_verified?: boolean;
}

interface Stats {
  users: {
    total: number;
    doctors: number;
    patients: number;
  };
  appointments: {
    pending: number;
    confirmed: number;
    completed: number;
    cancelled: number;
    no_show: number;
  };
}

interface DashboardProps {
  token?: string;
  user?: any;
}

export const LocalAdminDashboard: React.FC<DashboardProps> = ({ token: propToken }) => {
  let contextToken: string | null = '';
  try {
    const auth = useAuth();
    contextToken = auth.token;
  } catch (e) {
    // Fallback when context is not present (federation mode)
  }

  const token = propToken || contextToken;
  const [users, setUsers] = useState<UserItem[]>([]);
  const [stats, setStats] = useState<Stats | null>(null);
  const [activeTab, setActiveTab] = useState<'stats' | 'users'>('stats');
  const [msg, setMsg] = useState('');

  const fetchStats = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/stats`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setStats(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setUsers(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchUsers();
  }, [token]);

  const handleVerifyDoctor = async (doctorProfileId: number, currentVerifyStatus: boolean) => {
    setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/admin/doctors/${doctorProfileId}/verify?is_verified=${!currentVerifyStatus}`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setMsg("Doctor verification status updated!");
        fetchUsers();
        fetchStats();
      }
    } catch (e) {
      setMsg("Failed to verify doctor.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className={`btn ${activeTab === 'stats' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('stats')}
        >
          <Activity size={16} /> Platform Metrics
        </button>
        <button
          className={`btn ${activeTab === 'users' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('users')}
        >
          <Users size={16} /> Manage Platform Users
        </button>
      </div>

      {msg && <p style={{ color: 'var(--color-primary-hover)', marginBottom: '1rem' }}>{msg}</p>}

      {activeTab === 'stats' && stats ? (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          {/* Stats Grid Cards */}
          <div className="grid grid-3">
            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(59,130,246,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                <Users size={28} color="#3b82f6" />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Total Platform Users</span>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>{stats.users.total}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(13,148,136,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                <Briefcase size={28} color="#0d9488" />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Registered Doctors</span>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>{stats.users.doctors}</h3>
              </div>
            </div>

            <div className="glass-card" style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
              <div style={{ background: 'rgba(16,185,129,0.1)', padding: '0.75rem', borderRadius: '12px' }}>
                <Calendar size={28} color="#10b981" />
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Registered Patients</span>
                <h3 style={{ fontSize: '1.75rem', margin: 0 }}>{stats.users.patients}</h3>
              </div>
            </div>
          </div>

          {/* Appointment aggregates */}
          <div className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Appointment Aggregates</h3>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Pending Approval</span>
                <h4 style={{ fontSize: '1.5rem', color: 'var(--color-warning)', marginTop: '0.5rem' }}>{stats.appointments.pending}</h4>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Confirmed Bookings</span>
                <h4 style={{ fontSize: '1.5rem', color: 'var(--color-secondary)', marginTop: '0.5rem' }}>{stats.appointments.confirmed}</h4>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Completed Visits</span>
                <h4 style={{ fontSize: '1.5rem', color: 'var(--color-success)', marginTop: '0.5rem' }}>{stats.appointments.completed}</h4>
              </div>
              <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.01)', border: '1px solid var(--border-color)', borderRadius: '8px', textAlign: 'center' }}>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Cancelled Sessions</span>
                <h4 style={{ fontSize: '1.5rem', color: 'var(--color-danger)', marginTop: '0.5rem' }}>{stats.appointments.cancelled}</h4>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>Platform Users Registry</h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {users.map(u => (
              <div
                key={u.id}
                style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '1rem',
                  background: 'rgba(255,255,255,0.02)',
                  border: '1px solid var(--border-color)',
                  borderRadius: '8px',
                  flexWrap: 'wrap',
                  gap: '1rem'
                }}
              >
                <div>
                  <h4 style={{ color: 'var(--text-primary)' }}>{u.full_name}</h4>
                  <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                    Email: {u.email} | Role: <span style={{ textTransform: 'uppercase', fontWeight: 'bold', fontSize: '0.75rem', color: 'var(--color-primary-hover)' }}>{u.role}</span>
                    {u.role === 'doctor' && (
                      <span style={{ marginLeft: '0.5rem', color: u.is_verified ? 'var(--color-success)' : 'var(--color-warning)', fontWeight: 'bold' }}>
                        ({u.is_verified ? 'Verified' : 'Pending Verification'})
                      </span>
                    )}
                  </p>
                </div>

                {u.role === 'doctor' && (
                  <button 
                    className={`btn ${u.is_verified ? 'btn-secondary' : 'btn-primary'}`} 
                    onClick={() => handleVerifyDoctor(u.doctor_profile_id || 1, u.is_verified || false)}
                  >
                    <CheckCircle size={14} /> {u.is_verified ? 'Unverify Doctor' : 'Verify Doctor'}
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalAdminDashboard;
