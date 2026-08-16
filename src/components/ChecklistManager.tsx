import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAllWorkers,
  useGetAllChecklists,
  useGetAllChecklists1,
  useGetChecklistItems,
  useCreateChecklist,
  useDeleteChecklist,
  useAddChecklistItems,
  useDeleteChecklistItems,
  useAssignDriver,
  getGetAllChecklistsQueryKey,
  getGetAllChecklists1QueryKey,
  getGetChecklistItemsQueryKey,
} from '../api/generated';
import type { RightPanelState } from '../types';

interface ChecklistItem {
  id?: number;
  checklistId?: number;
  name: string;
  description?: string;
  latitude: number;
  longitude: number;
}

interface Props {
  panelState: RightPanelState;
  setPanelState: (state: RightPanelState) => void;
  mapInstance: google.maps.Map | null;
}

const CHECKLIST_COLORS = ['#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

// Generate an inline custom SVG map marker with a number inside
const getSvgMarkerUrl = (color: string, label: string) => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 32 40" width="32" height="40">
      <path fill="${color}" stroke="#ffffff" stroke-width="2" d="M16 2C8.268 2 2 8.268 2 16c0 8.45 13.083 21.583 13.525 22.016a0.665 0.665 0 0 0 .95 0C16.917 37.583 30 24.45 30 16c0-7.732-6.268-14-14-14z"/>
      <text x="16" y="21" font-family="Arial, sans-serif" font-size="12" font-weight="bold" fill="white" text-anchor="middle">${label}</text>
    </svg>`;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
};

export default function ChecklistManager({ panelState, setPanelState, mapInstance }: Props) {
  const queryClient = useQueryClient();

  const isDriverMode = (panelState.mode as string) === 'DRIVER_CHECKLISTS';
  const driverId = isDriverMode ? (panelState as any).driverId : undefined;

  const { data: workers } = (useGetAllWorkers as any)();

  const { data: allChecklists = [] } = (useGetAllChecklists1 as any)({
    query: { enabled: !isDriverMode },
  });

  const { data: driverChecklists = [] } = (useGetAllChecklists as any)(
    { userId: driverId, driverId },
    { query: { enabled: isDriverMode && !!driverId } }
  );

  const checklists = isDriverMode ? driverChecklists : allChecklists;

  // Track collapsed checklists so everything defaults to OPEN on initial load
  const [collapsedChecklists, setCollapsedChecklists] = useState<Record<number, boolean>>({});

  const toggleChecklist = (id: number, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    setCollapsedChecklists((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  const safeId = (c: any) => c?.checklist?.id ?? c?.id;
  const safeName = (c: any) => c?.checklist?.name ?? c?.name;
  const safeDriverId = (c: any) => c?.checklist?.driverId ?? c?.driverId;
  const safeItems = (c: any): ChecklistItem[] => c?.items ?? c?.checklistItems ?? c?.checklist?.items ?? [];

  const selectedChecklistId = panelState.mode === 'CHECKLIST_EDIT' ? (panelState as any).checklistId : null;
  const selectedChecklist = checklists.find((c: any) => safeId(c) === selectedChecklistId) || null;

  const { data: items = [] } = (useGetChecklistItems as any)(selectedChecklistId || 0, {
    query: {
      enabled: !!selectedChecklistId,
    },
  });

  const [newChecklistName, setNewChecklistName] = useState('');
  const [isMapPickActive, setIsMapPickActive] = useState(false);
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState('');
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const autocompleteRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const clearMapMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  // --- MAP MARKER SYNCHRONIZATION EFFECT ---
  useEffect(() => {
    if (!mapInstance) return;
    clearMapMarkers();

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // 1. If editing ONE checklist, show only its items (in default blue)
    if (panelState.mode === 'CHECKLIST_EDIT' && items.length > 0) {
      items.forEach((item: any, idx: number) => {
        if (item.latitude === undefined || item.longitude === undefined) return;
        const marker = new window.google.maps.Marker({
          position: { lat: Number(item.latitude), lng: Number(item.longitude) },
          map: mapInstance,
          title: item.name,
          icon: {
            url: getSvgMarkerUrl('#0ea5e9', `${idx + 1}`),
            scaledSize: new window.google.maps.Size(32, 40),
            anchor: new window.google.maps.Point(16, 40),
          },
        });
        bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) });
        markersRef.current.push(marker);
        hasPoints = true;
      });
    } 
    // 2. If viewing the list/driver mode, show items for ALL UNROLLED checklists
    else if (panelState.mode === 'CHECKLIST_LIST' || isDriverMode) {
      checklists.forEach((c: any, index: number) => {
        const checklistId = safeId(c);
        const isOpen = !collapsedChecklists[checklistId];
        
        // Skip if this checklist is collapsed
        if (!isOpen) return;

        // Assign a consistent color based on list index
        const color = CHECKLIST_COLORS[index % CHECKLIST_COLORS.length];
        const itemsList = safeItems(c);

        itemsList.forEach((item: any, idx: number) => {
          if (item.latitude === undefined || item.longitude === undefined) return;
          const marker = new window.google.maps.Marker({
            position: { lat: Number(item.latitude), lng: Number(item.longitude) },
            map: mapInstance,
            title: `${safeName(c)} - ${item.name}`,
            icon: {
              url: getSvgMarkerUrl(color, `${idx + 1}`),
              scaledSize: new window.google.maps.Size(32, 40),
              anchor: new window.google.maps.Point(16, 40),
            },
          });
          bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) });
          markersRef.current.push(marker);
          hasPoints = true;
        });
      });
    }

    if (hasPoints) {
      mapInstance.fitBounds(bounds);
    }

    // Cleanup markers when component unmounts or mode changes
    return () => clearMapMarkers();
  }, [items, checklists, collapsedChecklists, panelState.mode, mapInstance, isDriverMode]);


  const invalidateChecklistQueries = () => {
    queryClient.invalidateQueries({ queryKey: getGetAllChecklists1QueryKey() });
    queryClient.invalidateQueries({ queryKey: getGetAllChecklistsQueryKey() });
  };

  const createChecklistMutation = useCreateChecklist({
    mutation: {
      onSuccess: () => {
        invalidateChecklistQueries();
        setNewChecklistName('');
      },
    },
  });

  const deleteChecklistMutation = useDeleteChecklist({
    mutation: {
      onSuccess: () => {
        invalidateChecklistQueries();
        setPanelState({ mode: 'CHECKLIST_LIST' });
      },
    },
  });

  const addItemsMutation = useAddChecklistItems({
    mutation: {
      onSuccess: () => {
        if (selectedChecklistId) {
          queryClient.invalidateQueries({ queryKey: getGetChecklistItemsQueryKey(selectedChecklistId) });
        }
        setNewItemTitle('');
        setNewItemDescription('');
        setSelectedCoords(null);
      },
    },
  });

  const deleteItemMutation = useDeleteChecklistItems({
    mutation: {
      onSuccess: () => {
        if (selectedChecklistId) {
          queryClient.invalidateQueries({ queryKey: getGetChecklistItemsQueryKey(selectedChecklistId) });
        }
      },
    },
  });

  const assignDriverMutation = useAssignDriver({
    mutation: { onSuccess: () => invalidateChecklistQueries() },
  });

  useEffect(() => {
    if (panelState.mode === 'CHECKLIST_EDIT' && autocompleteRef.current && window.google?.maps?.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current);
      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setSelectedCoords({ lat, lng });
          setNewItemTitle(place.name || place.formatted_address || 'Selected Location');

          if (mapInstance) {
            mapInstance.panTo({ lat, lng });
            mapInstance.setZoom(15);
          }
        }
      });
    }
  }, [panelState.mode, mapInstance]);

  useEffect(() => {
    if (!mapInstance || !isMapPickActive || panelState.mode !== 'CHECKLIST_EDIT') return;

    const listener = mapInstance.addListener('click', (e: google.maps.MapMouseEvent) => {
      if (e.latLng) {
        const lat = e.latLng.lat();
        const lng = e.latLng.lng();
        setSelectedCoords({ lat, lng });
        setNewItemTitle(`Waypoint (${lat.toFixed(4)}, ${lng.toFixed(4)})`);
        setIsMapPickActive(false);
      }
    });

    return () => {
      window.google.maps.event.removeListener(listener);
    };
  }, [mapInstance, isMapPickActive, panelState.mode]);

  const handleCreateChecklist = () => {
    if (!newChecklistName.trim()) return;
    createChecklistMutation.mutate({ data: { name: newChecklistName } } as any);
  };

  const handleDeleteChecklist = (e: React.MouseEvent, id: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this checklist?')) {
      deleteChecklistMutation.mutate({ checklistId: id });
    }
  };

  const handleAddItem = () => {
    if (!selectedChecklistId || !selectedCoords || !newItemTitle) return;

    addItemsMutation.mutate({
      id: selectedChecklistId,
      checklistId: selectedChecklistId,
      data: [{
        name: newItemTitle,
        description: newItemDescription,
        latitude: selectedCoords.lat,
        longitude: selectedCoords.lng,
      }],
    } as any);
  };

  const handleDeleteItem = (itemId: number) => {
    if (!selectedChecklistId) return;
    deleteItemMutation.mutate({ checklistId: selectedChecklistId, itemId });
  };

  const handleAssignDriver = (driverIdToAssign: number) => {
    if (!selectedChecklistId) return;
    assignDriverMutation.mutate({
      id: selectedChecklistId,
      checklistId: selectedChecklistId,
      driverId: driverIdToAssign,
      params: { driverId: driverIdToAssign }
    } as any);
  };

  if (panelState.mode === 'CHECKLIST_LIST' || isDriverMode) {
    return (
      <div>
        {isDriverMode && (
          <div style={{ marginBottom: '12px', padding: '8px', backgroundColor: '#1e293b', borderRadius: '4px', border: '1px solid #0ea5e9' }}>
            <small style={{ color: '#0ea5e9', fontWeight: 'bold' }}>
              📋 Checklists for Driver #{driverId}
            </small>
          </div>
        )}

        {!isDriverMode && (
          <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
            <input
              type="text"
              placeholder="New checklist name..."
              value={newChecklistName}
              onChange={(e) => setNewChecklistName(e.target.value)}
              style={{ flexGrow: 1 }}
            />
            <button className="action-btn" onClick={handleCreateChecklist} disabled={createChecklistMutation.isPending}>
              {createChecklistMutation.isPending ? 'Creating...' : 'Create'}
            </button>
          </div>
        )}

        <h5 style={{ color: '#cbd5e1', marginBottom: '8px' }}>
          {isDriverMode ? `Assigned Tasks (${checklists.length})` : `Active Roster (${checklists.length})`}
        </h5>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
          {checklists.map((c: any, index: number) => {
            const checklistId = safeId(c);
            const itemsList = safeItems(c);
            const isOpen = !collapsedChecklists[checklistId];
            const isDeleting = deleteChecklistMutation.isPending && deleteChecklistMutation.variables?.checklistId === checklistId;
            const themeColor = CHECKLIST_COLORS[index % CHECKLIST_COLORS.length]; // Color for map sync

            return (
              <div
                key={checklistId}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  border: '1px solid #334155',
                  borderLeft: `4px solid ${themeColor}`, // <--- The UI color mapping
                  overflow: 'hidden',
                }}
              >
                {/* Accordion Header */}
                <div
                  onClick={(e) => toggleChecklist(checklistId, e)}
                  style={{
                    padding: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    backgroundColor: '#1e293b',
                    borderBottom: isOpen ? '1px solid #334155' : 'none',
                  }}
                >
                  <div>
                    <strong style={{ color: 'white', display: 'block' }}>{safeName(c)}</strong>
                    <small style={{ color: '#94a3b8' }}>
                      {safeDriverId(c) ? `Assigned to Driver #${safeDriverId(c)}` : 'Unassigned'}
                      {` • ${itemsList.length} Waypoint${itemsList.length === 1 ? '' : 's'}`}
                    </small>
                  </div>

                  <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                    {!isDriverMode && (
                      <button
                        onClick={(e) => handleDeleteChecklist(e, checklistId)}
                        disabled={deleteChecklistMutation.isPending}
                        style={{
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          padding: '4px 8px',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          fontSize: '11px',
                        }}
                      >
                        {isDeleting ? 'Deleting...' : 'Delete'}
                      </button>
                    )}

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPanelState({ mode: 'CHECKLIST_EDIT', checklistId });
                      }}
                      style={{
                        backgroundColor: 'transparent',
                        border: '1px solid #0ea5e9',
                        color: '#0ea5e9',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        fontSize: '11px',
                        cursor: 'pointer',
                      }}
                    >
                      Edit →
                    </button>

                    <span style={{ color: '#94a3b8', fontSize: '12px', marginLeft: '4px' }}>
                      {isOpen ? '▲' : '▼'}
                    </span>
                  </div>
                </div>

                {/* Accordion Dropdown Content */}
                {isOpen && (
                  <div style={{ backgroundColor: '#0f172a', padding: '10px 12px' }}>
                    {itemsList.length === 0 ? (
                      <small style={{ color: '#64748b', fontStyle: 'italic' }}>
                        No waypoints/items attached to this checklist.
                      </small>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {itemsList.map((item: any, idx: number) => (
                          <div
                            key={item.id || idx}
                            style={{
                              padding: '8px',
                              backgroundColor: '#1e293b',
                              borderRadius: '4px',
                              border: '1px solid #334155',
                            }}
                          >
                            <div style={{ display: 'flex', gap: '6px', alignItems: 'flex-start' }}>
                              <span style={{ 
                                backgroundColor: themeColor, 
                                color: 'white', 
                                borderRadius: '50%', 
                                width: '18px', 
                                height: '18px', 
                                display: 'inline-flex', 
                                alignItems: 'center', 
                                justifyContent: 'center',
                                fontSize: '10px',
                                fontWeight: 'bold',
                                flexShrink: 0,
                                marginTop: '2px'
                              }}>
                                {idx + 1}
                              </span>
                              <div>
                                <strong style={{ color: '#f8fafc', fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                                  {item.name}
                               </strong>
                                {item.description && (
                                  <p style={{ color: '#cbd5e1', fontSize: '12px', margin: '2px 0 4px 0', whiteSpace: 'pre-wrap' }}>
                                    {item.description}
                                  </p>
                                )}
                                {item.latitude !== undefined && item.longitude !== undefined && (
                                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                                    {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // --- EDIT MODE VIEW REMAINS UNCHANGED ---
  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
      <button
        onClick={() => setPanelState({ mode: 'CHECKLIST_LIST' })}
        style={{ background: 'none', border: 'none', color: '#94a3b8', cursor: 'pointer', marginBottom: '12px', alignSelf: 'flex-start' }}
      >
        ← Back to all checklists
      </button>

      {selectedChecklist && (
        <>
          <h4 style={{ margin: '0 0 12px 0', color: 'white' }}>{safeName(selectedChecklist)}</h4>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Assigned Driver</label>
            <select
              style={{ width: '100%', marginTop: '4px', padding: '6px', borderRadius: '4px' }}
              value={safeDriverId(selectedChecklist) || ''}
              onChange={(e) => handleAssignDriver(Number(e.target.value))}
              disabled={assignDriverMutation.isPending}
            >
              <option value="">-- Unassigned --</option>
              {workers?.map((w: any) => (
                <option key={w.id} value={w.id}>
                  {w.name} (ID: {w.id})
                </option>
              ))}
            </select>
          </div>

          <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
            <label style={{ display: 'block', fontSize: '12px', color: '#cbd5e1', marginBottom: '6px' }}>
              Add a New Waypoint
            </label>
            <input
              ref={autocompleteRef}
              type="text"
              placeholder="Search Google Places..."
              style={{ width: '100%', marginBottom: '10px' }}
            />

            <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '10px' }}>
              <button
                className="action-btn"
                style={{ backgroundColor: isMapPickActive ? '#ef4444' : '#3b82f6', fontSize: '12px', padding: '6px 12px' }}
                onClick={() => setIsMapPickActive(!isMapPickActive)}
              >
                {isMapPickActive ? 'Click Map Spot...' : '📍 Pick Spot on Map'}
              </button>
              {selectedCoords && (
                <span style={{ fontSize: '11px', color: '#22c55e' }}>
                  {selectedCoords.lat.toFixed(3)}, {selectedCoords.lng.toFixed(3)}
                </span>
              )}
            </div>

            <input
              type="text"
              placeholder="Waypoint Name / Title"
              value={newItemTitle}
              onChange={(e) => setNewItemTitle(e.target.value)}
              style={{ width: '100%', marginBottom: '10px' }}
            />

            <textarea
              placeholder="Description (Optional)"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              style={{
                width: '100%', marginBottom: '10px', padding: '8px', minHeight: '60px',
                borderRadius: '4px', resize: 'vertical', backgroundColor: '#0f172a',
                color: 'white', border: '1px solid #334155'
              }}
            />

            <button
              className="action-btn"
              style={{ width: '100%', backgroundColor: '#10b981' }}
              onClick={handleAddItem}
              disabled={!selectedCoords || !newItemTitle || addItemsMutation.isPending}
            >
              {addItemsMutation.isPending ? 'Adding...' : 'Add Waypoint Item'}
            </button>
          </div>

          <h5 style={{ color: '#cbd5e1', marginBottom: '8px' }}>Checklist Waypoints ({items.length})</h5>
          <div style={{ flexGrow: 1, overflowY: 'auto', paddingRight: '4px' }}>
            {items.map((item: any, idx: number) => (
              <div
                key={item.id || idx}
                style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                  padding: '8px 12px', backgroundColor: '#0f172a', marginBottom: '6px',
                  borderRadius: '4px', border: '1px solid #334155'
                }}
              >
                <div style={{ flexGrow: 1, paddingRight: '8px' }}>
                  <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                    {idx + 1}. {item.name}
                  </strong>
                  {item.description && (
                    <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                      {item.description}
                    </div>
                  )}
                  <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                    {item.latitude.toFixed(4)}, {item.longitude.toFixed(4)}
                  </div>
                </div>
                {item.id && (
                  <button
                    onClick={() => handleDeleteItem(item.id)}
                    disabled={deleteItemMutation.isPending}
                    style={{
                      backgroundColor: '#ef4444', color: 'white', border: 'none',
                      padding: '4px 8px', borderRadius: '4px', cursor: 'pointer', fontSize: '11px', marginTop: '2px'
                    }}
                  >
                    Delete
                  </button>
                )}
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}