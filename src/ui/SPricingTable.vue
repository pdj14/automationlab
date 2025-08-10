<template>
  <div class="s-pricing-table">
    <div class="plan-grid">
      <SPricingCard
        v-for="plan in plans"
        :key="plan.title"
        :title="plan.title"
        :price="plan.price"
        :period="plan.period"
        :features="plan.features"
        :cta="plan.cta"
        :primary="plan.primary"
        elevation="low"
      />
    </div>
  </div>
</template>

<script setup lang="ts">
import SPricingCard from './SPricingCard.vue'

export interface PricingPlan {
  title: string
  price?: string
  period?: string
  features: string[]
  cta?: string
  primary?: boolean
}

defineProps<{ plans: PricingPlan[] }>()
</script>

<style scoped>
.s-pricing-table { width: 100%; }
.plan-grid {
  display: grid; gap: 1rem; 
  grid-template-columns: repeat(12, minmax(0, 1fr));
}
.plan-grid > * { grid-column: span 3; }
@media (max-width: 1024px) { .plan-grid > * { grid-column: span 6; } }
@media (max-width: 640px) { .plan-grid > * { grid-column: span 12; } }
</style>



