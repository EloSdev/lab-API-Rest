# Laboratorio · Módulo 05 · API REST

Cliente con `fetch` contra el servidor de hoteles (`hotels-server`): exploración de la API, CRUD, CORS y gestión de varias peticiones.

## Cómo arrancarlo

### Servidor

```bash
cd hotels-server
npm install
npm run dev        # http://localhost:3000
```

> Los datos viven en memoria: cada reinicio (también al guardar un fichero del servidor, porque usa `tsx watch`) vuelve a los 10 hoteles iniciales.

### Cliente

El cliente se construye y lo sirve el propio servidor (mismo origen, `http://localhost:3000`):

```bash
cd client
npm install
npm run build      # tsc + vite build; el postbuild copia dist/ a hotels-server/front
```

> Si npm tiene `ignore-scripts=true` (compruébalo con `npm config get ignore-scripts`), el `postbuild` no se ejecuta y hay que copiar a mano: `Copy-Item dist\* ..\hotels-server\front -Recurse -Force` (PowerShell) o `cp -r dist/* ../hotels-server/front/` (bash).

### Activar CORS

_Pendiente (O3)._

---

## O1 · Explorar la API antes de programar

Peticiones hechas con `curl -i` contra el servidor recién arrancado, en este orden. Por ejemplo:

```bash
curl -i -H "Accept: application/json" http://localhost:3000/api/hotels/1

curl -i -X POST -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"name":"Hotel Tueste","city":"Seattle","lowRate":90,"highRate":120}' \
  http://localhost:3000/api/hotels

curl -i -X PUT -H "Accept: application/json" -H "Content-Type: application/json" \
  -d '{"lowRate":42}' http://localhost:3000/api/hotels/1

curl -i -X DELETE -H "Accept: application/json" http://localhost:3000/api/hotels/1
```

| Petición | Código de estado | ¿Qué devuelve en el cuerpo? |
|---|---|---|
| `GET /api/hotels` sin cabecera `Accept` | `406 Not Acceptable` | `{"error":"Not Acceptable"}` |
| `GET /api/hotels` con `Accept: application/json` | `200 OK` | `{"data":[...]}` con los 10 hoteles completos (~30 campos cada uno) |
| `GET /api/hotels/1` | `200 OK` | `{"data":{...}}` con el hotel "Motif Seattle" |
| `GET /api/hotels/999` | `200 OK` ⚠️ | `{}` (vacío, sin `data`) |
| `GET /api/cities` | `200 OK` | `{"data":[{"id":"Seattle","name":"Seattle"}, ...]}` con 5 ciudades |
| `POST /api/hotels` con un hotel en JSON | `201 Created` | `{"data":{...}}` con lo enviado más `id` (UUID generado por el servidor), `created` y `modified` |
| `PUT /api/hotels/1` cambiando `lowRate` | `200 OK` | `{"data":{...}}` con el hotel completo actualizado (nuevo `lowRate` y nuevo `modified`) |
| `DELETE /api/hotels/1` | `204 No Content` | Nada (sin cuerpo ni `Content-Type`) |
| `GET /api/hotels/1` después de borrarlo | `200 OK` ⚠️ | `{}` |

### Comprobaciones

- **Sin `Accept: application/json` todo `/api` falla con 406.** En `hotels-server/src/middleware.ts`, `checkContentTypeJSON` compara la cabecera con `accept !== "application/json"`, una igualdad exacta. Cualquier otro valor (que no venga, `*/*` o `application/json, text/plain, */*`, que es lo que manda axios por defecto) se rechaza. En `index.ts` el middleware está montado sobre todo `/api` con `app.use('/api', checkContentTypeJSON)`.
- **Los datos vienen envueltos** en `{ "data": ... }` en todas las respuestas correctas.
- **Las dos respuestas que no siguen la teoría** (⚠️): `GET /api/hotels/999` y `GET /api/hotels/1` después del `DELETE` deberían devolver `404 Not Found` y devuelven `200 OK` con `{}`. El motivo: `hotelRepo.findById(id)` devuelve `undefined`, y `res.json({ data: undefined })` se serializa como `{}` porque `JSON.stringify` omite las propiedades `undefined`.

### 📝 Respuestas

**¿Qué código debería devolver `GET /api/hotels/999` según el concepto 01? ¿Qué devuelve este servidor? ¿Qué problema le causa eso al front?**

Según "Common HTTP Response Status Codes" debería devolver `404 Not Found`, porque el recurso pedido no existe. Este servidor devuelve `200 OK` con el cuerpo `{}`.

El problema para el front es que, para `fetch`, la petición ha ido bien: `response.ok` es `true`, no se lanza ningún error y el código sigue como si tuviera un hotel. Al leer `body.data` obtiene `undefined`, y el fallo aparece más tarde y lejos de su origen (por ejemplo, `Cannot read properties of undefined (reading 'name')` al pintar). El front no puede fiarse del código de estado para saber si el hotel existe: tiene que inspeccionar el cuerpo (que falte `data`), y eso acopla el cliente a un comportamiento incorrecto del servidor.

**¿Por qué el DELETE no devuelve cuerpo? ¿Qué código lo indica?**

Porque, una vez borrado, no hay recurso que devolver: basta con confirmar que la operación ha ido bien. Lo indica el `204 No Content`, que significa éxito sin cuerpo (tampoco llega `Content-Type`). Por eso el cliente no debe llamar a `response.json()` con un 204: no hay JSON que leer y fallaría con un error de parseo.

**El concepto 02 recomienda envolver las respuestas en un objeto (`{ "data": ... }`). ¿Qué ventaja tiene frente a devolver el array directamente?**

Que la respuesta se puede ampliar sin romper el contrato. Si mañana hace falta paginación o metadatos, basta con añadir propiedades al lado de `data` (`{ "data": [...], "pagination": { ... } }`), y los clientes que ya leían `data` siguen funcionando. Con un array en la raíz no hay dónde añadir nada sin cambiar el tipo de la respuesta, lo que obliga a modificar todos los clientes. Además, todas las respuestas siguen la misma forma (`data` si va bien, `error` si va mal), y eso permite tratarlas de manera uniforme en el cliente.

---

## O2 · Un cliente con fetch

Código en [`client/src/hotels.api.ts`](client/src/hotels.api.ts) y [`client/src/main.ts`](client/src/main.ts).

- **Modelo:** `Hotel` solo tiene los 5 campos que usa el front (`id`, `name`, `city`, `lowRate`, `highRate`), y `NewHotel = Omit<Hotel, "id">`.
- **`request<T>(path, options)`** concentra lo que se repite en todas las llamadas:
  - Añade siempre `Accept: application/json`, y `Content-Type: application/json` solo cuando hay `body`.
  - Si `response.ok` es `false`, lanza `Error("<MÉTODO> <URL> failed with status <código>")`.
  - Con un `204` no lee el cuerpo y devuelve `undefined`.
  - Si no, devuelve `body.data`.
- **`getHotel(id)` devuelve `null` si el hotel no existe.** Como vimos en O1, el servidor responde `200` con `{}` y no un 404. Por eso no se puede detectar con el código de estado: `request` devuelve `body.data`, que es `undefined` cuando falta, y `getHotel` lo convierte en `null` (`hotel ?? null`).
- **Botón "Probar CRUD"** en `main.ts`: ejecuta el recorrido del enunciado, y si algo falla el error se muestra con `console.error`.

### Comprobaciones

Con el cliente servido en `http://localhost:3000`, al pulsar "Probar CRUD" la consola muestra:

```
1 10
2 Hotel Tueste ef4ff351-0a12-4b32-9ab9-85b618cfd567
3 Hotel Tueste
4 95
5 null
6 10
```

En Network (Fetch/XHR) aparecen, en orden: `GET /api/hotels` 200, `POST /api/hotels` **201**, `GET /api/hotels/:id` 200, `PUT /api/hotels/:id` 200, `DELETE /api/hotels/:id` **204**, `GET /api/hotels/:id` 200 y `GET /api/hotels` 200. El Payload del POST es exactamente el JSON enviado: `{"name":"Hotel Tueste","city":"Seattle","lowRate":90,"highRate":120}`, sin `id`.

Al quitar el `Accept` de `request`, la consola muestra `Error: GET /api/hotels failed with status 406` y no un `undefined` silencioso. Como el recorrido es secuencial (`await` tras `await`), la primera petición que falla corta el resto: no llega a hacer el POST.

### 📝 Respuestas

**`fetch` no lanza un error con un 404 o un 500. ¿Cuándo sí lanza? ¿Qué pasaría en vuestra aplicación si no comprobaseis `response.ok`?**

`fetch` solo rechaza la promesa cuando **no hay respuesta HTTP** que entregar:
- un fallo de red (servidor caído, sin conexión, DNS que no resuelve);
- una petición bloqueada por CORS;
- una petición cancelada con un `AbortController` (`AbortError`);
- una URL o unas opciones inválidas.

Si el servidor responde, aunque sea con un 404 o un 500, para `fetch` la petición "ha ido bien": resuelve con un `Response` que tiene `ok === false` y el código en `status`.

Sin comprobar `response.ok`, el código seguiría como si todo hubiera ido bien. Leería el cuerpo de error (por ejemplo `{"error":"Not Acceptable"}` en un 406) y devolvería su `data`, es decir, `undefined`. El fallo saltaría más tarde y lejos de su causa: en nuestro botón, `(await getHotels()).length` daría `TypeError: Cannot read properties of undefined (reading 'length')`, sin ninguna pista de que el problema real era un 406 del servidor.

**¿Por qué `createHotel` no envía el `id`? ¿Quién lo decide?**

Porque el `id` lo decide el **servidor**, que es el dueño del recurso. En `hotel.repo.ts`, `create()` le asigna `crypto.randomUUID()` (además de `created` y `modified`), y lo hace después de copiar los datos recibidos, así que un `id` enviado por el cliente se sobrescribiría igualmente. El cliente no puede garantizar que un identificador sea único entre todos los clientes, y el servidor sí. Por eso el tipo `NewHotel = Omit<Hotel, "id">` impide en tiempo de compilación pasar un `id`, y el cliente lo conoce leyendo la respuesta del `POST` (`201` con el hotel creado).

## O3 · Llamar desde otro origen: CORS

_Pendiente._

## O4 · Gestionar varias peticiones

_Pendiente._

---

## Checklist

### Obligatorios

- [x] O1 · Explorar la API antes de programar
- [x] O2 · Un cliente con fetch
- [ ] O3 · Llamar desde otro origen: CORS
- [ ] O4 · Gestionar varias peticiones
- [ ] O5 · README + bitácora de IA (capturas incluidas)

### Opcionales

- [ ] P1 · Lo mismo con axios
- [ ] P2 · El proxy de Vite
- [ ] P3 · El ejercicio del módulo: client-cors
- [ ] P4 · Tueste, con API de verdad
- [ ] P5 · Validar lo que llega

### Desafíos

- [ ] D1 · Arreglad el servidor
- [ ] D2 · Tiempo máximo y reintentos
- [ ] D3 · Diseñad la API de Tueste

---

## 🤖 Bitácora de IA

Herramienta: Claude Code.

_Pendiente: al menos 3 ejemplos con el formato Prompt / Qué me dio / Qué corregí y por qué._
