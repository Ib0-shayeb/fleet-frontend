import { useState, useEffect, useRef } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import {
  useGetAllWorkers,
  useGetAllChecklists,
  useGetChecklistItems,
  useCreateChecklist,
  useDeleteChecklist,
  useAddChecklistItems,
  useDeleteChecklistItems,
  useAssignDriver,
  getGetAllChecklistsQueryKey,
  getGetChecklistItemsQueryKey,
} from '../api/generated';
import type { RightPanelState } from '../types';

interface ChecklistItem {
  id?: number;
  checklistId?: number;
  name: string;
  description?: string; // Added description
  latitude: number;
  longitude: number;
}

interface Props {
  panelState: RightPanelState;
  setPanelState: (state: RightPanelState) => void;
  mapInstance: google.maps.Map | null;
}

export default function ChecklistManager({ panelState, setPanelState, mapInstance }: Props) {
  const queryClient = useQueryClient();

  // 1. Generated Query Hooks
  const { data: workers } = useGetAllWorkers();
  const { data: checklists = [] } = useGetAllChecklists();

  const selectedChecklistId = panelState.mode === 'CHECKLIST_EDIT' ? panelState.checklistId : null;
  const selectedChecklist = checklists.find((c: any) => c.id === selectedChecklistId) || null;

  const { data: items = [] } = useGetChecklistItems(selectedChecklistId || 0, {
    query: {
      enabled: !!selectedChecklistId,
    },
  });

  // Form & Location State
  const [newChecklistName, setNewChecklistName] = useState('');
  const [isMapPickActive, setIsMapPickActive] = useState(false);
  
  const [newItemTitle, setNewItemTitle] = useState('');
  const [newItemDescription, setNewItemDescription] = useState(''); // New description state
  
  const [selectedCoords, setSelectedCoords] = useState<{ lat: number; lng: number } | null>(null);

  const autocompleteRef = useRef<HTMLInputElement>(null);
  const markersRef = useRef<google.maps.Marker[]>([]);

  // 2. Generated Mutation Hooks
  const createChecklistMutation = useCreateChecklist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAllChecklistsQueryKey() });
        setNewChecklistName('');
      },
    },
  });

  const deleteChecklistMutation = useDeleteChecklist({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAllChecklistsQueryKey() });
      },
    },
  });

  const addItemsMutation = useAddChecklistItems({
    mutation: {
      onSuccess: () => {
        if (selectedChecklistId) {
          queryClient.invalidateQueries({
            queryKey: getGetChecklistItemsQueryKey(selectedChecklistId),
          });
        }
        // Clear all form fields on success
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
          queryClient.invalidateQueries({
            queryKey: getGetChecklistItemsQueryKey(selectedChecklistId),
          });
        }
      },
    },
  });

  const assignDriverMutation = useAssignDriver({
    mutation: {
      onSuccess: () => {
        queryClient.invalidateQueries({ queryKey: getGetAllChecklistsQueryKey() });
      },
    },
  });

  // Update map markers when items change
  useEffect(() => {
    if (panelState.mode === 'CHECKLIST_EDIT' && items) {
      renderMapMarkers(items as unknown as ChecklistItem[]);
    } else {
      clearMapMarkers();
    }
  }, [items, panelState.mode]);

  // Google Places Autocomplete Setup
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

  // Click on Map Listener to Select Waypoint
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

  const clearMapMarkers = () => {
    markersRef.current.forEach((m) => m.setMap(null));
    markersRef.current = [];
  };

  const renderMapMarkers = (checklistItems: ChecklistItem[]) => {
    clearMapMarkers();
    if (!mapInstance) return;

    const bounds = new window.google.maps.LatLngBounds();

    checklistItems.forEach((item, idx) => {
      const marker = new window.google.maps.Marker({
        position: { lat: item.latitude, lng: item.longitude },
        map: mapInstance,
        label: `${idx + 1}`,
        title: item.name,
      });

      bounds.extend({ lat: item.latitude, lng: item.longitude });
      markersRef.current.push(marker);
    });

    if (checklistItems.length > 0) {
      mapInstance.fitBounds(bounds);
    }
  };

  const handleCreateChecklist = () => {
    if (!newChecklistName.trim()) return;
  
    createChecklistMutation.mutate({ 
      params: { name: newChecklistName } 
    });
  };

  const handleDeleteChecklist = (e: React.MouseEvent, checklistId: number) => {
    e.stopPropagation();
    if (window.confirm('Are you sure you want to delete this checklist?')) {
      deleteChecklistMutation.mutate({ checklistId });
    }
  };

  const handleAddItem = () => {
    if (!selectedChecklistId || !selectedCoords || !newItemTitle) return;

    // Build the new item payload with description
    const newItem = {
      name: newItemTitle,
      description: newItemDescription, // Pass description to API
      latitude: selectedCoords.lat,
      longitude: selectedCoords.lng,
    };

    addItemsMutation.mutate({
      checklistId: selectedChecklistId,
      data: [newItem as any],
    });
  };

  const handleDeleteItem = (itemId: number) => {
    if (!selectedChecklistId) return;
    deleteItemMutation.mutate({
      checklistId: selectedChecklistId,
      itemId,
    });
  };

  const handleAssignDriver = (driverId: number) => {
    if (!selectedChecklistId) return;
    assignDriverMutation.mutate({
      checklistId: selectedChecklistId,
      driverId,
    });
  };

  // View 1: List All Checklists
  if (panelState.mode === 'CHECKLIST_LIST') {
    return (
      <div>
        <div style={{ display: 'flex', gap: '8px', marginBottom: '16px' }}>
          <input
            type="text"
            placeholder="New checklist name..."
            value={newChecklistName}
            onChange={(e) => setNewChecklistName(e.target.value)}
            style={{ flexGrow: 1 }}
          />
          <button
            className="action-btn"
            onClick={handleCreateChecklist}
            disabled={createChecklistMutation.isPending}
          >
            {createChecklistMutation.isPending ? 'Creating...' : 'Create'}
          </button>
        </div>

        <h5 style={{ color: '#cbd5e1', marginBottom: '8px' }}>Active Roster ({checklists.length})</h5>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
          {checklists.map((c: any) => {
            const isDeleting =
              deleteChecklistMutation.isPending &&
              deleteChecklistMutation.variables?.checklistId === c.id;

            return (
              <div
                key={c.id}
                onClick={() => setPanelState({ mode: 'CHECKLIST_EDIT', checklistId: c.id })}
                style={{
                  padding: '12px',
                  backgroundColor: '#1e293b',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  border: '1px solid #334155',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                }}
              >
                <div>
                  <strong style={{ color: 'white', display: 'block' }}>{c.name}</strong>
                  <small style={{ color: '#94a3b8' }}>
                    {c.driverId ? `Assigned to Driver #${c.driverId}` : 'Unassigned'}
                  </small>
                </div>
                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                  <button
                    onClick={(e) => handleDeleteChecklist(e, c.id)}
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
                  <span style={{ color: '#0ea5e9' }}>Edit →</span>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // View 2: Edit Checklist Waypoints
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
          <h4 style={{ margin: '0 0 12px 0', color: 'white' }}>{selectedChecklist.name}</h4>

          <div className="form-group" style={{ marginBottom: '16px' }}>
            <label style={{ fontSize: '12px', color: '#cbd5e1' }}>Assigned Driver</label>
            <select
              style={{ width: '100%', marginTop: '4px', padding: '6px', borderRadius: '4px' }}
              value={selectedChecklist.driverId || ''}
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

            {/* NEW: Textarea for the Description */}
            <textarea
              placeholder="Description (Optional) - e.g. 'Drop package at back door'"
              value={newItemDescription}
              onChange={(e) => setNewItemDescription(e.target.value)}
              style={{
                width: '100%',
                marginBottom: '10px',
                padding: '8px',
                minHeight: '60px',
                borderRadius: '4px',
                resize: 'vertical',
                backgroundColor: '#0f172a',
                color: 'white',
                border: '1px solid #334155'
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
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'flex-start',
                  padding: '8px 12px',
                  backgroundColor: '#0f172a',
                  marginBottom: '6px',
                  borderRadius: '4px',
                  border: '1px solid #334155'
                }}
              >
                <div style={{ flexGrow: 1, paddingRight: '8px' }}>
                  <strong style={{ color: 'white', fontSize: '13px', display: 'block', marginBottom: '2px' }}>
                    {idx + 1}. {item.name}
                  </strong>
                  
                  {/* NEW: Render Description if it exists */}
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
                      backgroundColor: '#ef4444',
                      color: 'white',
                      border: 'none',
                      padding: '4px 8px',
                      borderRadius: '4px',
                      cursor: 'pointer',
                      fontSize: '11px',
                      marginTop: '2px'
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