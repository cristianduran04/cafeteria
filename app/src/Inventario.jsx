import { useEffect, useState } from 'react';
import { subscribeInventory, addStock } from './inventory';

const UNITS = ['unidades', 'kg', 'g', 'litros', 'paquetes'];

function fmtTime(ts) { return new Date(ts).toLocaleString('es-CO', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }

export default function Inventario() {
  const [items, setItems] = useState([]);
  const [name, setName] = useState('');
  const [qty, setQty] = useState('');
  const [unit, setUnit] = useState('unidades');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const unsub = subscribeInventory(setItems);
    return unsub;
  }, []);

  async function handleAdd(e) {
    e.preventDefault();
    const n = Number(qty);
    if (!name.trim() || !n || n <= 0) return;
    setSaving(true);
    try {
      await addStock(name, n, unit);
      setName('');
      setQty('');
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  return (
    <div>
      <h2 className="view-title">Subir inventario</h2>
      <div className="card">
        <form className="form-grid" onSubmit={handleAdd}>
          <div>
            <label className="field-label">Producto</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Tomate, Pan brioche…" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="field-label">Cantidad</label>
            <input type="number" min="0" step="0.1" value={qty} onChange={e => setQty(e.target.value)} placeholder="Ej: 10" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="field-label">Unidad</label>
            <select value={unit} onChange={e => setUnit(e.target.value)} style={{ width: '100%' }}>
              {UNITS.map(u => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      </div>

      <h2 className="view-title">Existencias actuales</h2>
      <div className="card">
        {items.length === 0 ? (
          <div className="empty-note">Todavía no has subido inventario</div>
        ) : (
          items.map(it => (
            <div className="inv-row" key={it.id}>
              <div>
                <div>{it.name}</div>
                <div style={{ fontSize: 11, color: 'var(--ink-soft)' }}>Actualizado {fmtTime(it.updatedAt)}</div>
              </div>
              <span className="inv-qty">{it.qty} {it.unit}</span>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
