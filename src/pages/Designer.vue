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
            <FloorPlanViewer3D ref="viewer3dRef" />
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
  console.log(`🔄 Tab 변경: ${newTab}`)
  
  if (newTab === '3d') {
    // 3D 탭으로 전환 시 3D 뷰어 초기화
    console.log('🚀 3D 탭 활성화 - 3D 뷰어 초기화')
    
    // 3D 뷰어가 완전히 렌더링될 때까지 대기
    await nextTick()
    
    // 3D 뷰어 컴포넌트에 접근하여 강제 재초기화
    if (viewer3dRef.value) {
      console.log('✅ 3D 뷰어 컴포넌트 참조 발견')
      
      // 3D 뷰어의 debugStore 함수 호출하여 상태 확인
      try {
        if (typeof viewer3dRef.value.debugStore === 'function') {
          console.log('🔍 3D 뷰어 상태 디버깅 시작')
          viewer3dRef.value.debugStore()
        }
      } catch (error) {
        console.error('❌ 3D 뷰어 디버깅 오류:', error)
      }
    } else {
      console.log('⚠️ 3D 뷰어 컴포넌트 참조를 찾을 수 없음')
    }
  } else if (newTab === '2d') {
    // 2D 탭으로 전환 시 2D 에디터 초기화
    console.log('🎨 2D 탭 활성화 - 2D 에디터 초기화')
    
    // 2D 탭으로 전환 시 3D 뷰어 참조 정리
    viewer3dRef.value = null
  }
})
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
  height: calc(100vh - 160px);
  overflow: hidden;
}

.viewer-3d {
  border: 1px solid var(--color-border-primary, #23252a);
  overflow: hidden;
  background: var(--color-bg-level-1, #0f1011);
  height: 100%;
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


