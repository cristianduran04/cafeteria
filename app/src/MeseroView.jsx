import { useEffect, useRef, useState } from 'react';
import { subscribeMenuAvailable } from './menuService';
import { sendOrder, subscribeOpenOrders, updateOrderItem, removeOrderItem, markDelivered } from './orders';
import { playReadySound, unlockAudio } from './sound';

function fmtTime(ts) { return new Date(ts).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' }); }
function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

export default function MeseroView() {
  const [tab, setTab] = useState('nuevo');
  const [orders, setOrders] = useState([]);
  const [menu, setMenu] = useState([]);
  const [search, setSearch] = useState('');
  const [mesa, setMesa] = useState('');
  const [draft, setDraft] = useState([]);
  const [sending, setSending] = useState(false);
  const [toast, setToast] = useState('');
  const [expandedOrderId, setExpandedOrderId] = useState(null);
  const [noteOpenFor, setNoteOpenFor] = useState(null); // id (menuId o itemId) con la nota desplegada
  const seenReadyIds = useRef(new Set());
  const firstLoad = useRef(true);

  useEffect(() => {
    const unsub = subscribeOpenOrders((data) => {
      const currentReadyIds = new Set(data.filter(o => o.ready).map(o => o.id));
      if (!firstLoad.current) {
        let hasNewlyReady = false;
        currentReadyIds.forEach(id => { if (!seenReadyIds.current.has(id)) hasNewlyReady = true; });
        if (hasNewlyReady) playReadySound();
      }
      seenReadyIds.current = currentReadyIds;
      firstLoad.current = false;
      setOrders(data);
    });
    return unsub;
  }, []);

  useEffect(() => {
    const unsub = subscribeMenuAvailable(setMenu);
    return unsub;
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(''), 2800);
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
  const draftCount = draft.reduce((s, d) => s + d.qty, 0);

  async function handleSend() {
    if (!mesa || draft.length === 0) return;
    setSending(true);
    try {
      const result = await sendOrder(mesa, draft);
      setToast(result.merged ? `Se agregó a la cuenta de la mesa ${mesa}` : `Pedido enviado — mesa ${mesa}`);
      setDraft([]);
      setMesa('');
      setNoteOpenFor(null);
    } catch (e) {
      setToast('No se pudo enviar el pedido, intenta de nuevo.');
    }
    setSending(false);
  }

  async function changeQty(orderId, item, delta) {
    const newQty = item.qty + delta;
    if (newQty <= 0) await removeOrderItem(orderId, item.id);
    else await updateOrderItem(orderId, item.id, { qty: newQty });
  }
  async function changeNote(orderId, item, note) {
    await updateOrderItem(orderId, item.id, { note });
  }
  async function removeItem(orderId, item) {
    if (!confirm(`¿Quitar "${item.name}" de esta cuenta?`)) return;
    await removeOrderItem(orderId, item.id);
  }

  const readyOrders = orders.filter(o => o.ready && !o.delivered);
  const preparingOrders = orders.filter(o => !o.ready && !o.delivered);
  const filteredMenu = menu.filter(m => m.name.toLowerCase().includes(search.trim().toLowerCase()));
  const cats = [...new Set(filteredMenu.map(m => m.cat))];

  function renderOrderCard(o) {
    const expanded = expandedOrderId === o.id;
    const doneCount = o.items.filter(i => i.status === 'listo').length;
    return (
      <div className="card" key={o.id} style={{ marginBottom: 10, padding: expanded ? 16 : 0, overflow: 'hidden' }}>
        <div
          className="active-order-row"
          style={{ border: 'none', borderRadius: expanded ? 0 : 10, marginBottom: expanded ? 10 : 0 }}
          onClick={() => setExpandedOrderId(expanded ? null : o.id)}
        >
          <span>
            <strong style={{ fontFamily: "'Space Mono',monospace" }}>Mesa {o.mesa}</strong>
            <span style={{ color: 'var(--ink-soft)' }}> · {fmtTime(o.createdAt)} · {doneCount}/{o.items.length} listos</span>
          </span>
          <span style={{ fontSize: 18, color: 'var(--ink-soft)' }}>{expanded ? '▾' : '▸'}</span>
        </div>
        {expanded && o.items.map(it => (
          <div key={it.id} style={{ borderTop: '1px solid var(--line)', padding: '10px 0' }}>
            <div className="draft-row" style={{ border: 'none', padding: 0 }}>
              <span style={{ opacity: it.status === 'listo' ? 0.5 : 1 }}>
                {it.qty}× {it.name} {it.status === 'listo' && <span style={{ fontSize: 11 }}>(ya listo)</span>}
              </span>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                {it.status !== 'listo' && (
                  <div className="qty-ctl">
                    <button onClick={() => changeQty(o.id, it, -1)}>−</button>
                    <span>{it.qty}</span>
                    <button onClick={() => changeQty(o.id, it, 1)}>+</button>
                  </div>
                )}
                <button className="btn btn-sm btn-ghost" onClick={() => removeItem(o.id, it)}>🗑</button>
              </div>
            </div>
            {it.status !== 'listo' && noteOpenFor !== it.id && (
              <button className={'note-toggle' + (it.note ? ' has-note' : '')} onClick={() => setNoteOpenFor(it.id)}>
                {it.note ? `📝 ${it.note}` : '+ Nota'}
              </button>
            )}
            {it.status !== 'listo' && noteOpenFor === it.id && (
              <input
                type="text"
                autoFocus
                defaultValue={it.note}
                onBlur={e => { if (e.target.value !== it.note) changeNote(o.id, it, e.target.value); setNoteOpenFor(null); }}
                placeholder="Nota (ej: sin lechuga)"
                style={{ width: '100%', marginTop: 6, fontSize: 13, padding: '6px 10px' }}
              />
            )}
            {it.status === 'listo' && it.note && (
              <div style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 2 }}>Nota: {it.note}</div>
            )}
          </div>
        ))}
      </div>
    );
  }

  return (
    <div style={{ paddingBottom: 74 }} onClick={unlockAudio}>
      <main>
        {toast && <div className="notice-banner" style={{ background: 'var(--ink)' }}>{toast}</div>}

        {tab === 'nuevo' && (
          <>
            <div className="card">
              <label className="field-label">Número de mesa</label>
              <input type="number" min="1" value={mesa} onChange={e => setMesa(e.target.value)} placeholder="Ej: 5" style={{ width: 120 }} />
            </div>

            <div className="card">
              <div className="search-bar">
                <span className="icon">🔍</span>
                <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" />
              </div>
              <div className="scroll-box">
                {menu.length === 0 && (
                  <div className="empty-note">El administrador aún no ha cargado el menú.</div>
                )}
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
                <label className="field-label">Pedido actual</label>
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
              </div>
            )}
          </>
        )}

        {tab === 'activos' && (
          <>
            {readyOrders.length > 0 && (
              <>
                <h2 className="view-title">Listas para recoger</h2>
                {readyOrders.map(o => (
                  <div key={o.id}>
                    <div className="notice-banner">
                      <span
                        style={{ fontFamily: "'Space Mono',monospace", fontWeight: 700, fontSize: 18, cursor: 'pointer' }}
                        onClick={() => setExpandedOrderId(expandedOrderId === o.id ? null : o.id)}
                      >
                        Mesa {o.mesa} — pedido listo {expandedOrderId === o.id ? '▾' : '▸'}
                      </span>
                      <button
                        className="btn btn-sm"
                        style={{ background: '#fff', color: 'var(--sage)' }}
                        onClick={() => markDelivered(o.id)}
                      >
                        ✅ Entregado
                      </button>
                    </div>
                    {expandedOrderId === o.id && (
                      <div className="card" style={{ marginTop: -6 }}>
                        {o.items.map(it => (
                          <div key={it.id} style={{ padding: '6px 0', borderBottom: '1px solid var(--line)' }}>
                            <div className="caja-item-row"><span>{it.qty}× {it.name}</span></div>
                            {it.note && <div style={{ fontSize: 12, color: 'var(--ink-soft)' }}>Nota: {it.note}</div>}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </>
            )}
            <h2 className="view-title">En preparación</h2>
            {preparingOrders.length === 0 && readyOrders.length === 0 ? (
              <div className="empty-note">No hay cuentas abiertas</div>
            ) : preparingOrders.length === 0 ? (
              <div className="empty-note">No hay más pedidos en preparación</div>
            ) : (
              preparingOrders.map(o => renderOrderCard(o))
            )}
          </>
        )}
      </main>

      {tab === 'nuevo' && draft.length > 0 && (
        <div style={{ position: 'fixed', bottom: 66, left: 0, right: 0, padding: '0 20px', maxWidth: 1000, margin: '0 auto', zIndex: 21 }}>
          <button className="btn btn-primary" style={{ width: '100%', padding: 14, fontSize: 15 }} disabled={!mesa || sending} onClick={handleSend}>
            {sending ? 'Enviando…' : `Enviar ${draftCount} producto${draftCount === 1 ? '' : 's'} · ${money(draftTotal)}`}
          </button>
        </div>
      )}

      <nav className="mesero-bottom-nav">
        <button className={tab === 'nuevo' ? 'active' : ''} onClick={() => setTab('nuevo')}>
          <span className="icon">📋</span>Nuevo pedido
        </button>
        <button className={tab === 'activos' ? 'active' : ''} onClick={() => setTab('activos')}>
          <span className="icon">🔔</span>Pedidos activos
          {readyOrders.length > 0 && <span className="nav-badge">{readyOrders.length}</span>}
        </button>
      </nav>
    </div>
  );
}
