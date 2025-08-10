<template>
  <div class="designer">
    <header class="page-header">
      <h2>Designer</h2>
    </header>
    <div class="layout">
      <section class="editor-2d">
        <FloorPlanEditor2D />
      </section>
      <section class="viewer-3d">
        <FloorPlanViewer3D />
      </section>
      <aside class="object-library">
        <ObjectLibrary />
      </aside>
    </div>
  </div>
</template>

<script setup lang="ts">
import FloorPlanEditor2D from '@/components/FloorPlanEditor2D.vue'
import FloorPlanViewer3D from '@/components/FloorPlanViewer3D.vue'
import ObjectLibrary from '@/components/ObjectLibrary.vue'
</script>

<style scoped>
.designer { display: grid; grid-template-rows: auto 1fr; min-height: 100vh; }
.page-header { 
  display:flex; align-items:center; justify-content:space-between; 
  padding: 1rem var(--page-padding-inline, 24px);
  border-bottom: 1px solid var(--color-border-primary, #23252a);
}
.layout {
  display: grid;
  grid-template-columns: 1fr 1fr 320px;
  grid-auto-rows: auto;
  gap: 0.75rem;
  padding: 0 var(--page-padding-inline, 24px) 1rem;
}
.editor-2d, .viewer-3d {
  border: 1px solid var(--color-border-primary, #23252a);
  overflow: hidden;
  background: var(--color-bg-level-1, #0f1011);
  min-height: 360px;
}
.object-library {
  border-left: 1px solid var(--color-border-primary, #23252a);
  background: var(--color-bg-level-2, #141516);
  max-height: none;
}
.btn { padding: 0.5rem 0.75rem; border-radius: var(--radius-6, 6px); text-decoration:none; }
.btn-secondary { background: var(--color-bg-tertiary, #232326); color: var(--color-text-primary, #f7f8f8); border: 1px solid var(--color-border-secondary, #34343a); }
.btn-secondary:hover { background: var(--color-bg-quaternary, #28282c); }
</style>


