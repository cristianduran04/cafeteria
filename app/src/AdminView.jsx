import { useState } from 'react';
import StationBoard from './StationBoard';
import CocinaView from './CocinaView';
import Caja from './Caja';
import Reportes from './Reportes';
import Inventario from './Inventario';
import MenuAdmin from './MenuAdmin';
import Domicilios from './Domicilios';
import { unlockAudio } from './sound';

const TABS = [
  { id: 'barra', label: '☕ Barra' },
  { id: 'cocina', label: '🍔 Cocina' },
  { id: 'domicilios', label: '🛵 Domicilios' },
  { id: 'caja', label: '💰 Caja' },
  { id: 'menu', label: '📝 Menú' },
  { id: 'inventario', label: '📦 Inventario' },
  { id: 'reportes', label: '📊 Reportes' },
];

export default function AdminView() {
  const [tab, setTab] = useState('barra');

  return (
    <div onClick={unlockAudio}>
      <div className="tabs" style={{ padding: '0 20px', background: '#fff', borderBottom: '1px solid var(--line)' }}>
        {TABS.map(t => (
          <button key={t.id} className={'tab' + (tab === t.id ? ' active' : '')} onClick={() => setTab(t.id)}>
            {t.label}
          </button>
        ))}
      </div>
      <main>
        {tab === 'barra' && <StationBoard station="barra" label="Barra" />}
        {tab === 'cocina' && <CocinaView />}
        {tab === 'domicilios' && <Domicilios />}
        {tab === 'caja' && <Caja />}
        {tab === 'menu' && <MenuAdmin />}
        {tab === 'inventario' && <Inventario />}
        {tab === 'reportes' && <Reportes />}
      </main>
    </div>
  );
}
