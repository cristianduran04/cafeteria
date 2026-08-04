import { useEffect, useState } from 'react';
import { subscribeRegisterEvents, openRegister, closeRegister } from './registerService';

function fmtDateTime(ts) {
  return new Date(ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' });
}
function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

export default function CashRegister({ onBack }) {
  const [events, setEvents] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [amount, setAmount] = useState('');
  const [busy, setBusy] = useState(false);
  const [lastResult, setLastResult] = useState(null);

  useEffect(() => {
    const unsub = subscribeRegisterEvents((data) => { setEvents(data); setLoaded(true); });
    return unsub;
  }, []);

  const latest = events[0] || null;
  const isOpen = latest && latest.type === 'apertura';

  async function handleOpen() {
    const n = Number(amount);
    if (!n && n !== 0) return;
    setBusy(true);
    try {
      await openRegister(n);
      setAmount('');
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  async function handleClose() {
    const n = Number(amount);
    if (!n && n !== 0) return;
    setBusy(true);
    try {
      const result = await closeRegister(n, latest);
      setLastResult(result);
      setAmount('');
    } catch (e) { console.error(e); }
    setBusy(false);
  }

  return (
    <div>
      <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={onBack}>← Volver a caja</button>
      <h2 className="view-title">Apertura y cierre de caja</h2>

      <div className="card">
        {!loaded ? (
          <div className="empty-note">Cargando…</div>
        ) : isOpen ? (
          <>
            <div style={{ marginBottom: 12 }}>
              <span className="badge ready">Caja abierta</span>
              <p style={{ fontSize: 13, color: 'var(--ink-soft)', marginTop: 8 }}>
                Base: <strong>{money(latest.cashAmount)}</strong> · desde {fmtDateTime(latest.timestamp)} · abrió {latest.by}
              </p>
            </div>
            <label className="field-label">Efectivo contado ahora (para cerrar)</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej: 250000" style={{ width: '100%', marginBottom: 10 }} />
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={!amount || busy} onClick={handleClose}>
              {busy ? 'Cerrando…' : 'Cerrar caja'}
            </button>
          </>
        ) : (
          <>
            <span className="badge pend">Caja cerrada</span>
            <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '8px 0 12px' }}>No hay una apertura activa.</p>
            <label className="field-label">Base con la que abres (efectivo inicial)</label>
            <input type="number" min="0" value={amount} onChange={e => setAmount(e.target.value)} placeholder="Ej: 100000" style={{ width: '100%', marginBottom: 10 }} />
            <button className="btn btn-primary" style={{ width: '100%' }} disabled={!amount || busy} onClick={handleOpen}>
              {busy ? 'Abriendo…' : 'Abrir caja'}
            </button>
          </>
        )}
      </div>

      {lastResult && (
        <div className="card" style={{ background: lastResult.difference === 0 ? 'var(--sage-dim)' : 'var(--amber-dim)' }}>
          <p style={{ margin: 0, fontSize: 13 }}>
            Ventas en efectivo desde la apertura: <strong>{money(lastResult.cashSalesSum)}</strong><br />
            Efectivo esperado en caja: <strong>{money(lastResult.expected)}</strong><br />
            Diferencia: <strong>{lastResult.difference === 0 ? 'cuadró exacto' : (lastResult.difference > 0 ? `sobran ${money(lastResult.difference)}` : `faltan ${money(-lastResult.difference)}`)}</strong>
          </p>
        </div>
      )}

      <h2 className="view-title">Historial de aperturas y cierres</h2>
      <div className="card">
        {events.length === 0 ? (
          <div className="empty-note">Todavía no hay registros</div>
        ) : (
          <div className="scroll-box" style={{ maxHeight: '45vh' }}>
            {events.map(ev => (
              <div key={ev.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span>
                    <span className={'badge ' + (ev.type === 'apertura' ? 'ready' : 'pend')}>
                      {ev.type === 'apertura' ? 'Apertura' : 'Cierre'}
                    </span>
                    {' '}{fmtDateTime(ev.timestamp)} · {ev.by}
                  </span>
                </div>
                {ev.type === 'apertura' ? (
                  <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>Base: {money(ev.cashAmount)}</div>
                ) : (
                  <div style={{ color: 'var(--ink-soft)', marginTop: 4 }}>
                    Contado: {money(ev.cashCounted)} · Esperado: {money(ev.expected)} ·{' '}
                    {ev.difference === 0 ? 'cuadró' : ev.difference > 0 ? `sobraron ${money(ev.difference)}` : `faltaron ${money(-ev.difference)}`}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
