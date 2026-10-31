import './style.css'
import { createHotel, deleteHotel, getHotel, getHotels, updateHotel } from './hotels.api.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <div>
    <h1>API RESTful benchmark</h1>
  </div>
  <button id="crud" type="button">Probar CRUD</button>
</section>
`

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

document.querySelector<HTMLButtonElement>('#crud')!.addEventListener('click', () => {
  testCrud().catch((error) => console.error(error))
})
