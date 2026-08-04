import { collection, doc, increment, onSnapshot, orderBy, query, setDoc } from 'firebase/firestore';
import { db } from './firebase';

function slugify(name) {
  return name
    .trim()
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '') // quita tildes
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

export function subscribeInventory(callback) {
  const q = query(collection(db, 'inventory'), orderBy('name', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error('subscribeInventory:', err));
}

// Suma cantidad al inventario (crea el producto si no existía todavía).
export async function addStock(name, qty, unit) {
  const id = slugify(name);
  if (!id) return;
  await setDoc(
    doc(db, 'inventory', id),
    { name: name.trim(), unit, qty: increment(qty), updatedAt: Date.now() },
    { merge: true }
  );
}
