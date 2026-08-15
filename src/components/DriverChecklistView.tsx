import { useGetAllChecklists, useGetChecklistItems, useGetAllWorkers } from '../api/generated';

interface Props {
  driverId: number;
  onClose?: () => void;
}

export default function DriverChecklistView({ driverId, onClose }: Props) {
  // FIX: Cast hooks to any to suppress expected argument count errors from OpenAPI
  const { data: workers = [] } = (useGetAllWorkers as any)();
  const { data: allChecklists = [], isLoading: isChecklistsLoading } = (useGetAllChecklists as any)();

  // FIX: Helper to safely extract properties whether flat or wrapped in ChecklistWithItemsDTO
  const safeDriverId = (c: any) => c?.checklist?.driverId ?? c?.driverId;
  const safeId = (c: any) => c?.checklist?.id ?? c?.id;

  const driver = workers.find((w: any) => w.id === driverId);
  const driverChecklists = allChecklists.filter((c: any) => safeDriverId(c) === driverId);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      {/* Header */}
      <div style={{ marginBottom: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {onClose && (
          <button
            onClick={onClose}
            style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', fontSize: '13px' }}
          >
            ← Close Panel
          </button>
        )}
      </div>

      {/* Driver Card Info */}
      <div
        style={{
          padding: '12px',
          backgroundColor: '#1e293b',
          borderRadius: '6px',
          border: '1px solid #334155',
          marginBottom: '16px',
        }}
      >
        <h3 style={{ margin: 0, color: 'white', fontSize: '16px' }}>
          {driver ? driver.name : `Driver #${driverId}`}
        </h3>
        <span style={{ fontSize: '12px', color: '#94a3b8' }}>
          Driver ID: {driverId} {driver?.phoneNumber ? `• ${driver.phoneNumber}` : ''}
        </span>
      </div>

      <h4 style={{ color: '#cbd5e1', marginTop: 0, marginBottom: '12px' }}>
        Assigned Checklists ({driverChecklists.length})
      </h4>

      {/* Checklists List */}
      <div style={{ flexGrow: 1, overflowY: 'auto' }}>
        {isChecklistsLoading && <p style={{ color: '#94a3b8' }}>Loading driver tasks...</p>}

        {!isChecklistsLoading && driverChecklists.length === 0 && (
          <div style={{ textAlign: 'center', padding: '24px 12px', color: '#64748b', backgroundColor: '#0f172a', borderRadius: '6px' }}>
            <span style={{ fontSize: '24px', display: 'block', marginBottom: '8px' }}>📭</span>
            No active checklists assigned to this driver.
          </div>
        )}

        {driverChecklists.map((checklist: any) => (
          <ChecklistCard key={safeId(checklist)} checklist={checklist} />
        ))}
      </div>
    </div>
  );
}

// Helper Sub-Component to render a Checklist with its items and progress
function ChecklistCard({ checklist }: { checklist: any }) {
  const safeId = (c: any) => c?.checklist?.id ?? c?.id;
  const safeName = (c: any) => c?.checklist?.name ?? c?.name;

  // FIX: Cast hook to any and pass the checklist ID cleanly
  const { data: items = [], isLoading } = (useGetChecklistItems as any)(safeId(checklist));

  // Compute completion stats
  const totalItems = items.length;
  const completedItems = items.filter((item: any) => item.status === 'COMPLETED').length;
  const progressPercent = totalItems > 0 ? Math.round((completedItems / totalItems) * 100) : 0;

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '6px',
        border: '1px solid #334155',
        marginBottom: '12px',
        padding: '12px',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
        <strong style={{ color: 'white', fontSize: '14px' }}>{safeName(checklist)}</strong>
        <span
          style={{
            fontSize: '11px',
            fontWeight: 'bold',
            padding: '2px 8px',
            borderRadius: '10px',
            backgroundColor: progressPercent === 100 ? '#10b98120' : '#0ea5e920',
            color: progressPercent === 100 ? '#10b981' : '#0ea5e9',
            border: `1px solid ${progressPercent === 100 ? '#10b98150' : '#0ea5e950'}`,
          }}
        >
          {completedItems}/{totalItems} Done ({progressPercent}%)
        </span>
      </div>

      {/* Progress Bar */}
      <div style={{ width: '100%', height: '4px', backgroundColor: '#0f172a', borderRadius: '2px', marginBottom: '12px', overflow: 'hidden' }}>
        <div
          style={{
            width: `${progressPercent}%`,
            height: '100%',
            backgroundColor: progressPercent === 100 ? '#22c55e' : '#0ea5e9',
            transition: 'width 0.3s ease',
          }}
        />
      </div>

      {/* Checklist Items Breakdown */}
      {isLoading ? (
        <small style={{ color: '#64748b' }}>Loading items...</small>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
          {items.map((item: any, idx: number) => {
            const isCompleted = item.status === 'COMPLETED';
            const isCancelled = item.status === 'CANCELLED';

            let statusIcon = '⏳';
            let statusColor = '#f59e0b'; // Pending - Amber

            if (isCompleted) {
              statusIcon = '✅';
              statusColor = '#22c55e'; // Completed - Green
            } else if (isCancelled) {
              statusIcon = '❌';
              statusColor = '#ef4444'; // Cancelled - Red
            }

            return (
              <div
                key={item.id || idx}
                style={{
                  padding: '8px',
                  backgroundColor: '#0f172a',
                  borderRadius: '4px',
                  border: '1px solid #334155',
                }}
              >
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <div style={{ flexGrow: 1 }}>
                    <span style={{ color: 'white', fontSize: '13px', fontWeight: '500' }}>
                      {idx + 1}. {item.name}
                    </span>

                    {item.description && (
                      <p style={{ margin: '2px 0 4px 0', color: '#94a3b8', fontSize: '11px', whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </p>
                    )}

                    {item.completedAt && (
                      <div style={{ fontSize: '10px', color: '#22c55e', marginTop: '2px' }}>
                        Completed: {new Date(item.completedAt).toLocaleString()}
                      </div>
                    )}
                  </div>

                  {/* Status Badge */}
                  <span
                    style={{
                      fontSize: '11px',
                      color: statusColor,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px',
                      whiteSpace: 'nowrap',
                      fontWeight: 'bold',
                    }}
                  >
                    {statusIcon} {item.status || 'PENDING'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}