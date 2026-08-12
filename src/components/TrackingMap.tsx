import { useEffect, useRef } from 'react';
import { useGetHistory, type DriverTripHistory } from '../api/generated';
import { AXIOS_INSTANCE } from '../api/axios-instance';

interface TrackingMapProps {
  selectedUserIds: number[];
  isLiveActive: boolean;
  dateRange: {
    start: string;
    end: string;
  };
}

function formatIsoDate(localDateTimeValue: string): string {
  if (!localDateTimeValue) return '';
  const d = new Date(localDateTimeValue);
  return isNaN(d.getTime()) ? localDateTimeValue : d.toISOString();
}

export default function TrackingMap({ selectedUserIds, isLiveActive, dateRange }: TrackingMapProps) {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstance = useRef<google.maps.Map | null>(null);
  const polylines = useRef<google.maps.Polyline[]>([]);
  const markers = useRef<google.maps.Marker[]>([]);
  const eventSources = useRef<Map<number, EventSource>>(new Map());

  useEffect(() => {
    if (!mapInstance.current && mapRef.current && window.google) {
      mapInstance.current = new window.google.maps.Map(mapRef.current, {
        center: { lat: 31.9522, lng: 35.915 },
        zoom: 13,
      });
    }
  }, []);

  const startISO = formatIsoDate(dateRange.start);
  let endISO = formatIsoDate(dateRange.end);
  if (isLiveActive) {
    const futureDate = new Date();
    futureDate.setMinutes(futureDate.getMinutes() + 60);
    endISO = futureDate.toISOString();
  }

  const { data: driverHistories, refetch } = useGetHistory(
    {
      userIds: selectedUserIds,
      start: startISO,
      end: endISO,
    },
    {
      query: {
        enabled: selectedUserIds.length > 0,
      },
    }
  );

  useEffect(() => {
    if (selectedUserIds.length === 0) {
      clearMapLayers();
    } else if (driverHistories) {
      drawRoutes(driverHistories);
    }
  }, [driverHistories, selectedUserIds]);

  useEffect(() => {
    if (isLiveActive) {
      selectedUserIds.forEach((userId: number) => {
        if (!eventSources.current.has(userId)) {
          const token = localStorage.getItem('token');
          const baseURL = AXIOS_INSTANCE.defaults.baseURL || '';
          const streamUrl = `${baseURL}/api/manager/locations/stream?userId=${userId}${token ? `&token=${encodeURIComponent(token)}` : ''}`;

          const source = new EventSource(streamUrl);

          source.addEventListener('location-update', () => {
            refetch(); 
          });

          eventSources.current.set(userId, source);
        }
      });
    } else {
      eventSources.current.forEach((source) => source.close());
      eventSources.current.clear();
    }

    return () => {
      eventSources.current.forEach((source, id) => {
        if (!selectedUserIds.includes(id) || !isLiveActive) {
          source.close();
          eventSources.current.delete(id);
        }
      });
    };
  }, [selectedUserIds, isLiveActive, refetch]);

  const clearMapLayers = () => {
    polylines.current.forEach((p) => p.setMap(null));
    markers.current.forEach((m) => m.setMap(null));
    polylines.current = [];
    markers.current = [];
  };

  const drawRoutes = (histories: DriverTripHistory[]) => {
    clearMapLayers();
    if (!mapInstance.current) return;

    const bounds = new window.google.maps.LatLngBounds();
    let hasPoints = false;

    histories.forEach((driverData) => {
      const { trips } = driverData;
      trips?.forEach((trip) => {
        if (!trip.logs || trip.logs.length === 0) return;

        const path = trip.logs.map((log) => ({
          lat: log.latitude || 0,
          lng: log.longitude || 0,
        }));

        path.forEach((coord) => {
          bounds.extend(coord);
          hasPoints = true;
        });

        const polyline = new window.google.maps.Polyline({
          path,
          strokeColor: '#0ea5e9',
          strokeOpacity: 0.85,
          strokeWeight: 5,
        });
        polyline.setMap(mapInstance.current);
        polylines.current.push(polyline);

        const startMarker = new window.google.maps.Marker({
          position: path[0],
          map: mapInstance.current,
          title: `Trip #${trip.tripId} Start`,
        });
        const endMarker = new window.google.maps.Marker({
          position: path[path.length - 1],
          map: mapInstance.current,
          title: `Trip #${trip.tripId} End`,
        });
        markers.current.push(startMarker, endMarker);
      });
    });

    if (hasPoints) {
      mapInstance.current.fitBounds(bounds);
    }
  };

  return <div ref={mapRef} style={{ width: '100%', height: '100%' }} />;
}