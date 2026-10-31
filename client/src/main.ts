import './style.css'
import { createHotel, deleteHotel, getCities, getHotel, getHotels, request, updateHotel } from './hotels.api.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <div>
    <h1>API RESTful benchmark</h1>
  </div>
  <button id="crud" type="button">Probar CRUD</button>
  <button id="load-all" type="button">Cargar todo</button>
  <button id="load-failure" type="button">Cargar con fallo</button>
  <button id="reload" type="button">Recargar</button>
  <pre id="output"></pre>
</section>
`

const output = document.querySelector<HTMLPreElement>('#output')!
const show = (text: string) => {
  output.textContent = text
}
const showError = (error: unknown) => {
  console.error(error)
  show(`Error: ${error instanceof Error ? error.message : String(error)}`)
}

async function testCrud() {
  console.log('1', (await getHotels()).length)
  const created = await createHotel({ name: 'Hotel Tueste', city: 'Seattle', lowRate: 90, highRate: 120 })
  console.log('2', created.name, created.id)
  console.log('3', (await getHotel(created.id))?.name)
  console.log('4', (await updateHotel(created.id, { lowRate: 95 })).lowRate)
  await deleteHotel(created.id)
  console.log('5', await getHotel(created.id))
  console.log('6', (await getHotels()).length)
}

async function loadAll() {
  let start = performance.now()
  const [hotels, cities] = await Promise.all([getHotels(), getCities()])
  const parallelMs = performance.now() - start

  start = performance.now()
  await getHotels()
  await getCities()
  const sequentialMs = performance.now() - start

  show(
    `Hoteles: ${hotels.length} · Ciudades: ${cities.length}\n` +
      `En paralelo (Promise.all): ${parallelMs.toFixed(1)} ms\n` +
      `Una detrás de otra (await): ${sequentialMs.toFixed(1)} ms`,
  )
}

async function loadWithFailure() {
  const lines: string[] = []

  try {
    const [hotels, cities] = await Promise.all([getHotels(), getCities(), request('/nope')])
    lines.push(`Promise.all: ${hotels.length} hoteles, ${cities.length} ciudades`)
  } catch (error) {
    lines.push(`Promise.all: no se muestra nada, va directo al catch → ${(error as Error).message}`)
  }

  const labels = ['hoteles', 'ciudades', '/api/nope']
  const results = await Promise.allSettled([getHotels(), getCities(), request('/nope')])
  lines.push('Promise.allSettled:')
  results.forEach((result, i) => {
    lines.push(
      result.status === 'fulfilled'
        ? `  ✅ ${labels[i]}: ${Array.isArray(result.value) ? result.value.length : 'ok'}`
        : `  ❌ ${labels[i]}: ${(result.reason as Error).message}`,
    )
  })

  show(lines.join('\n'))
}

let reloadController: AbortController | null = null
let reloadCount = 0

async function reload() {
  reloadController?.abort()
  const controller = new AbortController()
  reloadController = controller
  const attempt = ++reloadCount

  try {
    const hotels = await getHotels(controller.signal)
    show(`Recarga #${attempt}: ${hotels.length} hoteles`)
  } catch (error) {
    // We cancelled it ourselves: not an error to show
    if (error instanceof DOMException && error.name === 'AbortError') return
    throw error
  }
}

document.querySelector<HTMLButtonElement>('#crud')!.addEventListener('click', () => {
  testCrud().catch((error) => console.error(error))
})
document.querySelector<HTMLButtonElement>('#load-all')!.addEventListener('click', () => {
  loadAll().catch(showError)
})
document.querySelector<HTMLButtonElement>('#load-failure')!.addEventListener('click', () => {
  loadWithFailure().catch(showError)
})
document.querySelector<HTMLButtonElement>('#reload')!.addEventListener('click', () => {
  reload().catch(showError)
})
