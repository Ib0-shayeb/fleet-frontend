import { useState } from 'react';
import Sidebar, { getDefaultStartDateTime, getCurrentEndDateTime } from './Sidebar';
import TrackingMap from './TrackingMap';
import AdminViews from './AdminViews';
import ChecklistManager from './ChecklistManager';
import type { RightPanelState } from '../types';

export default function Dashboard({ onLogout }: { onLogout: () => void }) {
  const [activeView, setActiveView] = useState<'map' | 'creds' | 'register'>('map');
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<number>>(new Set());
  const [isLiveActive, setIsLiveActive] = useState(false);
  
  // State for the Driver Tasks / Checklist Manager panel
  const [panelState, setPanelState] = useState<RightPanelState>({ mode: 'CHECKLIST_LIST' });

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

  // EXCLUSIVE SELECTION: Deselects all other drivers and selects ONLY this one
  const handleSelectDriverChecklist = (driverId: number) => {
    setSelectedUserIds(new Set([driverId]));
    setPanelState({ mode: 'DRIVER_CHECKLISTS', driverId });
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

      <div className="main-container" style={{ display: 'flex', height: 'calc(100vh - 60px)', overflow: 'hidden' }}>
        <Sidebar 
          isOpen={isSidebarOpen} 
          selectedUserIds={selectedUserIds} 
          toggleUserSelection={toggleUserSelection}
          isLiveActive={isLiveActive}
          setIsLiveActive={setIsLiveActive}
          dateRange={dateRange}
          setDateRange={setDateRange}
          onSelectDriverChecklist={handleSelectDriverChecklist}
        />
        
        <div style={{ display: activeView === 'map' ? 'block' : 'none', flexGrow: 1, height: '100%' }}>
          <TrackingMap 
            selectedUserIds={Array.from(selectedUserIds)} 
            isLiveActive={isLiveActive} 
            dateRange={dateRange} 
          />
        </div>

        {activeView !== 'map' && <AdminViews activeView={activeView} />}

        {/* Uses panelState and ChecklistManager to satisfy TypeScript */}
        <ChecklistManager 
          panelState={panelState} 
          setPanelState={setPanelState} 
        />
      </div>
    </div>
  );
}