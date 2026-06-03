import React, { useState, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { Calendar, CheckCircle, Clock, Save, Plus, Trash2, Ban, AlertTriangle } from 'lucide-react';

interface Slot {
  id: number;
  day_of_week: string;
  start_time: string;
  end_time: string;
  slot_duration_minutes: number;
}

interface Appointment {
  id: number;
  patient_id: number;
  appointment_date: string;
  start_time: string;
  end_time: string;
  status: string;
  reason?: string;
  fee_cents: number;
  patient?: {
    full_name: string;
  };
}

interface ScheduleBlock {
  id: number;
  doctor_id: number;
  block_start: string;
  block_end: string;
  reason?: string;
  created_at: string;
}

interface DashboardProps {
  token?: string;
  user?: any;
}

export const LocalDoctorDashboard: React.FC<DashboardProps> = ({ token: propToken }) => {
  let contextToken: string | null = '';
  try {
    const auth = useAuth();
    contextToken = auth.token;
  } catch (e) {
    // Fallback when context is not present (federation mode)
  }

  const token = propToken || contextToken;
  const [activeTab, setActiveTab] = useState<'appointments' | 'schedule' | 'blocks'>('appointments');
  const [slots, setSlots] = useState<Slot[]>([]);
  const [appointments, setAppointments] = useState<Appointment[]>([]);
  const [scheduleBlocks, setScheduleBlocks] = useState<ScheduleBlock[]>([]);
  
  // Form fields for availability
  const [day, setDay] = useState('Monday');
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [duration, setDuration] = useState(30);
  const [msg, setMsg] = useState('');
  
  // Form fields for schedule blocks
  const [blockStart, setBlockStart] = useState('');
  const [blockEnd, setBlockEnd] = useState('');
  const [blockReason, setBlockReason] = useState('');
  
  // Note details
  const [selectedAppt, setSelectedAppt] = useState<Appointment | null>(null);
  const [notes, setNotes] = useState('');
  const [prescription, setPrescription] = useState('');

  const [docProfile, setDocProfile] = useState<any>(null);

  const fetchProfile = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setDocProfile(data);
      }
    } catch (e) {
      console.error("Error fetching doctor profile", e);
    }
  };

  const fetchSlots = async () => {
    if (!docProfile) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/${docProfile.id}/availability`);
      if (res.ok) {
        const data = await res.json();
        setSlots(data);
      }
    } catch (e) {
      console.error("Error fetching slots", e);
    }
  };

  const fetchAppointments = async () => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        const enriched = data.map((appt: any) => ({
          ...appt,
          patient: { full_name: appt.patient?.full_name || `Patient #${appt.patient_id}` }
        }));
        setAppointments(enriched);
      }
    } catch (e) {
      console.error("Error fetching appts", e);
    }
  };

  const fetchScheduleBlocks = async () => {
    if (!docProfile) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/${docProfile.id}/schedule-blocks`);
      if (res.ok) {
        setScheduleBlocks(await res.json());
      }
    } catch (e) {
      console.error("Error fetching schedule blocks", e);
    }
  };

  useEffect(() => {
    if (token) {
      fetchProfile();
      fetchAppointments();
    }
  }, [token]);

  useEffect(() => {
    if (docProfile) {
      fetchSlots();
      fetchScheduleBlocks();
    }
  }, [docProfile]);

  const handleAddSlot = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/availability`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          day_of_week: day,
          start_time: startTime,
          end_time: endTime,
          slot_duration_minutes: duration
        })
      });
      if (res.ok) {
        setMsg("Availability slot added successfully!");
        fetchSlots();
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || "Failed to add slot"}`);
      }
    } catch (e) {
      setMsg("Connection error.");
    }
  };

  const handleDeleteSlot = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/availability/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchSlots();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleConfirm = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments/${id}/confirm`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleComplete = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments/${id}/complete`, {
        method: 'PUT',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleSaveNotes = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedAppt) return;
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/appointments/${selectedAppt.id}/notes`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ notes, prescription })
      });
      if (res.ok) {
        setMsg("Consultation notes saved!");
        setSelectedAppt(null);
        setNotes('');
        setPrescription('');
        fetchAppointments();
      }
    } catch (e) {
      console.error(e);
    }
  };

  const handleCreateBlock = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg('');
    if (!blockStart || !blockEnd) {
      setMsg("Please select both start and end dates.");
      return;
    }
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/schedule-blocks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          block_start: blockStart,
          block_end: blockEnd,
          reason: blockReason || null
        })
      });
      if (res.ok) {
        setMsg("Schedule block created! Slots in this range are now unavailable.");
        setBlockStart('');
        setBlockEnd('');
        setBlockReason('');
        fetchScheduleBlocks();
      } else {
        const err = await res.json();
        setMsg(`Error: ${err.detail || "Failed to create block"}`);
      }
    } catch (e) {
      setMsg("Connection error.");
    }
  };

  const handleDeleteBlock = async (id: number) => {
    try {
      const res = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:8000'}/doctors/schedule-blocks/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (res.ok) {
        fetchScheduleBlocks();
        setMsg("Block removed. Slots are available again.");
      }
    } catch (e) {
      console.error(e);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '2rem', flexWrap: 'wrap' }}>
        <button
          className={`btn ${activeTab === 'appointments' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('appointments'); setMsg(''); }}
        >
          <Calendar size={16} /> Appointments
        </button>
        <button
          className={`btn ${activeTab === 'schedule' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('schedule'); setMsg(''); }}
        >
          <Clock size={16} /> Weekly Schedule
        </button>
        <button
          className={`btn ${activeTab === 'blocks' ? 'btn-primary' : 'btn-secondary'}`}
          onClick={() => { setActiveTab('blocks'); setMsg(''); }}
        >
          <Ban size={16} /> Schedule Blocks
        </button>
      </div>

      {/* ─── Appointments Tab ─── */}
      {activeTab === 'appointments' && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 500px' }} className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Upcoming Patient Appointments</h3>
            {appointments.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No appointments found.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {appointments.map(appt => (
                  <div
                    key={appt.id}
                    className="animate-fade-in"
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1.25rem',
                      background: 'rgba(255,255,255,0.02)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '12px',
                      transition: 'var(--transition)'
                    }}
                  >
                    <div>
                      <h4 style={{ color: 'var(--color-primary-hover)' }}>{appt.patient?.full_name}</h4>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        Date: {new Date(appt.appointment_date).toLocaleDateString()} | Time: {appt.start_time} - {appt.end_time}
                      </p>
                      <p style={{ fontSize: '0.9rem', marginTop: '0.25rem' }}>Reason: {appt.reason || 'Routine Checkup'}</p>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                      <span className={`badge badge-${appt.status}`}>{appt.status}</span>
                      {appt.status === 'pending' && (
                        <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleConfirm(appt.id)}>
                          <CheckCircle size={14} /> Confirm
                        </button>
                      )}
                      {appt.status === 'confirmed' && (
                        <div style={{ display: 'flex', gap: '0.25rem' }}>
                          <button className="btn btn-primary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => setSelectedAppt(appt)}>
                            <Plus size={14} /> Add Notes
                          </button>
                          <button className="btn btn-secondary" style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }} onClick={() => handleComplete(appt.id)}>
                            <CheckCircle size={14} /> Complete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {selectedAppt && (
            <div style={{ flex: '1 1 350px' }} className="glass-card animate-fade-in">
              <h3 style={{ marginBottom: '1.5rem', color: 'var(--color-primary-hover)' }}>Add Consultation Record</h3>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1rem' }}>
                For {selectedAppt.patient?.full_name}
              </p>
              <form onSubmit={handleSaveNotes}>
                <div className="form-group">
                  <label className="form-label">Diagnosis Notes</label>
                  <textarea rows={4} className="form-textarea" value={notes} onChange={e => setNotes(e.target.value)} required />
                </div>
                <div className="form-group">
                  <label className="form-label">Prescription Details</label>
                  <textarea rows={3} className="form-textarea" value={prescription} onChange={e => setPrescription(e.target.value)} placeholder="e.g. Paracetamol 500mg" />
                </div>
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <button className="btn btn-primary" type="submit">
                    <Save size={16} /> Save Record
                  </button>
                  <button className="btn btn-secondary" type="button" onClick={() => setSelectedAppt(null)}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}
        </div>
      )}

      {/* ─── Weekly Schedule Tab ─── */}
      {activeTab === 'schedule' && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 350px' }} className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Add Recurring Availability</h3>
            {msg && <p style={{ color: 'var(--color-primary-hover)', marginBottom: '1rem', fontSize: '0.9rem' }}>{msg}</p>}
            <form onSubmit={handleAddSlot}>
              <div className="form-group">
                <label className="form-label">Day of Week</label>
                <select className="form-select" value={day} onChange={e => setDay(e.target.value)}>
                  <option>Monday</option>
                  <option>Tuesday</option>
                  <option>Wednesday</option>
                  <option>Thursday</option>
                  <option>Friday</option>
                  <option>Saturday</option>
                  <option>Sunday</option>
                </select>
              </div>

              <div className="form-group">
                <label className="form-label">Start Time</label>
                <input className="form-input" type="text" placeholder="09:00" value={startTime} onChange={e => setStartTime(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">End Time</label>
                <input className="form-input" type="text" placeholder="17:00" value={endTime} onChange={e => setEndTime(e.target.value)} required />
              </div>

              <div className="form-group">
                <label className="form-label">Slot Duration (Minutes)</label>
                <select className="form-select" value={duration} onChange={e => setDuration(Number(e.target.value))}>
                  <option value={15}>15 Mins</option>
                  <option value={30}>30 Mins</option>
                  <option value={45}>45 Mins</option>
                  <option value={60}>60 Mins</option>
                </select>
              </div>

              <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                <Plus size={16} /> Add Slot to Schedule
              </button>
            </form>
          </div>

          <div style={{ flex: '1 1 400px' }} className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Current Weekly Schedule</h3>
            {slots.length === 0 ? (
              <p style={{ color: 'var(--text-secondary)' }}>No recurring availability configured.</p>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {slots.map(s => (
                  <div
                    key={s.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '0.75rem 1rem',
                      background: 'rgba(255,255,255,0.01)',
                      border: '1px solid var(--border-color)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <strong style={{ color: 'var(--text-primary)' }}>{s.day_of_week}</strong>
                      <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                        {s.start_time} - {s.end_time} ({s.slot_duration_minutes}m slots)
                      </p>
                    </div>
                    <button className="btn btn-secondary" style={{ padding: '0.4rem', borderRadius: '50%' }} onClick={() => handleDeleteSlot(s.id)}>
                      <Trash2 size={14} color="var(--color-danger)" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ─── Schedule Blocks Tab ─── */}
      {activeTab === 'blocks' && (
        <div style={{ display: 'flex', gap: '2rem', flexWrap: 'wrap' }}>
          <div style={{ flex: '1 1 400px' }} className="glass-card">
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
              <AlertTriangle size={20} color="var(--color-warning)" />
              <h3>Block Your Schedule</h3>
            </div>
            <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>
              Mark a date range as unavailable. All appointment slots within this range will be hidden from patients.
            </p>

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

            <form onSubmit={handleCreateBlock}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label className="form-label">Block Start Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={blockStart}
                    onChange={e => setBlockStart(e.target.value)}
                    required
                  />
                </div>
                <div className="form-group">
                  <label className="form-label">Block End Date *</label>
                  <input
                    type="date"
                    className="form-input"
                    value={blockEnd}
                    onChange={e => setBlockEnd(e.target.value)}
                    min={blockStart}
                    required
                  />
                </div>
              </div>

              <div className="form-group">
                <label className="form-label">Reason (Optional)</label>
                <input
                  type="text"
                  className="form-input"
                  placeholder="e.g. Vacation, Conference, Personal leave"
                  value={blockReason}
                  onChange={e => setBlockReason(e.target.value)}
                />
              </div>

              <button className="btn btn-primary" type="submit" style={{ width: '100%', justifyContent: 'center' }}>
                <Ban size={16} /> Create Schedule Block
              </button>
            </form>
          </div>

          <div style={{ flex: '1 1 400px' }} className="glass-card">
            <h3 style={{ marginBottom: '1.5rem' }}>Active Schedule Blocks</h3>
            {scheduleBlocks.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-secondary)' }}>
                <Calendar size={32} style={{ marginBottom: '0.75rem', opacity: 0.5 }} />
                <p>No schedule blocks set. Your full availability is open for booking.</p>
              </div>
            ) : (
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                {scheduleBlocks.map(block => (
                  <div
                    key={block.id}
                    style={{
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      padding: '1rem',
                      background: 'rgba(239, 68, 68, 0.05)',
                      border: '1px solid rgba(239, 68, 68, 0.15)',
                      borderRadius: '8px'
                    }}
                  >
                    <div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                        <Ban size={14} color="var(--color-danger)" />
                        <strong style={{ color: 'var(--color-danger)' }}>
                          {new Date(block.block_start + 'T00:00:00').toLocaleDateString()} — {new Date(block.block_end + 'T00:00:00').toLocaleDateString()}
                        </strong>
                      </div>
                      {block.reason && (
                        <p style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', marginTop: '0.25rem' }}>
                          Reason: {block.reason}
                        </p>
                      )}
                    </div>
                    <button
                      className="btn btn-secondary"
                      style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem' }}
                      onClick={() => handleDeleteBlock(block.id)}
                    >
                      <Trash2 size={14} /> Remove
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default LocalDoctorDashboard;
