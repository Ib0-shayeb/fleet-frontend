import React from 'react';

interface AppDownloadPageProps {
  androidDownloadUrl?: string;
  iosDownloadUrl?: string;
  androidVersion?: string;
  iosVersion?: string;
}

export default function AppDownloadPage({
  androidDownloadUrl = '#',
  iosDownloadUrl = '#',
  androidVersion = 'v1.4.2 (APK)',
  iosVersion = 'v1.4.2 (TestFlight / App Store)',
}: AppDownloadPageProps) {
  return (
    <div
      style={{
        minHeight: '100vh',
        backgroundColor: '#0f172a',
        color: '#f8fafc',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px 16px',
        fontFamily: 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '800px',
          width: '100%',
          textAlign: 'center',
          marginBottom: '32px',
        }}
      >
        <span
          style={{
            fontSize: '12px',
            fontWeight: 700,
            letterSpacing: '0.08em',
            textTransform: 'uppercase',
            color: '#0ea5e9',
            backgroundColor: '#0284c720',
            padding: '4px 12px',
            borderRadius: '9999px',
            border: '1px solid #0ea5e940',
          }}
        >
          Mobile Fleet Apps
        </span>
        <h1 style={{ fontSize: '32px', fontWeight: 800, marginTop: '16px', marginBottom: '8px', color: '#ffffff' }}>
          Download Fleet Tracker Mobile
        </h1>
        <p style={{ color: '#94a3b8', fontSize: '16px', margin: 0 }}>
          Manage tasks, update waypoint checklists, and track live routes directly from your phone.
        </p>
      </div>

      {/* Download Cards Grid */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '20px',
          width: '100%',
          maxWidth: '720px',
        }}
      >
        {/* Android Card */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: '#10b98120',
                border: '1px solid #10b98140',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#10b981">
                <path d="M17.523 15.3414c-.5511 0-.9993-.4486-.9993-.9997 0-.551.4482-.9993.9993-.9993.5515 0 .9997.4483.9997.9993 0 .5511-.4482.9997-.9997.9997zm-11.046 0c-.5511 0-.9993-.4486-.9993-.9997 0-.551.4482-.9993.9993-.9993.5515 0 .9997.4483.9997.9993 0 .5511-.4482.9997-.9993.9997zm11.4045-6.02l1.9973-3.4592a.416.416 0 00-.1522-.5676.4162.4162 0 00-.5676.1522l-2.0223 3.503C15.5898 8.3582 13.851 8 12 8s-3.5898.3582-5.1347.9502L4.843 5.4468a.4158.4158 0 00-.5676-.1522.4163.4163 0 00-.1522.5676l1.9973 3.4592C2.6886 11.1824.3333 14.392.3333 18.1667h23.3334c0-3.7747-2.3553-6.9843-5.7862-8.8453z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>Android App</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
              Compatible with Android 8.0 and above. Supports offline sync and background location.
            </p>
          </div>

          <div style={{ width: '100%' }}>
            <a
              href={androidDownloadUrl}
              download
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#10b981',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3" />
              </svg>
              Download APK
            </a>
            <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
              {androidVersion}
            </span>
          </div>
        </div>

        {/* iOS Card */}
        <div
          style={{
            backgroundColor: '#1e293b',
            border: '1px solid #334155',
            borderRadius: '12px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            alignItems: 'center',
            textAlign: 'center',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.3)',
          }}
        >
          <div>
            <div
              style={{
                width: '56px',
                height: '56px',
                borderRadius: '12px',
                backgroundColor: '#0ea5e920',
                border: '1px solid #0ea5e940',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                margin: '0 auto 16px auto',
              }}
            >
              <svg width="28" height="28" viewBox="0 0 24 24" fill="#0ea5e9">
                <path d="M18.71 19.5c-.83 1.24-1.71 2.45-3.05 2.47-1.34.03-1.77-.79-3.29-.79-1.53 0-2 .77-3.27.82-1.31.05-2.3-1.32-3.14-2.53C4.25 17 2.94 12.45 4.7 9.39c.87-1.52 2.43-2.48 4.12-2.51 1.28-.02 2.5.87 3.29.87.78 0 2.26-1.07 3.81-.91.65.03 2.47.26 3.64 1.98-.09.06-2.17 1.28-2.15 3.81.03 3.02 2.65 4.03 2.68 4.04-.03.07-.42 1.44-1.38 2.83M15.97 6.85c.67-.82 1.12-1.96.99-3.1-.97.04-2.14.65-2.83 1.46-.62.72-1.16 1.88-1.01 3 1.08.08 2.18-.54 2.85-1.36z" />
              </svg>
            </div>
            <h3 style={{ margin: '0 0 6px 0', fontSize: '20px', fontWeight: 700, color: '#ffffff' }}>iOS App</h3>
            <p style={{ margin: '0 0 16px 0', fontSize: '13px', color: '#94a3b8' }}>
              Compatible with iOS 14.0 and above. Install via TestFlight or Direct App Bundle.
            </p>
          </div>

          <div style={{ width: '100%' }}>
            <a
              href={iosDownloadUrl}
              target="_blank"
              rel="noopener noreferrer"
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                width: '100%',
                padding: '12px 16px',
                backgroundColor: '#0ea5e9',
                color: '#ffffff',
                borderRadius: '8px',
                fontWeight: 600,
                fontSize: '14px',
                textDecoration: 'none',
                boxSizing: 'border-box',
                transition: 'background-color 0.2s',
              }}
            >
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6M15 3h6v6M10 14L21 3" />
              </svg>
              Get for iOS
            </a>
            <span style={{ display: 'block', marginTop: '8px', fontSize: '11px', color: '#64748b' }}>
              {iosVersion}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}