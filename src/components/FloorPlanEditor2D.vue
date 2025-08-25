<template>
  <div class="editor-2d-container">
    <!-- 존 생성 툴바 -->
    <div class="toolbar">
      <div class="zone-controls">
        <h3>� Zone Creator</h3>
        <div class="size-inputs">
          <div class="input-group">
            <label>X (m):</label>
            <input v-model.number="zoneX" type="number" min="0" max="100" step="0.01" placeholder="X 위치" />
          </div>
          <div class="input-group">
            <label>Y (m):</label>
            <input v-model.number="zoneY" type="number" min="0" max="70" step="0.01" placeholder="Y 위치" />
          </div>
          <div class="input-group">
            <label>Width (m):</label>
            <input v-model.number="zoneWidth" type="number" min="0.01" max="100" step="0.01" placeholder="가로" />
          </div>
          <div class="input-group">
            <label>Height (m):</label>
            <input v-model.number="zoneHeight" type="number" min="0.01" max="70" step="0.01" placeholder="세로" />
          </div>
          <div class="color-swatches">
            <button v-for="c in floorColors" :key="c.hex" type="button" class="swatch"
              :class="{ selected: selectedFloorColor.hex === c.hex }" :style="{ backgroundColor: c.hex }"
              @click="selectedFloorColor = c" :title="c.label" />
          </div>
          <button @click="createZone" class="btn btn-primary" :disabled="!isValidZoneSize">
            🏗️ Create Zone
          </button>
        </div>
      </div>



      <div class="wall-tools">
        <h4>🧱 Wall Tools</h4>
        <div class="tool-buttons">
          <button @click="setTool('select')"
            :class="['btn', 'btn-secondary', { active: currentTool === 'select' }]" title="Select and Edit Walls">
            👆 Select
          </button>
          <button @click="setTool('wall')"
            :class="['btn', 'btn-secondary', { active: currentTool === 'wall' }]" title="Draw New Interior Walls">
            🧱 Draw Wall
          </button>
          <button @click="deleteSelectedObject" :disabled="!selectedObject && selectedObjects.length === 0" class="btn btn-danger"
            title="Delete Selected Object(s)">
            🗑️ Delete
          </button>
        </div>
        
        <!-- 벽 그리기 좌표 입력 -->
        <div v-if="currentTool === 'wall'" class="wall-coordinates">
          <h5>📍 Wall Coordinates</h5>
          <div class="coordinate-inputs">
            <div class="coordinate-group">
              <label>Start Point:</label>
              <div class="coordinate-pair">
                <input v-model.number="wallStartX" type="number" min="0" max="100" step="0.01" placeholder="X (m)" />
                <input v-model.number="wallStartY" type="number" min="0" max="70" step="0.01" placeholder="Y (m)" />
              </div>
            </div>
                          <div class="coordinate-group">
                <label>End Point:</label>
                <div class="coordinate-pair">
                  <input v-model.number="wallEndX" type="number" min="0" max="100" step="0.01" placeholder="X (m)" />
                  <input v-model.number="wallEndY" type="number" min="0" max="70" step="0.01" placeholder="Y (m)" />
                </div>
              </div>
              <button @click="drawWallFromCoordinates" class="btn btn-primary" :disabled="!isValidWallCoordinates">
                🧱 Draw Wall
              </button>
          </div>
        </div>
        <div v-if="selectedObject || selectedObjects.length > 0" class="selection-info">
          <!-- 멀티 선택 정보 -->
          <div v-if="selectedObjects.length > 1" class="multi-selection-info">
            <small>✅ {{ selectedObjects.length }}개 객체 선택됨 - Press Delete or click button to remove all</small>
            <div class="selected-objects-list">
              <small v-for="(obj, index) in selectedObjects" :key="index" class="selected-object-item">
                • {{ getObjectDisplayName(obj) }}
              </small>
            </div>
          </div>
          <!-- 단일 선택 정보 -->
          <div v-else-if="selectedObject">
            <small v-if="selectedObject.userData?.type === 'placed-object'">
              ✅ Object "{{ selectedObject.userData?.objectName }}" selected - Press Delete or click button to remove
            </small>
            <small v-else-if="selectedObject.userData?.type === 'room-floor'">
              ✅ Room Floor selected - Press Delete or click button to remove
            </small>
            <small v-else-if="selectedObject.userData?.type === 'zone-floor'">
              ✅ Zone Floor selected - Press Delete or click button to remove
            </small>
            <small v-else>
              ✅ {{ selectedObject.userData?.type === 'exterior-wall' ? 'Exterior Wall' : 'Interior Wall' }} selected
              ({{ selectedObject.userData?.position || 'custom' }}) - Press Delete or click button to remove
            </small>
          </div>
        </div>



        <div class="tool-info">
          <small v-if="currentTool === 'select'">
            🛠️ <strong>Select Mode:</strong> Click walls or objects to select and move them. Use Delete to remove
            selected items.
          </small>
          <small v-else-if="currentTool === 'wall'">
            🛠️ <strong>Draw Mode (Active):</strong> Click and drag on canvas to draw new walls, or input exact coordinates below. Existing items are not selectable.
          </small>
        </div>

        <!-- 디버깅용 정보 -->
        <div v-if="currentTool === 'wall'" class="debug-info">
          <small>🐛 Debug: Tool = "{{ currentTool }}", Canvas = {{ !!fabricCanvas ? 'Ready' : 'Not Ready' }}</small>
        </div>
      </div>

      <div class="tool-group">
        <button @click="resetView" class="btn btn-secondary" title="Reset zoom and pan">
          🔍 Reset View
        </button>
        <button @click="clearCanvas" class="btn btn-secondary">
          🗑️ Clear
        </button>
        <button @click="saveFloorPlan" class="btn btn-success" title="Save floor plan to backend">
          💾 Save
        </button>
        <button @click="exportFloorPlan" class="btn btn-primary">
          📤 Export
        </button>
      </div>
    </div>

    <!-- 캔버스 영역 -->
    <div class="canvas-wrapper" ref="canvasWrapper">
      <canvas ref="canvas2d" />
    </div>

    <!-- 상태바 -->
    <div class="statusbar">
      <span>📐 Grid: {{ (GRID_WIDTH * 100).toFixed(0) }}cm × {{ (GRID_HEIGHT * 100).toFixed(0) }}cm</span>
      <span>🏢 Base Floor: {{ (roomWidth * 100).toFixed(0) }}cm × {{ (roomHeight * 100).toFixed(0) }}cm</span>
      <span>🏗️ Zone: X{{ zoneX.toFixed(2) }}m Y{{ zoneY.toFixed(2) }}m W{{ zoneWidth.toFixed(2) }}m H{{ zoneHeight.toFixed(2) }}m</span>
      <span>�️ Tool : {{ getCurrentToolName() }} {{ currentTool === 'select' ? '(Edit Mode)' : '(Draw Mode)' }}</span>
      <span>� Griud: 1칸 = 1m</span>
      <span>�️ oMouse: ({{ mousePosition.x }}, {{ mousePosition.y }})</span>
      <span>� Zoom : {{ (zoom * 100).toFixed(0) }}%</span>
      <span>📱 Pan: ({{ pan.x.toFixed(0) }}, {{ pan.y.toFixed(0) }})</span>
      <span v-if="floorplanStore.isLoadingZones" class="loading-indicator">🔄 Zone 로딩 중...</span>
      <span v-if="floorplanStore.zones.length > 0" class="zone-count-indicator">🏗️ 저장된 Zone: {{ floorplanStore.zones.length }}개</span>
      <span v-if="floorplanStore.isLoadingWalls" class="loading-indicator">🔄 Wall 로딩 중...</span>
      <span v-if="floorplanStore.walls.length > 0" class="wall-count-indicator">🧱 저장된 Wall: {{ floorplanStore.walls.length }}개</span>
      <span v-if="boxPlacementMode" class="box-mode-indicator">📦 Box Mode: 장비를 상자 위에 배치할 수 있습니다</span>
    </div>

    <!-- Zone 변경사항 확인 팝업 -->
    <div v-if="showChangeConfirmDialog" class="change-confirm-overlay">
      <div class="change-confirm-dialog">
        <div class="dialog-header">
          <h3>🏗️ Zone 변경사항 확인</h3>
          <button @click="closeChangeConfirmDialog" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">
          <!-- Zone 변경사항 -->
          <div v-if="zoneChangeSummary.toCreate.length > 0" class="change-section">
            <h4>➕ 새로 생성할 Zone ({{ zoneChangeSummary.toCreate.length }}개)</h4>
            <div class="zone-list">
              <div v-for="(zone, index) in zoneChangeSummary.toCreate" :key="`create-${index}`" class="zone-item">
                <span class="zone-info">📍 ({{ zone.x.toFixed(2) }}m, {{ zone.y.toFixed(2) }}m) {{ zone.width.toFixed(2) }}m × {{ zone.height.toFixed(2) }}m</span>
                <span class="zone-color" :style="{ backgroundColor: zone.color }"></span>
              </div>
            </div>
          </div>

          <div v-if="zoneChangeSummary.toUpdate.length > 0" class="change-section">
            <h4>🔄 업데이트할 Zone ({{ zoneChangeSummary.toUpdate.length }}개)</h4>
            <div class="zone-list">
              <div v-for="update in zoneChangeSummary.toUpdate" :key="`update-${update.id}`" class="zone-item">
                <div class="update-details">
                  <span class="zone-id">ID: {{ update.id }}</span>
                  <span class="zone-info">📍 ({{ update.newData.x.toFixed(2) }}m, {{ update.newData.y.toFixed(2) }}m) {{ update.newData.width.toFixed(2) }}m × {{ update.newData.height.toFixed(2) }}m</span>
                  <span class="zone-color" :style="{ backgroundColor: update.newData.color }"></span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="zoneChangeSummary.toDelete.length > 0" class="change-section">
            <h4>🗑️ 삭제할 Zone ({{ zoneChangeSummary.toDelete.length }}개)</h4>
            <div class="zone-list">
              <div v-for="zone in zoneChangeSummary.toDelete" :key="`delete-${zone.id}`" class="zone-item">
                <span class="zone-info">📍 ({{ zone.x.toFixed(2) }}m, {{ zone.y.toFixed(2) }}m) {{ zone.width.toFixed(2) }}m × {{ zone.height.toFixed(2) }}m</span>
                <span class="zone-color" :style="{ backgroundColor: zone.color }"></span>
              </div>
            </div>
          </div>

          <!-- Wall 변경사항 -->
          <div v-if="wallChangeSummary.toCreate.length > 0" class="change-section">
            <h4>🧱 새로 생성할 Wall ({{ wallChangeSummary.toCreate.length }}개)</h4>
            <div class="wall-list">
              <div v-for="(wall, index) in wallChangeSummary.toCreate" :key="`create-wall-${index}`" class="wall-item">
                <span class="wall-info">📍 ({{ wall.startX.toFixed(2) }}m, {{ wall.startY.toFixed(2) }}m) → ({{ wall.endX.toFixed(2) }}m, {{ wall.endY.toFixed(2) }}m) [{{ wall.type }}]</span>
              </div>
            </div>
          </div>

          <div v-if="wallChangeSummary.toUpdate.length > 0" class="change-section">
            <h4>🔄 업데이트할 Wall ({{ wallChangeSummary.toUpdate.length }}개)</h4>
            <div class="wall-list">
              <div v-for="update in wallChangeSummary.toUpdate" :key="`update-wall-${update.id}`" class="wall-item">
                <div class="update-details">
                  <span class="wall-id">ID: {{ update.id }}</span>
                  <span class="wall-info">📍 ({{ update.newData.startX.toFixed(2) }}m, {{ update.newData.startY.toFixed(2) }}m) → ({{ update.newData.endX.toFixed(2) }}m, {{ update.newData.endY.toFixed(2) }}m) [{{ update.newData.type }}]</span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="wallChangeSummary.toDelete.length > 0" class="change-section">
            <h4>🗑️ 삭제할 Wall ({{ wallChangeSummary.toDelete.length }}개)</h4>
            <div class="wall-list">
              <div v-for="wall in wallChangeSummary.toDelete" :key="`delete-wall-${wall.id}`" class="wall-item">
                <span class="wall-info">📍 ({{ wall.startX.toFixed(2) }}m, {{ wall.startY.toFixed(2) }}m) → ({{ wall.endX.toFixed(2) }}m, {{ wall.endY.toFixed(2) }}m) [{{ wall.type }}]</span>
              </div>
            </div>
          </div>

          <div v-if="zoneChangeSummary.toCreate.length === 0 && zoneChangeSummary.toUpdate.length === 0 && zoneChangeSummary.toDelete.length === 0 && 
                      wallChangeSummary.toCreate.length === 0 && wallChangeSummary.toUpdate.length === 0 && wallChangeSummary.toDelete.length === 0" class="no-changes">
            <p>✅ 변경사항이 없습니다.</p>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="closeChangeConfirmDialog" class="btn btn-secondary">취소</button>
          <button @click="confirmAndSaveZones" class="btn btn-primary" :disabled="zoneChangeSummary.toCreate.length === 0 && zoneChangeSummary.toUpdate.length === 0 && zoneChangeSummary.toDelete.length === 0 && 
                                                                        wallChangeSummary.toCreate.length === 0 && wallChangeSummary.toUpdate.length === 0 && wallChangeSummary.toDelete.length === 0">
            💾 변경사항 저장
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'
import * as fabricLib from 'fabric'
import { useFloorplanStore } from '../stores/floorplanStore'
import axios from 'axios'

// Fabric.js v5 호환성을 위한 처리
const fabric = (fabricLib as any).fabric || fabricLib

// Pinia Store 사용
const floorplanStore = useFloorplanStore()

// 상태 관리
const canvas2d = ref<HTMLCanvasElement>()
const canvasWrapper = ref<HTMLDivElement>()
let fabricCanvas: any = null

// 전체 Grid 크기 (고정값)
const GRID_WIDTH = 100   // 전체 Grid 가로 100m
const GRID_HEIGHT = 70   // 전체 Grid 세로 70m

// Zone 생성을 위한 변수들
const zoneX = ref(0)      // Zone X 위치 (m)
const zoneY = ref(0)      // Zone Y 위치 (m)
const zoneWidth = ref(10) // Zone 가로 크기 (m)
const zoneHeight = ref(10) // Zone 세로 크기 (m)

// 벽 그리기를 위한 좌표 변수들
const wallStartX = ref(0)  // 벽 시작점 X (m)
const wallStartY = ref(0)  // 벽 시작점 Y (m)
const wallEndX = ref(10)   // 벽 끝점 X (m)
const wallEndY = ref(0)    // 벽 끝점 Y (m)

// 기본 바닥 크기 (Grid 중앙에 배치)
const roomWidth = ref(87)  // 기본 가로 87m (8700cm)
const roomHeight = ref(56) // 기본 세로 56m (5600cm)

const floorColors = ref([
  { label: 'Pastel Yellow', hex: '#FFE082', rgba: 'rgba(255, 224, 130, 0.65)' },
  { label: 'Pastel Mint', hex: '#80DEEA', rgba: 'rgba(128, 222, 234, 0.65)' },
  { label: 'Pastel Green', hex: '#A5D6A7', rgba: 'rgba(165, 214, 167, 0.65)' },
  { label: 'Pastel Pink', hex: '#F8BBD0', rgba: 'rgba(248, 187, 208, 0.65)' },
  { label: 'Pastel Blue', hex: '#90CAF9', rgba: 'rgba(144, 202, 249, 0.65)' },
  { label: 'Pastel Purple', hex: '#CE93D8', rgba: 'rgba(206, 147, 216, 0.65)' },
  { label: 'Pastel Orange', hex: '#FFCC80', rgba: 'rgba(255, 204, 128, 0.65)' },
  { label: 'Pastel Red', hex: '#EF9A9A', rgba: 'rgba(239, 154, 154, 0.65)' },
  { label: 'Pastel Teal', hex: '#80CBC4', rgba: 'rgba(128, 203, 196, 0.65)' },
  { label: 'Pastel Indigo', hex: '#9FA8DA', rgba: 'rgba(159, 168, 218, 0.65)' },
  { label: 'Pastel Brown', hex: '#BCAAA4', rgba: 'rgba(188, 170, 164, 0.65)' },
  { label: 'Pastel Coral', hex: '#FFAB91', rgba: 'rgba(255, 171, 145, 0.65)' }
])
const selectedFloorColor = ref<{ label: string; hex: string; rgba: string }>(floorColors.value[0]) // Pastel Yellow
const currentTool = ref('select')
const mousePosition = ref({ x: 0, y: 0 })
const selectedObject = ref<any>(null)
const selectedObjects = ref<any[]>([]) // 멀티 선택을 위한 배열
const selectedBox = ref<any>(null) // 선택된 상자
const boxPlacementMode = ref(false) // 상자 위 장비 배치 모드

// Zone과 Wall 변경사항 확인 팝업 관련 상태
const showChangeConfirmDialog = ref(false)
const zoneChangeSummary = ref<{
  toCreate: any[]
  toUpdate: { id: string; oldData: any; newData: any }[]
  toDelete: any[]
}>({
  toCreate: [],
  toUpdate: [],
  toDelete: []
})

const wallChangeSummary = ref<{
  toCreate: any[]
  toUpdate: { id: string; oldData: any; newData: any }[]
  toDelete: any[]
}>({
  toCreate: [],
  toUpdate: [],
  toDelete: []
})

// 확대/축소 및 이동 관련 상태
const zoom = ref(0.4) // 초기 zoom 40% (Default Zoom)
const pan = ref({ x: 0, y: 0 })
const isPanning = ref(false)
const lastPanPoint = ref({ x: 0, y: 0 })


// Store에서 직접 사용할 데이터들 (로컬 state 제거)
// const currentRoom = ref<{width: number, height: number, bounds?: any} | null>(null) -> store 사용
// const interiorWalls = ref<any[]>([]) -> store 사용

// Zone 크기 유효성 검사
const isValidZoneSize = computed(() => {
  return zoneX.value >= 0 && zoneY.value >= 0 &&
    zoneWidth.value > 0 && zoneHeight.value > 0 &&
    (zoneX.value + zoneWidth.value) <= GRID_WIDTH &&
    (zoneY.value + zoneHeight.value) <= GRID_HEIGHT
})

// 벽 좌표 유효성 검사
const isValidWallCoordinates = computed(() => {
  return wallStartX.value >= 0 && wallStartY.value >= 0 &&
    wallEndX.value >= 0 && wallEndY.value >= 0 &&
    wallStartX.value <= GRID_WIDTH && wallStartY.value <= GRID_HEIGHT &&
    wallEndX.value <= GRID_WIDTH && wallEndY.value <= GRID_HEIGHT &&
    (wallStartX.value !== wallEndX.value || wallStartY.value !== wallEndY.value) // 시작점과 끝점이 다르야 함
})

// 기존 Room 크기 유효성 검사 (호환성 유지)
const isValidSize = computed(() => {
  return roomWidth.value > 0 && roomHeight.value > 0 &&
    roomWidth.value <= 300 && roomHeight.value <= 300
})

// 현재 도구 이름
const getCurrentToolName = () => {
  switch (currentTool.value) {
    case 'select': return 'Select'
    case 'wall': return 'Draw Wall'
    default: return 'Unknown'
  }
}

// 툴 설정 함수 (툴 전환 시 추가 처리)
const setTool = (tool: string) => {
  const previousTool = currentTool.value
  currentTool.value = tool
  
  console.log(`🔧 툴 변경: ${previousTool} → ${tool}`)
  
  // 벽 그리기 모드에서 다른 모드로 전환 시 zoom/pan 기능 재활성화
  if (previousTool === 'wall' && tool !== 'wall') {
    console.log('✅ Zoom/Pan 기능 재활성화')
    if (fabricCanvas) {
      // 캔버스 선택 기능 활성화
      fabricCanvas.selection = true
      
      // 강제로 zoom/pan 이벤트 재활성화 확인
      console.log('🔍 현재 zoom 상태:', zoom.value)
      console.log('📱 현재 pan 상태:', pan.value)
      
      // 캔버스 변환 강제 업데이트
      updateCanvasTransform()
    }
  }
  
  // 벽 선택 가능 여부 업데이트
  updateWallSelectability()
}

// 벽 선택 가능 여부 업데이트 함수
const updateWallSelectability = () => {
  if (!fabricCanvas) return
  
  const isSelectMode = currentTool.value === 'select'
  
  // 모든 벽 오브젝트의 선택 가능 여부 업데이트
  fabricCanvas.getObjects().forEach((obj: any) => {
    if (obj.userData?.type === 'interior-wall' || obj.userData?.type === 'exterior-wall') {
      obj.selectable = isSelectMode
      obj.evented = isSelectMode
      obj.opacity = isSelectMode ? 1.0 : 0.7
      obj.stroke = isSelectMode ? '#444444' : '#666666'
    }
  })
  
  fabricCanvas.renderAll()
  console.log(`🔄 벽 선택 가능 여부 업데이트: ${isSelectMode ? '활성화' : '비활성화'}`)
}

// Throttle 함수 (성능 최적화)
const throttle = (func: Function, delay: number) => {
  let timeoutId: ReturnType<typeof setTimeout> | null = null
  let lastExecTime = 0

  return (...args: any[]) => {
    const currentTime = Date.now()

    if (currentTime - lastExecTime > delay) {
      func.apply(null, args)
      lastExecTime = currentTime
    } else {
      if (timeoutId) clearTimeout(timeoutId)
      timeoutId = setTimeout(() => {
        func.apply(null, args)
        lastExecTime = Date.now()
      }, delay)
    }
  }
}

// 실시간 3D 업데이트 제거로 인해 throttledUpdate3D 함수 제거
// const throttledUpdate3D = throttle(() => {
//   console.log('🔄 Throttled 3D 업데이트 실행')
//   updateAllWalls()
// }, 300)

// 캔버스 초기화
const initCanvas = async () => {
  if (!canvas2d.value || !canvasWrapper.value) return

  const wrapper = canvasWrapper.value
  const width = wrapper.clientWidth
  const height = wrapper.clientHeight

  // Dark/Light mode에 따른 캔버스 배경색 설정
  const isDarkMode = document.documentElement.classList.contains('dark')
  const backgroundColor = isDarkMode ? '#1a1a1a' : '#ffffff'

  fabricCanvas = new fabric.Canvas(canvas2d.value, {
    width,
    height,
    backgroundColor,
    selection: true,
  })

  // Store에 캔버스 크기 저장
  floorplanStore.setCanvasSize({ width, height })

  // 캔버스 포커스 설정을 더 강력하게
  fabricCanvas.upperCanvasEl.setAttribute('tabindex', '0')
  fabricCanvas.upperCanvasEl.style.outline = 'none'

  // 그리드 배경 추가
  addGrid()

  // 기본 바닥 자동 생성 (87m x 56m 밝은 회색)
  createDefaultFloor()

  // 초기 뷰 설정 (30% zoom, 회색 바닥 중앙 정렬)
  setupInitialView()

  // 초기 커서 스타일 설정
  if (canvasWrapper.value) {
    canvasWrapper.value.classList.remove('drawing-mode')
  }

  // 이벤트 리스너
  fabricCanvas.on('mouse:move', (e: any) => {
    const pointer = fabricCanvas!.getPointer(e.e)
    mousePosition.value = {
      x: Math.round(pointer.x),
      y: Math.round(pointer.y)
    }
  })

  // 패닝을 위한 별도의 mousemove 이벤트
  fabricCanvas.upperCanvasEl.addEventListener('mousemove', (e: any) => {
    if (isPanning.value) {
      const deltaX = e.clientX - lastPanPoint.value.x
      const deltaY = e.clientY - lastPanPoint.value.y

      pan.value.x += deltaX
      pan.value.y += deltaY
      lastPanPoint.value = { x: e.clientX, y: e.clientY }

      updateCanvasTransform()
    }
  })

  // 오브젝트 이동 이벤트 리스너
  fabricCanvas.on('object:modified', (e: any) => {
    const modifiedObject = e.target
    if (modifiedObject && modifiedObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(modifiedObject)

      // 상자가 이동하거나 회전한 경우 그 위의 장비들도 함께 이동/회전
      if (modifiedObject.userData?.category === 'etc' && modifiedObject.userData?.isBox) {
        moveObjectsOnBox(modifiedObject)
      }
    }
  })

  // 벽 그리기 이벤트 설정
  setupWallDrawing()

  // 확대/축소 및 이동 이벤트 설정
  setupZoomAndPanEvents()

  // 다중 키보드 이벤트 설정 (더 확실하게)
  setupKeyboardEvents()

  // 저장된 Zone과 Wall 정보 불러오기
  await Promise.all([
    loadSavedZones(),
    loadSavedWalls()
  ])
}

// 키보드 이벤트 설정 (다중 방법)
const setupKeyboardEvents = () => {
  if (!fabricCanvas) return

  // 방법 1: 캔버스 엘리먼트에 직접
  fabricCanvas.upperCanvasEl.addEventListener('keydown', handleCanvasKeydown)

  // 방법 2: 캔버스 래퍼에도 추가
  if (canvasWrapper.value) {
    canvasWrapper.value.addEventListener('keydown', handleCanvasKeydown)
    canvasWrapper.value.setAttribute('tabindex', '0')
    canvasWrapper.value.style.outline = 'none'
  }

  // 방법 3: document 레벨에서도 처리 (캔버스가 포커스된 경우에만)
  document.addEventListener('keydown', handleGlobalKeydown)

  // 캔버스 포커스 이벤트들
  fabricCanvas.upperCanvasEl.addEventListener('click', focusCanvas)
  fabricCanvas.upperCanvasEl.addEventListener('mousedown', focusCanvas)

  if (canvasWrapper.value) {
    canvasWrapper.value.addEventListener('click', focusCanvas)
  }
}

// 캔버스 포커스 함수
const focusCanvas = () => {
  if (fabricCanvas) {
    fabricCanvas.upperCanvasEl.focus()
  }
  if (canvasWrapper.value) {
    canvasWrapper.value.focus()
  }
}

// 전역 키보드 이벤트 처리 (캔버스 포커스 시에만)
const handleGlobalKeydown = (e: KeyboardEvent) => {
  // 캔버스나 래퍼가 포커스된 경우에만 처리
  const activeElement = document.activeElement
  const isCanvasFocused = activeElement === fabricCanvas?.upperCanvasEl ||
    activeElement === canvasWrapper.value

  if (isCanvasFocused && (e.key === 'Delete' || e.key === 'Backspace')) {
    handleCanvasKeydown(e)
  }
}

// 캔버스 키보드 이벤트 처리
const handleCanvasKeydown = (e: KeyboardEvent) => {
  if (e.key === 'Delete') {
    e.preventDefault()
    deleteSelectedObject()
  }
}

// 확대/축소 및 이동 이벤트 설정
const setupZoomAndPanEvents = () => {
  if (!fabricCanvas) return

  // 마우스 휠 이벤트 (확대/축소)
  fabricCanvas.on('mouse:wheel', (e: any) => {
    e.e.preventDefault()

    // 벽 그리기 모드에서는 확대/축소 비활성화
    if (currentTool.value === 'wall') {
      return
    }

    const delta = e.e.deltaY
    const zoomFactor = 0.05 // 더 작은 zoom 단계로 변경
    const newZoom = delta > 0 ? zoom.value * (1 - zoomFactor) : zoom.value * (1 + zoomFactor)
    
    // 줌 제한 계산
    const canvasWidth = fabricCanvas.width!
    const canvasHeight = fabricCanvas.height!
    const gridPxWidth = GRID_WIDTH * 40   // 4000px (100m * 40px/m)
    const gridPxHeight = GRID_HEIGHT * 40 // 2800px (70m * 40px/m)
    
    // 최소 줌: 전체 그리드가 화면에 맞게 보이도록 (축소 한계)
    const minZoomX = canvasWidth / gridPxWidth   // 가로 기준 최소 줌
    const minZoomY = canvasHeight / gridPxHeight // 세로 기준 최소 줌
    const minZoom = Math.min(minZoomX, minZoomY) * 0.9 // 여백을 위해 90%
    
    // 최대 줌: 상세 배치를 위한 확대 한계 (더 크게 확대 가능)
    const maxZoom = 3.0  // 300% 확대까지 허용
    
    const clampedZoom = Math.max(minZoom, Math.min(maxZoom, newZoom))
    
    console.log('🔍 Zoom 제한:', {
      current: zoom.value,
      new: newZoom,
      clamped: clampedZoom,
      limits: { min: minZoom, max: maxZoom },
      gridSize: { width: gridPxWidth, height: gridPxHeight },
      canvasSize: { width: canvasWidth, height: canvasHeight }
    })
    
    zoom.value = clampedZoom

    updateCanvasTransform()
  })

  // 마우스 오른쪽 클릭 이벤트 (이동) - 네이티브 DOM 이벤트 사용
  fabricCanvas.upperCanvasEl.addEventListener('mousedown', (e: any) => {
    if (e.button === 2) { // 오른쪽 클릭
      e.preventDefault()

      // 벽 그리기 모드에서는 이동 비활성화
      if (currentTool.value === 'wall') {
        return
      }

      isPanning.value = true
      const rect = fabricCanvas.upperCanvasEl.getBoundingClientRect()
      lastPanPoint.value = { x: e.clientX, y: e.clientY }
      fabricCanvas.defaultCursor = 'grabbing'
    }
  })

  fabricCanvas.upperCanvasEl.addEventListener('mouseup', (e: any) => {
    if (e.button === 2) { // 오른쪽 클릭 해제
      isPanning.value = false
      fabricCanvas.defaultCursor = 'default'

    }
  })

  // 컨텍스트 메뉴 비활성화
  fabricCanvas.upperCanvasEl.addEventListener('contextmenu', (e: any) => {
    e.preventDefault()
  })
}

// 캔버스 변환 업데이트 (확대/축소 및 이동)
const updateCanvasTransform = () => {
  if (!fabricCanvas) return

  // 캔버스 뷰포트 변환
  fabricCanvas.setViewportTransform([
    zoom.value,
    0,
    0,
    zoom.value,
    pan.value.x,
    pan.value.y
  ])

  // 그리드 업데이트
  updateGrid()

  fabricCanvas.renderAll()
}

// 모든 바닥을 가장 뒤 레이어로 보냄 (기본 바닥은 항상 맨 뒤 고정)
const sendAllFloorsToBack = () => {
  if (!fabricCanvas) return

  // 기본 바닥을 맨 뒤로 고정
  const baseFloor = fabricCanvas.getObjects().find((o: any) => o.userData?.type === 'base-floor')
  if (baseFloor) {
    fabricCanvas.moveTo(baseFloor, 0)
  }

  // Zone 바닥들을 기본 바닥 위에 배치
  const zoneFloors = fabricCanvas.getObjects().filter((o: any) => o.userData?.type === 'zone-floor')
  zoneFloors.forEach((f: any, index: number) => {
    fabricCanvas.moveTo(f, index + 1)
    f.selectable = true
    f.evented = true
  })

  // 기존 room-floor 타입도 처리 (호환성)
  const roomFloors = fabricCanvas.getObjects().filter((o: any) => o.userData?.type === 'room-floor')
  roomFloors.forEach((f: any, index: number) => {
    fabricCanvas.moveTo(f, zoneFloors.length + index + 1)
    f.selectable = true
    f.evented = true
  })
}

// 그리드를 모든 바닥 바로 위로 이동
const positionGridAfterFloors = () => {
  if (!fabricCanvas) return
  const grid = fabricCanvas.getObjects().find((obj: any) => obj.type === 'group' && obj.getObjects?.().some((line: any) => line.type === 'line'))
  if (!grid) return
  const objs = fabricCanvas.getObjects()

  // 모든 바닥 타입의 인덱스 찾기 (base-floor, zone-floor, room-floor)
  const floorIndices = (objs
    .map((o: any, idx: number) => ({ o, idx })) as Array<{ o: any; idx: number }>)
    .filter((x: { o: any; idx: number }) =>
      x.o.userData?.type === 'base-floor' ||
      x.o.userData?.type === 'zone-floor' ||
      x.o.userData?.type === 'room-floor'
    )
    .map((x: { o: any; idx: number }) => x.idx)

  const maxFloorIndex = floorIndices.length ? Math.max(...floorIndices) : -1
  if (maxFloorIndex >= 0) {
    fabricCanvas.moveTo(grid, maxFloorIndex + 1)
  } else {
    fabricCanvas.moveTo(grid, 0)
  }
  // 오브젝트는 항상 바닥/그리드 보다 앞쪽 (유지): 바닥/그리드 외의 요소를 앞으로
  const others = objs.filter((o: any) => !(o.userData?.type === 'room-floor') && !(o === grid))
  others.forEach((o: any, i: number) => fabricCanvas.moveTo(o, maxFloorIndex + 2 + i))
}

// 벽 그리기 이벤트 설정
const setupWallDrawing = () => {
  if (!fabricCanvas) {
    return
  }

  let isDrawing = false
  let startPoint: any = null
  let currentLine: any = null

  fabricCanvas.on('selection:created', (e: any) => {
    const selected = e.selected

    // 멀티 선택 지원
    if (selected && selected.length > 0) {
      selectedObjects.value = [...selected]
      selectedObject.value = selected[0] // 첫 번째 선택된 객체를 메인으로 설정

      // 첫 번째 선택된 객체로 상자 모드 결정
      const firstSelected = selected[0]
      if (firstSelected && firstSelected.userData?.type === 'placed-object') {
        // ETC 상자가 선택된 경우 상자 위 장비 배치 모드 활성화
        if (firstSelected.userData?.category === 'etc' && firstSelected.userData?.isBox) {
          selectedBox.value = firstSelected
          boxPlacementMode.value = true
        } else {
          // 상자가 아닌 오브젝트 선택 시 상자 모드 비활성화
          selectedBox.value = null
          boxPlacementMode.value = false

          // 상자 위에 배치된 장비가 선택된 경우 해당 상자도 함께 선택
          if (firstSelected.userData?.isOnBox && firstSelected.userData?.boxId) {
            const fabricObjects = fabricCanvas.getObjects()
            const boxObject = fabricObjects.find((fabricObj: any) =>
              fabricObj.userData?.placedObjectId === firstSelected.userData?.boxId
            )
            if (boxObject) {
              fabricCanvas.setActiveObject(boxObject)
            }
          }
        }
      }
      return
    }

    // 단일 선택 처리 (기존 로직 유지)
    const singleSelected = e.selected[0]
    if (singleSelected && singleSelected.userData?.type === 'placed-object') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]

      // ETC 상자가 선택된 경우 상자 위 장비 배치 모드 활성화
      if (singleSelected.userData?.category === 'etc' && singleSelected.userData?.isBox) {
        selectedBox.value = singleSelected
        boxPlacementMode.value = true
      } else {
        // 상자가 아닌 오브젝트 선택 시 상자 모드 비활성화
        selectedBox.value = null
        boxPlacementMode.value = false

        // 상자 위에 배치된 장비가 선택된 경우 해당 상자도 함께 선택
        if (singleSelected.userData?.isOnBox && singleSelected.userData?.boxId) {
          const fabricObjects = fabricCanvas.getObjects()
          const boxObject = fabricObjects.find((fabricObj: any) =>
            fabricObj.userData?.placedObjectId === singleSelected.userData?.boxId
          )
          if (boxObject) {
            fabricCanvas.setActiveObject(boxObject)
          }
        }
      }
      return
    }
    // 바닥 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'room-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }
    
    // Zone 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'zone-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }

    // 벽은 select 모드에서만 선택 가능
    if (currentTool.value !== 'select') {
      fabricCanvas.discardActiveObject()
      selectedObject.value = null
      selectedObjects.value = []
      return
    }

    if (singleSelected && (singleSelected.userData?.type === 'interior-wall' || singleSelected.userData?.type === 'exterior-wall')) {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
    } else {
      selectedObject.value = null
      selectedObjects.value = []
    }
  })

  fabricCanvas.on('selection:updated', (e: any) => {
    const selected = e.selected

    // 멀티 선택 지원
    if (selected && selected.length > 0) {
      selectedObjects.value = [...selected]
      selectedObject.value = selected[0] // 첫 번째 선택된 객체를 메인으로 설정
      return
    }

    // 단일 선택 처리
    const singleSelected = e.selected[0]
    if (singleSelected && singleSelected.userData?.type === 'placed-object') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }
    // 바닥 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'room-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }
    
    // Zone 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'zone-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }

    // 벽은 select 모드에서만 선택 가능
    if (currentTool.value !== 'select') {
      fabricCanvas.discardActiveObject()
      selectedObject.value = null
      selectedObjects.value = []
      return
    }

    if (singleSelected && (singleSelected.userData?.type === 'interior-wall' || singleSelected.userData?.type === 'exterior-wall')) {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
    } else {
      selectedObject.value = null
      selectedObjects.value = []
    }
  })

  fabricCanvas.on('selection:cleared', () => {
    selectedObject.value = null
    selectedObjects.value = []
  })

  updateWallSelectability()

  fabricCanvas.on('object:modified', (e: any) => {
    const modifiedObject = e.target
    if (modifiedObject && (modifiedObject.userData?.type === 'interior-wall' || modifiedObject.userData?.type === 'exterior-wall')) {
      const wallType = modifiedObject.userData?.type === 'interior-wall' ? '내부 벽' : '외부 벽'
      updateInteriorWallInList(modifiedObject)
    } else if (modifiedObject && modifiedObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(modifiedObject)
    } else if (modifiedObject && modifiedObject.userData?.type === 'zone-floor') {
      handleZoneModified(modifiedObject)
    }
  })

  fabricCanvas.on('object:moving', (e: any) => {
    const movingObject = e.target
    if (movingObject && (movingObject.userData?.type === 'interior-wall' || movingObject.userData?.type === 'exterior-wall')) {
      const wallType = movingObject.userData?.type === 'interior-wall' ? '내부 벽' : '외부 벽'
      updateInteriorWallInList(movingObject)
    } else if (movingObject && movingObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(movingObject)
    } else if (movingObject && movingObject.userData?.type === 'zone-floor') {
      handleZoneMoving(movingObject)
    }
  })

  fabricCanvas.on('object:scaling', (e: any) => {
    const scalingObject = e.target
    if (scalingObject && (scalingObject.userData?.type === 'interior-wall' || scalingObject.userData?.type === 'exterior-wall')) {
      const wallType = scalingObject.userData?.type === 'interior-wall' ? '내부 벽' : '외부 벽'
      updateInteriorWallInList(scalingObject)
    }
  })

  fabricCanvas.on('object:rotating', (e: any) => {
    const rotatingObject = e.target
    if (rotatingObject && (rotatingObject.userData?.type === 'interior-wall' || rotatingObject.userData?.type === 'exterior-wall')) {
      const wallType = rotatingObject.userData?.type === 'interior-wall' ? '내부 벽' : '외부 벽'
      updateInteriorWallInList(rotatingObject)
    } else if (rotatingObject && rotatingObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(rotatingObject)
    }
  })

  fabricCanvas.on('mouse:down', (e: any) => {
    if (currentTool.value !== 'wall') {
      return
    }

    const pointer = fabricCanvas.getPointer(e.e)
    isDrawing = true
    startPoint = pointer

    currentLine = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
      stroke: '#666666',
      strokeWidth: 3 / zoom.value, // 확대/축소에 따른 선 두께 조정
      strokeLineCap: 'round',
      selectable: false,
      evented: false,
      opacity: 0.7,
    })

    fabricCanvas.add(currentLine)
  })

  fabricCanvas.on('mouse:move', (e: any) => {
    if (!isDrawing || !currentLine || !startPoint) {
      return
    }

    const pointer = fabricCanvas.getPointer(e.e)
    currentLine.set({ x2: pointer.x, y2: pointer.y })
    fabricCanvas.renderAll()
  })

  fabricCanvas.on('mouse:up', (e: any) => {
    if (!isDrawing || !startPoint || !currentLine) {
      return
    }

    const pointer = fabricCanvas.getPointer(e.e)

    const length = Math.sqrt(
      Math.pow(pointer.x - startPoint.x, 2) +
      Math.pow(pointer.y - startPoint.y, 2)
    )

    if (length < 20) {
      fabricCanvas.remove(currentLine)
    } else {
      fabricCanvas.remove(currentLine)
      addInteriorWall(startPoint, pointer)
      
      // 벽 그리기 완료 후 자동으로 Select 모드로 전환
      console.log('🔄 벽 그리기 완료 - Select 모드로 자동 전환')
      setTool('select')
    }

    isDrawing = false
    startPoint = null
    currentLine = null
  })
}

// 소수점 2자리로 반올림하는 헬퍼 함수 (값만 반환, 오브젝트 수정 안함)
const roundToTwoDecimals = (value: number): number => {
  return Math.round(value * 100) / 100
}

// Store를 사용한 벽 정보 업데이트 (내부벽/외부벽 모두 처리)
const updateInteriorWallInList = (modifiedWall: any) => {

  const wallId = modifiedWall.userData?.id
  const wallType = modifiedWall.userData?.type

  if (!wallId) {
    return
  }

  let startPoint, endPoint

  // 벽 타입에 따라 좌표 계산 방법 분기 (내부벽과 외부벽 모두 Line 객체로 통일)
  if (wallType === 'interior-wall' || wallType === 'exterior-wall') {
    // 내부벽과 외부벽 모두 Line 객체로 동일하게 처리
    const linePoints = modifiedWall.calcLinePoints()
    const matrix = modifiedWall.calcTransformMatrix()
    startPoint = fabric.util.transformPoint({ x: linePoints.x1, y: linePoints.y1 }, matrix)
    endPoint = fabric.util.transformPoint({ x: linePoints.x2, y: linePoints.y2 }, matrix)
    
    // userData의 원본 좌표를 미터 단위로 업데이트
    const scale = 40 // 1m = 40px
    const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
      obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
    )
    
    if (defaultFloor) {
      const baseX = defaultFloor.left
      const baseY = defaultFloor.top
      
      // 픽셀 좌표를 미터 단위로 변환하여 userData에 저장
      modifiedWall.userData.startX = Math.round(((startPoint.x - baseX) / scale) * 100) / 100
      modifiedWall.userData.startY = Math.round(((startPoint.y - baseY) / scale) * 100) / 100
      modifiedWall.userData.endX = Math.round(((endPoint.x - baseX) / scale) * 100) / 100
      modifiedWall.userData.endY = Math.round(((endPoint.y - baseY) / scale) * 100) / 100
    }
  } else {
    return
  }

  const updatedWall = {
    start: { x: startPoint.x, y: startPoint.y },
    end: { x: endPoint.x, y: endPoint.y },
    id: wallId
  }

  if (wallType === 'interior-wall') {
    floorplanStore.updateInteriorWall(wallId, updatedWall)
  } else if (wallType === 'exterior-wall') {
    floorplanStore.updateExteriorWall(wallId, updatedWall)
  }

  updateWallLengthLabel(modifiedWall)
}

// 그리드 배경 추가 (100m x 70m Grid)
const addGrid = () => {
  if (!fabricCanvas) return

  const gridSize = 40 // 1m = 40px (1칸에 1m로 변경)
  const canvasWidth = fabricCanvas.width!
  const canvasHeight = fabricCanvas.height!
  
  // Grid 영역 계산 (100m x 70m)
  const gridWidthPx = GRID_WIDTH * gridSize   // 4000px
  const gridHeightPx = GRID_HEIGHT * gridSize // 2800px
  
  // Grid 시작점 (캔버스 중앙에서 Grid 크기의 절반만큼 왼쪽 위)
  const gridStartX = (canvasWidth - gridWidthPx) / 2
  const gridStartY = (canvasHeight - gridHeightPx) / 2
  const gridEndX = gridStartX + gridWidthPx
  const gridEndY = gridStartY + gridHeightPx

  // Dark/Light mode에 따른 그리드 색상 설정
  const thinGridColor = document.documentElement.classList.contains('dark') ? '#404040' : '#c0c0c0'  // 얇은 그리드 선
  const thickGridColor = document.documentElement.classList.contains('dark') ? '#606060' : '#a0a0a0' // 굵은 그리드 선

  const lines = []

  // 세로선 (1m 간격) - Grid 영역 내에서만
  for (let i = gridStartX; i <= gridEndX; i += gridSize) {
    lines.push(new fabric.Line([i, gridStartY, i, gridEndY], {
      stroke: thinGridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }))
  }

  // 가로선 (1m 간격) - Grid 영역 내에서만
  for (let i = gridStartY; i <= gridEndY; i += gridSize) {
    lines.push(new fabric.Line([gridStartX, i, gridEndX, i], {
      stroke: thinGridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }))
  }

  // 굵은 그리드 (5m 간격) - Grid 영역 내에서만
  for (let i = gridStartX; i <= gridEndX; i += gridSize * 5) {
    lines.push(new fabric.Line([i, gridStartY, i, gridEndY], {
      stroke: thickGridColor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }))
  }

  for (let i = gridStartY; i <= gridEndY; i += gridSize * 5) {
    lines.push(new fabric.Line([gridStartX, i, gridEndX, i], {
      stroke: thickGridColor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }))
  }
  
  // Grid 경계선 (굵은 테두리)
  const borderColor = document.documentElement.classList.contains('dark') ? '#808080' : '#666666'
  lines.push(new fabric.Line([gridStartX, gridStartY, gridEndX, gridStartY], { // 상단
    stroke: borderColor, strokeWidth: 3, selectable: false, evented: false
  }))
  lines.push(new fabric.Line([gridEndX, gridStartY, gridEndX, gridEndY], { // 우측
    stroke: borderColor, strokeWidth: 3, selectable: false, evented: false
  }))
  lines.push(new fabric.Line([gridEndX, gridEndY, gridStartX, gridEndY], { // 하단
    stroke: borderColor, strokeWidth: 3, selectable: false, evented: false
  }))
  lines.push(new fabric.Line([gridStartX, gridEndY, gridStartX, gridStartY], { // 좌측
    stroke: borderColor, strokeWidth: 3, selectable: false, evented: false
  }))

  const grid = new fabric.Group(lines, {
    selectable: false,
    evented: false,
  })

  fabricCanvas.add(grid)
  // 레이어 정렬: 모든 바닥 뒤, 그 위에 그리드, 그 위에 오브젝트
  positionGridAfterFloors()

  // 테마 변경 시 캔버스 배경색도 업데이트
  const backgroundColor = document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff'
  fabricCanvas.setBackgroundColor(backgroundColor, () => {
    fabricCanvas.renderAll()
  })
}

// 확대/축소 및 이동에 따른 그리드 업데이트
const updateGrid = () => {
  if (!fabricCanvas) return

  // 기존 그리드 제거
  const existingGrid = fabricCanvas.getObjects().find((obj: any) =>
    obj.type === 'group' && obj.getObjects().some((line: any) => line.type === 'line')
  )

  if (existingGrid) {
    fabricCanvas.remove(existingGrid)
  }

  // 새로운 그리드 생성 (확대/축소 및 이동을 고려한 확장된 영역)
  const gridSize = 40 * zoom.value // 확대/축소에 따른 그리드 크기 조정 (1m = 40px)
  const canvasWidth = fabricCanvas.width!
  const canvasHeight = fabricCanvas.height!

  // 뷰포트 영역 계산
  const viewportLeft = -pan.value.x / zoom.value
  const viewportTop = -pan.value.y / zoom.value
  const viewportRight = viewportLeft + canvasWidth / zoom.value
  const viewportBottom = viewportTop + canvasHeight / zoom.value

  // 그리드 시작/끝 위치 계산 (여백 포함)
  const margin = 1000 // 여백 크기
  const startX = Math.floor((viewportLeft - margin) / gridSize) * gridSize
  const endX = Math.ceil((viewportRight + margin) / gridSize) * gridSize
  const startY = Math.floor((viewportTop - margin) / gridSize) * gridSize
  const endY = Math.ceil((viewportBottom + margin) / gridSize) * gridSize

  // Dark/Light mode에 따른 그리드 색상 설정
  const thinGridColor = document.documentElement.classList.contains('dark') ? '#404040' : '#c0c0c0'  // 얇은 그리드 선
  const thickGridColor = document.documentElement.classList.contains('dark') ? '#606060' : '#a0a0a0' // 굵은 그리드 선

  const lines = []

  // 세로선 (1m 간격)
  for (let i = startX; i <= endX; i += gridSize) {
    lines.push(new fabric.Line([i, startY, i, endY], {
      stroke: thinGridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }))
  }

  // 가로선 (1m 간격)
  for (let i = startY; i <= endY; i += gridSize) {
    lines.push(new fabric.Line([startX, i, endX, i], {
      stroke: thinGridColor,
      strokeWidth: 1,
      selectable: false,
      evented: false,
    }))
  }

  // 굵은 그리드 (5m 간격)
  for (let i = startX; i <= endX; i += gridSize * 5) {
    lines.push(new fabric.Line([i, startY, i, endY], {
      stroke: thickGridColor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }))
  }

  for (let i = startY; i <= endY; i += gridSize * 5) {
    lines.push(new fabric.Line([startX, i, endX, i], {
      stroke: thickGridColor,
      strokeWidth: 2,
      selectable: false,
      evented: false,
    }))
  }

  const grid = new fabric.Group(lines, {
    selectable: false,
    evented: false,
  })

  fabricCanvas.add(grid)
  positionGridAfterFloors()

  // 테마 변경 시 캔버스 배경색도 업데이트
  const backgroundColor = document.documentElement.classList.contains('dark') ? '#1a1a1a' : '#ffffff'
  fabricCanvas.setBackgroundColor(backgroundColor, () => {
    fabricCanvas.renderAll()
  })
}

// 좌표 입력으로 벽 그리기
const drawWallFromCoordinates = () => {
  if (!isValidWallCoordinates.value || !fabricCanvas) return
  
  const scale = 40 // 1m = 40px
  
  // 원본 입력값 사용 (반올림하지 않음)
  const startXValue = wallStartX.value
  const startYValue = wallStartY.value
  const endXValue = wallEndX.value
  const endYValue = wallEndY.value
  
  // 기본 회색 바닥의 위치를 찾기
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )
  
  if (!defaultFloor) {
    console.error('기본 바닥을 찾을 수 없습니다.')
    return
  }
  
  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 좌표 변환
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  
  // 미터 단위를 픽셀 단위로 변환
  const startX = baseX + (startXValue * scale)
  const startY = baseY + (startYValue * scale)
  const endX = baseX + (endXValue * scale)
  const endY = baseY + (endYValue * scale)
  
  // 벽 그리기
  addInteriorWall({ x: startX, y: startY }, { x: endX, y: endY })
  
  // 벽 그리기 완료 후 자동으로 Select 모드로 전환
  console.log('🔄 좌표 입력으로 벽 그리기 완료 - Select 모드로 자동 전환')
  setTool('select')
  
  // 입력 필드 초기화 (소수점 2자리 제한)
  wallStartX.value = 0.00
  wallStartY.value = 0.00
  wallEndX.value = 10.00
  wallEndY.value = 0.00
}



// Store를 사용한 내부 벽 추가
const addInteriorWall = (start: { x: number, y: number }, end: { x: number, y: number }) => {
  if (!fabricCanvas) return

  // 현재 툴에 따라 선택 가능 여부 및 시각적 스타일 결정
  const isSelectMode = currentTool.value === 'select'

  const wall = new fabric.Line([start.x, start.y, end.x, end.y], {
    stroke: isSelectMode ? '#444444' : '#666666', // Select 모드: 더 진한 회색, Draw 모드: 진한 회색
    strokeWidth: 3,
    strokeLineCap: 'round',
    selectable: isSelectMode,
    evented: isSelectMode,
    opacity: isSelectMode ? 1.0 : 0.7, // Select 모드: 불투명, Draw 모드: 반투명
    hoverCursor: isSelectMode ? 'move' : 'default',
    moveCursor: isSelectMode ? 'move' : 'default',
  })

  // 더 상세한 식별 정보 추가
  const wallId = Date.now() + Math.random() // 고유 ID
  wall.userData = {
    type: 'interior-wall',
    id: wallId,
    startX: start.x,
    startY: start.y,
    endX: end.x,
    endY: end.y,
    isSaved: false // 새로 생성된 Wall
  }

  fabricCanvas.add(wall)

  // Store에 내부 벽 추가
  const wallData = {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
    id: wallId
  }

  floorplanStore.addInteriorWall(wallData)
  


  addWallLengthLabel(wall, start, end)

  // 새로 생성된 벽의 선택 가능 여부를 현재 툴에 맞게 설정
  updateWallSelectability()
}



// 기본 바닥 생성 함수 (87m x 56m 밝은 회색, Grid 중앙에 배치)
const createDefaultFloor = () => {
  if (!fabricCanvas) return

  const scale = 40 // 1m = 40px
  const defaultWidth = 87 // 87m (8700cm)
  const defaultHeight = 56 // 56m (5600cm)
  const roomWidthPx = defaultWidth * scale
  const roomHeightPx = defaultHeight * scale

  // Grid 중앙에 배치 (100m x 70m Grid의 중앙)
  const canvasWidth = fabricCanvas.width!
  const canvasHeight = fabricCanvas.height!
  const gridWidthPx = GRID_WIDTH * scale   // 4000px
  const gridHeightPx = GRID_HEIGHT * scale // 2800px
  
  // Grid의 시작점 (캔버스 중앙에서 Grid 크기의 절반만큼 왼쪽 위)
  const gridStartX = (canvasWidth - gridWidthPx) / 2
  const gridStartY = (canvasHeight - gridHeightPx) / 2
  
  // 회색 바닥을 Grid 중앙에 배치
  const startX = gridStartX + (GRID_WIDTH - defaultWidth) * scale / 2  // Grid 중앙 X
  const startY = gridStartY + (GRID_HEIGHT - defaultHeight) * scale / 2 // Grid 중앙 Y

  // 기본 바닥(직사각형) 생성 - 밝은 회색 (고정, 선택 불가)
  const floorId = 'default-floor'
  const floorRect = new fabric.Rect({
    left: startX,
    top: startY,
    width: roomWidthPx,
    height: roomHeightPx,
    fill: 'rgba(211, 211, 211, 0.8)', // 밝은 회색
    stroke: '#A9A9A9', // 테두리는 살짝 어둡게
    strokeWidth: 2,
    selectable: false,    // 선택 불가
    hasControls: false,   // 컨트롤 핸들 없음
    lockMovementX: true,  // X축 이동 금지
    lockMovementY: true,  // Y축 이동 금지
    lockRotation: true,   // 회전 금지
    lockScalingX: true,   // X축 크기 조정 금지
    lockScalingY: true,   // Y축 크기 조정 금지
    evented: false        // 이벤트 처리 안함
  })
    ; (floorRect as any).userData = { type: 'base-floor', floorId, isFixed: true }
  fabricCanvas.add(floorRect)

  // 기본 바닥은 라벨이나 이벤트 처리 없음 (고정이므로)

  // 레이어 정렬
  sendAllFloorsToBack()
  positionGridAfterFloors()

  // Store에 기본 룸 정보 저장
  const roomData = {
    width: defaultWidth,
    height: defaultHeight,
    bounds: {
      left: startX,
      top: startY,
      right: startX + roomWidthPx,
      bottom: startY + roomHeightPx
    }
  }
  floorplanStore.setRoom(roomData)

  // Store floors에도 추가
  floorplanStore.addFloor({
    id: floorId,
    width: defaultWidth,
    height: defaultHeight,
    boundsPx: { left: startX, top: startY, right: startX + roomWidthPx, bottom: startY + roomHeightPx },
    color: '#D3D3D3'
  })

  fabricCanvas.renderAll()
}

// 초기 뷰 설정 (Default Zoom 40%, 화면 중앙 배치)
const setupInitialView = () => {
  if (!fabricCanvas) return

  const canvasWidth = fabricCanvas.width!
  const canvasHeight = fabricCanvas.height!
  const scale = 40 // 1m = 40px
  
  // Default Zoom을 40%로 고정
  zoom.value = 0.4
  
  // 전체 Grid 크기 (픽셀)
  const gridWidthPx = GRID_WIDTH * scale   // 4000px
  const gridHeightPx = GRID_HEIGHT * scale // 2800px
  
  // 40% 줌에서의 실제 그리드 크기
  const scaledGridWidth = gridWidthPx * zoom.value   // 1600px
  const scaledGridHeight = gridHeightPx * zoom.value // 1120px
  
  // Grid의 원래 위치 (캔버스 중앙에 배치된 상태)
  const gridStartX = (canvasWidth - gridWidthPx) / 2
  const gridStartY = (canvasHeight - gridHeightPx) / 2
  
  // 40% 줌에서 Grid가 화면 중앙에 오도록 pan 계산
  // Grid의 원래 중심점이 화면 중앙에 오도록 조정
  const gridCenterX = gridStartX + gridWidthPx / 2
  const gridCenterY = gridStartY + gridHeightPx / 2
  
  const scaledGridCenterX = gridCenterX * zoom.value
  const scaledGridCenterY = gridCenterY * zoom.value
  
  pan.value.x = (canvasWidth / 2) - scaledGridCenterX
  pan.value.y = (canvasHeight / 2) - scaledGridCenterY
  
  console.log('🔍 초기 뷰 설정 (Default Zoom 40%):', {
    canvasSize: { width: canvasWidth, height: canvasHeight },
    gridSize: { width: gridWidthPx, height: gridHeightPx },
    gridStart: { x: gridStartX, y: gridStartY },
    gridCenter: { x: gridCenterX, y: gridCenterY },
    scaledGridSize: { width: scaledGridWidth, height: scaledGridHeight },
    scaledGridCenter: { x: scaledGridCenterX, y: scaledGridCenterY },
    defaultZoom: zoom.value,
    pan: { x: pan.value.x, y: pan.value.y }
  })
  
  // 캔버스 변환 적용
  updateCanvasTransform()
}

// 중복된 setupInitialView 함수 제거됨 (새로운 함수는 1006라인 근처에 있음)

// Store를 사용한 네모난 방 생성 (바닥만 생성, 벽 미생성)
const createRoom = () => {
  if (!fabricCanvas || !isValidSize.value) return

  // 기존 도면은 유지하고 바닥만 추가 (여러 바닥 지원)

  const scale = 40 // 1m = 40px
  const roomWidthPx = roomWidth.value * scale
  const roomHeightPx = roomHeight.value * scale

  // 캔버스 중앙에 배치
  const canvasWidth = fabricCanvas.width!
  const canvasHeight = fabricCanvas.height!
  const startX = (canvasWidth - roomWidthPx) / 2
  const startY = (canvasHeight - roomHeightPx) / 2

  // 바닥(직사각형) 생성 - 파스텔톤 노란색 (반투명)
  const floorId = Date.now().toString()
  const floorRect = new fabric.Rect({
    left: startX,
    top: startY,
    width: roomWidthPx,
    height: roomHeightPx,
    fill: selectedFloorColor.value.rgba,
    stroke: '#E5D38A', // 테두리는 살짝 어둡게
    strokeWidth: 1,
    selectable: true,
    hasControls: true,
    lockRotation: true,
    evented: true
  })
    ; (floorRect as any).userData = { type: 'room-floor', floorId }
  fabricCanvas.add(floorRect)

  // 바닥 사이즈 라벨 추가
  addOrUpdateRoomSizeLabel(floorRect)

  // 바닥 이동/리사이즈 처리 분리 (이동 시 크기 변경 금지)
  floorRect.on('moving', () => handleFloorMoving(floorRect))
  floorRect.on('modified', () => handleFloorModified(floorRect))

  // 선택/해제 시 UI 연동 (Delete 버튼 활성화)
  floorRect.on('selected', () => { selectedObject.value = floorRect })
  floorRect.on('deselected', () => { if (selectedObject.value === floorRect) selectedObject.value = null })
  // 바닥 클릭 시에도 즉시 레이어 정렬 유지
  floorRect.on('mousedown', () => {
    sendAllFloorsToBack()
    positionGridAfterFloors()
  })

  // 레이어: 바닥은 항상 가장 뒤로
  sendAllFloorsToBack()
  // 그리드를 바닥 위로 정렬
  positionGridAfterFloors()

  // Store에 룸 정보 업데이트 (bounds는 그대로 유지)
  const roomData = {
    width: roomWidth.value,
    height: roomHeight.value,
    bounds: {
      left: startX,
      top: startY,
      right: startX + roomWidthPx,
      bottom: startY + roomHeightPx
    }
  }
  floorplanStore.setRoom(roomData)

  // Store floors에도 추가 (여러 바닥 지원)
  floorplanStore.addFloor({
    id: floorId,
    width: roomWidth.value,
    height: roomHeight.value,
    boundsPx: { left: startX, top: startY, right: startX + roomWidthPx, bottom: startY + roomHeightPx },
    color: selectedFloorColor.value.hex
  })

  // 외부벽 데이터는 생성하지 않음 (요청사항)

  fabricCanvas.renderAll()
}

// Zone 생성 함수 (회색 바닥 기준 좌표계 사용)
const createZone = () => {
  if (!fabricCanvas || !isValidZoneSize.value) return

  const scale = 40 // 1m = 40px

  // 원본 입력값 사용 (소수점 2자리까지 정확하게)
  const zoneXValue = Math.round(zoneX.value * 100) / 100
  const zoneYValue = Math.round(zoneY.value * 100) / 100
  const zoneWidthValue = Math.round(zoneWidth.value * 100) / 100
  const zoneHeightValue = Math.round(zoneHeight.value * 100) / 100

  // 기본 회색 바닥의 위치를 찾기
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )

  if (!defaultFloor) {
    console.error('기본 바닥을 찾을 수 없습니다.')
    return
  }

  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 Zone 위치 계산
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  const zoneLeft = baseX + (zoneXValue * scale)
  const zoneTop = baseY + (zoneYValue * scale)
  const zoneWidthPx = zoneWidthValue * scale
  const zoneHeightPx = zoneHeightValue * scale

  // Zone 바닥 생성
  const zoneId = Date.now().toString()
  const zoneRect = new fabric.Rect({
    left: zoneLeft,
    top: zoneTop,
    width: zoneWidthPx,
    height: zoneHeightPx,
    fill: selectedFloorColor.value.rgba,
    stroke: selectedFloorColor.value.hex,
    strokeWidth: 2,
    selectable: true,
    hasControls: true,
    lockRotation: true,
    evented: true
  })
    ; (zoneRect as any).userData = { 
      type: 'zone-floor', 
      zoneId, 
      isZone: true, 
      isNew: true,
      isSaved: false, // 새로 생성된 Zone
      originalWidth: zoneWidthValue,  // 원본 크기 저장
      originalHeight: zoneHeightValue // 원본 크기 저장
    }
  fabricCanvas.add(zoneRect)

  // Zone을 기본 바닥보다 위에 표시하되, 다른 오브젝트보다는 아래에 배치
  const allObjects = fabricCanvas.getObjects()
  const floorObjects = allObjects.filter((obj: any) => obj.userData?.type === 'room-floor')
  const maxFloorIndex = floorObjects.length > 0 ?
    Math.max(...floorObjects.map((obj: any) => allObjects.indexOf(obj))) : -1

  if (maxFloorIndex >= 0) {
    fabricCanvas.moveTo(zoneRect, maxFloorIndex + 1)
  }

  // Zone 사이즈 라벨 추가
  addOrUpdateZoneSizeLabel(zoneRect)

  // Zone 이동/리사이즈 처리
  zoneRect.on('moving', () => handleZoneMoving(zoneRect))
  zoneRect.on('modified', () => handleZoneModified(zoneRect))
  zoneRect.on('selected', () => { selectedObject.value = zoneRect })
  zoneRect.on('deselected', () => { if (selectedObject.value === zoneRect) selectedObject.value = null })

  // Zone 생성 후 자동으로 선택 상태로 설정
  fabricCanvas.setActiveObject(zoneRect)
  selectedObject.value = zoneRect

  // Store에 Zone 정보 추가
  floorplanStore.addFloor({
    id: zoneId,
    width: zoneWidthValue,
    height: zoneHeightValue,
    boundsPx: { left: zoneLeft, top: zoneTop, right: zoneLeft + zoneWidthPx, bottom: zoneTop + zoneHeightPx },
    color: selectedFloorColor.value.hex,
    isZone: true,
    zonePosition: { x: zoneXValue, y: zoneYValue }
  })

  fabricCanvas.renderAll()
  
  // Zone 생성 후 입력 필드 초기화 (소수점 2자리 제한)
  zoneX.value = 0.00
  zoneY.value = 0.00
  zoneWidth.value = 10.00
  zoneHeight.value = 10.00
}

// Zone 사이즈 라벨 생성/업데이트
const addOrUpdateZoneSizeLabel = (zoneRect: any) => {
  if (!fabricCanvas) return
  const scale = 40
  const widthM = (zoneRect.width * zoneRect.scaleX) / scale
  const heightM = (zoneRect.height * zoneRect.scaleY) / scale
  const area = Math.round(widthM * heightM * 100) / 100
  const labelText = `Zone: ${widthM.toFixed(2)}m × ${heightM.toFixed(2)}m | ${area.toFixed(2)}m²`

  // 기존 라벨 찾기
  const zoneId = zoneRect.userData?.zoneId
  const existing = fabricCanvas.getObjects().find((o: any) =>
    o.userData?.type === 'zone-size-label' && o.userData?.zoneId === zoneId
  ) as any

  if (existing) {
    existing.text = labelText
    existing.left = zoneRect.left + 8
    existing.top = zoneRect.top + 8
    existing.bringToFront()
  } else {
    const label = new fabric.Text(labelText, {
      left: zoneRect.left + 8,
      top: zoneRect.top + 8,
      fontSize: 12,
      fill: '#333333',
      backgroundColor: 'rgba(255,255,255,0.8)',
      selectable: false,
      evented: false
    }) as any
    label.userData = { type: 'zone-size-label', zoneId }
    fabricCanvas.add(label)
    label.bringToFront()
  }
}

// Zone 이동 처리
const handleZoneMoving = (zoneRect: any) => {
  addOrUpdateZoneSizeLabel(zoneRect)
  
  // Store에 Zone 위치 업데이트 (크기는 변경되지 않음)
  const zoneId = zoneRect.userData?.zoneId
  if (zoneId) {
    const scale = 40 // 1m = 40px
    const newBounds = {
      left: zoneRect.left,
      top: zoneRect.top,
      right: zoneRect.left + zoneRect.width,
      bottom: zoneRect.top + zoneRect.height
    }
    
    floorplanStore.updateFloor(zoneId, { boundsPx: newBounds })
  }
}

// Zone 수정 처리
const handleZoneModified = (zoneRect: any) => {
  addOrUpdateZoneSizeLabel(zoneRect)
  
  // Store에 Zone 크기 및 위치 업데이트
  const zoneId = zoneRect.userData?.zoneId
  if (zoneId) {
    const scale = 40 // 1m = 40px
    
    // 더 정확한 크기 계산: width * scaleX, height * scaleY
    const newWidth = (zoneRect.width * zoneRect.scaleX) / scale
    const newHeight = (zoneRect.height * zoneRect.scaleY) / scale
    
    // 소수점 2자리까지 반올림하여 정확성 향상
    const roundedWidth = Math.round(newWidth * 100) / 100
    const roundedHeight = Math.round(newHeight * 100) / 100
    
    // userData에 원본 크기 업데이트 (반올림된 값)
    zoneRect.userData.originalWidth = roundedWidth
    zoneRect.userData.originalHeight = roundedHeight
    
    const newBounds = {
      left: zoneRect.left,
      top: zoneRect.top,
      right: zoneRect.left + zoneRect.width,
      bottom: zoneRect.top + zoneRect.height
    }
    
    floorplanStore.updateFloor(zoneId, {
      width: roundedWidth,
      height: roundedHeight,
      boundsPx: newBounds
    })
  }
}

// 바닥 사이즈 라벨 생성/업데이트
const addOrUpdateRoomSizeLabel = (floorRect: any) => {
  if (!fabricCanvas) return
  const scale = 40
  const widthM = (floorRect.width * floorRect.scaleX) / scale
  const heightM = (floorRect.height * floorRect.scaleY) / scale
  const area = Math.round(widthM * heightM * 100) / 100
  const labelText = `W ${widthM.toFixed(2)}m × D ${heightM.toFixed(2)}m  |  Area ${area.toFixed(2)} m²`

  // 기존 라벨 찾기 (floor별)
  const floorId = floorRect.userData?.floorId
  const existing = fabricCanvas.getObjects().find((o: any) => o.userData?.type === 'room-size-label' && o.userData?.floorId === floorId) as any
  if (existing) {
    existing.text = labelText
    existing.left = floorRect.left + 8
    existing.top = floorRect.top + 8
    existing.bringToFront()
  } else {
    const label = new fabric.Text(labelText, {
      left: floorRect.left + 8,
      top: floorRect.top + 8,
      fontSize: 14,
      fill: '#5c5c5c',
      backgroundColor: 'rgba(255,255,255,0.6)'
    }) as any
    label.userData = { type: 'room-size-label', floorId }
    fabricCanvas.add(label)
    label.bringToFront()
  }
}

// 바닥 이동/리사이즈 후 스토어 바닥/라벨만 업데이트 (다른 요소 영향 없음)
const handleFloorModified = (floorRect: any) => {
  if (!fabricCanvas) return
  const scale = 40

  // 변경된 실제 크기 픽셀 → 고정 폭/높이로 반영하고 scale 초기화
  const newWidthPx = floorRect.getScaledWidth()
  const newHeightPx = floorRect.getScaledHeight()
  floorRect.set({ width: newWidthPx, height: newHeightPx, scaleX: 1, scaleY: 1 })

  // 새로운 룸 크기 (미터)
  const newWm = newWidthPx / scale
  const newDm = newHeightPx / scale

  // floors 스토어 업데이트 (현재 floorId 기준)
  const floorId = floorRect.userData?.floorId as string
  if (floorId) {
    floorplanStore.updateFloor(floorId, {
      width: newWm,
      height: newDm,
      boundsPx: {
        left: floorRect.left,
        top: floorRect.top,
        right: floorRect.left + newWidthPx,
        bottom: floorRect.top + newHeightPx
      }
    })
  }

  // 라벨 업데이트
  addOrUpdateRoomSizeLabel(floorRect)

  // 다른 요소에는 영향 없음. 2D 재구성 불필요

  fabricCanvas.renderAll()
}

// 바닥 이동 중에는 크기를 고정하고, 위치만 반영
const handleFloorMoving = (floorRect: any) => {
  if (!fabricCanvas) return
  const scale = 40
  // 크기 스케일 잠금
  if (floorRect.scaleX !== 1 || floorRect.scaleY !== 1) {
    const w = floorRect.getScaledWidth()
    const h = floorRect.getScaledHeight()
    floorRect.set({ width: w, height: h, scaleX: 1, scaleY: 1 })
  }
  // 위치만 floors 스토어에 반영
  const floorId = floorRect.userData?.floorId as string
  if (!floorId) return
  const newBounds = {
    left: floorRect.left,
    top: floorRect.top,
    right: floorRect.left + floorRect.width,
    bottom: floorRect.top + floorRect.height
  }
  floorplanStore.updateFloor(floorId, { boundsPx: newBounds })
  // 라벨도 함께 이동
  addOrUpdateRoomSizeLabel(floorRect)
  // 레이어 정렬 유지
  sendAllFloorsToBack()
  positionGridAfterFloors()
}

// 실시간 3D 업데이트 제거로 인해 updateAllWalls 함수 비활성화
// collect2DData 함수로 대체됨
// const updateAllWalls = () => {
//   console.log('🔄 updateAllWalls 함수 시작')
//   
//   if (!currentRoom.value) {
//     console.log('❌ currentRoom.value가 없음')
//     return
//   }
// 
//   const bounds = currentRoom.value.bounds
//   if (!bounds) {
//     console.log('❌ bounds가 없음')
//     return
//   }
// 
//   // 캔버스 크기 정보
//   const canvasWidth = fabricCanvas?.width || 800
//   const canvasHeight = fabricCanvas?.height || 600
// 
//   // 외벽 정보
//   const exteriorWalls = [
//     { start: { x: bounds.left, y: bounds.top }, end: { x: bounds.right, y: bounds.top } }, // 위
//     { start: { x: bounds.right, y: bounds.top }, end: { x: bounds.right, y: bounds.bottom } }, // 오른쪽
//     { start: { x: bounds.right, y: bounds.bottom }, end: { x: bounds.left, y: bounds.bottom } }, // 아래
//     { start: { x: bounds.left, y: bounds.bottom }, end: { x: bounds.left, y: bounds.top } } // 왼쪽
//   ]
// 
//   const eventData = {
//     exteriorWalls: exteriorWalls,
//     interiorWalls: interiorWalls.value,
//     roomSize: {
//       width: currentRoom.value.width,
//       height: currentRoom.value.height,
//       centerX: (bounds.left + bounds.right) / 2,
//       centerY: (bounds.top + bounds.bottom) / 2
//     },
//     canvasSize: {
//       width: canvasWidth,
//       height: canvasHeight
//     }
//   }
// 
//   // window.dispatchEvent 제거
// }

// 중복된 updateWallSelectability 함수 제거됨

// 벽 길이 표시 레이블 추가
const addWallLengthLabel = (wall: any, start: { x: number, y: number }, end: { x: number, y: number }) => {
  if (!fabricCanvas) return

  // 벽 길이 계산 (픽셀을 미터로 변환)
  const lengthPx = Math.sqrt(Math.pow(end.x - start.x, 2) + Math.pow(end.y - start.y, 2))
  const lengthM = lengthPx / 40 // 1m = 40px
  const lengthText = lengthM.toFixed(2) + 'm'

  // 벽의 중점 계산
  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2

  // 벽의 각도 계산
  const angle = Math.atan2(end.y - start.y, end.x - start.x)

  // 텍스트 위치 오프셋 (벽에서 조금 떨어뜨림)
  const offsetDistance = 15
  const offsetX = Math.cos(angle + Math.PI / 2) * offsetDistance
  const offsetY = Math.sin(angle + Math.PI / 2) * offsetDistance

  // 텍스트 객체 생성
  const lengthLabel = new fabric.Text(lengthText, {
    left: centerX + offsetX,
    top: centerY + offsetY,
    fontSize: 12,
    fill: '#333333',
    fontFamily: 'Arial',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    angle: angle * 180 / Math.PI, // 라디안을 도로 변환
    selectable: false,
    evented: false,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 2
  })

  // 벽과 연관된 레이블임을 표시
  lengthLabel.userData = {
    type: 'wall-length-label',
    wallId: wall.userData?.id,
    wallType: wall.userData?.type
  }

  fabricCanvas.add(lengthLabel)
}

// 벽 길이 레이블 업데이트
const updateWallLengthLabel = (wall: any) => {
  if (!fabricCanvas) return

  const wallId = wall.userData?.id
  if (!wallId) return

  // 기존 레이블 찾기 및 제거
  const existingLabel = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'wall-length-label' && obj.userData?.wallId === wallId
  )

  if (existingLabel) {
    fabricCanvas.remove(existingLabel)
  }

  // 새로운 좌표로 레이블 재생성
  let start, end

  if (wall.userData?.type === 'interior-wall' || wall.userData?.type === 'exterior-wall') {
    // 내부벽과 외부벽 모두 Line 객체로 동일하게 처리
    const linePoints = wall.calcLinePoints()
    const matrix = wall.calcTransformMatrix()
    start = fabric.util.transformPoint({ x: linePoints.x1, y: linePoints.y1 }, matrix)
    end = fabric.util.transformPoint({ x: linePoints.x2, y: linePoints.y2 }, matrix)

    const wallType = wall.userData?.type === 'interior-wall' ? '내부벽' : '외부벽'
  }

  if (start && end) {
    addWallLengthLabel(wall, start, end)
  }
}

// 2D 캔버스에서 오브젝트 색상 업데이트
const updateObjectColorOnCanvas = (placedObjectId: string, newColor: string) => {
  if (!fabricCanvas) return

  // 캔버스에서 해당 오브젝트 찾기
  const fabricObject = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'placed-object' && obj.userData?.placedObjectId === placedObjectId
  )

  if (fabricObject && fabricObject.type === 'group') {
    // 그룹 내의 사각형 오브젝트 색상 변경
    fabricObject.getObjects().forEach((child: any) => {
      if (child.type === 'rect') {
        child.set('fill', newColor)
      }
    })
    fabricCanvas.renderAll()
  }
}

// Store 기반 2D 오브젝트 재구성 (3D와 동일한 방식)
const rerender2DObjectsFromStore = () => {
  if (!fabricCanvas) return

  // 기존 배치 오브젝트 모두 제거
  const objectsToRemove = (fabricCanvas.getObjects() as Array<fabric.Object & { userData?: any }>).filter((obj) =>
    obj.userData?.type === 'placed-object'
  )

  objectsToRemove.forEach(obj => {
    fabricCanvas.remove(obj)
  })

  // Store 데이터 기반으로 모든 오브젝트 재생성
  floorplanStore.placedObjects.forEach(placedObj => {
    const canvasWidth = fabricCanvas.width || 800
    const canvasHeight = fabricCanvas.height || 600

    // Store 좌표 → 2D Canvas 좌표 변환
    const fabricX = placedObj.position.x * 40 + canvasWidth / 2
    const fabricY = placedObj.position.y * 40 + canvasHeight / 2

    // 오브젝트 모양 생성
    const objectShape = new fabric.Rect({
      left: fabricX - (placedObj.width * 40) / 2,
      top: fabricY - (placedObj.depth * 40) / 2,
      width: placedObj.width * 40,
      height: placedObj.depth * 40,
      fill: placedObj.color || getObjectColor(placedObj.category, placedObj.isOnBox),
      stroke: '#333',
      strokeWidth: 1,
      selectable: true,
      evented: true
    })

    // 라벨 생성
    const label = new fabric.Text(placedObj.name, {
      left: fabricX,
      top: fabricY,
      fontSize: 12,
      textAlign: 'center',
      originX: 'center',
      originY: 'center',
      selectable: false,
      evented: false,
      fill: '#000'
    })

    // 그룹으로 묶기
    const group = new fabric.Group([objectShape, label], {
      left: fabricX,
      top: fabricY,
      originX: 'center',
      originY: 'center',
      angle: placedObj.rotation * (180 / Math.PI), // 라디안 → 도
      selectable: true,
      evented: true,
      hasRotatingPoint: true
    })

    group.userData = {
      type: 'placed-object',
      placedObjectId: placedObj.id,
      objectName: placedObj.name
    }

    fabricCanvas.add(group)
  })

  fabricCanvas.renderAll()
}

// 상자 위의 장비들을 상자와 함께 이동
const moveObjectsOnBox = (boxObject: any) => {
  if (!boxObject || boxObject.userData?.category !== 'etc' || !boxObject.userData?.isBox) return

  const boxId = boxObject.userData?.placedObjectId
  if (!boxId) return

  // 상자 위에 있는 모든 장비 찾기
  const objectsOnBox = floorplanStore.placedObjects.filter(obj => obj.boxId === boxId)

  objectsOnBox.forEach(obj => {
    // 해당 장비의 Fabric.js 오브젝트 찾기
    const fabricObjects = fabricCanvas?.getObjects() || []
    const fabricObject = fabricObjects.find((fabricObj: any) =>
      fabricObj.userData?.placedObjectId === obj.id
    )

    if (fabricObject) {
      // 상자의 새로운 위치에 맞춰 장비 위치 업데이트
      const boxLeft = boxObject.left || 0
      const boxTop = boxObject.top || 0

      fabricObject.set({
        left: boxLeft,
        top: boxTop - 20, // 상자 위쪽에 약간 올려서 배치
        angle: boxObject.angle || 0 // 상자와 같은 회전각 적용
      })

      // Store도 업데이트
      const canvasWidth = fabricCanvas?.width || 800
      const canvasHeight = fabricCanvas?.height || 600
      const worldX = (boxLeft - canvasWidth / 2) / 40
      const worldY = (boxTop - canvasHeight / 2) / 40

      const updatedObject = {
        ...obj,
        position: { x: worldX, y: worldY },
        rotation: (boxObject.angle || 0) * (Math.PI / 180) // 상자와 같은 회전각 (라디안)
      }
      floorplanStore.updatePlacedObject(obj.id, updatedObject)
    }
  })

  fabricCanvas?.renderAll()
}

// Store에서 배치된 오브젝트 정보 업데이트
const updatePlacedObjectInStore = (fabricObject: any) => {
  if (!fabricObject || !fabricObject.userData?.placedObjectId) return

  const placedObjectId = fabricObject.userData.placedObjectId
  const canvasWidth = fabricCanvas?.width || 800
  const canvasHeight = fabricCanvas?.height || 600

  // Fabric.js 좌표를 3D 월드 좌표로 변환 (벽과 동일한 방식)
  const worldX = (fabricObject.left - canvasWidth / 2) / 40   // X축 좌표
  const worldY = (fabricObject.top - canvasHeight / 2) / 40   // Y축 좌표 (벽과 동일한 방식)

  // 회전값 변환 (Fabric.js는 도 단위, Store는 라디안 단위)
  const fabricAngle = fabricObject.angle || 0
  const rotationRadians = fabricAngle * (Math.PI / 180)



  // Store에서 해당 오브젝트 찾기
  const existingObject = floorplanStore.placedObjects.find(obj => obj.id === placedObjectId)
  if (existingObject) {
    const updatedObject = {
      ...existingObject,
      position: { x: worldX, y: worldY },
      rotation: rotationRadians
    }
    floorplanStore.updatePlacedObject(placedObjectId, updatedObject)
  }
}

// Object Library에서 오브젝트 배치 처리
const handlePlaceObject = (event: any) => {
  if (!fabricCanvas) return

  const { object } = event.detail

  let centerX: number
  let centerY: number

  // 상자 위 배치 모드인 경우 상자 위에 배치
  if (boxPlacementMode.value && selectedBox.value && object.category !== 'etc') {
    const box = selectedBox.value
    const boxLeft = box.left || 0
    const boxTop = box.top || 0

    // 상자 위 중앙에 배치
    centerX = boxLeft
    centerY = boxTop - 20 // 상자 위쪽에 약간 올려서 배치


  } else {
    // 일반 배치 - 캔버스 중앙에 배치
    const canvasWidth = fabricCanvas.width || 800
    const canvasHeight = fabricCanvas.height || 600
    centerX = canvasWidth / 2
    centerY = canvasHeight / 2
  }

  // 오브젝트 크기 (미터 단위를 픽셀로 변환) - 2D에서는 width(가로), depth(세로) 사용
  const meterToPixel = 40 // 1m = 40px
  let objectWidth = (object.width || 1) * meterToPixel   // 가로
  let objectHeight = (object.depth || 1) * meterToPixel  // 세로 (2D 표현용)

  // 상자 위 배치인 경우 크기를 약간 작게 조정
  if (boxPlacementMode.value && selectedBox.value && object.category !== 'etc') {
    objectWidth *= 0.8
    objectHeight *= 0.8
  }

  // 카테고리별 색상 및 모양 설정
  let objectShape: any
  // GLB에서 추출한 색상이 있으면 사용, 없으면 카테고리 기본 색상 사용
  const isBox = object.isBox || false
  const objectColor = object.color || getObjectColor(object.category, isBox)
  const objectIcon = getObjectIcon(object.category, isBox)

  // 사각형으로 오브젝트 표현 (추후 이미지나 복잡한 도형으로 확장 가능)
  objectShape = new fabric.Rect({
    left: 0, // 그룹 내에서의 상대 위치
    top: 0,  // 그룹 내에서의 상대 위치
    width: objectWidth,
    height: objectHeight,
    fill: objectColor,
    stroke: '#333',
    strokeWidth: 2,
    angle: 0,
    originX: 'center',
    originY: 'center',
    shadow: boxPlacementMode.value && selectedBox.value && object.category !== 'etc'
      ? new fabric.Shadow({ color: 'rgba(0,0,0,0.3)', blur: 4, offsetX: 2, offsetY: 2 })
      : null
  })

  // 오브젝트 이름 레이블 추가
  const nameLabel = new fabric.Text(`${objectIcon} ${object.name}`, {
    left: 0, // 그룹 내에서의 상대 위치
    top: objectHeight / 2 + 10, // 오브젝트 아래쪽에 배치
    fontSize: boxPlacementMode.value && selectedBox.value && object.category !== 'etc' ? 8 : 10,
    fill: '#333',
    fontFamily: 'Arial',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    backgroundColor: 'rgba(255, 255, 255, 0.8)',
    padding: 2
  })

  // 고유 ID 생성 (배치된 오브젝트용)
  const placedObjectId = `placed-${object.id}-${Date.now()}`

  // 오브젝트와 레이블을 그룹으로 묶기
  const objectGroup = new fabric.Group([objectShape, nameLabel], {
    left: centerX,
    top: centerY,
    originX: 'center',
    originY: 'center',
    selectable: true,
    evented: true,
    hasControls: true,
    hasBorders: true,
    lockScalingX: true,
    lockScalingY: true,
    lockUniScaling: true,
    hasRotatingPoint: true,
    userData: {
      type: 'placed-object',
      placedObjectId: placedObjectId,
      objectId: object.id,
      objectName: object.name,
      category: object.category,
      glbUrl: object.glbUrl,
      description: object.description,
      width: object.width,
      height: object.height,
      isOnBox: boxPlacementMode.value && selectedBox.value && object.category !== 'etc',
      boxId: boxPlacementMode.value && selectedBox.value ? selectedBox.value.userData?.placedObjectId : null,
      depth: object.depth // 3D에서 사용할 깊이 정보 추가
    }
  })

  // 크기 조정 핸들만 숨기고 회전 핸들은 유지
  objectGroup.setControlsVisibility({
    tl: false, // top-left
    tr: false, // top-right
    br: false, // bottom-right
    bl: false, // bottom-left
    ml: false, // middle-left
    mt: false, // middle-top
    mr: false, // middle-right
    mb: false, // middle-bottom
    mtr: true  // rotation handle (middle-top-rotate)
  })

  fabricCanvas.add(objectGroup)
  fabricCanvas.renderAll()

  // Store에 배치된 오브젝트 정보 추가 (벽과 동일한 좌표계 사용)
  const placedObjectData = {
    id: placedObjectId,
    name: object.name,
    category: object.category,
    glbUrl: object.glbUrl,
    lodUrl: object.lodUrl, // LOD 모델 URL 추가
    description: object.description,
    width: object.width || 1,    // 가로 (2D X축)
    depth: object.depth || 1,    // 세로 (2D Y축)
    height: object.height || 2,  // 높이 (3D에서만 사용)
    position: {
      x: (centerX - (fabricCanvas.width || 800) / 2) / 40,  // 벽과 동일한 좌표 변환
      y: (centerY - (fabricCanvas.height || 600) / 2) / 40  // 벽과 동일한 좌표 변환
    },
    rotation: 0, // 초기 회전값
    color: object.color, // GLB에서 추출한 색상 (있다면)
    isOnBox: boxPlacementMode.value && selectedBox.value && object.category !== 'etc', // 상자 위 배치 여부
    boxId: boxPlacementMode.value && selectedBox.value ? selectedBox.value.userData?.placedObjectId : null, // 상자 ID
    isBox: object.isBox || false, // 상자 여부
    instancing: object.instancing || false // 인스턴싱 값 추가
  }

  floorplanStore.addPlacedObject(placedObjectData)

  // 🚀 핵심 개선: Store 기반 2D 재구성 (일관성 있는 렌더링)
  rerender2DObjectsFromStore()

  // 상자 위 배치 후 상자 모드 비활성화
  if (boxPlacementMode.value) {
    boxPlacementMode.value = false
    selectedBox.value = null
  }

  // 배치 완료 (알림 제거)
}

// 카테고리별 색상 반환
const getObjectColor = (category: string, isBox?: boolean): string => {
  const colorMap: { [key: string]: string } = {
    robot: '#FF6B6B',     // 빨간색 계열
    equipment: '#4ECDC4',  // 청록색 계열
    appliances: '#45B7D1', // 파란색 계열
    etc: isBox ? '#D2B48C' : '#96CEB4'  // 상자는 파스텔 브라운, 일반 ETC는 녹색
  }
  return colorMap[category] || '#CCCCCC'
}

// 카테고리별 아이콘 반환
const getObjectIcon = (category: string, isBox?: boolean): string => {
  const iconMap: { [key: string]: string } = {
    robot: '🤖',
    equipment: '⚙️',
    appliances: '🔌',
    etc: isBox ? '📦' : '📂'  // 상자는 📦, 일반 ETC는 📂
  }
  return iconMap[category] || '📦'
}

// 뷰 리셋 함수 (Default Zoom 40%, 화면 중앙 정렬)
const resetView = () => {
  if (!fabricCanvas) return

  // Default zoom과 pan 값으로 리셋
  zoom.value = 0.4
  pan.value = { x: 0, y: 0 }

  // 초기 뷰 설정 다시 적용
  setupInitialView()
}

const clearCanvas = () => {
  if (!fabricCanvas) return

  fabricCanvas.clear()

  // 확대/축소 및 이동 상태를 초기값으로 리셋
  zoom.value = 0.4  // Default Zoom 40%
  pan.value = { x: 0, y: 0 }
  isPanning.value = false

  addGrid()
  createDefaultFloor()  // 기본 바닥 다시 생성
  setupInitialView()    // 초기 뷰 설정
  selectedObject.value = null

  // Store 초기화
  floorplanStore.clearRoom()
  floorplanStore.clearPlacedObjects()
  floorplanStore.clearZones()
  floorplanStore.clearWalls()

  // 캔버스 크기 정보 업데이트
  const canvasWidth = fabricCanvas.width || 800
  const canvasHeight = fabricCanvas.height || 600
  floorplanStore.setCanvasSize({ width: canvasWidth, height: canvasHeight })
}

// Zone 변경사항 확인 팝업 닫기
const closeChangeConfirmDialog = () => {
  showChangeConfirmDialog.value = false
}

// Zone과 Wall 변경사항 확인 및 저장
const confirmAndSaveZones = async () => {
  try {
    // Zone과 Wall 동기화를 병렬로 실행
    const [zoneSuccess, wallSuccess] = await Promise.all([
      floorplanStore.syncZones(zoneChangeSummary.value),
      floorplanStore.syncWalls(wallChangeSummary.value)
    ])
    
    if (zoneSuccess && wallSuccess) {
      // 기존 데이터 초기화
      await clearCanvasData()
      
      // 성공 시 최신 데이터 다시 로드 (mount 시와 동일하게)
      await Promise.all([
        loadSavedZones(),
        loadSavedWalls()
      ])
      alert('✅ Zone과 Wall 변경사항이 성공적으로 저장되었습니다!')
    } else {
      alert('❌ 저장 중 오류가 발생했습니다.')
    }
  } catch (error) {
    console.error('저장 실패:', error)
    alert('❌ 저장 중 오류가 발생했습니다.')
  } finally {
    closeChangeConfirmDialog()
  }
}

// 캔버스의 Zone과 Wall 데이터 초기화 (기본 바닥과 그리드는 유지)
const clearCanvasData = async () => {
  if (!fabricCanvas) return
  
  try {
    console.log('🧹 캔버스 데이터 초기화 시작...')
    
    // Zone과 Wall 객체만 제거 (기본 바닥과 그리드는 유지)
    const objectsToRemove = fabricCanvas.getObjects().filter((obj: any) => {
      const type = obj.userData?.type
      return type === 'zone-floor' || 
             type === 'interior-wall' || 
             type === 'exterior-wall' ||
             type === 'placed-object'
    })
    
    // 객체들을 캔버스에서 제거
    objectsToRemove.forEach((obj: any) => {
      fabricCanvas.remove(obj)
    })
    
    console.log(`🧹 ${objectsToRemove.length}개의 객체를 캔버스에서 제거했습니다.`)
    
    // Store의 Zone과 Wall 데이터도 초기화
    floorplanStore.setZones([])
    floorplanStore.setWalls([])
    
    console.log('✅ 캔버스 데이터 초기화 완료')
    
  } catch (error) {
    console.error('❌ 캔버스 데이터 초기화 실패:', error)
  }
}

// 평면도 저장 (백엔드 API로 Zone 정보 전송)
const saveFloorPlan = async () => {
  if (!fabricCanvas) {
    alert('저장할 플로어플랜이 없습니다.')
    return
  }

  try {
    // 현재 캔버스에 그려진 Zone들 수집
    const zones = fabricCanvas.getObjects().filter((obj: any) => 
      obj.userData?.type === 'zone-floor'
    )

    if (zones.length === 0) {
      alert('저장할 Zone이 없습니다. Zone을 먼저 생성해주세요.')
      return
    }

    console.log('💾 저장할 Zone 개수:', zones.length)

    // Zone 정보를 백엔드 형식으로 변환
    const zonesToSave = zones.map((zone: any) => {
      const scale = 40 // 1m = 40px
      
      // 기본 회색 바닥의 위치를 찾기
      const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
        obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
      )
      
      if (!defaultFloor) {
        throw new Error('기본 바닥을 찾을 수 없습니다.')
      }
      
      // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 좌표 변환
      const baseX = defaultFloor.left
      const baseY = defaultFloor.top
      
      // Zone의 실제 위치를 미터 단위로 계산
      const zoneX = (zone.left - baseX) / scale
      const zoneY = (zone.top - baseY) / scale
      
      // 원본 크기 사용 (userData에 저장된 값 우선, 없으면 실시간 계산)
      let zoneWidth = zone.userData?.originalWidth
      let zoneHeight = zone.userData?.originalHeight
      
      // userData에 원본 크기가 없으면 실시간 계산
      if (zoneWidth === undefined || zoneHeight === undefined) {
        zoneWidth = (zone.width * zone.scaleX) / scale
        zoneHeight = (zone.height * zone.scaleY) / scale
      }
      
      return {
        id: zone.userData?.isSaved ? zone.userData?.zoneId : undefined, // 저장된 Zone만 ID 포함
        x: Math.round(zoneX * 100) / 100, // 소수점 2자리까지 (1cm 정밀도)
        y: Math.round(zoneY * 100) / 100,
        width: Math.round(zoneWidth * 100) / 100,
        height: Math.round(zoneHeight * 100) / 100,
        color: zone.fill || '#FFE082' // 기본 색상
      }
    })

    console.log('💾 변환된 Zone 데이터:', zonesToSave)
    
    // 디버깅: 각 Zone의 상세 정보 출력
    zonesToSave.forEach((zone: any, index: number) => {
      console.log(`🔍 Zone ${index + 1}:`, {
        id: zone.id,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        color: zone.color
      })
    })

    // 현재 캔버스에 그려진 Wall들 수집
    const walls = fabricCanvas.getObjects().filter((obj: any) => 
      obj.userData?.type === 'interior-wall' || obj.userData?.type === 'exterior-wall'
    )

    console.log('🧱 저장할 Wall 개수:', walls.length)

    // Wall 정보를 백엔드 형식으로 변환
    const wallsToSave = walls.map((wall: any) => {
      const scale = 40 // 1m = 40px
      
      // 기본 회색 바닥의 위치를 찾기
      const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
        obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
      )
      
      if (!defaultFloor) {
        throw new Error('기본 바닥을 찾을 수 없습니다.')
      }
      
      // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 Wall 위치 계산
      const baseX = defaultFloor.left
      const baseY = defaultFloor.top
      
      // Wall의 시작점과 끝점을 미터 단위로 계산
      // userData에 저장된 원본 좌표 사용 (이동/수정된 경우에도 정확한 값)
      const startX = wall.userData?.startX || (wall.x1 - baseX) / scale
      const startY = wall.userData?.startY || (wall.y1 - baseY) / scale
      const endX = wall.userData?.endX || (wall.x2 - baseX) / scale
      const endY = wall.userData?.endY || (wall.y2 - baseY) / scale
      
      return {
        id: wall.userData?.isSaved ? wall.userData?.id : undefined, // 저장된 Wall만 ID 포함
        startX: Math.round(startX * 100) / 100, // 소수점 2자리까지 (1cm 정밀도)
        startY: Math.round(startY * 100) / 100,
        endX: Math.round(endX * 100) / 100,
        endY: Math.round(endY * 100) / 100,


      }
    })

    console.log('🧱 변환된 Wall 데이터:', wallsToSave)
    
    // 디버깅: 각 Wall의 상세 정보 출력
    wallsToSave.forEach((wall: any, index: number) => {
      console.log(`🔍 Wall ${index + 1}:`, {
        id: wall.id,
        startX: wall.startX,
        startY: wall.startY,
        endX: wall.endX,
        endY: wall.endY
      })
    })

    // 백엔드에서 최신 Zone과 Wall 데이터 가져오기
    const [zonesResponse, wallsResponse] = await Promise.all([
      axios.get('http://localhost:8080/api/zones'),
      axios.get('http://localhost:8080/api/walls')
    ])
    
    const savedZones = zonesResponse.data
    const savedWalls = wallsResponse.data
    
    console.log('💾 백엔드에서 불러온 Zone 데이터:', savedZones)
    console.log('💾 백엔드에서 불러온 Wall 데이터:', savedWalls)
    
    // 디버깅: 백엔드 Zone 데이터 상세 정보 출력
    savedZones.forEach((zone: any, index: number) => {
      console.log(`💾 백엔드 Zone ${index + 1}:`, {
        id: zone.id,
        x: zone.x,
        y: zone.y,
        width: zone.width,
        height: zone.height,
        color: zone.color
      })
    })
    
    // 디버깅: 백엔드 Wall 데이터 상세 정보 출력
    savedWalls.forEach((wall: any, index: number) => {
      console.log(`💾 백엔드 Wall ${index + 1}:`, {
        id: wall.id,
        startX: wall.startX,
        startY: wall.startY,
        endX: wall.endX,
        endY: wall.endY
      })
    })

    // Store의 analyzeZoneChanges와 analyzeWallChanges 함수로 변경사항 분석
    const zoneChanges = floorplanStore.analyzeZoneChanges(zonesToSave, savedZones)
    const wallChanges = floorplanStore.analyzeWallChanges(wallsToSave, savedWalls)
    
    zoneChangeSummary.value = zoneChanges
    wallChangeSummary.value = wallChanges

    console.log('🔍 Zone 변경사항 분석 결과:', zoneChanges)
    console.log('🔍 Wall 변경사항 분석 결과:', wallChanges)

    // 변경사항이 있으면 팝업 표시
    const hasChanges = zoneChanges.toCreate.length > 0 || zoneChanges.toUpdate.length > 0 || zoneChanges.toDelete.length > 0 ||
                      wallChanges.toCreate.length > 0 || wallChanges.toUpdate.length > 0 || wallChanges.toDelete.length > 0
    
    if (hasChanges) {
      showChangeConfirmDialog.value = true
    } else {
      alert('✅ 변경사항이 없습니다.')
    }
    
  } catch (error: any) {
    console.error('❌ Zone 변경사항 분석 실패:', error)
    
    let errorMessage = '알 수 없는 오류'
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      errorMessage = `서버 오류 (${error.response.status}): ${error.response.data?.message || error.response.statusText}`
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없음
      errorMessage = '서버에 연결할 수 없습니다. 서버가 실행 중인지 확인해주세요.'
    } else {
      // 요청 설정 중 에러
      errorMessage = error.message || '요청 설정 오류'
    }
    
    alert(`Zone 변경사항 분석에 실패했습니다: ${errorMessage}`)
  }
}

// 저장된 Wall 정보 불러오기
const loadSavedWalls = async () => {
  if (!fabricCanvas) return

  try {
    console.log('🔄 저장된 Wall 정보 불러오기 시작...')
    
    // Store에서 로딩 상태 설정
    floorplanStore.setLoadingWalls(true)
    
    // 백엔드 API에서 저장된 Wall 정보 가져오기
    const response = await axios.get('http://localhost:8080/api/walls')
    
    const savedWalls = response.data
    console.log('✅ 불러온 Wall 정보:', savedWalls)

    if (savedWalls.length === 0) {
      console.log('📝 저장된 Wall이 없습니다.')
      floorplanStore.setWalls([])
      floorplanStore.setLoadingWalls(false)
      return
    }

    // Store에 Wall 데이터 저장
    floorplanStore.setWalls(savedWalls)

    // 각 Wall을 캔버스에 그리기
    savedWalls.forEach((wallData: any) => {
      createWallFromSavedData(wallData)
    })

    console.log(`✅ ${savedWalls.length}개의 Wall을 성공적으로 불러왔습니다.`)
    
  } catch (error: any) {
    console.error('❌ Wall 정보 불러오기 실패:', error)
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      if (error.response.status === 404) {
        console.log('📝 저장된 Wall이 없습니다.')
        floorplanStore.setWalls([])
      } else {
        console.error('서버 응답 에러:', error.response.status, error.response.data)
      }
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없음
      console.error('네트워크 에러: 서버에 연결할 수 없습니다.')
    } else {
      // 요청 설정 중 에러
      console.error('요청 설정 에러:', error.message)
    }
    
    // 에러가 발생해도 기본 기능은 계속 동작하도록 함
  } finally {
    // 로딩 상태 해제
    floorplanStore.setLoadingWalls(false)
  }
}

// 저장된 Zone 정보 불러오기
const loadSavedZones = async () => {
  if (!fabricCanvas) return

  try {
    console.log('🔄 저장된 Zone 정보 불러오기 시작...')
    
    // Store에서 로딩 상태 설정
    floorplanStore.setLoadingZones(true)
    
    // 백엔드 API에서 저장된 Zone 정보 가져오기
    const response = await axios.get('http://localhost:8080/api/zones')
    
    const savedZones = response.data
    console.log('✅ 불러온 Zone 정보:', savedZones)

    if (savedZones.length === 0) {
      console.log('📝 저장된 Zone이 없습니다.')
      floorplanStore.setZones([])
      floorplanStore.setLoadingZones(false)
      return
    }

    // Store에 Zone 데이터 저장
    floorplanStore.setZones(savedZones)

    // 각 Zone을 캔버스에 그리기
    savedZones.forEach((zoneData: any) => {
      createZoneFromSavedData(zoneData)
    })

    console.log(`✅ ${savedZones.length}개의 Zone을 성공적으로 불러왔습니다.`)
    
  } catch (error: any) {
    console.error('❌ Zone 정보 불러오기 실패:', error)
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      if (error.response.status === 404) {
        console.log('📝 저장된 Zone이 없습니다.')
        floorplanStore.setZones([])
      } else {
        console.error('서버 응답 에러:', error.response.status, error.response.data)
      }
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없음
      console.error('네트워크 에러: 서버에 연결할 수 없습니다.')
    } else {
      // 요청 설정 중 에러
      console.error('요청 설정 에러:', error.message)
    }
    
    // 에러가 발생해도 기본 기능은 계속 동작하도록 함
  } finally {
    // 로딩 상태 해제
    floorplanStore.setLoadingZones(false)
  }
}

// 저장된 데이터로부터 Wall 생성
const createWallFromSavedData = (wallData: any) => {
  if (!fabricCanvas) return

  const scale = 40 // 1m = 40px

  // 기본 회색 바닥의 위치를 찾기
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )

  if (!defaultFloor) {
    console.error('기본 바닥을 찾을 수 없습니다.')
    return
  }

  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 Wall 위치 계산
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  const startX = baseX + (wallData.startX * scale)
  const startY = baseY + (wallData.startY * scale)
  const endX = baseX + (wallData.endX * scale)
  const endY = baseY + (wallData.endY * scale)

  // Wall 생성
  const wall = new fabric.Line([startX, startY, endX, endY], {
    stroke: '#666666', // 기본 회색
    strokeWidth: 3,
    strokeLineCap: 'round',
    selectable: true,
    evented: true,
    opacity: 1.0,
    hoverCursor: 'move',
    moveCursor: 'move',
  })

  wall.userData = { 
    type: 'interior-wall', // 기본값으로 interior-wall 사용
    id: wallData.id, // 백엔드의 실제 ID 사용
    isSaved: true,
    startX: Math.round(wallData.startX * 100) / 100, // 1cm 정밀도로 반올림
    startY: Math.round(wallData.startY * 100) / 100,
    endX: Math.round(wallData.endX * 100) / 100,
    endY: Math.round(wallData.endY * 100) / 100
  }

  fabricCanvas.add(wall)

  // Wall 길이 라벨 추가
  addWallLengthLabel(wall, { x: startX, y: startY }, { x: endX, y: endY })

  // Store에 Wall 정보 추가 (기본적으로 interior wall로 처리)
  floorplanStore.addInteriorWall({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    id: wallData.id
  })

  // walls 배열에도 추가
  if (wallData.id) {
    floorplanStore.addWall({
      id: wallData.id,
      startX: Math.round(wallData.startX * 100) / 100, // 1cm 정밀도로 반올림
      startY: Math.round(wallData.startY * 100) / 100,
      endX: Math.round(wallData.endX * 100) / 100,
      endY: Math.round(wallData.endY * 100) / 100,


    })
  }

  fabricCanvas.renderAll()
}

// 저장된 데이터로부터 Zone 생성
const createZoneFromSavedData = (zoneData: any) => {
  if (!fabricCanvas) return

  const scale = 40 // 1m = 40px

  // 기본 회색 바닥의 위치를 찾기
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )

  if (!defaultFloor) {
    console.error('기본 바닥을 찾을 수 없습니다.')
    return
  }

  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 Zone 위치 계산
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  const zoneLeft = baseX + (zoneData.x * scale)
  const zoneTop = baseY + (zoneData.y * scale)
  const zoneWidthPx = zoneData.width * scale
  const zoneHeightPx = zoneData.height * scale

  // Zone 바닥 생성
  const zoneId = zoneData.id // 백엔드의 실제 ID 사용
  const zoneRect = new fabric.Rect({
    left: zoneLeft,
    top: zoneTop,
    width: zoneWidthPx,
    height: zoneHeightPx,
    fill: zoneData.color || '#FFE082',
    stroke: zoneData.color || '#FFE082',
    strokeWidth: 2,
    selectable: true,
    hasControls: true,
    lockRotation: true,
    evented: true
  })
  zoneRect.userData = { 
    type: 'zone-floor', 
    zoneId, // 백엔드 ID 직접 사용
    isZone: true, 
    isSaved: true,
    originalWidth: Math.round(zoneData.width * 100) / 100, // 원본 크기 저장
    originalHeight: Math.round(zoneData.height * 100) / 100 // 원본 크기 저장
  }
  fabricCanvas.add(zoneRect)

  // Zone을 기본 바닥보다 위에 표시하되, 다른 오브젝트보다는 아래에 배치
  const allObjects = fabricCanvas.getObjects()
  const floorObjects = allObjects.filter((obj: any) => obj.userData?.type === 'room-floor')
  const maxFloorIndex = floorObjects.length > 0 ?
    Math.max(...floorObjects.map((obj: any) => allObjects.indexOf(obj))) : -1

  if (maxFloorIndex >= 0) {
    fabricCanvas.moveTo(zoneRect, maxFloorIndex + 1)
  }

  // Zone 사이즈 라벨 추가
  addOrUpdateZoneSizeLabel(zoneRect)

  // Zone 이동/리사이즈 처리
  zoneRect.on('moving', () => handleZoneMoving(zoneRect))
  zoneRect.on('modified', () => handleZoneModified(zoneRect))
  zoneRect.on('selected', () => { selectedObject.value = zoneRect })
  zoneRect.on('deselected', () => { if (selectedObject.value === zoneRect) selectedObject.value = null })

  // Store에 Zone 정보 추가 (floors와 zones 모두에 추가)
  floorplanStore.addFloor({
    id: zoneData.id, // 백엔드 ID 직접 사용
    width: Math.round(zoneData.width * 100) / 100, // 1cm 정밀도로 반올림
    height: Math.round(zoneData.height * 100) / 100,
    boundsPx: { left: zoneLeft, top: zoneTop, right: zoneLeft + zoneWidthPx, bottom: zoneTop + zoneHeightPx },
    color: zoneData.color || '#FFE082',
    isZone: true,
    zonePosition: { 
      x: Math.round(zoneData.x * 100) / 100, // 1cm 정밀도로 반올림
      y: Math.round(zoneData.y * 100) / 100 
    }
  })

  // zones 배열에도 추가
  if (zoneData.id) {
    floorplanStore.addZone({
      id: zoneData.id,
      x: Math.round(zoneData.x * 100) / 100, // 1cm 정밀도로 반올림
      y: Math.round(zoneData.y * 100) / 100,
      width: Math.round(zoneData.width * 100) / 100,
      height: Math.round(zoneData.height * 100) / 100,
      color: zoneData.color || '#FFE082'
    })
  }

  fabricCanvas.renderAll()
}

// 평면도 내보내기
const exportFloorPlan = () => {
  if (!fabricCanvas) return

  const dataURL = fabricCanvas.toDataURL({
    format: 'png',
    quality: 1,
  })

  // 다운로드 링크 생성
  const link = document.createElement('a')
  link.download = `room_${roomWidth.value}x${roomHeight.value}m.png`
  link.href = dataURL
  link.click()
}

// 선택된 오브젝트 삭제 (멀티 선택 지원)
const deleteSelectedObject = () => {
  if (!fabricCanvas) {
    alert('삭제할 오브젝트를 먼저 선택해주세요.')
    return
  }

  // 멀티 선택된 객체들이 있으면 모두 삭제
  if (selectedObjects.value.length > 1) {
    console.log(`🗑️ ${selectedObjects.value.length}개 객체 멀티 삭제 시작`)
    
    // 선택된 모든 객체를 삭제
    selectedObjects.value.forEach(obj => {
      deleteSingleObject(obj)
    })
    
    // 선택 해제
    selectedObjects.value = []
    selectedObject.value = null
    fabricCanvas.discardActiveObject()
    
    // 강제 렌더링
    fabricCanvas.renderAll()
    fabricCanvas.requestRenderAll()
    
    return
  }

  // 단일 선택된 객체 삭제 (기존 로직)
  if (!selectedObject.value) {
    alert('삭제할 오브젝트를 먼저 선택해주세요.')
    return
  }

  deleteSingleObject(selectedObject.value)
  
  // 선택 해제
  selectedObject.value = null
  selectedObjects.value = []
  fabricCanvas.discardActiveObject()
}

// 객체 표시 이름 반환 함수
const getObjectDisplayName = (obj: any): string => {
  if (!obj || !obj.userData) return 'Unknown Object'
  
  const type = obj.userData.type
  switch (type) {
    case 'placed-object':
      return obj.userData.objectName || 'Object'
    case 'room-floor':
      return 'Room Floor'
    case 'zone-floor':
      return 'Zone Floor'
    case 'interior-wall':
      return 'Interior Wall'
    case 'exterior-wall':
      return 'Exterior Wall'
    default:
      return type || 'Unknown'
  }
}

// 단일 객체 삭제 함수
const deleteSingleObject = (objectToDelete: any) => {
  if (!fabricCanvas) return
  
  const objectId = objectToDelete.userData?.id
  const objectType = objectToDelete.userData?.type

  if (objectType === 'placed-object') {
    // 배치된 오브젝트 삭제 (그룹으로 묶여있으므로 레이블도 함께 삭제됨)
    const placedObjectId = objectToDelete.userData?.placedObjectId

    fabricCanvas.remove(objectToDelete)

    // Store에서도 제거
    if (placedObjectId) {
      // 상자가 삭제되는 경우 그 위의 장비들도 함께 삭제
      if (objectToDelete.userData?.category === 'etc' && objectToDelete.userData?.isBox) {
        const objectsOnBox = floorplanStore.placedObjects.filter(obj => obj.boxId === placedObjectId)

        objectsOnBox.forEach(obj => {
          // Fabric.js에서도 제거
          const fabricObjects = fabricCanvas.getObjects()
          const fabricObject = fabricObjects.find((fabricObj: any) =>
            fabricObj.userData?.placedObjectId === obj.id
          )
          if (fabricObject) {
            fabricCanvas.remove(fabricObject)
          }

          // Store에서 제거
          floorplanStore.removePlacedObject(obj.id)
        })
      }

      floorplanStore.removePlacedObject(placedObjectId)

      // 🚀 핵심 개선: Store 기반 2D 재구성 (3D와 동일한 방식)
      rerender2DObjectsFromStore()
    }

  } else if (objectType === 'interior-wall' || objectType === 'exterior-wall') {
    // 벽 삭제 (기존 로직)
    const associatedLabel = fabricCanvas.getObjects().find((obj: any) =>
      obj.userData?.type === 'wall-length-label' && obj.userData?.wallId === objectId
    )

    if (associatedLabel) {
      fabricCanvas.remove(associatedLabel)
    }

    fabricCanvas.remove(objectToDelete)

    const allObjects = fabricCanvas.getObjects()
    const wallsToRemove = allObjects.filter((obj: any) =>
      obj.userData?.id === objectId && (obj.userData?.type === 'interior-wall' || obj.userData?.type === 'exterior-wall')
    )

    wallsToRemove.forEach((wall: any) => {
      fabricCanvas.remove(wall)
    })

    // Store에서 벽 제거
    if (objectType === 'interior-wall') {
      if (objectId) {
        floorplanStore.removeInteriorWall(objectId)
      }
    } else if (objectType === 'exterior-wall') {
      if (objectId) {
        floorplanStore.removeExteriorWall(objectId)
      }
    }
  } else if (objectType === 'room-floor') {
    // 바닥 삭제: 같은 floorId의 라벨/사각형 모두 제거, 스토어 업데이트, 강제 리프레시 및 레이어 재정렬
    const floorId = objectToDelete.userData?.floorId
    if (floorId) {
      // 라벨 제거
      const sizeLabels = fabricCanvas.getObjects().filter((obj: any) => obj.userData?.type === 'room-size-label' && obj.userData?.floorId === floorId)
      sizeLabels.forEach((lbl: any) => fabricCanvas.remove(lbl))
      // 사각형(바닥) 중 동일 floorId가 남아있다면 모두 제거
      const sameFloorRects = fabricCanvas.getObjects().filter((obj: any) => obj.userData?.type === 'room-floor' && obj.userData?.floorId === floorId)
      sameFloorRects.forEach((rect: any) => fabricCanvas.remove(rect))
      // Store에서 제거
      floorplanStore.removeFloor(floorId)
    } else {
      // floorId가 없는 경우도 안전하게 제거
      fabricCanvas.remove(objectToDelete)
    }
    // 레이어 재정렬 및 강제 리렌더
    sendAllFloorsToBack()
    positionGridAfterFloors()
  } else if (objectType === 'zone-floor') {
    // Zone 삭제: 같은 zoneId의 라벨/사각형 모두 제거, 스토어 업데이트
    const zoneId = objectToDelete.userData?.zoneId
    if (zoneId) {
      // Zone 사이즈 라벨 제거
      const zoneLabels = fabricCanvas.getObjects().filter((obj: any) => obj.userData?.type === 'zone-size-label' && obj.userData?.zoneId === zoneId)
      zoneLabels.forEach((lbl: any) => fabricCanvas.remove(lbl))
      
      // Zone 사각형 제거
      const sameZoneRects = fabricCanvas.getObjects().filter((obj: any) => obj.userData?.type === 'zone-floor' && obj.userData?.zoneId === zoneId)
      sameZoneRects.forEach((rect: any) => fabricCanvas.remove(rect))
      
      // Store에서 Zone 제거
      floorplanStore.removeFloor(zoneId)
    } else {
      // zoneId가 없는 경우도 안전하게 제거
      fabricCanvas.remove(objectToDelete)
    }
    
    // 레이어 재정렬 및 강제 리렌더
    sendAllFloorsToBack()
    positionGridAfterFloors()
  }

  // 강제 캔버스 재렌더링
  try {
    fabricCanvas.renderAll()
    fabricCanvas.requestRenderAll()
  } catch (error) {
    console.error('❌ 캔버스 재렌더링 실패:', error)
  }

}

// 기존 resetView 함수 제거 (중복 방지)

// 윈도우 리사이즈 핸들링
const handleResize = () => {
  if (!fabricCanvas || !canvasWrapper.value) return

  const wrapper = canvasWrapper.value
  const width = wrapper.clientWidth
  const height = wrapper.clientHeight

  fabricCanvas.setDimensions({ width, height })

  // Store에 캔버스 크기 업데이트
  floorplanStore.setCanvasSize({ width, height })

  // 확대/축소 상태 유지하면서 그리드 업데이트
  updateCanvasTransform()
}

// Store 사용으로 데이터 요청 처리 함수들 제거
// 이제 3D에서 직접 store에 접근하므로 이벤트 기반 요청-응답 불필요
// const handleMake3DDataRequest = ... (제거됨)
// const collect2DData = ... (제거됨)

// 툴 변경 감지 및 벽 선택 가능 여부 업데이트
watch(currentTool, (newTool, oldTool) => {
  updateWallSelectability()

  // 커서 스타일 업데이트
  if (canvasWrapper.value) {
    if (newTool === 'wall') {
      canvasWrapper.value.classList.add('drawing-mode')
    } else {
      canvasWrapper.value.classList.remove('drawing-mode')
    }
  }
})

// Store의 배치된 오브젝트 색상 변경 감지
watch(
  () => floorplanStore.placedObjects,
  (newObjects, oldObjects) => {
    if (!fabricCanvas || !newObjects) return

    // 색상이 변경된 오브젝트들을 찾아서 2D 캔버스 업데이트
    newObjects.forEach(newObj => {
      const oldObj = oldObjects?.find(old => old.id === newObj.id)

      // 색상이 새로 추가되거나 변경된 경우
      if (newObj.color && (!oldObj || oldObj.color !== newObj.color)) {
        updateObjectColorOnCanvas(newObj.id, newObj.color)
      }
    })
  },
  { deep: true }
)

onMounted(async () => {
  await initCanvas()
  window.addEventListener('resize', handleResize)
  window.addEventListener('placeObject', handlePlaceObject)

  // 테마 변경 감지 및 그리드 업데이트
  const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
      if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
        // dark 클래스 변경 감지 시 그리드 업데이트
        if (fabricCanvas) {
          updateGrid()
        }
      }
    })
  })

  // document.documentElement의 class 변경 감지
  observer.observe(document.documentElement, {
    attributes: true,
    attributeFilter: ['class']
  })

  // 컴포넌트 언마운트 시 observer 정리
  onUnmounted(() => {
    observer.disconnect()
  })
})

onUnmounted(() => {
  if (fabricCanvas) {
    // 모든 키보드 이벤트 제거
    fabricCanvas.upperCanvasEl.removeEventListener('keydown', handleCanvasKeydown)
    fabricCanvas.upperCanvasEl.removeEventListener('click', focusCanvas)
    fabricCanvas.upperCanvasEl.removeEventListener('mousedown', focusCanvas)

    // Fabric.js 이벤트 리스너들 제거
    fabricCanvas.off('selection:created')
    fabricCanvas.off('selection:updated')
    fabricCanvas.off('selection:cleared')
    fabricCanvas.off('object:modified')
    fabricCanvas.off('object:moving')
    fabricCanvas.off('object:scaling')
    fabricCanvas.off('object:rotating')
    fabricCanvas.off('mouse:down')
    fabricCanvas.off('mouse:move')
    fabricCanvas.off('mouse:up')

    fabricCanvas.dispose()
  }

  if (canvasWrapper.value) {
    canvasWrapper.value.removeEventListener('keydown', handleCanvasKeydown)
    canvasWrapper.value.removeEventListener('click', focusCanvas)
  }

  document.removeEventListener('keydown', handleGlobalKeydown)
  window.removeEventListener('resize', handleResize)
  window.removeEventListener('placeObject', handlePlaceObject)
})
</script>

<style scoped>
.editor-2d-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  overflow: hidden;
}

.toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  background: white;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.1);
  gap: 2rem;
}

.color-swatches {
  display: flex;
  gap: 8px;
  align-items: center;
}

.swatch {
  width: 24px;
  height: 24px;
  border-radius: 4px;
  border: 1px solid #ccc;
  cursor: pointer;
}

.swatch.selected {
  outline: 2px solid #333;
}

.room-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.room-controls h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.zone-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.zone-controls h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
  font-weight: 600;
}

.size-inputs {
  display: flex;
  gap: 1rem;
  align-items: end;
}

.wall-tools {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wall-tools h4 {
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
}

.tool-buttons {
  display: flex;
  gap: 0.5rem;
}

.selection-info {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: #e8f5e8;
  border: 1px solid #c3e6c3;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #2d5a2d;
}

.multi-selection-info {
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  color: #856404;
}

.selected-objects-list {
  margin-top: 0.5rem;
  padding-left: 1rem;
}

.selected-object-item {
  display: block;
  margin: 0.25rem 0;
  color: #856404;
}



.tool-info {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: #e8f4fd;
  border: 1px solid #b3d9f7;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #1e4a72;
}

.debug-info {
  margin-top: 0.5rem;
  padding: 0.25rem 0.75rem;
  background-color: #fff3cd;
  border: 1px solid #ffeaa7;
  border-radius: 4px;
  font-size: 0.75rem;
  color: #856404;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.input-group label {
  font-size: 0.85rem;
  color: #666;
  font-weight: 500;
}

.input-group input {
  width: 80px;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
  text-align: center;
}

.input-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.tool-group {
  display: flex;
  gap: 0.5rem;
}

.btn.active {
  background: #3498db !important;
  color: white;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover:not(:disabled) {
  background: #c0392b;
}

.btn-danger:disabled {
  background: #bdc3c7;
  color: #7f8c8d;
}

.btn-success {
  background: #27ae60;
  color: white;
}

.btn-success:hover:not(:disabled) {
  background: #229954;
}

.canvas-wrapper {
  flex: 1;
  min-height: 0;
  background: var(--color-bg-level-2, #141516);
  overflow: hidden;
  position: relative;
}

.canvas-wrapper canvas {
  display: block;
  cursor: crosshair;
}

/* 확대/축소 및 이동 관련 스타일 */
.canvas-wrapper {
  cursor: grab;
}

.canvas-wrapper:active {
  cursor: grabbing;
}

/* 벽 그리기 모드일 때 커서 변경 */
.canvas-wrapper.drawing-mode {
  cursor: crosshair;
}

.statusbar {
  display: flex;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  background: white;
  border-top: 1px solid #ddd;
  font-size: 0.85rem;
  color: #666;
  flex-wrap: wrap;
  gap: 1rem;
}

.statusbar span {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* 버튼 비활성화 스타일 */
.btn:disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.btn:disabled:hover {
  background: #95a5a6;
}

/* 유효하지 않은 입력 스타일 */
.input-group input:invalid {
  border-color: #e74c3c;
}

/* 상자 모드 표시 스타일 */
.box-mode-indicator {
  background: #D2B48C;
  color: #8B4513;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  animation: pulse 2s infinite;
}

/* Zone 로딩 상태 표시 스타일 */
.loading-indicator {
  background: #3498db;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
  animation: pulse 1s infinite;
}

/* Zone 개수 표시 스타일 */
.zone-count-indicator {
  background: #27ae60;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}

/* Wall 개수 표시 스타일 */
.wall-count-indicator {
  background: #e74c3c;
  color: white;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  font-weight: bold;
}

/* Zone 변경사항 확인 팝업 스타일 */
.change-confirm-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 1000;
}

.change-confirm-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  max-width: 600px;
  width: 90%;
  max-height: 80vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #e0e0e0;
}

.dialog-header h3 {
  margin: 0;
  color: #2c3e50;
  font-size: 1.3rem;
}

.close-btn {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: #666;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  transition: background-color 0.2s;
}

.close-btn:hover {
  background-color: #f0f0f0;
}

.dialog-content {
  padding: 1.5rem;
}

.change-section {
  margin-bottom: 1.5rem;
}

.change-section h4 {
  margin: 0 0 0.75rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
  font-weight: 600;
}

.zone-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.zone-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #3498db;
}

.zone-info {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.zone-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #ddd;
}

/* Wall 관련 스타일 */
.wall-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wall-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border-left: 4px solid #e74c3c;
}

.wall-info {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.wall-color {
  width: 20px;
  height: 20px;
  border-radius: 4px;
  border: 2px solid #ddd;
}

.wall-id {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: block;
}

.zone-id {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 600;
  margin-bottom: 0.25rem;
  display: block;
}

.update-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
  flex: 1;
}

.no-changes {
  text-align: center;
  padding: 2rem;
  color: #27ae60;
  font-size: 1.1rem;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #e0e0e0;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

/* 벽 좌표 입력 스타일 */
.wall-coordinates {
  margin-top: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border: 1px solid #dee2e6;
  border-radius: 8px;
}

.wall-coordinates h5 {
  margin: 0 0 0.75rem 0;
  font-size: 0.9rem;
  color: #495057;
  font-weight: 600;
}

.coordinate-inputs {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.coordinate-group {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.coordinate-group label {
  font-size: 0.8rem;
  color: #6c757d;
  font-weight: 500;
}

.coordinate-pair {
  display: flex;
  gap: 0.5rem;
}

.coordinate-pair input {
  width: 70px;
  padding: 0.4rem;
  border: 1px solid #ced4da;
  border-radius: 4px;
  font-size: 0.85rem;
  text-align: center;
}

.coordinate-pair input:focus {
  outline: none;
  border-color: #80bdff;
  box-shadow: 0 0 0 0.2rem rgba(0, 123, 255, 0.25);
}

.coordinate-pair input::placeholder {
  color: #adb5bd;
  font-size: 0.8rem;
}

@keyframes pulse {
  0% {
    opacity: 1;
  }

  50% {
    opacity: 0.7;
  }

  100% {
    opacity: 1;
  }
}
</style>