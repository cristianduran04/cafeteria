import { useState } from 'react';
import { signInWithEmailAndPassword } from 'firebase/auth';
import { auth } from './firebase';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
    } catch (err) {
      setError('Correo o contraseña incorrectos.');
    }
    setLoading(false);
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'var(--paper-dim)' }}>
      <form onSubmit={handleSubmit} className="card" style={{ width: 320, maxWidth: '90vw' }}>
        <h1 style={{ fontFamily: "'Space Mono',monospace", fontSize: 20, margin: '0 0 18px' }}>☕ Cafetería</h1>
        <label className="field-label">Correo</label>
        <input
          type="text"
          value={email}
          onChange={e => setEmail(e.target.value)}
          style={{ width: '100%', marginBottom: 12 }}
          autoCapitalize="off"
          autoCorrect="off"
        />
        <label className="field-label">Contraseña</label>
        <input
          type="password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          style={{ width: '100%', marginBottom: 16 }}
        />
        {error && <div style={{ color: 'var(--rust)', fontSize: 13, marginBottom: 12 }}>{error}</div>}
        <button className="btn btn-primary" type="submit" disabled={loading} style={{ width: '100%' }}>
          {loading ? 'Entrando…' : 'Entrar'}
        </button>
      </form>
    </div>
  );
}
