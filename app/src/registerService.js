import { addDoc, collection, limit, onSnapshot, orderBy, query, where, getDocs } from 'firebase/firestore';
import { db, auth } from './firebase';

// Historial de aperturas y cierres de caja, más reciente primero.
export function subscribeRegisterEvents(callback) {
  const q = query(collection(db, 'registerEvents'), orderBy('timestamp', 'desc'), limit(100));
  return onSnapshot(q, (snap) => {
    callback(snap.docs.map(d => ({ id: d.id, ...d.data() })));
  }, (err) => console.error('subscribeRegisterEvents:', err));
}

export async function openRegister(cashAmount) {
  await addDoc(collection(db, 'registerEvents'), {
    type: 'apertura',
    cashAmount,
    by: auth.currentUser?.email || 'desconocido',
    timestamp: Date.now(),
  });
}

// Cierra la caja: suma las ventas en efectivo desde la última apertura y compara contra
// lo contado a mano, para mostrar si sobra o falta dinero.
export async function closeRegister(countedCash, lastOpening) {
  const base = lastOpening?.cashAmount || 0;
  const since = lastOpening?.timestamp || 0;

  const salesSnap = await getDocs(
    query(collection(db, 'sales'), where('paymentMethod', '==', 'efectivo'))
  );
  const cashSalesSum = salesSnap.docs
    .map(d => d.data())
    .filter(s => s.paidAt >= since)
    .reduce((s, d) => s + (d.total || 0), 0);
  const expected = base + cashSalesSum;
  const difference = countedCash - expected;

  await addDoc(collection(db, 'registerEvents'), {
    type: 'cierre',
    cashCounted: countedCash,
    baseAmount: base,
    cashSales: cashSalesSum,
    expected,
    difference,
    by: auth.currentUser?.email || 'desconocido',
    timestamp: Date.now(),
  });

  return { expected, difference, cashSalesSum };
}
