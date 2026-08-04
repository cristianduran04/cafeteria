import { useEffect, useState } from 'react';
import { onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from './firebase';
import Login from './Login';
import MeseroView from './MeseroView';
import CocinaView from './CocinaView';
import AdminView from './AdminView';

const ROLE_LABELS = { mesero: 'Mesero', cocina: 'Cocina', admin: 'Barra / Admin' };

export default function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      if (u) {
        try {
          const snap = await getDoc(doc(db, 'staff', u.uid));
          setRole(snap.exists() ? snap.data().role : null);
        } catch (e) {
          setRole(null);
        }
      } else {
        setRole(null);
      }
      setLoading(false);
    });
    return unsub;
  }, []);

  if (loading) {
    return <div className="empty-note" style={{ paddingTop: 60 }}>Cargando…</div>;
  }

  if (!user) {
    return <Login />;
  }

  if (!role) {
    return (
      <div style={{ padding: 24, textAlign: 'center' }}>
        <p>Tu cuenta no tiene un rol asignado todavía. Pídele al administrador que te
          agregue en Firestore, colección <code>staff</code>.</p>
        <button className="btn btn-ghost" onClick={() => signOut(auth)}>Cerrar sesión</button>
      </div>
    );
  }

  return (
    <div className="app">
      <div className="role-bar">
        <span className="role-tag">{ROLE_LABELS[role] || role}</span>
        <button onClick={() => signOut(auth)}>Cerrar sesión</button>
      </div>
      {role === 'mesero' && <MeseroView />}
      {role === 'cocina' && <main><CocinaView /></main>}
      {role === 'admin' && <AdminView />}
      {!['mesero', 'cocina', 'admin'].includes(role) && (
        <div className="empty-note" style={{ paddingTop: 40 }}>Rol desconocido: {role}</div>
      )}
    </div>
  );
}
