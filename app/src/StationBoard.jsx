import { useEffect, useRef, useState } from 'react';
import { subscribeAllOrders, setItemStatus } from './orders';
import { playNewOrderSound, unlockAudio } from './sound';

function fmtTime(ts) {
  return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' });
}

export default function StationBoard({ station, label }) {
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const seenPendingIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    const unsub = subscribeAllOrders((all) => {
      const filtered = all.filter(o => !o.paid && o.items.some(i => i.station === station));

      const currentPendingIds = new Set();
      filtered.forEach(o => o.items.forEach(i => {
        if (i.station === station && i.status !== 'listo') currentPendingIds.add(i.id);
      }));
      if (!firstLoad.current) {
        let hasNew = false;
        currentPendingIds.forEach(id => { if (!seenPendingIds.current.has(id)) hasNew = true; });
        if (hasNew) playNewOrderSound();
      }
      seenPendingIds.current = currentPendingIds;
      firstLoad.current = false;

      setOrders(filtered);
      setLoaded(true);
    });
    return unsub;
  }, [station]);

  async function toggle(orderId, itemId, current) {
    await setItemStatus(orderId, itemId, current === 'listo' ? 'pendiente' : 'listo');
  }

  return (
    <div className="board-view" onClick={unlockAudio}>
      <h2 className="view-title">{label} · pedidos activos</h2>
      {!loaded ? (
        <div className="empty-note">Cargando…</div>
      ) : orders.length === 0 ? (
        <div className="empty-note">No hay pedidos pendientes en {label.toLowerCase()}</div>
      ) : (
        <div className="tickets-grid">
          {orders.map(o => {
            const stationItems = o.items.filter(i => i.station === station);
            const allDone = stationItems.every(i => i.status === 'listo');
            return (
              <div key={o.id} className={'ticket' + (allDone ? ' ready' : '') + (o.type === 'domicilio' ? ' domicilio' : '')}>
                {allDone && <div className="stamp">LISTO</div>}
                {o.type === 'domicilio' && <div className="stamp domicilio-stamp">🛵 DOMICILIO</div>}
                <div className="ticket-head">
                  <span className="ticket-mesa">{o.type === 'domicilio' ? o.customerName : `Mesa ${o.mesa}`}</span>
                  <span className="ticket-time">{fmtTime(o.createdAt)}</span>
                </div>
                {stationItems.map(it => (
                  <div key={it.id} className={'board-item' + (it.status === 'listo' ? ' done' : '')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                      <span><span className="qty">{it.qty}×</span>{it.name}</span>
                      <button
                        className={'btn-board' + (it.status === 'listo' ? ' done' : '')}
                        onClick={() => toggle(o.id, it.id, it.status)}
                      >
                        {it.status === 'listo' ? '✓ Listo' : 'Marcar listo'}
                      </button>
                    </div>
                    {it.note && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>📝 {it.note}</div>}
                  </div>
                ))}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
