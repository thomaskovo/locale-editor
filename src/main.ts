import { createApp } from 'vue'
import PrimeVue from 'primevue/config';
import Aura from '@primevue/themes/aura';
import ToastService from 'primevue/toastservice';
import App from './App.vue'

import './style.css'
import 'primeicons/primeicons.css'

// If you want use Node.js, the`nodeIntegration` needs to be enabled in the Main process.
// import './demos/node'

createApp(App)
  .use(PrimeVue, {
    theme: {
      preset: Aura,
      // options: {
      //   cssLayer: {
      //     name: 'primevue',
      //     order: 'tailwind-base, primevue, tailwind-utilities'
      //   }
      // }
    }
  })
  .use(ToastService)
  .mount('#app')
  .$nextTick(() => {
    postMessage({ payload: 'removeLoading' }, '*')
  })
