import { useState } from 'react';
import type { RightPanelState } from './types';
import { INITIAL_PANEL_STATE } from './types';

import Login from './components/Login';
import AdminViews from './components/AdminViews';
import Sidebar from './components/Sidebar';
import TrackingMap from './components/TrackingMap';
import RightSidebar from './components/RightSidebar';
import AppDownloadPage from './components/AppDownloadPage';

export default function App() {
  // Auth state
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(
    () => !!localStorage.getItem('token')
  );

  // Read initial URL path so direct visits to /downloads render publicly
  const [currentView, setCurrentView] = useState<'map' | 'register' | 'downloads'>(() => {
    return window.location.pathname === '/downloads' ? 'downloads' : 'map';
  });

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

  // ---------------------------------------------------------------------------
  // 1. PUBLIC DOWNLOAD VIEW (Bypasses authentication completely)
  // ---------------------------------------------------------------------------
  if (currentView === 'downloads') {
    return (
      <div style={{ position: 'relative', minHeight: '100vh', backgroundColor: '#0f172a' }}>
        {/* Navigation button back to Portal / Login */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50 }}>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('map');
            }}
            style={{
              padding: '10px 18px',
              backgroundColor: '#0ea5e9',
              color: 'white',
              border: 'none',
              borderRadius: '8px',
              cursor: 'pointer',
              fontWeight: '600',
              fontSize: '14px',
              boxShadow: '0 4px 6px -1px rgba(0,0,0,0.3)',
            }}
          >
            {isAuthenticated ? '← Back to Map' : 'Go to Login →'}
          </button>
        </div>

        <AppDownloadPage 
          androidDownloadUrl="/downloads/app-release.apk"
          iosDownloadUrl="https://testflight.apple.com/join/YOUR_CODE"
        />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 2. AUTHENTICATION GUARD
  // ---------------------------------------------------------------------------
  if (!isAuthenticated) {
    return (
      <div style={{ position: 'relative' }}>
        {/* Public button on Login screen to visit downloads */}
        <div style={{ position: 'absolute', top: '20px', right: '20px', zIndex: 50 }}>
          <button
            onClick={() => {
              window.history.pushState({}, '', '/downloads');
              setCurrentView('downloads');
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: '#0ea5e9',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📲 Mobile Apps
          </button>
        </div>
        <Login onLoginSuccess={() => setIsAuthenticated(true)} />
      </div>
    );
  }

  // ---------------------------------------------------------------------------
  // 3. AUTHENTICATED PORTAL VIEW
  // ---------------------------------------------------------------------------
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
            onClick={() => {
              window.history.pushState({}, '', '/');
              setCurrentView('map');
            }}
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
              window.history.pushState({}, '', '/downloads');
              setCurrentView('downloads');
            }}
            style={{
              padding: '8px 14px',
              backgroundColor: '#1e293b',
              color: 'white',
              border: '1px solid #334155',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: '500',
            }}
          >
            📲 Mobile Apps
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
            setRightPanel({ mode: 'DRIVER_CHECKLISTS', driverId } as any);
          }}
        />

        {/* Center Viewport Switcher */}
        <div style={{ flexGrow: 1, position: 'relative', height: '100%' }}>
          {currentView === 'map' && (
            <TrackingMap
              selectedUserIds={selectedUserIds}
              isLiveActive={isLiveActive}
              dateRange={dateRange}
              onMapLoaded={setMapInstance}
              onTripClick={(tripId) => setRightPanel({ mode: 'TRIP_DETAILS', tripId })}
            />
          )}

          {currentView === 'register' && (
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