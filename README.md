# Sistema de pedidos — Cafetería (una sola app, con login por rol)

Ahora es **un solo proyecto de React** (`app/`). Al entrar pide correo y contraseña, y
según el rol de esa cuenta te manda directo a la pantalla que le corresponde:

- **mesero** → solo ve "Nuevo pedido" y "Pedidos activos" (para usar desde el celular).
- **cocina** → solo ve los pedidos que le llegan a cocina y el botón de marcar listo.
- **admin** → ve todo: Barra, Cocina (monitor), Caja, Inventario y Reportes.

No hay app de Android por ahora — el mesero simplemente abre el link en el navegador del
celular (Chrome/Safari) y usa la página, como cualquier otra app web. El celular puede
"Agregar a pantalla de inicio" para que se sienta como una app normal, sin pasar por
Play Store.

```
app/                             Todo el código (React + Firebase)
firebase.json, firestore.rules, .firebaserc   Configuración de Firebase
```

Las credenciales de tu proyecto (`cafeteria-b7a09`) ya están en `app/.env` — no necesitas
copiar nada para probarlo.

## Paso 1 — Crear las cuentas del personal (una sola vez, a mano)

Como ahora hay login real, tienes que crear una cuenta por cada persona o por cada rol.
Lo más simple para empezar es una cuenta por rol (luego, si quieres, puedes crear una por
persona):

1. Ve a [Authentication → Users](https://console.firebase.google.com/project/cafeteria-b7a09/authentication/users)
   → pestaña **Sign-in method** → habilita **Correo/contraseña**.
2. En la pestaña **Users**, dale **Agregar usuario** y crea, por ejemplo:
   - `mesero@cafeteria.local` con una contraseña
   - `cocina@cafeteria.local` con una contraseña
   - `admin@cafeteria.local` con una contraseña
   (Puedes usar cualquier correo, no tiene que ser uno real — nadie recibe emails, es solo
   para identificar la cuenta.)
3. Para cada usuario, copia su **UID** (aparece en la lista de Users, es un código largo).
4. Ve a [Firestore Database](https://console.firebase.google.com/project/cafeteria-b7a09/firestore)
   → colección `staff` → **Agregar documento**:
   - **ID del documento**: pega ahí el UID que copiaste (tiene que ser EXACTO).
   - Agrega un campo `role` (tipo string) con el valor `mesero`, `cocina` o `admin` según
     corresponda a esa cuenta.
5. Repite para las 3 cuentas. Cuando alguien entre con `mesero@cafeteria.local`, la app
   busca su UID en `staff/{uid}` y ve `role: "mesero"` → lo manda a la pantalla de mesero.

> Si más adelante quieres una cuenta por persona (ej. cada mesero con su propio usuario),
> el proceso es el mismo: creas la cuenta en Authentication, copias su UID, y creas su
> documento en `staff/{uid}` con el rol que le toca.

## Paso 2 — Crear la base de datos (si no lo has hecho)

[Firestore Database](https://console.firebase.google.com/project/cafeteria-b7a09/firestore)
→ **Crear base de datos** → modo producción → elige una región (ej. `southamerica-east1`).

Después, en la pestaña **Reglas**, pega el contenido de `firestore.rules` de este proyecto
y publica — así solo las cuentas del personal pueden leer/escribir datos.

## Probarlo en tu computador

```bash
cd app
npm install
npm run dev
```

Abre `http://localhost:5173`, inicia sesión con una de las cuentas que creaste y prueba
cada rol (te recomiendo tres pestañas del navegador, una por cuenta, para ver cómo se
sincronizan en tiempo real entre sí).

## Publicarla para uso real

```bash
npm install -g firebase-tools
firebase login
cd cafeteria-system        # la carpeta raíz, donde está firebase.json

cd app && npm run build && cd ..
firebase deploy
```

Te va a dar una URL única (algo como `cafeteria-b7a09.web.app`). Esa es la que:
- abre el mesero en el navegador de su celular (y la guarda en su pantalla de inicio),
- abre cocina en la tablet fija de la cocina, en pantalla completa,
- abre la persona en barra para administrar todo.

Cada quien entra con su propia cuenta y ve solo lo que le corresponde.

## Administrar el menú (agregar productos, marcar agotado, quitar del menú)

Nuevo: pestaña **"📝 Menú"** dentro del rol admin. Ahora el menú no es un archivo fijo,
vive en Firestore (colección `menu`), así que se administra desde la app, sin tocar código:

- **La primera vez**, la pestaña Menú va a estar vacía — dale al botón **"Cargar menú de
  ejemplo"** para llenarla con los productos de muestra (café, frappés, hamburguesas,
  etc.), y desde ahí edítalos o bórralos a tu gusto.
- **Agregar un producto nuevo**: llena el formulario de arriba (nombre, precio, si es de
  barra o cocina, y categoría) y dale "Agregar".
- **Si se acaba algo**: dale clic al botón verde **"Disponible"** de ese producto para
  pasarlo a **"Agotado"** — desaparece del menú que ve el mesero al armar pedidos, pero
  sigue guardado (cuando vuelvas a tener, lo vuelves a marcar "Disponible" con el mismo
  botón, sin tener que volver a crearlo).
- **Eliminar un producto por completo** (uno que ya no vas a vender nunca más): botón
  "Eliminar" — esto sí lo borra, pero no afecta los pedidos ya hechos con ese producto
  (quedan guardados tal cual en el historial y en los reportes).
- **Editar el precio**: haz clic sobre el precio de cualquier producto para editarlo.

El mesero ve el menú actualizado al instante, sin recargar la página.

## Inventario

Por ahora es sencillo, como pediste: un formulario para subir cantidades de verduras, pan
y demás insumos (producto + cantidad + unidad → "Agregar"), y una lista de las existencias
actuales. Cada vez que agregas, se **suma** a lo que ya había (no lo reemplaza). Está en la
pestaña "📦 Inventario" del rol admin.

Todavía no descuenta stock automáticamente cuando se vende algo — eso sería el siguiente
paso natural si quieres control de inventario más fino (por ejemplo, que cada hamburguesa
vendida reste pan y carne del inventario).

## Reportes: cuánto se vende de cada producto

En la pestaña "📊 Reportes" ahora hay una tabla con cada producto vendido y cuántas
unidades se han vendido **hoy**, **esta semana** (desde el lunes) y **este mes** — para que
sepas, por ejemplo, cuántas hamburguesas o cafés se están moviendo en cada periodo.

## Cobrar en efectivo: dinero recibido y cambio

En Caja, al elegir **💵 Efectivo** aparece un campo "Dinero recibido". Apenas escribes un
monto igual o mayor al total, sale abajo el **cambio a dar**, calculado solo. Si el monto
es menor al total, te avisa y no deja cobrar hasta que esté completo. Con
**📲 Transferencia** no pide nada de esto, solo confirma.

## Historial de ventas

Cada vez que se cobra algo (mesa o domicilio), además de cerrarse la cuenta se guarda un
registro aparte en el historial — con hora exacta, qué se vendió, el total, el método de
pago y, si fue en efectivo, cuánto recibiste y cuánto diste de cambio. Lo ves en
**Reportes → Historial de ventas**, más reciente primero.

## Cocina: Pendientes y Preparados por separado

La pantalla de cocina ahora tiene dos pestañas: **🔥 Pendientes** (solo lo que falta por
hacer) y **✅ Preparados** (lo que ya se marcó listo). Apenas marcas un producto como
listo, desaparece de "Pendientes" — así nadie repite ni se confunde con lo que ya está
hecho. Si te equivocaste, en "Preparados" hay un botón "↺ Deshacer" para devolverlo a
pendiente.

## Domicilios (solo admin/barra)

Nueva pestaña **🛵 Domicilios**: arma el pedido igual que el mesero (elige productos del
menú, con nota si hace falta), pon el **nombre de quien pide** y la **dirección**, y dale
enviar — va a cocina y barra exactamente igual que un pedido de mesa, pero:
- se ve en un **color café/dorado distinto** en los tickets de cocina y barra, con la
  etiqueta 🛵 DOMICILIO, para que no se confunda con las mesas del salón,
- en vez de número de mesa, el ticket muestra el nombre del cliente.

Para **cobrarlo**, ve a la pestaña 💰 Caja — los domicilios aparecen ahí mismo junto con
las mesas (con el ícono 🛵 y el nombre del cliente), con el mismo flujo de efectivo/cambio
o transferencia.

## Sonidos de notificación

- Cuando el mesero envía un pedido, **cocina/barra escuchan una campanada doble** de
  "pedido nuevo" apenas les llega el ticket.
- Cuando cocina/barra marcan un pedido completo como listo, **el mesero escucha una
  campanada triple** distinta de "pedido listo" en su pestaña de "Pedidos activos".

El sonido ahora es de campana (varios tonos superpuestos, no un pitido plano) y más fuerte
que antes, para que se note bien en un ambiente con ruido.

Nota técnica: los navegadores no dejan reproducir sonido hasta que la persona toca algo en
la pantalla primero (es una regla de todos los navegadores, no un error del sistema). Por
eso el primer clic en cada pantalla "activa" el audio en silencio — después de eso, los
sonidos funcionan normal el resto del turno.

## Buscador y listas que no se mueven enteras

El menú del mesero (y el de Domicilios, y la lista de productos en 📝 Menú del admin)
ahora tiene una **barra de búsqueda** arriba — muy útil si ya tienes 50+ productos, en vez
de bajar y bajar buscando. Además, la lista de productos vive dentro de una caja con su
propio scroll: cuando bajas buscando un producto, **solo se mueve lo de adentro de la
caja**, no toda la pantalla (la barra de arriba y el buscador se quedan fijos). Lo mismo
aplica al historial de ventas en Reportes.

## Notas como botón (menos desorden)

Al agregar un producto al pedido ya no sale automáticamente una barra de texto para la
nota. Ahora aparece un botón chiquito **"+ Nota"** — solo si lo necesitas (ej. "sin
lechuga") lo tocas y ahí se despliega el campo para escribir. Si ya tiene una nota, el
botón muestra el texto de la nota en vez de "+ Nota", para que sepas de un vistazo cuáles
productos tienen algo especial.

## Reportes reorganizado (con calendario)

La pantalla de Reportes ahora es un resumen limpio (totales de hoy/semana/mes, efectivo
vs. transferencia) con **tres botones** que llevan a pantallas separadas, cada una con su
"← Volver a reportes":
- **📦 Ventas por producto** — la tabla de hoy/semana/mes por producto, en su propia
  pantalla.
- **📅 Calendario de ventas** — un calendario de verdad, mes por mes (con flechas ‹ › para
  moverte de mes). Los días con ventas salen resaltados en verde con el total de ese día.
  Tocas cualquier día y te lleva al **detalle completo de ese día**: total, efectivo vs.
  transferencia, cuánto se vendió de cada producto, y la lista de ventas una por una.
- **📜 Historial de ventas** — el listado completo, más reciente primero (igual que antes).

Así el resumen no se llena de tablas ni de listas largas, y para hacer cuentas de un día
específico (por ejemplo, cuadrar caja de ayer) solo tienes que tocarlo en el calendario.

## Apertura y cierre de caja

Dentro de 💰 Caja hay un botón **"🔐 Apertura/Cierre"** arriba a la derecha:
- **Abrir caja**: al empezar el turno, escribes con cuánto efectivo arrancas (la "base") y
  le das "Abrir caja". Queda registrado quién la abrió y a qué hora.
- **Cerrar caja**: al terminar, cuentas el efectivo real que hay y lo escribes. El sistema
  calcula solo cuánto *debería* haber (la base + todo lo vendido en efectivo desde que
  abriste) y te dice si **cuadra, sobra o falta** dinero, con el monto exacto.
- Abajo queda el **historial completo de aperturas y cierres**, con fecha, quién lo hizo, y
  el resultado de cada cierre — para que puedas revisar turnos anteriores.

## Pedido entregado (mesero)

En "Pedidos activos", cada mesa lista tiene un botón **"✅ Entregado"**. En cuanto el
mesero lo lleva a la mesa y toca ese botón, deja de aparecer en su lista — así no se
confunde con lo que todavía debe recoger. La cuenta sigue abierta (sin cobrar) hasta que
caja la cobre; el mesero simplemente ya no la ve más.

## Notificación también para Barra/Admin

Ahora la pestaña de Barra (dentro de admin) también suena cuando llega un pedido nuevo,
igual que cocina — antes solo sonaba en cocina y en el mesero. Los tres roles (mesero,
cocina, barra/admin) quedan avisados con sonido de campana.

## Ver todo lo que pidió una mesa (mesero)

En "Pedidos activos", toca cualquier mesa (toda la fila es tocable, no solo un botón) y se
despliega con todo lo que pidieron: cada producto, cantidad, nota y si ya está listo o no.
Vuelve a tocarla para cerrar. Desde ahí mismo puede corregir cantidades, notas o quitar un
producto mal pedido (como ya podía hacer antes).

## Caja: mesas a la izquierda, cuenta fija a la derecha

En pantallas anchas (tablet/computador), al seleccionar una mesa el detalle (productos,
total, método de pago, botón de cobrar) queda **fijo a la derecha** mientras la lista de
mesas de la izquierda se puede seguir viendo/desplazando — así no hay que estar subiendo y
bajando la pantalla para cobrar. En el celular (pantalla angosta) se apila normal, una
cosa a la vez, porque ahí no hay espacio para las dos columnas.

## Diseño: colores y velocidad para el mesero

- **Paleta nueva**: negro para texto y elementos oscuros, **vinotinto** como color
  principal de botones y acentos, **verde oscuro** para "listo"/pagado/disponible — sobre
  un fondo crema neutro para que siga siendo fácil de leer (colores fuertes puros de fondo
  cansan la vista en una pantalla que se usa todo el día).
- **Menú del mesero más rápido**: ahora se puede tocar el producto completo (no solo el
  botoncito "+") para agregarlo al pedido — más fácil de acertar con el dedo.
- **Barra de navegación fija abajo** en la pantalla del mesero (como una app de celular
  normal), con el botón de enviar el pedido también fijo abajo — no hay que subir hasta
  arriba para mandar el pedido.
- Botones, tickets y tarjetas con más espacio, sombra sutil y mejor contraste en general.

## Notas por producto (ej. "sin lechuga")

Al armar un pedido, el mesero puede escribir una nota debajo de cada producto (input que
dice "Nota (ej: sin lechuga)"). Esa nota viaja con el producto y aparece:
- en el ticket de **Cocina** y de **Barra**, en naranja, debajo del producto (📝),
- en **Caja**, dentro del detalle de la cuenta al cobrar.

## Corregir un pedido mal tomado (el mesero se equivocó)

En la pestaña "Pedidos activos" del mesero, cada mesa en preparación tiene un botón
**"Editar"**. Ahí puede: cambiar la cantidad de un producto, quitar un producto que se
pidió por error, o corregir la nota — siempre que ese producto **todavía no lo hayan
marcado "listo"** en cocina/barra (si ya está listo, se puede quitar pero no cambiar
cantidad/nota, para no generar confusión con lo que ya prepararon). Si quitas el único
producto de una cuenta, la cuenta completa desaparece.

## Caja como POS: seleccionar mesa, ver total, elegir método de pago

La pestaña Caja ahora es más parecida a una caja registradora: primero se ve una grilla
con todas las mesas abiertas (número de mesa + si está lista o en preparación + total).
Al tocar una mesa, se abre el detalle con cada producto (con su nota si tiene), el total,
y dos botones de método de pago: **💵 Efectivo** o **📲 Transferencia** — hay que elegir
uno antes de que se habilite el botón de cobrar. Al cobrar, esa mesa desaparece de la
grilla y el pago queda registrado con el método usado (lo puedes ver en Reportes, que
ahora también muestra cuánto entró en efectivo vs. transferencia hoy).

## Cómo funciona lo de "agregar al mismo pedido"

Cuando el mesero envía un pedido para una mesa, la app busca si esa mesa ya tiene una
cuenta abierta (sin pagar). Si la tiene, los nuevos ítems se agregan ahí — no se crea una
cuenta nueva. Un postre pedido después de que ya sirvieron el café en la mesa 3 entra a la
misma cuenta.

## Próximos pasos sugeridos

- Reglas de Firestore más finas por rol (ej. que cocina no pueda cobrar) usando el rol
  guardado en `staff/{uid}`.
- Descuento automático de inventario según lo que se vende.
- Notificaciones push reales al celular del mesero (por ahora el aviso solo aparece si
  tiene la página abierta).
- Editar el menú en `app/src/menu.js` con tus productos y precios reales.
