import { useState } from 'react';
import { useLogin } from '../api/generated'; 

export default function Login({ onLoginSuccess }: { onLoginSuccess: () => void }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  
  const loginMutation = useLogin({
    mutation: {
      onSuccess: (data) => {
        // Cast generated object to access token safely for TypeScript compiler
        const res = data as { token?: string };
        if (res?.token) {
          localStorage.setItem('token', res.token);
          onLoginSuccess();
        }
      },
    },
  });

  const handleSubmit = () => {
    loginMutation.mutate({ data: { username, password } });
  };

  return (
    <div id="login-overlay" style={{ display: 'flex' }}>
      <div className="view-content" style={{ margin: '0', width: '100%', maxWidth: '400px' }}>
        <h3 style={{ textAlign: 'center' }}>Boss Portal Login</h3>
        <div className="form-group">
          <label>Username</label>
          <input 
            type="text" 
            value={username} 
            onChange={(e) => setUsername(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <div className="form-group">
          <label>Password</label>
          <input 
            type="password" 
            value={password} 
            onChange={(e) => setPassword(e.target.value)} 
            onKeyDown={(e) => e.key === 'Enter' && handleSubmit()}
          />
        </div>
        <button onClick={handleSubmit} className="action-btn" style={{ width: '100%' }} disabled={loginMutation.isPending}>
          {loginMutation.isPending ? 'Authenticating...' : 'Access Dashboard'}
        </button>
        {loginMutation.isError && <div className="feedback-msg" style={{ color: '#ef4444' }}>Invalid credentials</div>}
      </div>
    </div>
  );
}