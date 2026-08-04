import { useEffect, useState } from 'react';
import { subscribeAllOrders, payOrder } from './orders';
import { unlockAudio } from './sound';
import CashRegister from './CashRegister';

function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

export default function Caja() {
  const [screen, setScreen] = useState('pos'); // 'pos' | 'registro'
  const [orders, setOrders] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [selectedId, setSelectedId] = useState(null);
  const [paymentMethod, setPaymentMethod] = useState(null);
  const [cashReceived, setCashReceived] = useState('');
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    const unsub = subscribeAllOrders((all) => {
      const open = all.filter(o => !o.paid);
      open.sort((a, b) => (a.ready === b.ready ? a.createdAt - b.createdAt : a.ready ? -1 : 1));
      setOrders(open);
      setLoaded(true);
      setSelectedId(prev => (open.some(o => o.id === prev) ? prev : null));
    });
    return unsub;
  }, []);

  const selected = orders.find(o => o.id === selectedId) || null;
  const change = paymentMethod === 'efectivo' && cashReceived
    ? Math.max(0, Number(cashReceived) - (selected?.total || 0))
    : null;

  function selectOrder(id) {
    setSelectedId(id);
    setPaymentMethod(null);
    setCashReceived('');
  }

  async function handlePay() {
    if (!selected || !paymentMethod) return;
    if (paymentMethod === 'efectivo' && (!cashReceived || Number(cashReceived) < selected.total)) return;
    setPaying(true);
    try {
      await payOrder(selected.id, {
        paymentMethod,
        cashReceived: paymentMethod === 'efectivo' ? Number(cashReceived) : null,
        change: paymentMethod === 'efectivo' ? change : null,
      });
      setSelectedId(null);
      setPaymentMethod(null);
      setCashReceived('');
    } catch (e) { console.error(e); }
    setPaying(false);
  }

  const canPay = paymentMethod === 'transferencia' || (paymentMethod === 'efectivo' && cashReceived && Number(cashReceived) >= (selected?.total || Infinity));

  if (screen === 'registro') {
    return <CashRegister onBack={() => setScreen('pos')} />;
  }

  return (
    <div className={'caja-grid' + (selected ? ' split' : '')} onClick={unlockAudio}>
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
          <h2 className="view-title" style={{ margin: 0 }}>Mesas activas</h2>
          <button className="btn btn-sm btn-ghost" onClick={() => setScreen('registro')}>🔐 Apertura/Cierre</button>
        </div>
        {!loaded ? (
          <div className="empty-note">Cargando…</div>
        ) : orders.length === 0 ? (
          <div className="empty-note">No hay cuentas abiertas</div>
        ) : (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(110px, 1fr))', gap: 10 }}>
            {orders.map(o => (
              <button
                key={o.id}
                className="mesa-btn"
                onClick={() => selectOrder(o.id)}
                style={{ border: selectedId === o.id ? '2px solid var(--amber)' : '1.5px solid var(--line)' }}
              >
                <span style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: o.type === 'domicilio' ? 14 : 24 }}>
                  {o.type === 'domicilio' ? `🛵 ${o.customerName}` : o.mesa}
                </span>
                <span className={'badge ' + (o.ready ? 'ready' : 'pend')}>{o.ready ? 'Listo' : 'Preparando'}</span>
                <span style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{money(o.total)}</span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selected && (
        <div className="caja-detail">
          <h2 className="view-title">{selected.type === 'domicilio' ? `Domicilio · ${selected.customerName}` : `Mesa ${selected.mesa}`}</h2>
          <div className="caja-ticket">
            <div className="caja-head">
              <div>
                <strong style={{ fontFamily: "'Space Mono',monospace", fontSize: 16 }}>
                  {selected.type === 'domicilio' ? selected.customerName : `Mesa ${selected.mesa}`}
                </strong> · {fmtTime(selected.createdAt)}
                {selected.type === 'domicilio' && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>{selected.address}</div>}
              </div>
              <span className={'badge ' + (selected.ready ? 'ready' : 'pend')}>{selected.ready ? 'Listo' : 'En preparación'}</span>
            </div>
            <div style={{ maxHeight: '32vh', overflowY: 'auto' }}>
              {selected.items.map(it => (
                <div key={it.id} style={{ padding: '4px 0' }}>
                  <div className="caja-item-row">
                    <span>{it.qty}× {it.name}</span>
                    <span>{money(it.price * it.qty)}</span>
                  </div>
                  {it.note && <div style={{ fontSize: 12, color: 'var(--amber)' }}>📝 {it.note}</div>}
                </div>
              ))}
            </div>
            <div className="caja-total-row"><span>Total</span><span>{money(selected.total)}</span></div>

            <div style={{ marginTop: 14 }}>
              <label className="field-label">Método de pago</label>
              <div style={{ display: 'flex', gap: 8 }}>
                <button
                  className="btn"
                  style={{
                    flex: 1, padding: 12,
                    background: paymentMethod === 'efectivo' ? 'var(--sage)' : '#fff',
                    color: paymentMethod === 'efectivo' ? '#fff' : 'var(--ink)',
                    border: '1.5px solid var(--line)',
                  }}
                  onClick={() => setPaymentMethod('efectivo')}
                >
                  💵 Efectivo
                </button>
                <button
                  className="btn"
                  style={{
                    flex: 1, padding: 12,
                    background: paymentMethod === 'transferencia' ? 'var(--sage)' : '#fff',
                    color: paymentMethod === 'transferencia' ? '#fff' : 'var(--ink)',
                    border: '1.5px solid var(--line)',
                  }}
                  onClick={() => { setPaymentMethod('transferencia'); setCashReceived(''); }}
                >
                  📲 Transferencia
                </button>
              </div>
            </div>

            {paymentMethod === 'efectivo' && (
              <div style={{ marginTop: 12 }}>
                <label className="field-label">Dinero recibido</label>
                <input
                  type="number"
                  min="0"
                  value={cashReceived}
                  onChange={e => setCashReceived(e.target.value)}
                  placeholder={String(selected.total)}
                  style={{ width: '100%' }}
                />
                {cashReceived && Number(cashReceived) >= selected.total && (
                  <div style={{ marginTop: 8, fontFamily: "'Space Mono',monospace", fontSize: 15, display: 'flex', justifyContent: 'space-between' }}>
                    <span>Cambio a dar</span>
                    <strong>{money(change)}</strong>
                  </div>
                )}
                {cashReceived && Number(cashReceived) < selected.total && (
                  <div style={{ marginTop: 8, fontSize: 12, color: 'var(--rust)' }}>El dinero recibido es menor al total.</div>
                )}
              </div>
            )}

            <div style={{ marginTop: 12 }}>
              <button className="btn btn-primary" style={{ width: '100%' }} disabled={!canPay || paying} onClick={handlePay}>
                {paying ? 'Cobrando…' : `Cobrar ${money(selected.total)}`}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
