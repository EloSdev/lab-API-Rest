import './style.css'
import { setupAction } from './action.ts'

document.querySelector<HTMLDivElement>('#app')!.innerHTML = `
<section id="center">
  <div>
    <h1>API RESTful benchmark</h1>
    <p>Edit <code>src/main.ts</code> and save to test <code>HMR</code></p>
  </div>
  <button id="action" type="button"></button>
</section>
`

setupAction(document.querySelector<HTMLButtonElement>('#action')!)