import { useGetAllWorkers, useGetActiveDrivers } from '../api/generated';

const PATH_COLORS = ['#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

export default function Sidebar({
  isOpen,
  selectedUserIds,
  toggleUserSelection,
  isLiveActive,
  setIsLiveActive,
  dateRange,
  setDateRange,
}: any) {
  const { data: allWorkers, isLoading } = useGetAllWorkers();
  const { data: activeUserIds } = useGetActiveDrivers();

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
                  padding: '12px',
                  marginBottom: '8px',
                  backgroundColor: '#0f172a',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: `1px solid ${isSelected ? color : '#334155'}`,
                  boxShadow: isSelected ? `0 0 6px ${color}40` : 'none',
                }}
              >
                <div style={{ flexGrow: 1 }}>
                  <span style={{ color: 'white' }}>
                    {worker.name} (ID: {worker.id})
                  </span>
                  <br />
                  <small style={{ color: '#94a3b8' }}>{worker.phoneNumber || 'No Phone'}</small>
                </div>
                <span
                  style={{
                    height: 12,
                    width: 12,
                    borderRadius: '50%',
                    backgroundColor: isRecentlyActive ? '#22c55e' : '#64748b',
                  }}
                ></span>
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
          value={dateRange.start}
          onChange={(e) => setDateRange({ ...dateRange, start: e.target.value })}
        />
      </div>

      <div className="form-group">
        <label>End Time</label>
        <input
          type="datetime-local"
          value={dateRange.end}
          onChange={(e) => setDateRange({ ...dateRange, end: e.target.value })}
        />
      </div>
    </div>
  );
}