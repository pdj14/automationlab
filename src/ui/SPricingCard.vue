<template>
  <SCard :elevation="elevation">
    <template #header>
      <div class="head">
        <SBadge>{{ title }}</SBadge>
        <div class="price" v-if="price">
          <span class="amount">{{ price }}</span>
          <span class="period">{{ period }}</span>
        </div>
      </div>
    </template>
    <ul class="features">
      <li v-for="(f, i) in features" :key="i">{{ f }}</li>
    </ul>
    <template #footer>
      <div class="foot">
        <SButton :variant="primary ? 'primary' : 'secondary'">
          {{ cta || 'Get started' }}
        </SButton>
      </div>
    </template>
  </SCard>
</template>

<script setup lang="ts">
import SCard from './SCard.vue'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'

defineProps<{ 
  title: string
  price?: string
  period?: string
  features: string[]
  cta?: string
  primary?: boolean
  elevation?: 'none' | 'low' | 'medium'
}>()
</script>

<style scoped>
.head { display:flex; align-items:center; justify-content: space-between; }
.price { display:flex; align-items: baseline; gap: .375rem; }
.amount { font: var(--title-4, 590 2rem/1.125 var(--font-regular)); }
.period { color: var(--color-text-tertiary, #8a8f98); }
.features { list-style: none; padding: 0; margin: 0; display: grid; gap: .5rem; }
.features li { color: var(--color-text-secondary, #d0d6e0); }
.foot { display:flex; justify-content: flex-end; }
</style>



