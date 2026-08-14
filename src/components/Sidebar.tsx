import { useEffect } from 'react';
import { useGetAllWorkers, useGetActiveDrivers } from '../api/generated';

const PATH_COLORS = ['#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

export const getDefaultStartDateTime = () => '2020-01-01T00:00';

export const getCurrentEndDateTime = () => {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const hours = String(now.getHours()).padStart(2, '0');
  const minutes = String(now.getMinutes()).padStart(2, '0');
  return `${year}-${month}-${day}T${hours}:${minutes}`;
};

interface SidebarProps {
  isOpen: boolean;
  selectedUserIds: Set<number>;
  toggleUserSelection: (userId: number) => void;
  isLiveActive: boolean;
  setIsLiveActive: (active: boolean) => void;
  dateRange: { start: string; end: string };
  setDateRange: (range: { start: string; end: string }) => void;
  onSelectDriverChecklist?: (driverId: number) => void; // Added handler
}

export default function Sidebar({
  isOpen,
  selectedUserIds,
  toggleUserSelection,
  isLiveActive,
  setIsLiveActive,
  dateRange,
  setDateRange,
  onSelectDriverChecklist,
}: SidebarProps) {
  const { data: allWorkers, isLoading } = useGetAllWorkers();
  const { data: activeUserIds } = useGetActiveDrivers();

  useEffect(() => {
    if (!dateRange?.start || !dateRange?.end) {
      setDateRange({
        start: dateRange?.start || getDefaultStartDateTime(),
        end: dateRange?.end || getCurrentEndDateTime(),
      });
    }
  }, []);

  return (
    <div id="sidebar" className={isOpen ? '' : 'collapsed'}>
      <h2>Active Fleet Roster</h2>

      <div className="form-group">
        <label>Select Drivers</label>
        <div id="rosterContainer">
          {isLoading && <p style={{ color: '#64748b' }}>Connecting to fleet database...</p>}
          {!isLoading && (!allWorkers || allWorkers.length === 0) && (
            <p style={{ color: '#64748b' }}>No workers registered.</p>
          )}

          {allWorkers?.map((worker: any, index: number) => {
            const isSelected = selectedUserIds.has(worker.id);
            const isRecentlyActive = activeUserIds?.includes(worker.id);
            const color = PATH_COLORS[index % PATH_COLORS.length];

            return (
              <div
                key={worker.id}
                onClick={() => toggleUserSelection(worker.id)}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? color : '#334155'}`,
                  boxShadow: isSelected ? `0 0 6px ${color}40` : 'none',
                  gap: '8px',
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <span
                      style={{
                        height: 10,
                        width: 10,
                        borderRadius: '50%',
                        backgroundColor: isRecentlyActive ? '#22c55e' : '#64748b',
                        display: 'inline-block',
                      }}
                    />
                    <strong style={{ color: 'white', fontSize: '14px' }}>{worker.name}</strong>
                  </div>
                  <small style={{ color: '#94a3b8', display: 'block', marginTop: '2px' }}>
                    ID: {worker.id} • {worker.phoneNumber || 'No Phone'}
                  </small>
                </div>

                {/* Inspect Driver Checklists Button */}
                {onSelectDriverChecklist && (
                  <button
                    title="View Driver Tasks"
                    onClick={(e) => {
                      e.stopPropagation(); // Prevents toggling map path selection
                      onSelectDriverChecklist(worker.id);
                    }}
                    style={{
                      padding: '6px 10px',
                      backgroundColor: '#1e293b',
                      color: '#0ea5e9',
                      border: '1px solid #0ea5e950',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      fontWeight: 'bold',
                    }}
                  >
                    📋 Tasks
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </div>

      <div className="form-group" style={{ flexDirection: 'row', alignItems: 'center', gap: '10px' }}>
        <input type="checkbox" checked={isLiveActive} onChange={(e) => setIsLiveActive(e.target.checked)} />
        <label style={{ color: '#22c55e' }}>Enable Live Streaming</label>
      </div>

      <div className="form-group">
        <label>Start Time</label>
        <input
          type="datetime-local"
          value={dateRange?.start || getDefaultStartDateTime()}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>End Time</label>
        <input
          type="datetime-local"
          value={dateRange?.end || getCurrentEndDateTime()}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
        />
      </div>
    </div>
  );
}