import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Search, Calendar, Building2 } from 'lucide-react';

interface Doctor {
  id: number;
  full_name: string;
  bio?: string;
  department?: string;
  consultation_fee_cents: number;
  experience_years: number;
  is_verified: boolean;
  specializations: Array<{ name: string }>;
}

interface Appointment {
  id: number;
  doctor_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason?: string;
  doctor?: {
    full_name: string;
    department?: string;
  };
}

interface DashboardProps {
  token?: string;
  user?: any;
}

export const LocalPatientDashboard: React.FC<DashboardProps> = ({ token: propToken, user: propUser }) => {
  let contextToken: string | null = '';
  let contextUser: any = null;
  try {
    const auth = useAuth();
    contextToken = auth.token;
    contextUser = auth.user;
  } catch (e) {
    // Fallback when context is not present (federation mode)
  }

  const token = propToken || contextToken;
  const user = propUser || contextUser;
  const [activeTab, setActiveTab] = useState<'find' | 'my-bookings'>('find');
  const [doctors, setDoctors] = useState<Doctor[]>([]);
  const [search, setSearch] = useState('');
  const [spec, setSpec] = useState('');
  const [dept, setDept] = useState('');
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  
  // Booking flow state
  const [selectedDoc, setSelectedDoc] = useState<Doctor | null>(null);
  const [bookingDate, setBookingDate] = useState(new Date().toISOString().split('T')[0]);
  const [availableSlots, setAvailableSlots] = useState<Array<{ start_time: string; end_time: string }>>([]);
  const [selectedTime, setSelectedTime] = useState('');
  const [reason, setReason] = useState('');
  const [msg, setMsg] = useState('');

  const fetchDoctors = async () => {
    try {
      const params = new URLSearchParams();
      if (search) params.set('search', search);
      if (spec) params.set('specialization', spec);
      if (dept) params.set('department', dept);
      const url = `${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors?${params.toString()}`;
      const res = await fetch(url);
      if (res.ok) {
        setDoctors(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        setAppointments(await res.json());
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchDoctors();
    fetchAppointments();
  }, [search, spec, dept, token]);

  const handleFetchSlots = async () => {
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
    if (selectedDoc) {
      handleFetchSlots();
    }
  }, [selectedDoc, bookingDate]);

  const handleBook = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedDoc || !selectedTime) return;
    setMsg('');
    try {
      // Ensure patient profile exists
      await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/patients/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ full_name: user?.full_name || "Patient" })
      });

      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          doctor_id: selectedDoc.id,
          appointment_date: `${bookingDate}T${selectedTime}:00`,
          reason,
          type: 'in_person'
        })
      });
      if (res.ok) {
        setMsg("Appointment booked successfully!");
        setSelectedDoc(null);
        setReason('');
        setSelectedTime('');
        fetchAppointments();
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || "Booking failed"}`);
      }
    } catch (e) {
      setMsg("Connection error.");
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem' }}>
        <button
          className={`btn ${activeTab === 'find' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('find')}
        >
          <Search size={16} /> Find a Doctor
        </button>
        <button
          className={`btn ${activeTab === 'my-bookings' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => setActiveTab('my-bookings')}
        >
          <Calendar size={16} /> My Bookings
        </button>
      </div>

      {activeTab === 'find' ? (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '2 1 500px' }} className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Browse Specialists</h3>
            
            {/* Search filter row */}
            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
              <div style={{ position: 'relative', flex: '2 1 200px' }}>
                <input
                  type="text"
                  className="form-input"
                  placeholder="Search by name..."
                  value={search}
                  onChange={e => setSearch(e.target.value)}
                />
              </div>
              <input
                type="text"
                className="form-input"
                style={{ flex: '1 1 150px' }}
                placeholder="Specialization..."
                value={spec}
                onChange={e => setSpec(e.target.value)}
              />
              <input
                type="text"
                className="form-input"
                style={{ flex: '1 1 150px' }}
                placeholder="Department..."
                value={dept}
                onChange={e => setDept(e.target.value)}
              />
            </div>

            {doctors.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No doctors found matching filters.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {doctors.map(doc => (
                  <div
                    key={doc.id}
                    style={{
                      padding: '1.5rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      flexWrap: 'wrap',
                      gap: '1.5rem',
                      transition: 'var(--transition)',
                    }}
                    className="animate-fade-in"
                  >
                    <div>
                      <h4 style={{ color: 'var(--text-primary)', marginBottom: '0.25rem' }}>{doc.full_name}</h4>
                      <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '0.5rem', flexWrap: 'wrap' }}>
                        {doc.department && (
                          <span style={{
                            background: 'rgba(59, 130, 246, 0.1)',
                            color: 'var(--color-secondary)',
                            fontSize: '0.75rem',
                            padding: '0.2rem 0.5rem',
                            borderRadius: '4px',
                            fontWeight: 'bold',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.25rem'
                          }}>
                            <Building2 size={10} /> {doc.department}
                          </span>
                        )}
                        {doc.specializations.map((s, idx) => (
                          <span key={idx} style={{ background: 'rgba(13,148,136,0.1)', color: 'var(--color-primary-hover)', fontSize: '0.75rem', padding: '0.2rem 0.5rem', borderRadius: '4px', fontWeight: 'bold' }}>
                            {s.name}
                          </span>
                        ))}
                      </div>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{doc.bio || 'General Clinical Medicine Practitioner'}</p>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                        Exp: {doc.experience_years} years | Fee: ₹{doc.consultation_fee_cents / 100}
                      </p>
                    </div>
                    <button className="btn btn-primary" onClick={() => setSelectedDoc(doc)}>
                      Book Appointment
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedDoc && (
            <div style={{ flex: '1 1 350px' }} className="glass-card animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary-hover)' }}>Schedule Booking</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.25rem' }}>
                With {selectedDoc.full_name}
              </p>
              {selectedDoc.department && (
                <p style={{ color: 'var(--color-secondary)', fontSize: '0.85rem', marginBottom: '1rem' }}>
                  <Building2 size={12} style={{ display: 'inline', verticalAlign: 'middle', marginRight: '0.25rem' }} />
                  {selectedDoc.department}
                </p>
              )}
              {msg && (
                <div style={{
                  color: msg.startsWith('Error') ? 'var(--color-danger)' : 'var(--color-success)',
                  background: msg.startsWith('Error') ? 'rgba(239, 68, 68, 0.1)' : 'rgba(16, 185, 129, 0.1)',
                  padding: '0.75rem',
                  borderRadius: '8px',
                  marginBottom: '1rem',
                  fontSize: '0.9rem',
                  border: `1px solid ${msg.startsWith('Error') ? 'rgba(239, 68, 68, 0.2)' : 'rgba(16, 185, 129, 0.2)'}`
                }}>
                  {msg}
                </div>
              )}
              <form onSubmit={handleBook}>
                <div className="form-group">
                  <label className="form-label">Booking Date</label>
                  <input
                    type="date"
                    className="form-input"
                    value={bookingDate}
                    onChange={e => setBookingDate(e.target.value)}
                    required
                  />
                </div>

                <div className="form-group">
                  <label className="form-label">Select Available Time</label>
                  {availableSlots.length === 0 ? (
                    <p style={{ color: 'var(--color-danger)', fontSize: '0.85rem' }}>No slots available on this date. The doctor may be unavailable or fully booked.</p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem', maxHeight: '150px', overflowY: 'auto', padding: '0.25rem' }}>
                      {availableSlots.map((s, idx) => (
                        <button
                          key={idx}
                          type="button"
                          className={`btn ${selectedTime === s.start_time ? 'btn-primary' : 'btn-secondary'}`}
                          style={{ padding: '0.5rem', fontSize: '0.85rem', justifyContent: 'center' }}
                          onClick={() => setSelectedTime(s.start_time)}
                        >
                          {s.start_time}
                        </button>
                      ))}
                    </div>
                  )}
                </div>

                <div className="form-group">
                  <label className="form-label">Reason for Visit</label>
                  <input
                    type="text"
                    className="form-input"
                    placeholder="Brief description..."
                    value={reason}
                    onChange={e => setReason(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" type="submit" disabled={!selectedTime} style={{ flex: 1, justifyContent: 'center' }}>
                    Confirm Booking
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedDoc(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      ) : (
        <div className="glass-card">
          <h3 style={{ marginBottom: '1.5rem' }}>My Appointment History</h3>
          {appointments.length === 0 ? (
            <p style={{ color: 'var(--text-secondary)' }}>You have no bookings recorded.</p>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {appointments.map(appt => (
                <div
                  key={appt.id}
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    padding: '1rem',
                    background: 'rgba(255,255,255,0.02)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '8px'
                  }}
                >
                  <div>
                    <h4 style={{ color: 'var(--color-primary-hover)' }}>{appt.doctor?.full_name || `Doctor #${appt.doctor_id}`}</h4>
                    {appt.doctor?.department && (
                      <span style={{ fontSize: '0.75rem', color: 'var(--color-secondary)', fontWeight: '600' }}>{appt.doctor.department}</span>
                    )}
                    <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                      Date: {new Date(appt.appointment_date).toLocaleDateString()} | Time: {appt.start_time} - {appt.end_time}
                    </p>
                    <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Reason: {appt.reason || 'None'}</p>
                  </div>
                  <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LocalPatientDashboard;
