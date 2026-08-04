import { useEffect, useState } from 'react';
import {
  subscribeMenuAll, addMenuItem, updateMenuItem, setAvailability, deleteMenuItem, seedMenuIfEmpty,
} from './menuService';

function money(n) { return '$' + Math.round(n).toLocaleString('es-CO'); }

export default function MenuAdmin() {
  const [items, setItems] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [seeding, setSeeding] = useState(false);

  const [name, setName] = useState('');
  const [price, setPrice] = useState('');
  const [station, setStation] = useState('barra');
  const [cat, setCat] = useState('');
  const [saving, setSaving] = useState(false);

  const [editingId, setEditingId] = useState(null);
  const [editPrice, setEditPrice] = useState('');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const unsub = subscribeMenuAll((all) => { setItems(all); setLoaded(true); });
    return unsub;
  }, []);

  async function handleSeed() {
    setSeeding(true);
    await seedMenuIfEmpty();
    setSeeding(false);
  }

  async function handleAdd(e) {
    e.preventDefault();
    if (!name.trim() || !price || !cat.trim()) return;
    setSaving(true);
    try {
      await addMenuItem({ name, price, station, cat });
      setName(''); setPrice(''); setCat('');
    } catch (e) { console.error(e); }
    setSaving(false);
  }

  async function toggleAvailable(item) {
    await setAvailability(item.id, !(item.available !== false));
  }

  async function savePrice(item) {
    const n = Number(editPrice);
    if (n > 0) await updateMenuItem(item.id, { price: n });
    setEditingId(null);
  }

  async function handleDelete(item) {
    if (!confirm(`¿Eliminar "${item.name}" del menú por completo? Esto no se puede deshacer.`)) return;
    await deleteMenuItem(item.id);
  }

  const filteredItems = items.filter(i => i.name.toLowerCase().includes(search.trim().toLowerCase()));
  const cats = [...new Set(filteredItems.map(i => i.cat))];

  return (
    <div>
      <h2 className="view-title">Agregar producto al menú</h2>
      <div className="card">
        <form className="form-grid" onSubmit={handleAdd}>
          <div>
            <label className="field-label">Nombre</label>
            <input type="text" value={name} onChange={e => setName(e.target.value)} placeholder="Ej: Mocaccino" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="field-label">Precio</label>
            <input type="number" min="0" value={price} onChange={e => setPrice(e.target.value)} placeholder="7000" style={{ width: '100%' }} />
          </div>
          <div>
            <label className="field-label">Estación</label>
            <select value={station} onChange={e => setStation(e.target.value)} style={{ width: '100%' }}>
              <option value="barra">Barra</option>
              <option value="cocina">Cocina</option>
            </select>
          </div>
          <div>
            <label className="field-label">Categoría</label>
            <input type="text" value={cat} onChange={e => setCat(e.target.value)} placeholder="Ej: Café" style={{ width: '100%' }} />
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving ? 'Guardando…' : 'Agregar'}
          </button>
        </form>
      </div>

      <h2 className="view-title">Productos del menú</h2>
      {!loaded ? (
        <div className="empty-note">Cargando…</div>
      ) : items.length === 0 ? (
        <div className="card" style={{ textAlign: 'center' }}>
          <p style={{ color: 'var(--ink-soft)', fontSize: 14 }}>Todavía no hay productos en el menú.</p>
          <button className="btn btn-ghost" onClick={handleSeed} disabled={seeding}>
            {seeding ? 'Cargando…' : 'Cargar menú de ejemplo (café, frappés, hamburguesas…)'}
          </button>
        </div>
      ) : (
        <div className="card">
          <div className="search-bar">
            <span className="icon">🔍</span>
            <input type="text" value={search} onChange={e => setSearch(e.target.value)} placeholder="Buscar producto…" />
          </div>
          <div className="scroll-box">
            {filteredItems.length === 0 && (
              <div className="empty-note">Sin resultados para "{search}"</div>
            )}
            {cats.map(c => (
              <div key={c} style={{ marginBottom: 14 }}>
                <h3 style={{ fontSize: 12, textTransform: 'uppercase', letterSpacing: 0.5, color: 'var(--ink-soft)', margin: '0 0 8px' }}>{c}</h3>
                {filteredItems.filter(i => i.cat === c).map(item => {
                  const available = item.available !== false;
                  return (
                    <div className="menu-item" key={item.id} style={{ cursor: 'default' }}>
                      <div style={{ opacity: available ? 1 : 0.45 }}>
                        <div className="name">{item.name} <span style={{ fontSize: 11, color: 'var(--ink-soft)' }}>· {item.station}</span></div>
                        {editingId === item.id ? (
                          <div style={{ display: 'flex', gap: 6, marginTop: 4 }}>
                            <input type="number" value={editPrice} onChange={e => setEditPrice(e.target.value)} style={{ width: 90 }} />
                            <button className="btn btn-sm btn-primary" onClick={() => savePrice(item)}>Guardar</button>
                            <button className="btn btn-sm btn-ghost" onClick={() => setEditingId(null)}>Cancelar</button>
                          </div>
                        ) : (
                          <div className="price" style={{ cursor: 'pointer' }} onClick={() => { setEditingId(item.id); setEditPrice(String(item.price)); }}>
                            {money(item.price)} · editar
                          </div>
                        )}
                      </div>
                      <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
                        <button
                          className="btn btn-sm"
                          style={{ background: available ? 'var(--sage-dim)' : 'var(--amber-dim)', color: available ? 'var(--sage)' : 'var(--amber)' }}
                          onClick={() => toggleAvailable(item)}
                        >
                          {available ? 'Disponible' : 'Agotado'}
                        </button>
                        <button className="btn btn-sm btn-ghost" onClick={() => handleDelete(item)}>Eliminar</button>
                      </div>
                    </div>
                  );
                })}
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
