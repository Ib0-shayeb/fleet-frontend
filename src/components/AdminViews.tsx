import { useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useRegisterWorker, getGetAllWorkersQueryKey } from '../api/generated';

interface AdminViewsProps {
  activeView: 'register' | string;
}

export default function AdminViews({ activeView }: AdminViewsProps) {
  const queryClient = useQueryClient();

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