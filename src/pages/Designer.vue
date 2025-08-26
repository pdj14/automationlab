<template>
  <div class="designer">
    <header class="page-header">
      <h2>Designer</h2>
    </header>
    
    <!-- Tab Navigation -->
    <div class="tab-navigation">
      <button 
        :class="['tab-button', { 'tab-active': activeTab === '2d' }]"
        @click="activeTab = '2d'"
      >
        🎨 2D Design
      </button>
      <button 
        :class="['tab-button', { 'tab-active': activeTab === '3d' }]"
        @click="activeTab = '3d'"
      >
        🚀 3D View
      </button>
    </div>
    
    <!-- Tab Content -->
    <div class="tab-content">
      <!-- 2D Design Tab -->
      <div v-show="activeTab === '2d'" class="tab-panel tab-2d">
        <div class="layout-2d">
          <section class="editor-2d">
            <FloorPlanEditor2D />
          </section>
          <aside class="object-library">
            <ObjectLibrary />
          </aside>
        </div>
      </div>
      
      <!-- 3D View Tab -->
      <div v-if="activeTab === '3d'" class="tab-panel tab-3d">
        <div class="layout-3d">
          <section class="viewer-3d">
            <FloorPlanViewer3D ref="viewer3dRef" @mounted="handle3DViewerMounted" />
          </section>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch, nextTick } from 'vue'
import FloorPlanEditor2D from '@/components/FloorPlanEditor2D.vue'
import FloorPlanViewer3D from '@/components/FloorPlanViewer3D.vue'
import ObjectLibrary from '@/components/ObjectLibrary.vue'

// Active tab state
const activeTab = ref<'2d' | '3d'>('2d')

// Component refs
const viewer3dRef = ref<InstanceType<typeof FloorPlanViewer3D> | null>(null)

// Tab 변경 시 컴포넌트 초기화 처리
watch(activeTab, async (newTab) => {
  if (newTab === '3d') {
    // 3D 탭으로 전환 시 3D 뷰어 초기화
    
    // 3D 뷰어가 완전히 렌더링될 때까지 대기
    await nextTick()
    
    // 3D 뷰어 컴포넌트에 접근하여 자동으로 Make3D 실행
    if (viewer3dRef.value) {
      try {
        // 3D 뷰어가 완전히 마운트될 때까지 추가 대기
        await new Promise(resolve => setTimeout(resolve, 500))
        
        // make3D 함수가 존재하면 자동 실행
        if (typeof viewer3dRef.value.make3D === 'function') {
    
          await viewer3dRef.value.make3D()
        } else {
          console.warn('⚠️ make3D 함수를 찾을 수 없습니다')
        }
      } catch (error) {
        console.error('❌ 3D 뷰어 자동 Make3D 오류:', error)
      }
    }
  } else if (newTab === '2d') {
    // 2D 탭으로 전환 시 2D 에디터 초기화
    
    // 2D 탭으로 전환 시 3D 뷰어 참조 정리
    viewer3dRef.value = null
  }
})

// 3D 뷰어 컴포넌트가 마운트된 후 자동 Make3D 실행을 위한 추가 처리
const handle3DViewerMounted = async () => {
  if (activeTab.value === '3d' && viewer3dRef.value) {
    try {
      // 3D 뷰어가 완전히 마운트될 때까지 추가 대기
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // make3D 함수가 존재하면 자동 실행
      if (typeof viewer3dRef.value.make3D === 'function') {
  
        await viewer3dRef.value.make3D()
      }
    } catch (error) {
      console.error('❌ 3D 뷰어 마운트 후 자동 Make3D 오류:', error)
    }
  }
}
</script>

<style scoped>
.designer { 
  display: flex; 
  flex-direction: column;
  height: 100vh; 
  overflow: hidden;
}

.page-header { 
  display: flex; 
  align-items: center; 
  justify-content: space-between; 
  padding: 1rem var(--page-padding-inline, 24px);
  border-bottom: 1px solid var(--color-border-primary, #23252a);
  background: var(--color-bg-level-2, #141516);
}

.page-header h2 {
  color: var(--color-text-primary, #f7f8f8);
  margin: 0;
}

/* Tab Navigation */
.tab-navigation {
  display: flex;
  background: var(--color-bg-level-2, #141516);
  border-bottom: 1px solid var(--color-border-primary, #23252a);
  padding: 0 var(--page-padding-inline, 24px);
}

.tab-button {
  padding: 1rem 1.5rem;
  background: transparent;
  border: none;
  color: var(--color-text-secondary, #a1a1aa);
  cursor: pointer;
  border-bottom: 3px solid transparent;
  transition: all 0.2s ease;
  font-size: 1rem;
  font-weight: 500;
}

.tab-button:hover {
  color: var(--color-text-primary, #f7f8f8);
  background: var(--color-bg-level-1, #0f1011);
}

.tab-button.tab-active {
  color: var(--color-text-primary, #f7f8f8);
  border-bottom-color: var(--color-accent-primary, #3b82f6);
  background: var(--color-bg-level-1, #0f1011);
}

/* Tab Content */
.tab-content {
  flex: 1;
  overflow: hidden;
}

.tab-panel {
  height: 100%;
  padding: 0 var(--page-padding-inline, 24px) 1rem;
}

.tab-2d, .tab-3d {
  height: 100%;
  display: flex;
  flex-direction: column;
}

/* 2D Layout */
.layout-2d {
  display: grid;
  grid-template-columns: 1fr 320px;
  gap: 0.75rem;
  height: calc(100vh - 160px);
  overflow: hidden;
}

.editor-2d {
  border: 1px solid var(--color-border-primary, #23252a);
  overflow: hidden;
  background: var(--color-bg-level-1, #0f1011);
  height: 100%;
}

.object-library {
  border: 1px solid var(--color-border-primary, #23252a);
  background: var(--color-bg-level-2, #141516);
  height: 100%;
  overflow: hidden;
}

/* 3D Layout */
.layout-3d {
  height: calc(100vh - 200px);
  overflow: visible;
  padding-bottom: 1rem;
}

.viewer-3d {
  border: 1px solid var(--color-border-primary, #23252a);
  overflow: visible;
  background: var(--color-bg-level-1, #0f1011);
  height: calc(100vh - 220px);
  min-height: 600px;
}

/* Responsive Design */
@media (max-width: 768px) {
  .layout-2d {
    grid-template-columns: 1fr;
    grid-template-rows: 1fr auto;
  }
  
  .object-library {
    height: 300px;
  }
  
  .tab-button {
    padding: 0.75rem 1rem;
    font-size: 0.9rem;
  }
}
</style>


