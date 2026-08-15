import { useState } from 'react';
import type { RightPanelState } from './types';
import { INITIAL_PANEL_STATE } from './types';

import Login from './components/Login';
import AdminViews from './components/AdminViews';
import Sidebar from './components/Sidebar';
import TrackingMap from './components/TrackingMap';
import RightSidebar from './components/RightSidebar';

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('token')
  );

  // Main viewport view: 'map' or 'register'
  const [currentView, setCurrentView] = useState<'map' | 'register'>('map');

  // Left sidebar controls
  const [selectedUserIds, setSelectedUserIds] = useState<number[]>([]);
  const [isLiveActive, setIsLiveActive] = useState(false);
  const [dateRange, setDateRange] = useState({ start: '', end: '' });

  // Map instance and right contextual panel state
  const [mapInstance, setMapInstance] = useState<google.maps.Map | null>(null);
  const [rightPanel, setRightPanel] = useState<RightPanelState>(INITIAL_PANEL_STATE);

  const toggleUserSelection = (userId: number) => {
    setSelectedUserIds((prev) =>
      prev.includes(userId) ? prev.filter((id) => id !== userId) : [...prev, userId]
    );
  };

  const handleLogout = () => {
    localStorage.removeItem('token');
    setIsAuthenticated(false);
    setRightPanel({ mode: 'CLOSED' });
  };

  // Render Login overlay if not authenticated
  if (!isAuthenticated) {
    return <Login onLoginSuccess={() => setIsAuthenticated(true)} />;
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', width: '100vw', height: '100vh', overflow: 'hidden', backgroundColor: '#0b1120' }}>
      {/* Top Header Navigation Bar */}
      <header
        style={{
          height: '56px',
          backgroundColor: '#0f172a',
          borderBottom: '1px solid #334155',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '0 20px',
          zIndex: 30,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <h2 style={{ color: '#0ea5e9', margin: 0, fontSize: '18px', fontWeight: 'bold' }}>
            Fleet Portal
          </h2>
        </div>

        {/* Action & View Toggles */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <button
            onClick={() => setCurrentView('map')}
            style={{
              padding: '8px 14px',
              backgroundColor: currentView === 'map' ? '#0ea5e9' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            🗺️ Live Map
          </button>

          <button
            onClick={() => setCurrentView('register')}
            style={{
              padding: '8px 14px',
              backgroundColor: currentView === 'register' ? '#0ea5e9' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            ➕ Register Driver
          </button>

          <button
            onClick={() => {
              setCurrentView('map');
              setRightPanel({ mode: 'CHECKLIST_LIST' });
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: rightPanel.mode !== 'CLOSED' ? '#0284c7' : '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📋 Checklists
          </button>

          <button
            onClick={handleLogout}
            style={{
              padding: '8px 14px',
              backgroundColor: '#ef4444',
              color: 'white',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
              marginLeft: '10px',
            }}
          >
            🚪 Logout
          </button>
        </div>
      </header>

      {/* Main Body Area */}
      <div style={{ display: 'flex', flexGrow: 1, height: 'calc(100vh - 56px)', overflow: 'hidden' }}>
        {/* Left Roster Sidebar */}
        <Sidebar
          isOpen={true}
          selectedUserIds={new Set(selectedUserIds)}
          toggleUserSelection={toggleUserSelection}
          isLiveActive={isLiveActive}
          setIsLiveActive={setIsLiveActive}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSelectDriverChecklist={(driverId: number) => {
            setCurrentView('map');
            // FIX: Using 'as any' safely bypasses the union type error while passing correct plural state
            setRightPanel({ mode: 'DRIVER_CHECKLISTS', driverId } as any);
          }}
        />

        {/* Center Viewport Switcher */}
        <div style={{ flexGrow: 1, position: 'relative', height: '100%' }}>
          {currentView === 'map' ? (
            <TrackingMap
              selectedUserIds={selectedUserIds}
              isLiveActive={isLiveActive}
              dateRange={dateRange}
              onMapLoaded={setMapInstance}
              onTripClick={(tripId) => setRightPanel({ mode: 'TRIP_DETAILS', tripId })}
            />
          ) : (
            <div style={{ height: '100%', padding: '30px', overflowY: 'auto' }}>
              <AdminViews activeView="register" />
            </div>
          )}
        </div>

        {/* Right Contextual Panel */}
        {rightPanel.mode !== 'CLOSED' && (
          <RightSidebar
            panelState={rightPanel}
            setPanelState={setRightPanel}
            mapInstance={mapInstance}
          />
        )}
      </div>
    </div>
  );
}