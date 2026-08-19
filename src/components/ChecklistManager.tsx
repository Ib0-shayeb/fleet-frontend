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
  type ChecklistItem,
} from '../api/generated';
import type { RightPanelState } from '../types';

interface Props {
  panelState: RightPanelState;
  setPanelState: (state: RightPanelState) => void;
  mapInstance: google.maps.Map | null;
}

const CHECKLIST_COLORS = ['#0ea5e9', '#ef4444', '#10b981', '#f59e0b', '#a855f7', '#ec4899'];

// Custom SVG marker generator supporting color palette & green glowing silhouette on completion
const getSvgMarkerUrl = (color: string, label: string, isCompleted: boolean = false) => {
  const greenSilhouette = isCompleted
    ? `<circle cx="16" cy="16" r="18" fill="none" stroke="#22c55e" stroke-width="4" opacity="0.9" filter="drop-shadow(0 0 6px #22c55e)"/>
       <circle cx="26" cy="6" r="7" fill="#22c55e" stroke="#ffffff" stroke-width="1.5"/>
       <path fill="none" stroke="#ffffff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" d="M22.5 6l2 2 4.5-4.5"/>`
    : '';

  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="-6 -6 44 52" width="44" height="52">
      ${greenSilhouette}
      <path fill="${isCompleted ? '#15803d' : color}" stroke="${isCompleted ? '#22c55e' : '#ffffff'}" stroke-width="2" d="M16 2C8.268 2 2 8.268 2 16c0 8.45 13.083 21.583 13.525 22.016a0.665 0.665 0 0 0 .95 0C16.917 37.583 30 24.45 30 16c0-7.732-6.268-14-14-14z"/>
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

  // Track collapsed checklists
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
  const safeCompletedAt = (c: any) => c?.completedAt ?? c?.checklist?.completedAt;
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
  const [selectedGooglePlaceId, setSelectedGooglePlaceId] = useState<string | undefined>(undefined);

  const autocompleteRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  const clearMapMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  // Map Synchronization with Green Silhouette for Completed Pins
  useEffect(() => {
    if (!mapInstance) return;
    clearMapMarkers();

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    // Single Edit Mode Map Pins
    if (panelState.mode === 'CHECKLIST_EDIT' && items.length > 0) {
      items.forEach((item: ChecklistItem, idx: number) => {
        if (item.latitude === undefined || item.longitude === undefined) return;
        const isCompleted = Boolean(item.completedAt);

        const marker = new window.google.maps.Marker({
          position: { lat: Number(item.latitude), lng: Number(item.longitude) },
          map: mapInstance,
          title: item.name,
          icon: {
            url: getSvgMarkerUrl('#0ea5e9', `${idx + 1}`, isCompleted),
            scaledSize: new window.google.maps.Size(44, 52),
            anchor: new window.google.maps.Point(22, 52),
          },
        });
        bounds.extend({ lat: Number(item.latitude), lng: Number(item.longitude) });
        markersRef.current.push(marker);
        hasPoints = true;
      });
    } 
    // Expanded List / Driver View Map Pins
    else if (panelState.mode === 'CHECKLIST_LIST' || isDriverMode) {
      checklists.forEach((c: any, index: number) => {
        const checklistId = safeId(c);
        const isOpen = !collapsedChecklists[checklistId];
        
        if (!isOpen) return;

        const color = CHECKLIST_COLORS[index % CHECKLIST_COLORS.length];
        const itemsList = safeItems(c);

        itemsList.forEach((item: ChecklistItem, idx: number) => {
          if (item.latitude === undefined || item.longitude === undefined) return;
          const isCompleted = Boolean(item.completedAt);

          const marker = new window.google.maps.Marker({
            position: { lat: Number(item.latitude), lng: Number(item.longitude) },
            map: mapInstance,
            title: `${safeName(c)} - ${item.name}`,
            icon: {
              url: getSvgMarkerUrl(color, `${idx + 1}`, isCompleted),
              scaledSize: new window.google.maps.Size(44, 52),
              anchor: new window.google.maps.Point(22, 52),
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
        setSelectedGooglePlaceId(undefined);
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

  // Google Places Autocomplete bounded dynamically to current map viewport
  useEffect(() => {
    if (panelState.mode === 'CHECKLIST_EDIT' && autocompleteRef.current && window.google?.maps?.places) {
      const autocomplete = new window.google.maps.places.Autocomplete(autocompleteRef.current, {
        fields: ['geometry', 'name', 'formatted_address', 'place_id'],
      });

      if (mapInstance) {
        autocomplete.bindTo('bounds', mapInstance);
      }

      autocomplete.addListener('place_changed', () => {
        const place = autocomplete.getPlace();
        if (place.geometry?.location) {
          const lat = place.geometry.location.lat();
          const lng = place.geometry.location.lng();
          setSelectedCoords({ lat, lng });
          setSelectedGooglePlaceId(place.place_id);
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
        setSelectedGooglePlaceId(undefined);
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
        googlePlaceId: selectedGooglePlaceId,
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
            const themeColor = CHECKLIST_COLORS[index % CHECKLIST_COLORS.length];
            const isChecklistCompleted = Boolean(safeCompletedAt(c));

            return (
              <div
                key={checklistId}
                style={{
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  border: `1px solid ${isChecklistCompleted ? '#22c55e60' : '#334155'}`,
                  borderLeft: `4px solid ${isChecklistCompleted ? '#22c55e' : themeColor}`,
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
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'white', fontSize: '14px' }}>{safeName(c)}</strong>
                      {isChecklistCompleted ? (
                        <span title="Checklist Completed" style={{ color: '#22c55e', fontSize: '14px', fontWeight: 'bold' }}>
                          ✓
                        </span>
                      ) : (
                        <span
                          title="In Progress"
                          style={{
                            fontSize: '10px',
                            color: '#94a3b8',
                            backgroundColor: '#0f172a',
                            padding: '1px 6px',
                            borderRadius: '10px',
                            border: '1px solid #334155',
                          }}
                        >
                          ⏳ Pending
                        </span>
                      )}
                    </div>
                    <small style={{ color: '#94a3b8', marginTop: '2px', display: 'block' }}>
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

                {/* Accordion Body */}
                {isOpen && (
                  <div style={{ backgroundColor: '#0f172a', padding: '10px 12px' }}>
                    {itemsList.length === 0 ? (
                      <small style={{ color: '#64748b', fontStyle: 'italic' }}>
                        No waypoints/items attached to this checklist.
                      </small>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {itemsList.map((item: ChecklistItem, idx: number) => {
                          const isItemCompleted = Boolean(item.completedAt);

                          return (
                            <div
                              key={item.id || idx}
                              style={{
                                padding: '8px 10px',
                                backgroundColor: isItemCompleted ? '#0f291e' : '#1e293b',
                                borderRadius: '4px',
                                border: `1px solid ${isItemCompleted ? '#22c55e40' : '#334155'}`,
                              }}
                            >
                              <div style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
                                <span
                                  style={{
                                    backgroundColor: isItemCompleted ? '#22c55e' : themeColor,
                                    color: 'white',
                                    borderRadius: '50%',
                                    width: '20px',
                                    height: '20px',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '11px',
                                    fontWeight: 'bold',
                                    flexShrink: 0,
                                    marginTop: '2px',
                                    boxShadow: isItemCompleted ? '0 0 6px #22c55e80' : 'none',
                                  }}
                                >
                                  {isItemCompleted ? '✓' : idx + 1}
                                </span>

                                <div style={{ flexGrow: 1 }}>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong
                                      style={{
                                        color: isItemCompleted ? '#cbd5e1' : '#f8fafc',
                                        fontSize: '13px',
                                        textDecoration: isItemCompleted ? 'line-through' : 'none',
                                      }}
                                    >
                                      {item.name}
                                    </strong>

                                    {isItemCompleted ? (
                                      <span
                                        title="Completed"
                                        style={{ color: '#22c55e', fontSize: '13px', fontWeight: 'bold' }}
                                      >
                                        ✓
                                      </span>
                                    ) : (
                                      <span
                                        title="Incomplete"
                                        style={{
                                          fontSize: '10px',
                                          color: '#64748b',
                                          backgroundColor: '#0f172a',
                                          padding: '1px 5px',
                                          borderRadius: '4px',
                                          border: '1px solid #334155',
                                        }}
                                      >
                                        Unfinished
                                      </span>
                                    )}
                                  </div>

                                  {item.description && (
                                    <p style={{ color: '#94a3b8', fontSize: '12px', margin: '2px 0 4px 0', whiteSpace: 'pre-wrap' }}>
                                      {item.description}
                                    </p>
                                  )}
                                  {item.latitude !== undefined && item.longitude !== undefined && (
                                    <div style={{ color: '#64748b', fontSize: '11px' }}>
                                      {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                                    </div>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
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

  // Edit View
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
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <h4 style={{ margin: 0, color: 'white' }}>{safeName(selectedChecklist)}</h4>
            {safeCompletedAt(selectedChecklist) && (
              <span title="Checklist Completed" style={{ color: '#22c55e', fontSize: '16px', fontWeight: 'bold' }}>
                ✓
              </span>
            )}
          </div>

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
            {items.map((item: ChecklistItem, idx: number) => {
              const isDone = Boolean(item.completedAt);

              return (
                <div
                  key={item.id || idx}
                  style={{
                    display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
                    padding: '8px 12px', backgroundColor: isDone ? '#0f291e' : '#0f172a', marginBottom: '6px',
                    borderRadius: '4px', border: `1px solid ${isDone ? '#22c55e40' : '#334155'}`
                  }}
                >
                  <div style={{ flexGrow: 1, paddingRight: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                      <strong style={{ color: 'white', fontSize: '13px' }}>
                        {idx + 1}. {item.name}
                      </strong>
                      {isDone ? (
                        <span style={{ color: '#22c55e', fontSize: '12px', fontWeight: 'bold' }}>✓</span>
                      ) : (
                        <span style={{ fontSize: '10px', color: '#64748b', fontStyle: 'italic' }}>Pending</span>
                      )}
                    </div>
                    {item.description && (
                      <div style={{ color: '#cbd5e1', fontSize: '12px', marginBottom: '4px', whiteSpace: 'pre-wrap' }}>
                        {item.description}
                      </div>
                    )}
                    {item.latitude !== undefined && item.longitude !== undefined && (
                      <div style={{ color: '#94a3b8', fontSize: '11px' }}>
                        {Number(item.latitude).toFixed(4)}, {Number(item.longitude).toFixed(4)}
                      </div>
                    )}
                  </div>
                  {item.id && (
                    <button
                      onClick={() => handleDeleteItem(item.id!)}
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
              );
            })}
          </div>
        </>
      )}
    </div>
  );
}

interface DriverChecklistViewProps {
  driverId: number;
  onClose?: () => void;
}

export function DriverChecklistView({ driverId, onClose }: DriverChecklistViewProps) {
  const { data: workers = [] } = (useGetAllWorkers as any)();
  const { data: allChecklists = [], isLoading: isChecklistsLoading } = (useGetAllChecklists as any)();

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

// Helper Sub-Component
function ChecklistCard({ checklist }: { checklist: any }) {
  const safeId = (c: any) => c?.checklist?.id ?? c?.id;
  const safeName = (c: any) => c?.checklist?.name ?? c?.name;
  
  const checklistId = safeId(checklist);

  const { data: items = [] } = (useGetChecklistItems as any)(checklistId || 0, {
    query: { enabled: !!checklistId },
  });

  return (
    <div
      style={{
        backgroundColor: '#1e293b',
        borderRadius: '6px',
        border: '1px solid #334155',
        padding: '12px',
        marginBottom: '10px',
      }}
    >
      <strong style={{ color: 'white', fontSize: '14px', display: 'block', marginBottom: '8px' }}>
        {safeName(checklist)}
      </strong>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
        {items.map((item: ChecklistItem, idx: number) => (
          <div
            key={item.id || idx}
            style={{
              padding: '6px 8px',
              backgroundColor: '#0f172a',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#cbd5e1',
            }}
          >
            {idx + 1}. {item.name}
          </div>
        ))}
      </div>
    </div>
  );
}