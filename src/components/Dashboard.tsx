import { useState } from 'react';
import Sidebar, { getDefaultStartDateTime, getCurrentEndDateTime } from './Sidebar';
import TrackingMap from './TrackingMap';
import AdminViews from './AdminViews';

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<'map' | 'creds' | 'register'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [isLiveActive, setIsLiveActive] = useState(false);
  
  // Dynamically initialize with 2020-01-01 for start and current time for end
  const [dateRange, setDateRange] = useState({
    start: getDefaultStartDateTime(),
    end: getCurrentEndDateTime(),
  });

  const toggleUserSelection = (userId: number) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(userId)) newSet.delete(userId);
    else newSet.add(userId);
    setSelectedUserIds(newSet);
  };

  return (
    <div className="app-container">
      <div id="navbar" style={{ display: 'flex' }}>
        <div className="nav-left">
          <button className="nav-btn" onClick={() => setIsSidebarOpen(!isSidebarOpen)}>☰</button>
          <h1>Fleet Control Center</h1>
        </div>
        <div className="nav-links">
          <button className="nav-btn" onClick={() => setActiveView('map')}>Tracking Map</button>
          <button className="nav-btn" onClick={() => setActiveView('creds')}>Credential Manager</button>
          <button className="nav-btn primary" onClick={() => setActiveView('register')}>+ Register Worker</button>
          <button className="nav-btn danger" onClick={onLogout}>Logout</button>
        </div>
      </div>

      <div className="main-container">
        <Sidebar 
          isOpen={isSidebarOpen} 
          selectedUserIds={selectedUserIds} 
          toggleUserSelection={toggleUserSelection}
          isLiveActive={isLiveActive}
          setIsLiveActive={setIsLiveActive}
          dateRange={dateRange}
          setDateRange={setDateRange}
        />
        
        {/* keep the map mounted but hide it so we don't lose the Google Maps instance state */}
        <div style={{ display: activeView === 'map' ? 'block' : 'none', flexGrow: 1, height: '100%' }}>
            <TrackingMap 
              selectedUserIds={Array.from(selectedUserIds)} 
              isLiveActive={isLiveActive} 
              dateRange={dateRange} 
            />
        </div>

        {activeView !== 'map' && <AdminViews activeView={activeView} />}
      </div>
    </div>
  );
}