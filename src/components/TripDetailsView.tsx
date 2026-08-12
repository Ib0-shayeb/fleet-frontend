import { useEffect, useState } from 'react';
import { customInstance } from '../api/axios-instance';

interface Log {
  id: number;
  latitude: number;
  longitude: number;
  speed: number;
  recordedAt: string;
}

interface TripData {
  tripId: number;
  driverId: number;
  driverName?: string;
  startTime: string;
  endTime?: string;
  logs: Log[];
}

interface Props {
  tripId: number;
}

export default function TripDetailsView({ tripId }: Props) {
  const [trip, setTrip] = useState<TripData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadTrip() {
      setLoading(true);
      try {
        const data = await customInstance<TripData>({
          url: `/api/manager/trips/${tripId}`,
          method: 'GET',
        });
        setTrip(data);
      } catch (err) {
        console.error('Failed to load trip details', err);
      } finally {
        setLoading(false);
      }
    }
    if (tripId) loadTrip();
  }, [tripId]);

  if (loading) return <p style={{ color: '#94a3b8' }}>Loading trip details...</p>;
  if (!trip) return <p style={{ color: '#ef4444' }}>Unable to load details for Trip #{tripId}.</p>;

  return (
    <div style={{ color: 'white' }}>
      <div style={{ backgroundColor: '#1e293b', padding: '12px', borderRadius: '6px', marginBottom: '16px' }}>
        <h4 style={{ margin: '0 0 8px 0', color: '#0ea5e9' }}>Trip #{trip.tripId}</h4>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>Driver ID:</strong> {trip.driverId}
        </p>
        <p style={{ margin: '4px 0', fontSize: '14px' }}>
          <strong>Logs Count:</strong> {trip.logs?.length || 0} telemetry points
        </p>
      </div>

      <h5 style={{ marginBottom: '8px', color: '#cbd5e1' }}>Telemetry Log Stream</h5>
      <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
        {trip.logs?.map((log, i) => (
          <div
            key={log.id || i}
            style={{
              padding: '8px 12px',
              backgroundColor: '#0f172a',
              marginBottom: '6px',
              borderRadius: '4px',
              fontSize: '12px',
              borderLeft: '3px solid #3b82f6',
            }}
          >
            <div><strong>Speed:</strong> {log.speed ? `${log.speed.toFixed(1)} km/h` : 'N/A'}</div>
            <div style={{ color: '#94a3b8' }}>
              {log.latitude.toFixed(5)}, {log.longitude.toFixed(5)}
            </div>
            <div style={{ color: '#64748b', fontSize: '11px' }}>
              {new Date(log.recordedAt).toLocaleTimeString()}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}