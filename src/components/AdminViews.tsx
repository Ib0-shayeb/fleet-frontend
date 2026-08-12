import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRegisterWorker, getGetAllWorkersQueryKey } from '../api/generated';
import { customInstance } from '../api/axios-instance';

interface AdminViewsProps {
  activeView: 'creds' | 'register' | string;
}

export default function AdminViews({ activeView }: AdminViewsProps) {
  const queryClient = useQueryClient();

  const [credsForm, setCredsForm] = useState({ userId: '', newPassword: '' });
  const [credsFeedback, setCredsFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const [regForm, setRegForm] = useState({ name: '', username: '', password: '', phone: '' });
  const [regFeedback, setRegFeedback] = useState<{ msg: string; isError: boolean } | null>(null);

  const registerWorkerMutation = useRegisterWorker({
    mutation: {
      onSuccess: () => {
        setRegFeedback({ msg: 'Driver instance saved successfully!', isError: false });
        setRegForm({ name: '', username: '', password: '', phone: '' });

        queryClient.invalidateQueries({ queryKey: getGetAllWorkersQueryKey() });

        setTimeout(() => setRegFeedback(null), 4000);
      },
      onError: (err: any) => {
        const errorMsg = err?.response?.data || 'Failed to store record.';
        setRegFeedback({ msg: String(errorMsg), isError: true });
        setTimeout(() => setRegFeedback(null), 4000);
      },
    },
  });

  const handleRegisterSubmit = () => {
    if (!regForm.username || !regForm.password) {
      setRegFeedback({ msg: 'Username and password are required.', isError: true });
      return;
    }

    registerWorkerMutation.mutate({
      data: {
        name: regForm.name,
        username: regForm.username,
        password: regForm.password,
        phoneNumber: regForm.phone,
      },
    });
  };

  const handleUpdatePasswordSubmit = async () => {
    if (!credsForm.userId || !credsForm.newPassword) {
      setCredsFeedback({ msg: 'Please enter a target User ID and new password.', isError: true });
      return;
    }

    try {
      await customInstance({
        url: `/api/auth/update-password?userId=${encodeURIComponent(credsForm.userId)}`,
        method: 'PUT',
        data: { password: credsForm.newPassword },
      });

      setCredsFeedback({ msg: 'Credentials updated successfully!', isError: false });
      setCredsForm({ userId: '', newPassword: '' });
    } catch (err: any) {
      const errorMsg = err?.response?.data || 'Failed to update profile configurations.';
      setCredsFeedback({ msg: String(errorMsg), isError: true });
    }

    setTimeout(() => setCredsFeedback(null), 4000);
  };

  if (activeView === 'creds') {
    return (
      <div className="admin-view">
        <div className="view-content">
          <h3>Credential Manager</h3>
          <div className="form-group">
            <label>Target User ID (Database Key)</label>
            <input
              type="text"
              placeholder="e.g. 1, 2, 15"
              value={credsForm.userId}
              onChange={(e) => setCredsForm({ ...credsForm, userId: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Set New Password</label>
            <input
              type="password"
              placeholder="Enter secure password"
              value={credsForm.newPassword}
              onChange={(e) => setCredsForm({ ...credsForm, newPassword: e.target.value })}
            />
          </div>
          <button onClick={handleUpdatePasswordSubmit} className="action-btn" style={{ width: '100%' }}>
            Commit Security Update
          </button>
          {credsFeedback && (
            <div className="feedback-msg" style={{ color: credsFeedback.isError ? '#ef4444' : '#22c55e' }}>
              {credsFeedback.msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  if (activeView === 'register') {
    return (
      <div className="admin-view">
        <div className="view-content">
          <h3>Register New Driver</h3>
          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              placeholder="John Doe"
              value={regForm.name}
              onChange={(e) => setRegForm({ ...regForm, name: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Username</label>
            <input
              type="text"
              placeholder="driver123"
              value={regForm.username}
              onChange={(e) => setRegForm({ ...regForm, username: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Initial Password</label>
            <input
              type="password"
              placeholder="••••••••"
              value={regForm.password}
              onChange={(e) => setRegForm({ ...regForm, password: e.target.value })}
            />
          </div>
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="text"
              placeholder="+48 123 456 789"
              value={regForm.phone}
              onChange={(e) => setRegForm({ ...regForm, phone: e.target.value })}
            />
          </div>
          <button
            onClick={handleRegisterSubmit}
            className="action-btn"
            style={{ width: '100%' }}
            disabled={registerWorkerMutation.isPending}
          >
            {registerWorkerMutation.isPending ? 'Saving...' : 'Save Driver Instance'}
          </button>
          {regFeedback && (
            <div className="feedback-msg" style={{ color: regFeedback.isError ? '#ef4444' : '#22c55e' }}>
              {regFeedback.msg}
            </div>
          )}
        </div>
      </div>
    );
  }

  return null;
}