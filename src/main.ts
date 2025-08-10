import { createApp } from 'vue'
import { createPinia } from 'pinia'
import App from './App.vue'
import './style.css'
import { applyLinearTheme } from './theme/applyLinearTheme'
import router from './router'
import VueApexCharts from 'vue3-apexcharts'

await applyLinearTheme('/linearTheme.json')
const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)
app.use(VueApexCharts)
app.mount('#app')