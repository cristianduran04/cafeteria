import { useEffect, useState } from 'react';
import { subscribeMenuAvailable } from './menuService';
import { sendDeliveryOrder, subscribeOpenOrders } from './orders';

function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

export default function Domicilios() {
  const [menu, setMenu] = useState([]);
  const [orders, setOrders] = useState([]);
  const [search, setSearch] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [address, setAddress] = useState('');
  const [draft, setDraft] = useState([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [noteOpenFor, setNoteOpenFor] = useState(null);

  useEffect(() => {
    const unsub = subscribeMenuAvailable(setMenu);
    return unsub;
  }, []);
  useEffect(() => {
    const unsub = subscribeOpenOrders((all) => setOrders(all.filter(o => o.type === 'domicilio')));
    return unsub;
  }, []);
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2500);
    return () => clearTimeout(t);
  }, [toast]);

  function addItem(m) {
    setDraft(prev => {
      const existing = prev.find(d => d.menuItem.id === m.id);
      if (existing) return prev.map(d => d.menuItem.id === m.id ? { ...d, qty: d.qty + 1 } : d);
      return [...prev, { menuItem: m, qty: 1, note: '' }];
    });
  }
  function decItem(m) {
    setDraft(prev => {
      const existing = prev.find(d => d.menuItem.id === m.id);
      if (!existing) return prev;
      if (existing.qty <= 1) return prev.filter(d => d.menuItem.id !== m.id);
      return prev.map(d => d.menuItem.id === m.id ? { ...d, qty: d.qty - 1 } : d);
    });
  }
  function setNote(menuId, note) {
    setDraft(prev => prev.map(d => d.menuItem.id === menuId ? { ...d, note } : d));
  }
  const draftTotal = draft.reduce((s, d) => s + d.menuItem.price * d.qty, 0);
  const filteredMenu = menu.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const cats = [...new Set(filteredMenu.map(m => m.cat))];

  async function handleSend() {
    if (!customerName.trim() || !address.trim() || draft.length === 0) return;
    setSending(true);
    try {
      await sendDeliveryOrder({ customerName, address, draftItems: draft });
      setToast(`Domicilio enviado a cocina — ${customerName}`);
      setCustomerName(''); setAddress(''); setDraft([]); setNoteOpenFor(null);
    } catch (e) { console.error(e); }
    setSending(false);
  }

  return (
    <div>
      <h2 className="view-title">Nuevo domicilio</h2>
      <div className="card">
        <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr', marginBottom: 8 }}>
          <div>
            <label className="field-label">Nombre de quien pide</label>
            <input type="text" value={customerName} onChange={e => setCustomerName(e.target.value)} placeholder="Ej: Laura" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="field-label">Dirección</label>
            <input type="text" value={address} onChange={e => setAddress(e.target.value)} placeholder="Ej: Cra 5 # 10-20" style={{ width: '100%' }} />
          </div>
        </div>
      </div>

      <div className="card">
        <div className="search-bar">
          <span className="icon">🔍</span>
          <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" />
        </div>
        <div className="scroll-box">
          {menu.length > 0 && filteredMenu.length === 0 && (
            <div className="empty-note">Sin resultados para "{search}"</div>
          )}
          {cats.map(cat => (
            <div key={cat} className="menu-cat" style={{ marginBottom: 14 }}>
              <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-soft)', margin: '0 0 8px' }}>{cat}</h3>
              {filteredMenu.filter(m => m.cat === cat).map(m => (
                <div className="menu-item" key={m.id} onClick={() => addItem(m)}>
                  <div><div className="name">{m.name}</div><div className="price">{money(m.price)}</div></div>
                  <button className="btn-add" onClick={e => { e.stopPropagation(); addItem(m); }}>+</button>
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>

      {draft.length > 0 && (
        <div className="card">
          <label className="field-label">Pedido</label>
          {draft.map(d => (
            <div key={d.menuItem.id} style={{ borderBottom: '1px solid var(--line)', padding: '8px 0' }}>
              <div className="draft-row" style={{ border: 'none', padding: 0 }}>
                <span>{d.menuItem.name}</span>
                <div className="qty-ctl">
                  <button onClick={() => decItem(d.menuItem)}>−</button>
                  <span>{d.qty}</span>
                  <button onClick={() => addItem(d.menuItem)}>+</button>
                </div>
              </div>
              {noteOpenFor !== d.menuItem.id && (
                <button className={'note-toggle' + (d.note ? ' has-note' : '')} onClick={() => setNoteOpenFor(d.menuItem.id)}>
                  {d.note ? `📝 ${d.note}` : '+ Nota'}
                </button>
              )}
              {noteOpenFor === d.menuItem.id && (
                <input
                  type="text"
                  autoFocus
                  value={d.note}
                  onChange={e => setNote(d.menuItem.id, e.target.value)}
                  onBlur={() => setNoteOpenFor(null)}
                  placeholder="Nota (ej: sin lechuga)"
                  style={{ width: '100%', marginTop: 6, fontSize: 13, padding: '6px 10px' }}
                />
              )}
            </div>
          ))}
          <div className="draft-total"><span>Total</span><span>{money(draftTotal)}</span></div>
          <div style={{ marginTop: 12 }}>
            <button
              className="btn btn-primary" style={{ width: '100%' }}
              disabled={!customerName.trim() || !address.trim() || sending}
              onClick={handleSend}
            >
              {sending ? 'Enviando…' : 'Enviar domicilio a cocina y barra'}
            </button>
          </div>
        </div>
      )}

      {toast && <div className="notice-banner" style={{ background: 'var(--domicilio)' }}>{toast}</div>}

      <h2 className="view-title">Domicilios activos</h2>
      {orders.length === 0 ? (
        <div className="empty-note">No hay domicilios en curso</div>
      ) : (
        orders.map(o => (
          <div className="active-order-row" key={o.id} style={{ cursor: 'default' }}>
            <span>
              <strong>🛵 {o.customerName}</strong>
              <span style={{ color: 'var(--ink-soft)' }}> · {o.address} · {fmtTime(o.createdAt)}</span>
            </span>
            <span className={'badge ' + (o.ready ? 'ready' : 'pend')}>{o.ready ? 'Listo' : 'En preparación'}</span>
          </div>
        ))
      )}
      <p style={{ fontSize: 12, color: 'var(--ink-soft)' }}>
        Para cobrar un domicilio (efectivo o transferencia), ve a la pestaña 💰 Caja — ahí
        también aparecen los domicilios junto con las mesas.
      </p>
    </div>
  );
}
