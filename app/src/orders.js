import {
  addDoc, collection, doc, getDoc, getDocs, limit, onSnapshot, orderBy, query,
  runTransaction, updateDoc, where,
} from 'firebase/firestore';
import { db } from './firebase';

function withComputed(order) {
  const total = order.items.reduce((s, i) => s + i.price * i.qty, 0);
  const ready = order.items.length > 0 && order.items.every(i => i.status === 'listo');
  return { ...order, total, ready };
}

// Todos los pedidos (pagados y sin pagar) — Barra/Admin y Reportes.
export function subscribeAllOrders(callback) {
  const q = query(collection(db, 'orders'), orderBy('createdAt', 'asc'));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => withComputed({ id: d.id, ...d.data() })));
  }, (err) => console.error('subscribeAllOrders:', err));
}

// Solo cuentas abiertas — lo usan Mesero, Cocina y Domicilios.
// Nota: el orden se hace aquí en JS (no con orderBy en la consulta) porque combinar un
// filtro (paid == false) con un orderBy en otro campo (createdAt) exige crear un índice
// compuesto en Firestore. Ordenando en el cliente evitamos esa dependencia.
export function subscribeOpenOrders(callback) {
  const q = query(collection(db, 'orders'), where('paid', '==', false));
  return onSnapshot(q, (snap) => {
    const orders = snap.docs.map(d => withComputed({ id: d.id, ...d.data() }));
    orders.sort((a, b) => a.createdAt - b.createdAt);
    callback(orders);
  }, (err) => console.error('subscribeOpenOrders:', err));
}

export async function setItemStatus(orderId, itemId, status) {
  const ref = doc(db, 'orders', orderId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const items = snap.data().items.map(i => (i.id === itemId ? { ...i, status } : i));
    tx.update(ref, { items });
  });
}

// El mesero ya recogió y entregó el pedido en la mesa: deja de salir en su lista de
// pedidos activos, pero sigue abierto (sin pagar) hasta que caja lo cobre.
export async function markDelivered(orderId) {
  await updateDoc(doc(db, 'orders', orderId), { delivered: true, deliveredAt: Date.now() });
}

// Cobrar una cuenta. Si es en efectivo, se guarda cuánto dio el cliente y cuánto se le dio
// de cambio (para que quede en el historial de ventas). Además del pedido, se guarda un
// registro aparte en "sales" con hora, productos vendidos y el resto de detalles — así
// queda un historial de ventas propio, aunque más adelante se archiven o borren pedidos.
export async function payOrder(orderId, { paymentMethod, cashReceived = null, change = null }) {
  const ref = doc(db, 'orders', orderId);
  const snap = await getDoc(ref);
  const orderData = snap.exists() ? snap.data() : null;
  const paidAt = Date.now();

  await updateDoc(ref, { paid: true, paidAt, paymentMethod, cashReceived, change });

  if (orderData) {
    await addDoc(collection(db, 'sales'), {
      orderId,
      type: orderData.type || 'mesa',
      mesa: orderData.mesa ?? null,
      customerName: orderData.customerName ?? null,
      address: orderData.address ?? null,
      items: orderData.items,
      total: orderData.items.reduce((s, i) => s + i.price * i.qty, 0),
      paymentMethod,
      cashReceived,
      change,
      paidAt,
    });
  }
}

// Historial de ventas ya cobradas (para reportes / auditoría).
export function subscribeSales(callback) {
  const q = query(collection(db, 'sales'), orderBy('paidAt', 'desc'), limit(200));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error('subscribeSales:', err));
}

// Corregir un pedido mal tomado: cambiar cantidad o nota de un ítem que aún esté pendiente.
export async function updateOrderItem(orderId, itemId, changes) {
  const ref = doc(db, 'orders', orderId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const items = snap.data().items.map(i => (i.id === itemId ? { ...i, ...changes } : i));
    tx.update(ref, { items });
  });
}

// Quitar por completo un ítem que se pidió por error. Si era el único ítem del pedido,
// se borra el pedido completo (una cuenta con $0 no tiene sentido).
export async function removeOrderItem(orderId, itemId) {
  const ref = doc(db, 'orders', orderId);
  await runTransaction(db, async (tx) => {
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const items = snap.data().items.filter(i => i.id !== itemId);
    if (items.length === 0) tx.delete(ref);
    else tx.update(ref, { items });
  });
}

function newId() {
  return 'i_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
}

function buildLines(draftItems) {
  return draftItems.map(d => ({
    id: newId(),
    menuId: d.menuItem.id,
    name: d.menuItem.name,
    price: d.menuItem.price,
    station: d.menuItem.station,
    qty: d.qty,
    note: (d.note || '').trim(),
    status: 'pendiente',
  }));
}

// Envía un pedido para una mesa. Si esa mesa ya tiene una cuenta abierta, los ítems se
// agregan ahí (no se crea una cuenta nueva) — así un postre pedido después llega a la
// misma cuenta.
export async function sendOrder(mesa, draftItems) {
  const ordersRef = collection(db, 'orders');
  const existingSnap = await getDocs(
    query(ordersRef, where('mesa', '==', Number(mesa)), where('paid', '==', false), limit(1))
  );

  const newLines = buildLines(draftItems);

  if (existingSnap.empty) {
    await addDoc(ordersRef, {
      type: 'mesa',
      mesa: Number(mesa),
      items: newLines,
      createdAt: Date.now(),
      paid: false,
      paidAt: null,
    });
    return { merged: false };
  } else {
    const docSnap = existingSnap.docs[0];
    await runTransaction(db, async (tx) => {
      const fresh = await tx.get(docSnap.ref);
      const merged = (fresh.data().items || []).slice();
      newLines.forEach(newLine => {
        const idx = merged.findIndex(
          i => i.menuId === newLine.menuId && i.status === 'pendiente' && (i.note || '') === newLine.note
        );
        if (idx >= 0) merged[idx] = { ...merged[idx], qty: merged[idx].qty + newLine.qty };
        else merged.push(newLine);
      });
      tx.update(docSnap.ref, { items: merged });
    });
    return { merged: true };
  }
}

// Crea un pedido a domicilio: va a cocina/barra igual que un pedido de mesa, pero con
// datos del cliente en vez de número de mesa, y marcado con type "domicilio" para que se
// vea distinto en las pantallas.
export async function sendDeliveryOrder({ customerName, address, draftItems }) {
  const newLines = buildLines(draftItems);
  await addDoc(collection(db, 'orders'), {
    type: 'domicilio',
    mesa: null,
    customerName: customerName.trim(),
    address: address.trim(),
    items: newLines,
    createdAt: Date.now(),
    paid: false,
    paidAt: null,
  });
}
