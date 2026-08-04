import {
  collection, deleteDoc, doc, getDocs, onSnapshot, orderBy, query, setDoc, updateDoc,
} from 'firebase/firestore';
import { db } from './firebase';
import { MENU as SEED_MENU } from './menu';

// Todo el menú, tal como está guardado (incluye agotados) — lo usa la pantalla de
// administración del menú.
export function subscribeMenuAll(callback) {
  const q = query(collection(db, 'menu'), orderBy('cat', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error('subscribeMenuAll:', err));
}

// Solo lo disponible — lo usa el mesero para armar pedidos.
export function subscribeMenuAvailable(callback) {
  return subscribeMenuAll((all) => callback(all.filter(m => m.available !== false)));
}

function slugify(name) {
  return name.trim().toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
}

export async function addMenuItem({ name, price, station, cat }) {
  const id = slugify(name) || ('item-' + Date.now());
  await setDoc(doc(db, 'menu', id), {
    name: name.trim(), price: Number(price), station, cat: cat.trim(), available: true,
  });
}

export async function updateMenuItem(id, changes) {
  await updateDoc(doc(db, 'menu', id), changes);
}

export async function setAvailability(id, available) {
  await updateDoc(doc(db, 'menu', id), { available });
}

export async function deleteMenuItem(id) {
  await deleteDoc(doc(db, 'menu', id));
}

// Carga el menú inicial de ejemplo en Firestore (solo si la colección está vacía).
// Así no hay que crear ~20 productos a mano la primera vez.
export async function seedMenuIfEmpty() {
  const snap = await getDocs(collection(db, 'menu'));
  if (!snap.empty) return false;
  await Promise.all(SEED_MENU.map(m =>
    setDoc(doc(db, 'menu', m.id), { name: m.name, price: m.price, station: m.station, cat: m.cat, available: true })
  ));
  return true;
}
