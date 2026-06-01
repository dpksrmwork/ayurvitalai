import React, { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './AuthContext';
import { LogOut, Calendar, Shield, User as UserIcon, Activity, Stethoscope } from 'lucide-react';

import DoctorDashboard from './components/DoctorDashboard';
import PatientDashboard from './components/PatientDashboard';
import AdminDashboard from './components/AdminDashboard';

const DashboardShell: React.FC = () => {
  const { user, token, logout } = useAuth();
  const [activeTab, setActiveTab] = useState<string>('dashboard');

  if (!user) return null;

  return (
    <div className="app-layout">
      <aside className="sidebar">
        <div className="logo-section">
          <Activity size={24} color="#0d9488" />
          <h1>AyurVital SaaS</h1>
        </div>

        <nav className="sidebar-nav">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`nav-link ${activeTab === 'dashboard' ? 'active' : ''}`}
          >
            {user.role === 'doctor' && <Stethoscope size={18} />}
            {user.role === 'patient' && <Calendar size={18} />}
            {user.role === 'admin' && <Shield size={18} />}
            <span>Portal Dashboard</span>
          </button>
          
          <button
            onClick={() => setActiveTab('profile')}
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`}
          >
            <UserIcon size={18} />
            <span>Profile Settings</span>
          </button>
        </nav>

        <div className="sidebar-footer">
          <button onClick={logout} className="nav-link" style={{ color: 'var(--color-danger)' }}>
            <LogOut size={18} />
            <span>Logout</span>
          </button>
        </div>
      </aside>

      <main className="main-content">
        <header className="top-bar">
          <div className="page-title">
            <h2>{activeTab === 'dashboard' ? `${user.role.toUpperCase()} PORTAL` : 'PROFILE SETTINGS'}</h2>
          </div>
          <div className="user-profile-menu" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>{user.email}</span>
            <div className="avatar">{user.full_name.charAt(0)}</div>
            <button onClick={logout} className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center' }}>
              <LogOut size={14} style={{ marginRight: '0.3rem' }} /> Logout
            </button>
          </div>
        </header>

        <section className="content-body">
          {activeTab === 'dashboard' ? (
            <>
              {user.role === 'doctor' && <DoctorDashboard token={token || undefined} user={user} />}
              {user.role === 'patient' && <PatientDashboard token={token || undefined} user={user} />}
              {user.role === 'admin' && <AdminDashboard token={token || undefined} user={user} />}
            </>
          ) : (
            <ProfileSettings />
          )}
        </section>
      </main>
    </div>
  );
};

const ProfileSettings: React.FC = () => {
  const { user } = useAuth();
  return (
    <div className="glass-card animate-fade-in">
      <h3 style={{ marginBottom: '1rem', color: 'var(--color-primary-hover)' }}>Account Profile Info</h3>
      <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>Configure details for your AyurVital account</p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', maxWidth: '400px' }}>
        <div>
          <label className="form-label">Full Name</label>
          <input className="form-input" type="text" value={user?.full_name} readOnly />
        </div>
        <div>
          <label className="form-label">Email Address</label>
          <input className="form-input" type="email" value={user?.email} readOnly />
        </div>
        <div>
          <label className="form-label">User Role</label>
          <input className="form-input" type="text" value={user?.role.toUpperCase()} readOnly />
        </div>
      </div>
    </div>
  );
};

interface Doctor {
  id: number;
  full_name: string;
  department?: string;
  consultation_fee_cents: number;
  specializations: Array<{ name: string }>;
}

const GuestBookingForm: React.FC<{ onBack: () => void }> = ({ onBack }) => {
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  
  // Guest Details
  const [patientName, setPatientName] = useState('');
  const [patientEmail, setPatientEmail] = useState('');
  const [patientPhone, setPatientPhone] = useState('');
  
  // Search filters
  const [searchName, setSearchName] = useState('');
  const [searchDept, setSearchDept] = useState('');
  const [searchSpec, setSearchSpec] = useState('');
  
  const [msg, setMsg] = useState('');
  const [error, setError] = useState('');

  const fetchDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (searchName) params.set('search', searchName);
      if (searchDept) params.set('department', searchDept);
      if (searchSpec) params.set('specialization', searchSpec);
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors?${params.toString()}`);
      if (res.ok) {
        setDoctors(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchSlots = async () => {
    if (!selectedDoc) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/${selectedDoc.id}/slots/${bookingDate}`);
      if (res.ok) {
        const data = await res.json();
        setAvailableSlots(data.slots || []);
        setSelectedTime('');
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctors();
  }, [searchName, searchDept, searchSpec]);

  useEffect(() => {
    if (selectedDoc) {
      fetchSlots();
    }
  }, [selectedDoc, bookingDate]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    setError('');
    
    if (!selectedDoc || !selectedTime) {
      setError("Please select a doctor and an available time slot.");
      return;
    }

    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments/guest`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          doctor_id: selectedDoc.id,
          appointment_date: `${bookingDate}T${selectedTime}:00`,
          reason,
          patient_name: patientName,
          patient_email: patientEmail,
          patient_phone: patientPhone || null
        })
      });
      
      if (res.ok) {
        setMsg("Guest appointment booked successfully!");
        setReason('');
        setSelectedTime('');
        setSelectedDoc(null);
        setPatientName('');
        setPatientEmail('');
        setPatientPhone('');
      } else {
        const data = await res.json();
        setError(data.detail || "Failed to book appointment.");
      }
    } catch (e) {
      setError("Connection error. Could not reach server.");
    }
  };

  return (
    <div className="auth-container" style={{ padding: '2rem' }}>
      <div className="glass-card" style={{ maxWidth: '650px', width: '100%', padding: '2rem', backdropFilter: 'blur(16px)' }}>
        <h2 style={{ marginBottom: '0.5rem', color: 'var(--color-primary)' }}>Schedule Quick Visit</h2>
        <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          Schedule a direct clinical session instantly as a guest without creating an account.
        </p>
        
        {msg && <div style={{ color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(16, 185, 129, 0.2)', fontSize: '0.9rem' }}>{msg}</div>}
        {error && <div style={{ color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', border: '1px solid rgba(239, 68, 68, 0.2)', fontSize: '0.9rem' }}>{error}</div>}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <div className="form-group">
              <label className="form-label">Full Name *</label>
              <input type="text" className="form-input" value={patientName} onChange={e => setPatientName(e.target.value)} required placeholder="Jane Doe" />
            </div>
            <div className="form-group">
              <label className="form-label">Email Address *</label>
              <input type="email" className="form-input" value={patientEmail} onChange={e => setPatientEmail(e.target.value)} required placeholder="jane@example.com" />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Phone Number (Optional)</label>
            <input type="text" className="form-input" value={patientPhone} onChange={e => setPatientPhone(e.target.value)} placeholder="+1 (555) 019-2834" />
          </div>

          {/* Doctor Search Filters */}
          <div style={{ background: 'rgba(255,255,255,0.02)', borderRadius: '8px', padding: '1rem', border: '1px solid var(--border-color)' }}>
            <label className="form-label" style={{ marginBottom: '0.75rem', color: 'var(--text-primary)', fontSize: '0.9rem', fontWeight: 600 }}>Find a Doctor</label>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.5rem', marginBottom: '0.75rem' }}>
              <input type="text" className="form-input" style={{ fontSize: '0.85rem', padding: '0.5rem' }} placeholder="Name..." value={searchName} onChange={e => setSearchName(e.target.value)} />
              <input type="text" className="form-input" style={{ fontSize: '0.85rem', padding: '0.5rem' }} placeholder="Department..." value={searchDept} onChange={e => setSearchDept(e.target.value)} />
              <input type="text" className="form-input" style={{ fontSize: '0.85rem', padding: '0.5rem' }} placeholder="Specialization..." value={searchSpec} onChange={e => setSearchSpec(e.target.value)} />
            </div>
          </div>

          <div className="form-group">
            <label className="form-label">Select Specialist *</label>
            <select className="form-select" value={selectedDoc?.id || ''} onChange={e => {
              const doc = doctors.find(d => d.id === Number(e.target.value));
              setSelectedDoc(doc || null);
            }} required>
              <option value="">-- Choose a Doctor --</option>
              {doctors.map(doc => (
                <option key={doc.id} value={doc.id}>
                  {doc.full_name} {doc.department ? `[${doc.department}]` : ''} ({doc.specializations.map(s => s.name).join(', ')})
                </option>
              ))}
            </select>
          </div>

          {selectedDoc && (
            <>
              <div className="form-group">
                <label className="form-label">Booking Date *</label>
                <input type="date" className="form-input" value={bookingDate} onChange={e => setBookingDate(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Select Slot *</label>
                {availableSlots.length === 0 ? (
                  <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>No slots available on this date. The doctor may be unavailable or fully booked.</p>
                ) : (
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem', maxHeight: '120px', overflowY: 'auto' }}>
                    {availableSlots.map((s, idx) => (
                      <button
                        key={idx}
                        type="button"
                        className={`btn ${selectedTime === s.start_time ? 'btn-primary' : 'btn-secondary'}`}
                        style={{ padding: '0.4rem', fontSize: '0.85rem', justifyContent: 'center' }}
                        onClick={() => setSelectedTime(s.start_time)}
                      >
                        {s.start_time}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}

          <div className="form-group">
            <label className="form-label">Reason for Visit</label>
            <input type="text" className="form-input" value={reason} onChange={e => setReason(e.target.value)} placeholder="e.g. Regular Checkup" />
          </div>

          <div style={{ display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
            <button className="btn btn-primary" type="submit" disabled={!selectedTime} style={{ flex: 1, justifyContent: 'center' }}>
              Confirm Booking
            </button>
            <button className="btn btn-secondary" type="button" onClick={onBack}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

const AuthGate: React.FC = () => {
  const { user, login, loading } = useAuth();
  const [view, setView] = useState<'landing' | 'auth' | 'guest-booking'>('landing');
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [role, setRole] = useState<'doctor' | 'patient' | 'admin'>('patient');
  const [error, setError] = useState('');
  const [msg, setMsg] = useState('');

  if (loading) return (
    <div style={{ height: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#0f172a' }}>
      <div style={{ width: '40px', height: '40px', border: '3px solid rgba(13,148,136,0.2)', borderTopColor: '#0d9488', borderRadius: '50%', animation: 'spin 1s linear infinite' }}></div>
    </div>
  );

  if (user) return <DashboardShell />;

  const handleRoleSelect = (selectedRole: 'doctor' | 'patient' | 'admin') => {
    setRole(selectedRole);
    // If selecting admin, pre-fill email if wanted, or just open form
    if (selectedRole === 'doctor') {
      setEmail('doctor1@healthtech.com');
      setPassword('password123');
    } else if (selectedRole === 'patient') {
      setEmail('patient1@healthtech.com');
      setPassword('password123');
    } else {
      setEmail('admin@healthtech.com');
      setPassword('adminpassword');
    }
    setView('auth');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setMsg('');

    if (isRegister) {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/register`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password, role, full_name: fullName })
        });
        const data = await res.json();
        if (res.ok) {
          setMsg("Registered successfully! Please log in.");
          setIsRegister(false);
        } else {
          setError(data.detail || "Registration failed");
        }
      } catch (err) {
        setError("Could not reach authentication server.");
      }
    } else {
      try {
        const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ email, password })
        });
        const data = await res.json();
        if (res.ok) {
          await login(data.access_token, data.refresh_token);
        } else {
          setError(data.detail || "Invalid login credentials.");
        }
      } catch (err) {
        setError("Could not reach authentication server.");
      }
    }
  };

  if (view === 'landing') {
    return (
      <div className="landing-container animate-fade-in">
        <div className="hero-badge">Connected Healthcare Workspace</div>
        <h1 className="landing-title">
          Welcome to <span>AyurVital AI Clinic</span>
        </h1>
        <p className="landing-subtitle">
          Select your portal workspace node to log in, review records, configure calendar schedules, or configure platform properties.
        </p>

        <div className="portal-roles-grid">
          <div className="glass-card role-preview-card" style={{ cursor: 'pointer' }} onClick={() => handleRoleSelect('patient')}>
            <div className="role-icon-box" style={{ background: 'rgba(59, 130, 246, 0.15)' }}>
              <Calendar size={24} color="#3b82f6" />
            </div>
            <h3>Patient Workspace</h3>
            <p>Schedule dynamic clinical visits, manage your personal medical chart, view prescriptions, and communicate with verified practitioners.</p>
            <span className="role-tag">Access Patient Portal ➜</span>
          </div>

          <div className="glass-card role-preview-card" style={{ cursor: 'pointer' }} onClick={() => handleRoleSelect('doctor')}>
            <div className="role-icon-box" style={{ background: 'rgba(13, 148, 136, 0.15)' }}>
              <Stethoscope size={24} color="#0d9488" />
            </div>
            <h3>Doctor Workspace</h3>
            <p>Manage your recurring availability blocks, verify incoming appointments, write medical notes, and issue patient prescriptions.</p>
            <span className="role-tag">Access Doctor Portal ➜</span>
          </div>

          <div className="glass-card role-preview-card" style={{ cursor: 'pointer' }} onClick={() => handleRoleSelect('admin')}>
            <div className="role-icon-box" style={{ background: 'rgba(245, 158, 11, 0.15)' }}>
              <Shield size={24} color="#f59e0b" />
            </div>
            <h3>Admin Workspace</h3>
            <p>Review real-time system metrics, moderate registered doctor credentials, and coordinate global platform configurations.</p>
            <span className="role-tag">Access Admin Portal ➜</span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
          <button className="btn btn-primary" onClick={() => setView('guest-booking')}>
            <Calendar size={16} style={{ marginRight: '0.5rem' }} /> Book Appointment
          </button>
          <button className="btn btn-secondary" onClick={() => { setView('auth'); setIsRegister(false); }}>
            Direct Login
          </button>
          <button className="btn btn-secondary" onClick={() => { setView('auth'); setIsRegister(true); }}>
            Register New Account
          </button>
        </div>
      </div>
    );
  }

  if (view === 'guest-booking') {
    return <GuestBookingForm onBack={() => setView('landing')} />;
  }

  return (
    <div className="auth-container">
      <div className="glass-card auth-card animate-fade-in">
        <div className="auth-header">
          <Activity size={48} color="#0d9488" style={{ marginBottom: '1rem' }} />
          <h2>{isRegister ? 'Join AyurVital' : `Portal Login: ${role.toUpperCase()}`}</h2>
          <p>{isRegister ? 'Create your platform account' : `Access your clinical ${role} workspace`}</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div style={{ color: 'var(--color-danger)', background: 'rgba(239, 68, 68, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>{error}</div>}
          {msg && <div style={{ color: 'var(--color-success)', background: 'rgba(16, 185, 129, 0.1)', padding: '0.75rem', borderRadius: '8px', marginBottom: '1rem', fontSize: '0.9rem', border: '1px solid rgba(16, 185, 129, 0.2)' }}>{msg}</div>}

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Full Name</label>
              <input className="form-input" type="text" value={fullName} onChange={e => setFullName(e.target.value)} required />
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Email Address</label>
            <input className="form-input" type="email" value={email} onChange={e => setEmail(e.target.value)} required />
          </div>

          <div className="form-group">
            <label className="form-label">Password</label>
            <input className="form-input" type="password" value={password} onChange={e => setPassword(e.target.value)} required />
          </div>

          {isRegister && (
            <div className="form-group">
              <label className="form-label">Register As</label>
              <select className="form-select" value={role} onChange={e => setRole(e.target.value as any)}>
                <option value="patient">Patient</option>
                <option value="doctor">Doctor</option>
                <option value="admin">Platform Admin</option>
              </select>
            </div>
          )}

          <button className="btn btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '1rem' }} type="submit">
            {isRegister ? 'Register' : 'Login'}
          </button>
        </form>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1.25rem', alignItems: 'center' }}>
          <div className="auth-toggle">
            {isRegister ? 'Already have an account?' : "Don't have an account?"}
            <button onClick={() => { setIsRegister(!isRegister); setError(''); setMsg(''); }}>
              {isRegister ? 'Login instead' : 'Create account'}
            </button>
          </div>
          <button className="btn btn-secondary" style={{ width: '100%', justifyContent: 'center', fontSize: '0.85rem', padding: '0.5rem' }} onClick={() => setView('landing')}>
            Back to Home
          </button>
        </div>
      </div>
    </div>
  );
};

const App: React.FC = () => {
  return (
    <AuthProvider>
      <AuthGate />
    </AuthProvider>
  );
};

export default App;

