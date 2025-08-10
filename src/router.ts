import { createRouter, createWebHistory, RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'home',
    component: () => import('./pages/Home.vue'),
  },
  {
    path: '/designer',
    name: 'designer',
    component: () => import('./pages/Designer.vue'),
  },
  {
    path: '/components',
    name: 'components',
    component: () => import('./pages/Components.vue'),
  },
  {
    path: '/monitor',
    name: 'monitor',
    component: () => import('./pages/Monitor.vue'),
  },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior() {
    return { top: 0 }
  },
})

export default router


