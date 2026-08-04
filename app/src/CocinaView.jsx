import { useEffect, useRef, useState } from 'react';
import { subscribeOpenOrders, setItemStatus } from './orders';
import { playNewOrderSound, unlockAudio } from './sound';

function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }

export default function CocinaView() {
  const [tab, setTab] = useState('pendientes');
  const [tickets, setTickets] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const seenPendingIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    const unsub = subscribeOpenOrders((all) => {
      const kitchen = all
        .filter(o => o.items.some(i => i.station === 'cocina'))
        .map(o => ({
          id: o.id,
          type: o.type || 'mesa',
          mesa: o.mesa,
          customerName: o.customerName,
          address: o.address,
          createdAt: o.createdAt,
          items: o.items.filter(i => i.station === 'cocina'),
        }));

      // Detectar ítems pendientes nuevos (que no existían en la última vuelta) para el sonido.
      const currentPendingIds = new Set();
      kitchen.forEach(o => o.items.forEach(i => { if (i.status !== 'listo') currentPendingIds.add(i.id); }));
      if (!firstLoad.current) {
        let hasNew = false;
        currentPendingIds.forEach(id => { if (!seenPendingIds.current.has(id)) hasNew = true; });
        if (hasNew) playNewOrderSound();
      }
      seenPendingIds.current = currentPendingIds;
      firstLoad.current = false;

      setTickets(kitchen);
      setLoaded(true);
    });
    return unsub;
  }, []);

  async function toggle(orderId, itemId, current) {
    await setItemStatus(orderId, itemId, current === 'listo' ? 'pendiente' : 'listo');
  }

  const pendingTickets = tickets
    .map(o => ({ ...o, items: o.items.filter(i => i.status !== 'listo') }))
    .filter(o => o.items.length > 0);
  const doneTickets = tickets
    .map(o => ({ ...o, items: o.items.filter(i => i.status === 'listo') }))
    .filter(o => o.items.length > 0);

  const list = tab === 'pendientes' ? pendingTickets : doneTickets;

  return (
    <div className="board-view" onClick={unlockAudio}>
      <div className="tabs" style={{ marginBottom: 14 }}>
        <button className={'tab' + (tab === 'pendientes' ? ' active' : '')} onClick={() => setTab('pendientes')} style={{ color: tab === 'pendientes' ? 'var(--board-ink)' : 'var(--ink-soft)' }}>
          🔥 Pendientes {pendingTickets.length > 0 && <span className="badge pend" style={{ marginLeft: 6 }}>{pendingTickets.reduce((s, o) => s + o.items.length, 0)}</span>}
        </button>
        <button className={'tab' + (tab === 'preparados' ? ' active' : '')} onClick={() => setTab('preparados')} style={{ color: tab === 'preparados' ? 'var(--board-ink)' : 'var(--ink-soft)' }}>
          ✅ Preparados
        </button>
      </div>

      {!loaded ? (
        <div className="empty-note">Cargando…</div>
      ) : list.length === 0 ? (
        <div className="empty-note">{tab === 'pendientes' ? 'No hay pedidos pendientes' : 'Nada preparado todavía'}</div>
      ) : (
        <div className="tickets-grid">
          {list.map(o => (
            <div key={o.id} className={'ticket' + (o.type === 'domicilio' ? ' domicilio' : '')}>
              {o.type === 'domicilio' && <div className="stamp domicilio-stamp">🛵 DOMICILIO</div>}
              <div className="ticket-head">
                <span className="ticket-mesa">{o.type === 'domicilio' ? o.customerName : `Mesa ${o.mesa}`}</span>
                <span className="ticket-time">{fmtTime(o.createdAt)}</span>
              </div>
              {o.items.map(it => (
                <div key={it.id} className={'board-item' + (it.status === 'listo' ? ' done' : '')} style={{ flexDirection: 'column', alignItems: 'stretch' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', width: '100%' }}>
                    <span><span className="qty">{it.qty}×</span>{it.name}</span>
                    <button
                      className={'btn-board' + (it.status === 'listo' ? ' done' : '')}
                      onClick={() => toggle(o.id, it.id, it.status)}
                    >
                      {it.status === 'listo' ? '↺ Deshacer' : 'Marcar listo'}
                    </button>
                  </div>
                  {it.note && <div style={{ fontSize: 12, color: 'var(--amber)', marginTop: 2 }}>📝 {it.note}</div>}
                </div>
              ))}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
