<template>
  <SCard elevation="low" class="s-doc-card">
    <template #header>
      <div class="head">
        <h4 class="title"><slot name="title" /></h4>
        <SBadge tone="info"><slot name="badge" /></SBadge>
      </div>
    </template>
    <slot />
    <template #footer>
      <div class="foot">
        <SButton variant="secondary"><slot name="cta">Open</slot></SButton>
      </div>
    </template>
  </SCard>
</template>

<script setup lang="ts">
import SCard from './SCard.vue'
import SBadge from './SBadge.vue'
import SButton from './SButton.vue'
</script>

<style scoped>
.s-doc-card .head {
  display:flex; align-items:center; justify-content: space-between;
}
.title { margin: 0; font: var(--title-2, 590 1.3125rem/1.33 var(--font-regular)); }
.foot { display:flex; justify-content:flex-end; }
</style>



