import { useEffect, useState } from 'react';
import { subscribeAllOrders, subscribeSales } from './orders';

function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }
function dayKey(ts) {
  const d = new Date(ts);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}
function sameDay(a, b) { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth() && x.getDate() === y.getDate(); }
function sameMonth(a, b) { const x = new Date(a), y = new Date(b); return x.getFullYear() === y.getFullYear() && x.getMonth() === y.getMonth(); }
function startOfWeek(ts) {
  const d = new Date(ts);
  const day = (d.getDay() + 6) % 7; // lunes = 0
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d.getTime();
}
function countByItem(orders) {
  const counts = {};
  orders.forEach(o => o.items.forEach(i => { counts[i.name] = (counts[i.name] || 0) + i.qty; }));
  return counts;
}
const DIAS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
const MESES = ['Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio', 'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre'];

export default function Reportes() {
  const [screen, setScreen] = useState('resumen'); // resumen | historial | productos | calendario | dia
  const [orders, setOrders] = useState([]);
  const [sales, setSales] = useState([]);
  const [monthCursor, setMonthCursor] = useState(() => { const d = new Date(); d.setDate(1); return d; });
  const [selectedDay, setSelectedDay] = useState(null); // 'YYYY-MM-DD'

  useEffect(() => {
    const unsub = subscribeAllOrders(setOrders);
    return unsub;
  }, []);
  useEffect(() => {
    const unsub = subscribeSales(setSales);
    return unsub;
  }, []);

  const paid = orders.filter(o => o.paid);
  const now = Date.now();
  const weekStart = startOfWeek(now);

  const todayOrders = paid.filter(o => sameDay(o.paidAt, now));
  const weekOrders = paid.filter(o => o.paidAt >= weekStart);
  const monthOrders = paid.filter(o => sameMonth(o.paidAt, now));

  const summary = {
    todayTotal: todayOrders.reduce((s, o) => s + o.total, 0),
    weekTotal: weekOrders.reduce((s, o) => s + o.total, 0),
    monthTotal: monthOrders.reduce((s, o) => s + o.total, 0),
    openTabs: orders.filter(o => !o.paid).length,
  };
  const cashToday = todayOrders.filter(o => o.paymentMethod === 'efectivo').reduce((s, o) => s + o.total, 0);
  const transferToday = todayOrders.filter(o => o.paymentMethod === 'transferencia').reduce((s, o) => s + o.total, 0);

  const todayCounts = countByItem(todayOrders);
  const weekCounts = countByItem(weekOrders);
  const monthCounts = countByItem(monthOrders);
  const allProducts = [...new Set([...Object.keys(todayCounts), ...Object.keys(weekCounts), ...Object.keys(monthCounts)])]
    .sort((a, b) => (monthCounts[b] || 0) - (monthCounts[a] || 0));

  const totalsByDay = {};
  paid.forEach(o => { const k = dayKey(o.paidAt); totalsByDay[k] = (totalsByDay[k] || 0) + o.total; });

  function goBackToResumen() { setScreen('resumen'); }

  // ---------- Historial de ventas ----------
  if (screen === 'historial') {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={goBackToResumen}>← Volver a reportes</button>
        <h2 className="view-title">Historial de ventas</h2>
        <div className="card">
          {sales.length === 0 ? (
            <div className="empty-note">Aún no hay ventas registradas</div>
          ) : (
            <div className="scroll-box" style={{ maxHeight: '70vh' }}>
              {sales.map(s => (
                <div key={s.id} style={{ padding: '10px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontFamily: "'Space Mono',monospace" }}>
                    <span>
                      {new Date(s.paidAt).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })}
                      {' · '}{s.type === 'domicilio' ? `🛵 ${s.customerName}` : `Mesa ${s.mesa}`}
                    </span>
                    <strong>{money(s.total)}</strong>
                  </div>
                  <div style={{ color: 'var(--ink-soft)', marginTop: 2 }}>{s.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
                  <div style={{ color: 'var(--ink-soft)', marginTop: 2, fontSize: 12 }}>
                    {s.paymentMethod === 'efectivo' ? `💵 Efectivo (recibió ${money(s.cashReceived)}, cambio ${money(s.change)})` : '📲 Transferencia'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Ventas por producto ----------
  if (screen === 'productos') {
    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={goBackToResumen}>← Volver a reportes</button>
        <h2 className="view-title">Cuánto se ha vendido de cada producto</h2>
        <div className="card">
          {allProducts.length === 0 ? (
            <div className="empty-note">Aún no hay ventas registradas</div>
          ) : (
            <div className="scroll-box" style={{ maxHeight: '70vh' }}>
              <table className="sales-table">
                <thead>
                  <tr><th>Producto</th><th className="num">Hoy</th><th className="num">Semana</th><th className="num">Mes</th></tr>
                </thead>
                <tbody>
                  {allProducts.map(name => (
                    <tr key={name}>
                      <td>{name}</td>
                      <td className="num">{todayCounts[name] || 0}</td>
                      <td className="num">{weekCounts[name] || 0}</td>
                      <td className="num">{monthCounts[name] || 0}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Detalle de un día ----------
  if (screen === 'dia' && selectedDay) {
    const dayOrders = paid.filter(o => dayKey(o.paidAt) === selectedDay);
    const daySales = sales.filter(s => dayKey(s.paidAt) === selectedDay);
    const dayTotal = dayOrders.reduce((s, o) => s + o.total, 0);
    const dayCash = dayOrders.filter(o => o.paymentMethod === 'efectivo').reduce((s, o) => s + o.total, 0);
    const dayTransfer = dayOrders.filter(o => o.paymentMethod === 'transferencia').reduce((s, o) => s + o.total, 0);
    const dayCounts = countByItem(dayOrders);
    const dayProducts = Object.entries(dayCounts).sort((a, b) => b[1] - a[1]);
    const [y, m, d] = selectedDay.split('-').map(Number);
    const label = `${d} de ${MESES[m - 1]} de ${y}`;

    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={() => setScreen('calendario')}>← Volver al calendario</button>
        <h2 className="view-title">{label}</h2>

        <div className="report-grid">
          <div className="report-card"><div className="label">Total del día</div><div className="value">{money(dayTotal)}</div></div>
          <div className="report-card"><div className="label">Ventas</div><div className="value">{dayOrders.length}</div></div>
          <div className="report-card" style={{ background: 'var(--sage)' }}><div className="label">💵 Efectivo</div><div className="value">{money(dayCash)}</div></div>
          <div className="report-card" style={{ background: 'var(--amber)' }}><div className="label">📲 Transferencia</div><div className="value">{money(dayTransfer)}</div></div>
        </div>

        <h2 className="view-title">Productos vendidos ese día</h2>
        <div className="card">
          {dayProducts.length === 0 ? (
            <div className="empty-note">No hubo ventas ese día</div>
          ) : (
            <div className="scroll-box" style={{ maxHeight: '30vh' }}>
              {dayProducts.map(([name, qty]) => (
                <div key={name} className="caja-item-row"><span>{name}</span><span>{qty}</span></div>
              ))}
            </div>
          )}
        </div>

        <h2 className="view-title">Ventas del día</h2>
        <div className="card">
          {daySales.length === 0 ? (
            <div className="empty-note">Sin registros detallados</div>
          ) : (
            <div className="scroll-box" style={{ maxHeight: '40vh' }}>
              {daySales.map(s => (
                <div key={s.id} style={{ padding: '8px 0', borderBottom: '1px solid var(--line)', fontSize: 13 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span>{new Date(s.paidAt).toLocaleTimeString('es-CO', { hour: '2-digit', minute: '2-digit' })} · {s.type === 'domicilio' ? `🛵 ${s.customerName}` : `Mesa ${s.mesa}`}</span>
                    <strong>{money(s.total)}</strong>
                  </div>
                  <div style={{ color: 'var(--ink-soft)' }}>{s.items.map(i => `${i.qty}× ${i.name}`).join(', ')}</div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  }

  // ---------- Calendario de ventas ----------
  if (screen === 'calendario') {
    const year = monthCursor.getFullYear();
    const month = monthCursor.getMonth();
    const firstDay = new Date(year, month, 1);
    const startOffset = (firstDay.getDay() + 6) % 7; // lunes = 0
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const cells = [];
    for (let i = 0; i < startOffset; i++) cells.push(null);
    for (let d = 1; d <= daysInMonth; d++) cells.push(d);

    const monthTotalHere = Object.entries(totalsByDay)
      .filter(([k]) => k.startsWith(`${year}-${String(month + 1).padStart(2, '0')}`))
      .reduce((s, [, v]) => s + v, 0);

    return (
      <div>
        <button className="btn btn-ghost btn-sm" style={{ marginBottom: 14 }} onClick={goBackToResumen}>← Volver a reportes</button>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
          <h2 className="view-title" style={{ margin: 0 }}>{MESES[month]} {year}</h2>
          <div style={{ display: 'flex', gap: 6 }}>
            <button className="btn btn-sm btn-ghost" onClick={() => setMonthCursor(new Date(year, month - 1, 1))}>‹</button>
            <button className="btn btn-sm btn-ghost" onClick={() => setMonthCursor(new Date(year, month + 1, 1))}>›</button>
          </div>
        </div>
        <p style={{ fontSize: 12, color: 'var(--ink-soft)', marginTop: 4 }}>Total del mes: <strong>{money(monthTotalHere)}</strong></p>

        <div className="card">
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4, marginBottom: 6 }}>
            {DIAS.map(d => (
              <div key={d} style={{ textAlign: 'center', fontSize: 11, fontWeight: 700, color: 'var(--ink-soft)', textTransform: 'uppercase' }}>{d}</div>
            ))}
          </div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 4 }}>
            {cells.map((d, idx) => {
              if (!d) return <div key={idx} />;
              const key = `${year}-${String(month + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
              const total = totalsByDay[key] || 0;
              const isToday = key === dayKey(now);
              return (
                <button
                  key={idx}
                  onClick={() => { setSelectedDay(key); setScreen('dia'); }}
                  style={{
                    aspectRatio: '1', border: isToday ? '2px solid var(--amber)' : '1px solid var(--line)',
                    borderRadius: 8, background: total > 0 ? 'var(--sage-dim)' : '#fff', cursor: 'pointer',
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: 2,
                  }}
                >
                  <span style={{ fontSize: 12, fontWeight: 700 }}>{d}</span>
                  {total > 0 && <span style={{ fontSize: 9, color: 'var(--sage)', fontFamily: "'Space Mono',monospace" }}>{money(total)}</span>}
                </button>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ---------- Resumen (pantalla principal) ----------
  return (
    <div>
      <h2 className="view-title">Resumen de ventas</h2>
      <div className="report-grid">
        <div className="report-card"><div className="label">Vendido hoy</div><div className="value">{money(summary.todayTotal)}</div></div>
        <div className="report-card"><div className="label">Vendido esta semana</div><div className="value">{money(summary.weekTotal)}</div></div>
        <div className="report-card"><div className="label">Vendido este mes</div><div className="value">{money(summary.monthTotal)}</div></div>
        <div className="report-card"><div className="label">Cuentas abiertas</div><div className="value">{summary.openTabs}</div></div>
      </div>

      <div className="report-grid">
        <div className="report-card" style={{ background: 'var(--sage)' }}><div className="label">💵 Efectivo hoy</div><div className="value">{money(cashToday)}</div></div>
        <div className="report-card" style={{ background: 'var(--amber)' }}><div className="label">📲 Transferencia hoy</div><div className="value">{money(transferToday)}</div></div>
      </div>

      <div className="card">
        <p style={{ fontSize: 13, color: 'var(--ink-soft)', margin: '0 0 12px' }}>Ver más detalle:</p>
        <div style={{ display: 'grid', gap: 8 }}>
          <button className="btn btn-primary" onClick={() => setScreen('productos')}>📦 Ventas por producto (hoy / semana / mes)</button>
          <button className="btn btn-primary" onClick={() => setScreen('calendario')}>📅 Calendario de ventas por día</button>
          <button className="btn btn-primary" onClick={() => setScreen('historial')}>📜 Historial de ventas ({sales.length})</button>
        </div>
      </div>
    </div>
  );
}
