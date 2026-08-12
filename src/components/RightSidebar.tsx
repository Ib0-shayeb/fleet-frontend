import type { RightPanelState } from '../types';
import ChecklistManager from './ChecklistManager';
import TripDetailsView from './TripDetailsView';

interface Props {
  panelState: RightPanelState;
  setPanelState: (state: RightPanelState) => void;
  mapInstance: google.maps.Map | null;
}

export default function RightSidebar({ panelState, setPanelState, mapInstance }: Props) {
  return (
    <aside
      style={{
        width: '380px',
        height: '100%',
        backgroundColor: '#0f172a',
        borderLeft: '1px solid #334155',
        display: 'flex',
        flexDirection: 'column',
        zIndex: 20,
        boxShadow: '-4px 0 12px rgba(0,0,0,0.3)',
      }}
    >
      <div
        style={{
          padding: '16px',
          borderBottom: '1px solid #334155',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
        }}
      >
        <span style={{ fontWeight: 'bold', color: 'white' }}>
          {panelState.mode === 'TRIP_DETAILS' && 'Trip Analysis'}
          {panelState.mode === 'CHECKLIST_LIST' && 'Fleet Checklists'}
          {panelState.mode === 'CHECKLIST_EDIT' && 'Waypoint Manager'}
        </span>
        <button
          onClick={() => setPanelState({ mode: 'CLOSED' })}
          style={{ background: 'none', border: 'none', color: '#94a3b8', fontSize: '18px', cursor: 'pointer' }}
        >
          ✕
        </button>
      </div>

      <div style={{ flexGrow: 1, overflowY: 'auto', padding: '16px' }}>
        {panelState.mode === 'TRIP_DETAILS' && (
          <TripDetailsView tripId={panelState.tripId} />
        )}

        {(panelState.mode === 'CHECKLIST_LIST' || panelState.mode === 'CHECKLIST_EDIT') && (
          <ChecklistManager
            panelState={panelState}
            setPanelState={setPanelState}
            mapInstance={mapInstance}
          />
        )}
      </div>
    </aside>
  );
}