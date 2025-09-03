<template>
  <div class="editor-2d-container">
    <!-- 존 생성 툴바 -->
    <div class="toolbar">
      <div class="left-tool-group">
        <div class="zone-controls">
          <h3>🏗️ Zone Creator</h3>
          <button @click="openZoneCreatorPopup" class="btn btn-primary zone-create-btn">
            ➕ ZONE
          </button>
        </div>

        <div class="wall-tools">
          <h4>🧱 Wall Tools</h4>
          <button @click="openWallCreatorPopup" class="btn btn-primary wall-create-btn">
            ➕ WALL
          </button>
        </div>

        <div class="box-tools">
          <h4>📦 Box Tools</h4>
          <button @click="openBoxCreatorPopup" class="btn btn-primary box-create-btn">
            ➕ Add Box
          </button>
        </div>
      </div>

      <!-- 선택된 객체 정보 -->
      <div v-if="selectedObject || selectedObjects.length > 0" class="selection-info">
        <!-- Selection count info -->
        <div class="multi-selection-info">
          <span class="selection-text">✅ {{ selectedObjects.length || 1 }} objects selected</span>
          <div class="selected-objects-summary">
            <span v-for="(count, type) in getObjectTypeCounts()" :key="type" class="type-count">
              {{ type }}: {{ count }}
            </span>
          </div>
        </div>
      </div>



      <!-- 우측 정렬된 도구 그룹 -->
      <div class="right-tool-group">
        <button @click="clearCanvas" class="btn btn-warning">
          🗑️ Clear
        </button>
        <button @click="deleteSelectedObject" :disabled="!selectedObject && selectedObjects.length === 0" class="btn btn-danger"
          title="Delete Selected Object(s)">
          🗑️ Objects Delete
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



    <!-- Zone 변경사항 확인 팝업 -->
    <div v-if="showChangeConfirmDialog" class="change-confirm-overlay">
      <div class="change-confirm-dialog">
        <div class="dialog-header">
          <h3>🏗️ Changes Confirmation</h3>
          <button @click="closeChangeConfirmDialog" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">
          <!-- Zone 변경사항 -->
          <div v-if="zoneChangeSummary.toCreate.length > 0" class="change-section">
            <h4>➕ Create Zones ({{ zoneChangeSummary.toCreate.length }})</h4>
            <div class="zone-list">
              <div v-for="(zone, index) in zoneChangeSummary.toCreate" :key="`create-${index}`" class="zone-item">
                <span class="zone-info">📍 ({{ zone.x.toFixed(2) }}m, {{ zone.y.toFixed(2) }}m) {{ zone.width.toFixed(2) }}m × {{ zone.height.toFixed(2) }}m</span>
                <span class="zone-color" :style="{ backgroundColor: zone.color }"></span>
              </div>
            </div>
          </div>

          <div v-if="zoneChangeSummary.toUpdate.length > 0" class="change-section">
            <h4>🔄 Update Zones ({{ zoneChangeSummary.toUpdate.length }})</h4>
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
            <h4>🗑️ Delete Zones ({{ zoneChangeSummary.toDelete.length }})</h4>
            <div class="zone-list">
              <div v-for="zone in zoneChangeSummary.toDelete" :key="`delete-${zone.id}`" class="zone-item">
                <span class="zone-info">📍 ({{ zone.x.toFixed(2) }}m, {{ zone.y.toFixed(2) }}m) {{ zone.width.toFixed(2) }}m × {{ zone.height.toFixed(2) }}m</span>
                <span class="zone-color" :style="{ backgroundColor: zone.color }"></span>
              </div>
            </div>
          </div>

          <!-- Wall 변경사항 -->
          <div v-if="wallChangeSummary.toCreate.length > 0" class="change-section">
            <h4>🧱 Create Walls ({{ wallChangeSummary.toCreate.length }})</h4>
            <div class="wall-list">
              <div v-for="(wall, index) in wallChangeSummary.toCreate" :key="`create-wall-${index}`" class="wall-item">
                <span class="wall-info">📍 ({{ wall.startX.toFixed(2) }}m, {{ wall.startY.toFixed(2) }}m) → ({{ wall.endX.toFixed(2) }}m, {{ wall.endY.toFixed(2) }}m) [{{ wall.type }}]</span>
              </div>
            </div>
          </div>

          <div v-if="wallChangeSummary.toUpdate.length > 0" class="change-section">
            <h4>🔄 Update Walls ({{ wallChangeSummary.toUpdate.length }})</h4>
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
            <h4>🗑️ Delete Walls ({{ wallChangeSummary.toDelete.length }})</h4>
            <div class="wall-list">
              <div v-for="wall in wallChangeSummary.toDelete" :key="`delete-wall-${wall.id}`" class="wall-item">
                <span class="wall-info">📍 ({{ wall.startX.toFixed(2) }}m, {{ wall.startY.toFixed(2) }}m) → ({{ wall.endX.toFixed(2) }}m, {{ wall.endY.toFixed(2) }}m) [{{ wall.type }}]</span>
              </div>
            </div>
          </div>

          <!-- Box 변경사항 -->
          <div v-if="boxChangeSummary.toCreate.length > 0" class="change-section">
            <h4>📦 Create Boxes ({{ boxChangeSummary.toCreate.length }})</h4>
            <div class="box-list">
              <div v-for="(box, index) in boxChangeSummary.toCreate" :key="`create-box-${index}`" class="box-item">
                <span class="box-info">📍 ({{ box.x.toFixed(2) }}m, {{ box.y.toFixed(2) }}m) {{ box.width.toFixed(2) }}m × {{ box.depth.toFixed(2) }}m × {{ box.height.toFixed(2) }}m</span>
                <span class="box-color" :style="{ backgroundColor: box.color }"></span>
              </div>
            </div>
          </div>

          <div v-if="boxChangeSummary.toUpdate.length > 0" class="change-section">
            <h4>🔄 Update Boxes ({{ boxChangeSummary.toUpdate.length }})</h4>
            <div class="box-list">
              <div v-for="update in boxChangeSummary.toUpdate" :key="`update-box-${update.id}`" class="box-item">
                <div class="update-details">
                  <span class="box-id">ID: {{ update.id }}</span>
                  <span class="box-info">📍 ({{ update.newData.x.toFixed(2) }}m, {{ update.newData.y.toFixed(2) }}m) {{ update.newData.width.toFixed(2) }}m × {{ update.newData.depth.toFixed(2) }}m × {{ update.newData.height.toFixed(2) }}m</span>
                  <span class="box-color" :style="{ backgroundColor: update.newData.color }"></span>
                </div>
              </div>
            </div>
          </div>

          <div v-if="boxChangeSummary.toDelete.length > 0" class="change-section">
            <h4>🗑️ Delete Boxes ({{ boxChangeSummary.toDelete.length }})</h4>
            <div class="box-list">
              <div v-for="box in boxChangeSummary.toDelete" :key="`delete-box-${box.id}`" class="box-item">
                <span class="box-info">📍 ({{ box.x.toFixed(2) }}m, {{ box.y.toFixed(2) }}m) {{ box.width.toFixed(2) }}m × {{ box.depth.toFixed(2) }}m × {{ box.height.toFixed(2) }}m</span>
                <span class="box-color" :style="{ backgroundColor: box.color }"></span>
              </div>
            </div>
          </div>

          <div v-if="zoneChangeSummary.toCreate.length === 0 && zoneChangeSummary.toUpdate.length === 0 && zoneChangeSummary.toDelete.length === 0 && 
                      wallChangeSummary.toCreate.length === 0 && wallChangeSummary.toUpdate.length === 0 && wallChangeSummary.toDelete.length === 0 &&
                      boxChangeSummary.toCreate.length === 0 && boxChangeSummary.toUpdate.length === 0 && boxChangeSummary.toDelete.length === 0" class="no-changes">
            <p>✅ No changes detected.</p>
          </div>
        </div>

        <div class="dialog-actions">
          <button @click="closeChangeConfirmDialog" class="btn btn-secondary">Cancel</button>
          <button @click="confirmAndSaveZones" class="btn btn-primary" :disabled="zoneChangeSummary.toCreate.length === 0 && zoneChangeSummary.toUpdate.length === 0 && zoneChangeSummary.toDelete.length === 0 && 
                                                                        wallChangeSummary.toCreate.length === 0 && wallChangeSummary.toUpdate.length === 0 && wallChangeSummary.toDelete.length === 0 &&
                                                                        boxChangeSummary.toCreate.length === 0 && boxChangeSummary.toUpdate.length === 0 && boxChangeSummary.toDelete.length === 0">
            💾 Save Changes
          </button>
        </div>
      </div>
    </div>

    <!-- 색상 선택 팝업 -->
    <div v-if="showColorPicker" class="color-picker-overlay" @click="closeColorPicker">
      <div class="color-picker-dialog" @click.stop>
        <div class="dialog-header">
          <h3>🎨 Advanced Color Picker</h3>
          <button @click="closeColorPicker" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">


          <!-- 고급 색상 선택기 -->
          <div class="advanced-color-section">
            <h4>고급 색상 선택</h4>
            
            <!-- 색상 휠 및 밝기/채도 조절 -->
            <div class="color-wheel-section">
              <div class="color-wheel-container">
                <canvas ref="colorWheelCanvas" class="color-wheel-canvas" @mousedown="startColorWheelDrag" @mousemove="updateColorFromWheel" @mouseup="stopColorWheelDrag"></canvas>
                <div class="color-wheel-cursor" :style="{ left: colorWheelCursor.x + 'px', top: colorWheelCursor.y + 'px' }"></div>
              </div>
              
              <!-- 밝기/채도 슬라이더 -->
              <div class="color-sliders">
                <div class="slider-group">
                  <label>채도 (S):</label>
                  <input 
                    v-model="colorSaturation" 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1" 
                    @input="updateColorFromSliders"
                    class="color-slider"
                  />
                  <span class="slider-value">{{ colorSaturation }}%</span>
                </div>
                <div class="slider-group">
                  <label>밝기 (V):</label>
                  <input 
                    v-model="colorValue" 
                    type="range" 
                    min="0" 
                    max="100" 
                    step="1" 
                    @input="updateColorFromSliders"
                    class="color-slider"
                  />
                  <span class="slider-value">{{ colorValue }}%</span>
                </div>
              </div>
            </div>

            <!-- 색상 입력 필드들 -->
            <div class="color-input-fields">
              <div class="input-row">
                <div class="input-group">
                  <label>HEX:</label>
                  <input 
                    v-model="customColorHex" 
                    type="text" 
                    placeholder="#FFE082" 
                    @input="updateColorFromHex"
                    @blur="validateAndUpdateColor"
                    class="color-input"
                    :class="{ 'invalid': !isValidHexColor }"
                  />
                </div>
                <div class="input-group">
                  <label>RGB:</label>
                  <div class="rgb-inputs">
                    <input v-model="colorRed" type="number" min="0" max="255" @input="updateColorFromRGB" class="rgb-input" />
                    <input v-model="colorGreen" type="number" min="0" max="255" @input="updateColorFromRGB" class="rgb-input" />
                    <input v-model="colorBlue" type="number" min="0" max="255" @input="updateColorFromRGB" class="rgb-input" />
                  </div>
                </div>
                <div class="input-group">
                  <label>HSL:</label>
                  <div class="hsl-inputs">
                    <input v-model="colorHue" type="number" min="0" max="360" @input="updateColorFromHSL" class="hsl-input" />
                    <input v-model="colorSaturation" type="number" min="0" max="100" @input="updateColorFromHSL" class="hsl-input" />
                    <input v-model="colorLightness" type="number" min="0" max="100" @input="updateColorFromHSL" class="hsl-input" />
                  </div>
                </div>
              </div>
              
              <!-- 투명도 조절 -->
              <div class="opacity-section">
                <label>투명도:</label>
                <div class="opacity-controls">
                  <input 
                    v-model="customColorOpacity" 
                    type="range" 
                    min="0.1" 
                    max="1.0" 
                    step="0.05" 
                    @input="updateCustomColor"
                    class="opacity-slider"
                  />
                  <span class="opacity-value">{{ Math.round(customColorOpacity * 100) }}%</span>
                </div>
              </div>
            </div>

            <!-- 실시간 색상 미리보기 -->
            <div class="color-preview-section">
              <label>미리보기:</label>
              <div class="color-preview-container">
                <div class="color-preview-box" :style="{ backgroundColor: customColorHex + Math.round(customColorOpacity * 255).toString(16).padStart(2, '0') }"></div>
                <div class="color-info">
                  <span class="color-hex-display">{{ customColorHex }}</span>
                  <span class="color-rgba-display">{{ getRGBAString() }}</span>
                </div>
              </div>
            </div>
          </div>

          <!-- 선택된 색상 정보 -->
          <div class="selected-color-info">
            <h4>선택된 색상</h4>
            <div class="selected-color-display">
              <div class="selected-color-preview" :style="{ backgroundColor: selectedFloorColor.hex }"></div>
              <div class="selected-color-details">
                <span class="color-name">{{ selectedFloorColor.label }}</span>
                <span class="color-hex">{{ selectedFloorColor.hex }}</span>
                <span class="color-rgba">{{ selectedFloorColor.rgba }}</span>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="closeColorPicker" class="btn btn-secondary">Cancel</button>
          <button @click="confirmColorSelection" class="btn btn-primary">Confirm</button>
        </div>
      </div>
    </div>

    <!-- Zone Creator 팝업 -->
    <div v-if="showZoneCreatorPopup" class="zone-creator-overlay">
      <div class="zone-creator-dialog" @click.stop>
        <div class="dialog-header">
          <h3>🏗️ Zone Creator</h3>
          <button @click="closeZoneCreatorPopup" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="zone-inputs">
            <div class="input-row">
              <div class="input-group">
                <label>X Position (m):</label>
                <input v-model.number="popupZoneX" type="number" min="0" max="100" step="0.01" placeholder="X position" />
              </div>
              <div class="input-group">
                <label>Y Position (m):</label>
                <input v-model.number="popupZoneY" type="number" min="0" max="70" step="0.01" placeholder="Y position" />
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>Width (m):</label>
                <input v-model.number="popupZoneWidth" type="number" min="0.01" max="100" step="0.01" placeholder="Width" />
              </div>
              <div class="input-group">
                <label>Height (m):</label>
                <input v-model.number="popupZoneHeight" type="number" min="0.01" max="70" step="0.01" placeholder="Height" />
              </div>
            </div>
            <div class="color-section">
              <AdvancedColorPicker v-model="popupSelectedColor" />
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="closeZoneCreatorPopup" class="btn btn-secondary">Cancel</button>
          <button @click="createZoneFromPopup" class="btn btn-primary" :disabled="!isValidPopupZoneSize">Confirm</button>
        </div>
      </div>
    </div>

    <!-- Wall Creator 팝업 -->
    <div v-if="showWallCreatorPopup" class="wall-creator-overlay">
      <div class="wall-creator-dialog" @click.stop>
        <div class="dialog-header">
          <h3>🧱 Create Wall</h3>
          <button @click="closeWallCreatorPopup" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="wall-inputs">
            <div class="input-row">
              <div class="input-group">
                <label>Start Point X (m):</label>
                <input v-model.number="popupWallStartX" type="number" min="0" max="100" step="0.01" placeholder="Start X" />
              </div>
              <div class="input-group">
                <label>Start Point Y (m):</label>
                <input v-model.number="popupWallStartY" type="number" min="0" max="70" step="0.01" placeholder="Start Y" />
              </div>
            </div>
            <div class="input-row">
              <div class="input-group">
                <label>End Point X (m):</label>
                <input v-model.number="popupWallEndX" type="number" min="0" max="100" step="0.01" placeholder="End X" />
              </div>
              <div class="input-group">
                <label>End Point Y (m):</label>
                <input v-model.number="popupWallEndY" type="number" min="0" max="70" step="0.01" placeholder="End Y" />
              </div>
            </div>
            <div class="checkbox-section">
              <div class="checkbox-group">
                <input 
                  v-model="popupWallIsGlass" 
                  type="checkbox" 
                  id="wallIsGlass" 
                  class="wall-checkbox"
                />
                <label for="wallIsGlass">Glass Wall</label>
                <small class="checkbox-description">(Default: False)</small>
              </div>
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="closeWallCreatorPopup" class="btn btn-secondary">Cancel</button>
          <button @click="createWallFromPopup" class="btn btn-primary" :disabled="!isValidPopupWallCoordinates">Create</button>
        </div>
      </div>
    </div>

    <!-- Box Creator 팝업 -->
    <div v-if="showBoxCreatorPopup" class="box-creator-overlay">
      <div class="box-creator-dialog" @click.stop>
        <div class="dialog-header">
          <h3>📦 Box Creator</h3>
          <button @click="closeBoxCreatorPopup" class="close-btn">×</button>
        </div>
        
        <div class="dialog-content">
          <div class="box-inputs">
            <!-- 위치 입력 (2열 배치) -->
            <div class="input-row">
              <div class="input-group">
                <label>X Position (m):</label>
                <input v-model.number="popupBoxX" type="number" min="0" max="100" step="0.1" placeholder="X coordinate" />
              </div>
              <div class="input-group">
                <label>Y Position (m):</label>
                <input v-model.number="popupBoxY" type="number" min="0" max="70" step="0.1" placeholder="Y coordinate" />
              </div>
            </div>
            
            <!-- 크기 입력 (3열 배치) -->
            <div class="input-row three-columns">
              <div class="input-group">
                <label>Width (m):</label>
                <input v-model.number="popupBoxWidth" type="number" min="0.1" max="50" step="0.1" placeholder="Width" />
              </div>
              <div class="input-group">
                <label>Height (m):</label>
                <input v-model.number="popupBoxHeight" type="number" min="0.1" max="20" step="0.1" placeholder="Height" />
              </div>
              <div class="input-group">
                <label>Depth (m):</label>
                <input v-model.number="popupBoxDepth" type="number" min="0.1" max="50" step="0.1" placeholder="Depth" />
              </div>
            </div>
            
            <!-- 색상 선택 섹션 -->
            <div class="color-section">
              <AdvancedColorPicker v-model="popupSelectedBoxColor" />
            </div>
          </div>
        </div>

        <div class="dialog-footer">
          <button @click="closeBoxCreatorPopup" class="btn btn-secondary">Cancel</button>
          <button @click="createBoxFromPopup" class="btn btn-primary" :disabled="!isValidPopupBoxCoordinates">Confirm</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch, nextTick } from 'vue'
import * as fabricLib from 'fabric'
import { useFloorplanStore } from '../stores/floorplanStore'
import { useObjectStore } from '../stores/objectStore'
import { useBoxStore } from '../stores/boxStore'
import { useZoneStore } from '../stores/zoneStore'
import axios from 'axios'
import AdvancedColorPicker from './AdvancedColorPicker.vue'

// 이벤트 emit 정의
const emit = defineEmits<{
  wallCreated: []
  wallUpdated: []
  wallDeleted: []
}>()

// Fabric.js v5 호환성을 위한 처리
const fabric = (fabricLib as any).fabric || fabricLib

// Pinia Store 사용
const floorplanStore = useFloorplanStore()
const objectStore = useObjectStore()
const boxStore = useBoxStore()
const zoneStore = useZoneStore()

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

// 색상 선택 팝업 관련 상태
const showColorPicker = ref(false)

// Zone Creator 팝업 관련 상태
const showZoneCreatorPopup = ref(false)
const popupZoneX = ref(0)      // 팝업 Zone X 위치 (m)
const popupZoneY = ref(0)      // 팝업 Zone Y 위치 (m)
const popupZoneWidth = ref(10) // 팝업 Zone 가로 크기 (m)
const popupZoneHeight = ref(10) // 팝업 Zone 세로 크기 (m)
const popupSelectedColor = ref<{ label: string; hex: string; rgba: string }>(floorColors.value[0]) // 기본 색상

// Wall Creator 팝업 관련 상태
const showWallCreatorPopup = ref(false)
const popupWallStartX = ref(0)  // 팝업 Wall 시작점 X (m)
const popupWallStartY = ref(0)  // 팝업 Wall 시작점 Y (m)
const popupWallEndX = ref(10)   // 팝업 Wall 끝점 X (m)
const popupWallEndY = ref(0)    // 팝업 Wall 끝점 Y (m)
const popupWallIsGlass = ref(false) // 팝업 Wall isGlass 옵션

// Box Creator 팝업 관련 상태
const showBoxCreatorPopup = ref(false)
const popupBoxX = ref(0)        // 팝업 Box X 위치 (m)
const popupBoxY = ref(0)        // 팝업 Box Y 위치 (m)
const popupBoxWidth = ref(1.0)  // 팝업 Box 가로 크기 (m)
const popupBoxHeight = ref(1.0) // 팝업 Box 높이 (m)
const popupBoxDepth = ref(1.0)  // 팝업 Box 깊이 (m)
const popupSelectedBoxColor = ref<{ label: string; hex: string; rgba: string }>(floorColors.value[0]) // 기본 색상

// 고급 색상 선택기 관련 상태
const colorWheelCanvas = ref<HTMLCanvasElement>()
const colorWheelCursor = ref({ x: 100, y: 100 })
const isDraggingColorWheel = ref(false)

// 색상 값들 (HSV 기반)
const colorHue = ref(45)        // 색조 (0-360)
const colorSaturation = ref(100) // 채도 (0-100)
const colorValue = ref(100)      // 밝기 (0-100)
const colorLightness = ref(50)   // 명도 (0-100)

// RGB 값들
const colorRed = ref(255)
const colorGreen = ref(224)
const colorBlue = ref(130)

// 커스텀 색상 관련 상태
const customColorHex = ref('#FFE082')
const customColorOpacity = ref(0.65)
const isValidHexColor = ref(true)
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

const boxChangeSummary = ref<{
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



// 프리셋 색상 선택 함수
const selectPresetColor = (color: { label: string; hex: string; rgba: string }) => {
  selectedFloorColor.value = color
  // 프리셋 색상 선택 시 커스텀 색상 입력 필드도 업데이트
  customColorHex.value = color.hex
  // rgba에서 opacity 추출 (rgba(r, g, b, a) 형태)
  const opacityMatch = color.rgba.match(/rgba\([^)]+,\s*([^)]+)\)/)
  if (opacityMatch) {
    customColorOpacity.value = parseFloat(opacityMatch[1])
  }
}

// 커스텀 색상 업데이트 함수
const updateCustomColor = () => {
  // HEX 색상 유효성 검사
  if (/^#[0-9A-Fa-f]{6}$/.test(customColorHex.value)) {
    isValidHexColor.value = true
    // 커스텀 색상을 selectedFloorColor로 설정
    selectedFloorColor.value = {
      label: 'Custom Color',
      hex: customColorHex.value,
      rgba: `rgba(${parseInt(customColorHex.value.slice(1, 3), 16)}, ${parseInt(customColorHex.value.slice(3, 5), 16)}, ${parseInt(customColorHex.value.slice(5, 7), 16)}, ${customColorOpacity.value})`
    }
  } else {
    isValidHexColor.value = false
  }
}

// 색상 유효성 검사 및 업데이트 함수
const validateAndUpdateColor = () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(customColorHex.value)) {
    isValidHexColor.value = true
    updateCustomColor()
  } else {
    isValidHexColor.value = false
    // 유효하지 않은 경우 기본값으로 복원
    customColorHex.value = selectedFloorColor.value.hex
  }
}

// 색상 선택 팝업 관련 함수들
const openColorPicker = () => {
  showColorPicker.value = true
  // 다음 프레임에서 색상 휠 그리기 및 현재 색상으로 초기화
  nextTick(() => {
    drawColorWheel()
    initializeColorValues()
  })
}

// 색상 선택기를 열 때 현재 선택된 색상으로 초기화
const initializeColorValues = () => {
  if (selectedFloorColor.value) {
    // HEX를 RGB로 변환
    const hex = selectedFloorColor.value.hex.slice(1)
    colorRed.value = parseInt(hex.slice(0, 2), 16)
    colorGreen.value = parseInt(hex.slice(2, 4), 16)
    colorBlue.value = parseInt(hex.slice(4, 6), 16)
    
    // RGB를 HSV로 변환
    updateColorFromRGB()
    
    // 커서 위치 업데이트 (색상 휠에서)
    updateColorWheelCursor()
  }
}

// 색상 휠 커서 위치 업데이트
const updateColorWheelCursor = () => {
  if (!colorWheelCanvas.value) return
  
  const canvas = colorWheelCanvas.value
  const size = canvas.width
  const centerX = size / 2
  const centerY = size / 2
  const radius = Math.min(centerX, centerY) - 10
  
  // HSV 값으로부터 커서 위치 계산
  const angle = (colorHue.value * Math.PI) / 180
  const distance = (colorSaturation.value / 100) * radius
  
  const x = centerX + distance * Math.cos(angle)
  const y = centerY + distance * Math.sin(angle)
  
  colorWheelCursor.value = { x, y }
}

const closeColorPicker = () => {
  showColorPicker.value = false
}

// Zone Creator 팝업 관련 함수들
const openZoneCreatorPopup = () => {
  showZoneCreatorPopup.value = true
  // 팝업 열 때 기본값으로 초기화
  popupZoneX.value = 0
  popupZoneY.value = 0
  popupZoneWidth.value = 10
  popupZoneHeight.value = 10
  popupSelectedColor.value = selectedFloorColor.value
}



const closeZoneCreatorPopup = () => {
  showZoneCreatorPopup.value = false
}

// 팝업 Zone 크기 유효성 검사
const isValidPopupZoneSize = computed(() => {
  return popupZoneX.value >= 0 && popupZoneY.value >= 0 &&
    popupZoneWidth.value > 0 && popupZoneHeight.value > 0 &&
    (popupZoneX.value + popupZoneWidth.value) <= GRID_WIDTH &&
    (popupZoneY.value + popupZoneHeight.value) <= GRID_HEIGHT
})

// 팝업에서 Zone 생성
const createZoneFromPopup = () => {
  if (!isValidPopupZoneSize.value) return
  
  // 기존 Zone 변수들에 팝업 값들을 복사
  zoneX.value = popupZoneX.value
  zoneY.value = popupZoneY.value
  zoneWidth.value = popupZoneWidth.value
  zoneHeight.value = popupZoneHeight.value
  selectedFloorColor.value = popupSelectedColor.value
  
  // Zone 생성
  createZone()
  
  // 팝업 닫기
  closeZoneCreatorPopup()
}

// Wall Creator 팝업 관련 함수들
const openWallCreatorPopup = () => {
  showWallCreatorPopup.value = true
  // 팝업 열 때 기본값으로 초기화
  popupWallStartX.value = 0
  popupWallStartY.value = 0
  popupWallEndX.value = 10
  popupWallEndY.value = 0
  popupWallIsGlass.value = false
}

const closeWallCreatorPopup = () => {
  showWallCreatorPopup.value = false
}

// Box Creator 팝업 관련 함수들
const openBoxCreatorPopup = () => {
  showBoxCreatorPopup.value = true
  // 팝업 열 때 기본값으로 초기화
  popupBoxX.value = 0
  popupBoxY.value = 0
  popupBoxWidth.value = 1.0
  popupBoxHeight.value = 1.0
  popupBoxDepth.value = 1.0
  // 기본 색상 설정
  popupSelectedBoxColor.value = floorColors.value[0]
}

const closeBoxCreatorPopup = () => {
  showBoxCreatorPopup.value = false
}

// 팝업 Box 좌표 유효성 검사
const isValidPopupBoxCoordinates = computed(() => {
  return popupBoxX.value >= 0 && popupBoxY.value >= 0 &&
    popupBoxWidth.value > 0 && popupBoxHeight.value > 0 && popupBoxDepth.value > 0 &&
    popupBoxX.value + popupBoxWidth.value <= GRID_WIDTH && 
    popupBoxY.value + popupBoxDepth.value <= GRID_HEIGHT
})

// 팝업에서 Box 생성
const createBoxFromPopup = () => {
  if (!isValidPopupBoxCoordinates.value) return
  
  // Box 생성
  createBoxFromCoordinates()
  
  // 팝업 닫기
  closeBoxCreatorPopup()
}



// 팝업 Wall 좌표 유효성 검사
const isValidPopupWallCoordinates = computed(() => {
  return popupWallStartX.value >= 0 && popupWallStartY.value >= 0 &&
    popupWallEndX.value >= 0 && popupWallEndY.value >= 0 &&
    popupWallStartX.value <= GRID_WIDTH && popupWallStartY.value <= GRID_HEIGHT &&
    popupWallEndX.value <= GRID_WIDTH && popupWallEndY.value <= GRID_HEIGHT &&
    (popupWallStartX.value !== popupWallEndX.value || popupWallStartY.value !== popupWallEndY.value) // 시작점과 끝점이 다르야 함
})

// 팝업에서 Wall 생성
const createWallFromPopup = () => {
  if (!isValidPopupWallCoordinates.value) return
  
  // 기존 Wall 변수들에 팝업 값들을 복사
  wallStartX.value = popupWallStartX.value
  wallStartY.value = popupWallStartY.value
  wallEndX.value = popupWallEndX.value
  wallEndY.value = popupWallEndY.value
  
  // Wall 생성 (isClass 옵션 포함)
  createWallFromCoordinatesWithClass()
  
  // 팝업 닫기
  closeWallCreatorPopup()
}

// 색상 휠 그리기 함수
const drawColorWheel = () => {
  if (!colorWheelCanvas.value) return
  
  const canvas = colorWheelCanvas.value
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  
  const size = 200
  canvas.width = size
  canvas.height = size
  
  const centerX = size / 2
  const centerY = size / 2
  const radius = Math.min(centerX, centerY) - 10
  
  // 색상 휠 그리기
  for (let angle = 0; angle < 360; angle += 1) {
    const hue = angle
    for (let saturation = 0; saturation <= radius; saturation += 1) {
      const x = centerX + (saturation * Math.cos(angle * Math.PI / 180))
      const y = centerY + (saturation * Math.sin(angle * Math.PI / 180))
      
      if (x >= 0 && x < size && y >= 0 && y < size) {
        const rgb = hsvToRgb(hue, (saturation / radius) * 100, 100)
        ctx.fillStyle = `rgb(${rgb.r}, ${rgb.g}, ${rgb.b})`
        ctx.fillRect(x, y, 1, 1)
      }
    }
  }
}

// HSV를 RGB로 변환하는 헬퍼 함수
const hsvToRgb = (h: number, s: number, v: number) => {
  const c = (v / 100) * (s / 100)
  const x = c * (1 - Math.abs((h / 60) % 2 - 1))
  const m = (v / 100) - c
  
  let r, g, b
  if (h < 60) {
    r = c; g = x; b = 0
  } else if (h < 120) {
    r = x; g = c; b = 0
  } else if (h < 180) {
    r = 0; g = c; b = x
  } else if (h < 240) {
    r = 0; g = x; b = c
  } else if (h < 300) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  
  return {
    r: Math.round((r + m) * 255),
    g: Math.round((g + m) * 255),
    b: Math.round((b + m) * 255)
  }
}

const confirmColorSelection = () => {
  // 선택된 색상으로 Zone 생성 준비 완료
  // Zone Creator 팝업이 열려있다면 팝업의 색상도 업데이트
  if (showZoneCreatorPopup.value) {
    popupSelectedColor.value = selectedFloorColor.value
  }
  closeColorPicker()
}

// 색상 휠 관련 함수들
const startColorWheelDrag = (event: MouseEvent) => {
  isDraggingColorWheel.value = true
  updateColorFromWheel(event)
}

const updateColorFromWheel = (event: MouseEvent) => {
  if (!isDraggingColorWheel.value || !colorWheelCanvas.value) return
  
  const rect = colorWheelCanvas.value.getBoundingClientRect()
  const x = event.clientX - rect.left
  const y = event.clientY - rect.top
  
  // 색상 휠 중앙 기준으로 좌표 계산
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const deltaX = x - centerX
  const deltaY = y - centerY
  
  // 색조(Hue) 계산 (각도)
  const angle = Math.atan2(deltaY, deltaX) * 180 / Math.PI
  colorHue.value = (angle + 360) % 360
  
  // 채도(Saturation) 계산 (거리)
  const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
  const maxDistance = Math.min(centerX, centerY)
  colorSaturation.value = Math.min(100, Math.max(0, (distance / maxDistance) * 100))
  
  // 커서 위치 업데이트
  colorWheelCursor.value = { x, y }
  
  // 색상 업데이트 - 모든 입력 필드 동기화
  updateColorFromHSV()
  updateSelectedFloorColor()
}

const stopColorWheelDrag = () => {
  isDraggingColorWheel.value = false
}

// 색상 변환 함수들
const updateColorFromSliders = () => {
  updateColorFromHSV()
  updateSelectedFloorColor()
}

// 선택된 색상을 업데이트하는 함수
const updateSelectedFloorColor = () => {
  // 현재 색상 값들을 HEX로 변환
  const hex = rgbToHex(colorRed.value, colorGreen.value, colorBlue.value)
  customColorHex.value = hex
  
  // selectedFloorColor 업데이트
  selectedFloorColor.value = {
    label: `Custom Color (${hex})`,
    hex: hex,
    rgba: getRGBAString()
  }
  
  // Zone Creator 팝업이 열려있다면 팝업의 색상도 실시간으로 업데이트
  if (showZoneCreatorPopup.value) {
    popupSelectedColor.value = selectedFloorColor.value
  }
}

// RGB를 HEX로 변환하는 헬퍼 함수
const rgbToHex = (r: number, g: number, b: number) => {
  return '#' + [r, g, b].map(x => {
    const hex = x.toString(16)
    return hex.length === 1 ? '0' + hex : hex
  }).join('')
}

const updateColorFromHex = () => {
  if (/^#[0-9A-Fa-f]{6}$/.test(customColorHex.value)) {
    isValidHexColor.value = true
    // HEX를 RGB로 변환
    const hex = customColorHex.value.slice(1)
    colorRed.value = parseInt(hex.slice(0, 2), 16)
    colorGreen.value = parseInt(hex.slice(2, 4), 16)
    colorBlue.value = parseInt(hex.slice(4, 6), 16)
    
    // RGB를 HSV로 변환
    updateColorFromRGB()
    // selectedFloorColor 업데이트
    updateSelectedFloorColor()
  } else {
    isValidHexColor.value = false
  }
}

const updateColorFromRGB = () => {
  // RGB를 HSV로 변환
  const r = colorRed.value / 255
  const g = colorGreen.value / 255
  const b = colorBlue.value / 255
  
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  
  // 색조 계산
  if (delta === 0) {
    colorHue.value = 0
  } else if (max === r) {
    colorHue.value = ((g - b) / delta) % 6 * 60
  } else if (max === g) {
    colorHue.value = ((b - r) / delta + 2) * 60
  } else {
    colorHue.value = ((r - g) / delta + 4) * 60
  }
  
  // 채도 계산
  colorSaturation.value = max === 0 ? 0 : (delta / max) * 100
  
  // 밝기 계산
  colorValue.value = max * 100
  
  // HEX 업데이트
  updateCustomColor()
}

const updateColorFromHSL = () => {
  // HSL을 RGB로 변환
  const h = colorHue.value / 360
  const s = colorSaturation.value / 100
  const l = colorLightness.value / 100
  
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = l - c / 2
  
  let r, g, b
  if (h < 1/6) {
    r = c; g = x; b = 0
  } else if (h < 2/6) {
    r = x; g = c; b = 0
  } else if (h < 3/6) {
    r = 0; g = c; b = x
  } else if (h < 4/6) {
    r = 0; g = x; b = c
  } else if (h < 5/6) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  
  colorRed.value = Math.round((r + m) * 255)
  colorGreen.value = Math.round((g + m) * 255)
  colorBlue.value = Math.round((b + m) * 255)
  
  // HEX 업데이트
  updateCustomColor()
}

const updateColorFromHSV = () => {
  // HSV를 RGB로 변환
  const h = colorHue.value / 360
  const s = colorSaturation.value / 100
  const v = colorValue.value / 100
  
  const c = v * s
  const x = c * (1 - Math.abs((h * 6) % 2 - 1))
  const m = v - c
  
  let r, g, b
  if (h < 1/6) {
    r = c; g = x; b = 0
  } else if (h < 2/6) {
    r = x; g = c; b = 0
  } else if (h < 3/6) {
    r = 0; g = c; b = x
  } else if (h < 4/6) {
    r = 0; g = x; b = c
  } else if (h < 5/6) {
    r = x; g = 0; b = c
  } else {
    r = c; g = 0; b = x
  }
  
  colorRed.value = Math.round((r + m) * 255)
  colorGreen.value = Math.round((g + m) * 255)
  colorBlue.value = Math.round((b + m) * 255)
  
  // HEX 업데이트
  updateCustomColor()
}

// RGBA 문자열 생성
const getRGBAString = () => {
  return `rgba(${colorRed.value}, ${colorGreen.value}, ${colorBlue.value}, ${customColorOpacity.value})`
}



// 툴 설정 함수 (툴 전환 시 추가 처리)
const setTool = (tool: string) => {
  const previousTool = currentTool.value
  currentTool.value = tool
  
  
  
  // 벽 그리기 모드에서 다른 모드로 전환 시 zoom/pan 기능 재활성화
  if (previousTool === 'wall' && tool !== 'wall') {

    if (fabricCanvas) {
      // 캔버스 선택 기능 활성화
      fabricCanvas.selection = true
      
      // 강제로 zoom/pan 이벤트 재활성화 확인
      
      
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
    if (obj.userData?.type === 'wall') {
      obj.selectable = isSelectMode
      obj.evented = isSelectMode
      
      // 벽 타입에 따라 색상 설정
      if (obj.userData?.isGlass) {
        // 유리벽: 파란색
        obj.stroke = '#4682B4'
      } else {
        // 일반벽: 갈색
        obj.stroke = '#8A7B78'
      }
    }
  })
  
  fabricCanvas.renderAll()
  
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
}

// 그리드를 모든 바닥 바로 위로 이동
const positionGridAfterFloors = () => {
  if (!fabricCanvas) return
  const grid = fabricCanvas.getObjects().find((obj: any) => obj.type === 'group' && obj.getObjects?.().some((line: any) => line.type === 'line'))
  if (!grid) return
  const objs = fabricCanvas.getObjects()

  // 모든 바닥 타입의 인덱스 찾기 (base-floor, zone-floor)
  const floorIndices = (objs
    .map((o: any, idx: number) => ({ o, idx })) as Array<{ o: any; idx: number }>)
    .filter((x: { o: any; idx: number }) =>
      x.o.userData?.type === 'base-floor' ||
      x.o.userData?.type === 'zone-floor'
    )
    .map((x: { o: any; idx: number }) => x.idx)

  const maxFloorIndex = floorIndices.length ? Math.max(...floorIndices) : -1
  if (maxFloorIndex >= 0) {
    fabricCanvas.moveTo(grid, maxFloorIndex + 1)
  } else {
    fabricCanvas.moveTo(grid, 0)
  }
  // 오브젝트는 항상 바닥/그리드 보다 앞쪽 (유지): 바닥/그리드 외의 요소를 앞으로
  const others = objs.filter((o: any) => !(o === grid))
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
    
    // Zone 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'zone-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }
    
    // Box 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'custom-box') {
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

    if (singleSelected && singleSelected.userData?.type === 'wall') {
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
    
    // Zone 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'zone-floor') {
      selectedObject.value = singleSelected
      selectedObjects.value = [singleSelected]
      return
    }
    
    // Box 선택 허용
    if (singleSelected && singleSelected.userData?.type === 'custom-box') {
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

    if (singleSelected && singleSelected.userData?.type === 'wall') {
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
    if (modifiedObject && modifiedObject.userData?.type === 'wall') {
      const wallType = modifiedObject.userData?.isGlass ? '유리 벽' : '벽'
      updateWallInList(modifiedObject)
    } else if (modifiedObject && modifiedObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(modifiedObject)
    } else if (modifiedObject && modifiedObject.userData?.type === 'zone-floor') {
      handleZoneModified(modifiedObject)
    } else if (modifiedObject && modifiedObject.userData?.type === 'custom-box') {
      // Box가 수정될 때 크기 라벨 업데이트 및 Store 업데이트
      updateBoxSizeLabel(modifiedObject)
      updateBoxInStore(modifiedObject)
    }
  })

  fabricCanvas.on('object:moving', (e: any) => {
    const movingObject = e.target
    if (movingObject && movingObject.userData?.type === 'wall') {
      const wallType = movingObject.userData?.isGlass ? '유리 벽' : '벽'
      updateWallInList(movingObject)
    } else if (movingObject && movingObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(movingObject)
    } else if (movingObject && movingObject.userData?.type === 'zone-floor') {
      handleZoneMoving(movingObject)
    } else if (movingObject && movingObject.userData?.type === 'custom-box') {
      // Box가 이동할 때 크기 라벨 업데이트 및 Store 업데이트
      updateBoxSizeLabel(movingObject)
      updateBoxInStore(movingObject)
    }
  })

  fabricCanvas.on('object:scaling', (e: any) => {
    const scalingObject = e.target
    if (scalingObject && scalingObject.userData?.type === 'wall') {
      const wallType = scalingObject.userData?.isGlass ? '유리 벽' : '벽'
      updateWallInList(scalingObject)
    } else if (scalingObject && scalingObject.userData?.type === 'custom-box') {
      // Box가 크기가 조정될 때 크기 라벨 업데이트 및 Store 업데이트
      updateBoxSizeLabel(scalingObject)
      updateBoxInStore(scalingObject)
    }
  })

  fabricCanvas.on('object:rotating', (e: any) => {
    const rotatingObject = e.target
    if (rotatingObject && rotatingObject.userData?.type === 'wall') {
      const wallType = rotatingObject.userData?.isGlass ? '유리 벽' : '벽'
      updateWallInList(rotatingObject)
    } else if (rotatingObject && rotatingObject.userData?.type === 'placed-object') {
      updatePlacedObjectInStore(rotatingObject)
    } else if (rotatingObject && rotatingObject.userData?.type === 'custom-box') {
      // Box가 회전할 때 크기 라벨 업데이트 및 Store 업데이트
      updateBoxSizeLabel(rotatingObject)
      updateBoxInStore(rotatingObject)
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
      stroke: '#D2B48C',
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
      addWall(startPoint, pointer)
      
      // 벽 그리기 완료 후 자동으로 Select 모드로 전환
  
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

// Store를 사용한 벽 정보 업데이트 (유리벽/일반벽 모두 처리)
const updateWallInList = (modifiedWall: any) => {

  const wallId = modifiedWall.userData?.id
  const wallType = modifiedWall.userData?.type

  if (!wallId) {
    return
  }

  let startPoint, endPoint

  // 벽 타입에 따라 좌표 계산 방법 분기 (유리벽과 일반벽 모두 Line 객체로 통일)
  if (modifiedWall.userData?.type === 'wall') {
    // 유리벽과 일반벽 모두 Line 객체로 동일하게 처리
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
    id: wallId,
    isGlass: modifiedWall.userData?.isGlass || false
  }

  // Store에서 벽 정보 업데이트 (통합된 함수 사용)
  floorplanStore.updateWall(wallId, updatedWall)

  // 벽 업데이트 이벤트 emit
  emit('wallUpdated')

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
  addWall({ x: startX, y: startY }, { x: endX, y: endY })
  
  // 벽 그리기 완료 후 자동으로 Select 모드로 전환
  
  setTool('select')
  
  // 입력 필드 초기화 (소수점 2자리 제한)
  wallStartX.value = 0.00
  wallStartY.value = 0.00
  wallEndX.value = 10.00
  wallEndY.value = 0.00
}

// 팝업에서 Wall 생성 (isClass 옵션 포함)
const createWallFromCoordinatesWithClass = () => {
  if (!fabricCanvas) return
  
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
  
  // 벽 그리기 (isGlass 옵션 포함)
  addWall({ x: startX, y: startY }, { x: endX, y: endY }, popupWallIsGlass.value)
  
  // 벽 그리기 완료 후 자동으로 Select 모드로 전환
  setTool('select')
}

// Box 생성 함수
const createBoxFromCoordinates = () => {
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
  
  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 좌표 변환
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  
  // 미터 단위를 픽셀 단위로 변환
  const boxX = baseX + (popupBoxX.value * scale)
  const boxY = baseY + (popupBoxY.value * scale)
  

  const boxWidth = popupBoxWidth.value * scale
  const boxHeight = popupBoxHeight.value * scale
  const boxDepth = popupBoxDepth.value * scale
  
  // Box 생성 (직사각형으로 표현)
  const box = new fabric.Rect({
    left: boxX,
    top: boxY,
    width: boxWidth,
    height: popupBoxHeight.value * scale, // 높이를 2D에서 표시
    fill: popupSelectedBoxColor.value.hex, // 선택된 색상 사용
    stroke: '#F57F17',
    strokeWidth: 2,
    selectable: true,
    evented: true,
    opacity: 0.8,
    hoverCursor: 'move',
    moveCursor: 'move'
  })
  
  // Box 식별 정보 추가
  const boxId = Date.now() + Math.random()
  const boxIdString = boxId.toString()
  box.userData = {
    type: 'custom-box',
    id: boxIdString, // 문자열로 저장하여 Store와 일치시킴
    x: popupBoxX.value,
    y: popupBoxY.value,
    width: popupBoxWidth.value,
    height: popupBoxHeight.value,
    depth: popupBoxDepth.value,
    isSaved: false
  }
  
  fabricCanvas.add(box)
  
  // Box 크기 라벨 추가
  addBoxSizeLabel(box, popupBoxWidth.value, popupBoxHeight.value)
  
  // Store에 Box를 별도로 저장 (Zone/Wall과 동일한 방식)
  const boxData = {
    id: boxIdString, // boxIdString 사용으로 일관성 유지
    x: popupBoxX.value, // 미터 단위 원본 값
    y: popupBoxY.value,
    width: popupBoxWidth.value,
    depth: popupBoxDepth.value,
    height: popupBoxHeight.value,
    color: popupSelectedBoxColor.value.hex
  }
  
  boxStore.addBox(boxData)
  
  // 3D에서 보이도록 placedObject에도 저장 (기존 방식 유지)
  const placedObjectData = {
    id: boxIdString, // boxIdString 사용으로 일관성 유지
    name: `Box_${boxIdString}`,
    category: 'etc',
    width: popupBoxWidth.value,
    depth: popupBoxDepth.value,
    height: popupBoxHeight.value,
    position: {
      x: popupBoxX.value,
      y: popupBoxY.value
    },
    boundsPx: {
      left: boxX,
      top: boxY,
      right: boxX + boxWidth,
      bottom: boxY + boxHeight
    },
    rotation: 0,
    color: popupSelectedBoxColor.value.hex,
    isOnBox: false,
    boxId: undefined,
    isBox: true,
    instancing: false,
    description: '2D에서 생성된 Box'
  }
  
  objectStore.addPlacedObject(placedObjectData)
  
  // Box 생성 완료 후 자동으로 Select 모드로 전환
  setTool('select')
  

}



// Store를 사용한 일반 벽 추가
const addWall = (start: { x: number, y: number }, end: { x: number, y: number }, isGlass: boolean = false) => {
  if (!fabricCanvas) return

  // 현재 툴에 따라 선택 가능 여부 및 시각적 스타일 결정
  const isSelectMode = currentTool.value === 'select'

  // isGlass에 따라 색상 설정
  const wallColor = isGlass ? '#4682B4' : '#8A7B78' // 유리벽: 파란색, 일반벽: 갈색

  const wall = new fabric.Line([start.x, start.y, end.x, end.y], {
    stroke: wallColor,
    strokeWidth: 5, // 두께 증가
    strokeLineCap: 'round',
    selectable: isSelectMode,
    evented: isSelectMode,
    hoverCursor: isSelectMode ? 'move' : 'default',
    moveCursor: isSelectMode ? 'move' : 'default',
  })

  // base floor 기준으로 미터 단위 좌표 계산
  const scale = 40 // 1m = 40px
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )
  
  let startXMeters, startYMeters, endXMeters, endYMeters
  
  if (defaultFloor) {
    const baseX = defaultFloor.left
    const baseY = defaultFloor.top
    
    // 픽셀 좌표를 미터 단위로 변환
    startXMeters = Math.round(((start.x - baseX) / scale) * 100) / 100
    startYMeters = Math.round(((start.y - baseY) / scale) * 100) / 100
    endXMeters = Math.round(((end.x - baseX) / scale) * 100) / 100
    endYMeters = Math.round(((end.y - baseY) / scale) * 100) / 100
  } else {
    // fallback: 픽셀 좌표를 그대로 사용
    startXMeters = start.x
    startYMeters = start.y
    endXMeters = end.x
    endYMeters = end.y
  }

  // 더 상세한 식별 정보 추가
  const wallId = Date.now() + Math.random() // 고유 ID
  wall.userData = {
    type: 'wall', // 모든 벽은 'wall' 타입으로 통일
    id: wallId,
    isGlass: isGlass, // 유리벽 여부만 별도 저장
    startX: startXMeters, // 미터 단위 좌표 저장
    startY: startYMeters,
    endX: endXMeters,
    endY: endYMeters,
    isSaved: false // 새로 생성된 Wall
  }

  fabricCanvas.add(wall)

  // Store에 벽 추가 (픽셀 단위 좌표 사용 - 3D 뷰어에서 미터 단위로 변환)
  const wallData = {
    start: { x: start.x, y: start.y },
    end: { x: end.x, y: end.y },
    id: wallId,
    isGlass: isGlass
  }

  floorplanStore.addWall(wallData)
  
  // 벽 생성 이벤트 emit
  emit('wallCreated')

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
  const defaultWidthPx = defaultWidth * scale
  const defaultHeightPx = defaultHeight * scale

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
    width: defaultWidthPx,
    height: defaultHeightPx,
    fill: 'rgba(196, 196, 196, 0.8)', // 중간 회색 (#A9A9A9와 #E0E0E0의 중간값)
    stroke: '#C4C4C4', // 테두리는 살짝 어둡게
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
      right: startX + defaultWidthPx,
      bottom: startY + defaultHeightPx
    }
  }
  floorplanStore.setRoom(roomData)

  // Store floors에도 추가
  floorplanStore.addFloor({
    id: floorId,
    width: defaultWidth,
    height: defaultHeight,
    boundsPx: { left: startX, top: startY, right: startX + defaultWidthPx, bottom: startY + defaultHeightPx },
    color: '#C4C4C4'
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
  

  
  // 캔버스 변환 적용
  updateCanvasTransform()
}

// 중복된 setupInitialView 함수 제거됨 (새로운 함수는 1006라인 근처에 있음)

// Store를 사용한 네모난 방 생성 (바닥만 생성, 벽 미생성)


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
    fontSize: 14, // 폰트 크기 증가
    fill: '#000000', // 검은색으로 변경하여 가독성 향상
    fontFamily: 'Arial',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    angle: angle * 180 / Math.PI, // 라디안을 도로 변환
    selectable: false,
    evented: false,
    backgroundColor: 'rgba(255, 255, 255, 0.95)', // 배경 투명도 감소
    padding: 4, // 패딩 증가
    fontWeight: 'bold' // 굵은 글씨로 변경
  })

  // 벽과 연관된 레이블임을 표시
  lengthLabel.userData = {
    type: 'wall-length-label',
    wallId: wall.userData?.id,
    isGlass: wall.userData?.isGlass || false
  }

  fabricCanvas.add(lengthLabel)
}

// Box 크기 표시 레이블 추가
const addBoxSizeLabel = (box: any, width: number, height: number) => {
  if (!fabricCanvas) return

  // 안전한 값 사용 (undefined나 null 체크)
  const safeWidth = width || 1.0
  const safeHeight = height || 1.0

  // Box 크기 텍스트 (미터 단위) - 2D에서는 width × height로 표시
  const sizeText = `${safeWidth.toFixed(1)}×${safeHeight.toFixed(1)}m`

  // Box의 중점 계산
  const centerX = box.left + (box.width / 2)
  const centerY = box.top + (box.height / 2)

  // 텍스트 객체 생성
  const sizeLabel = new fabric.Text(sizeText, {
    left: centerX,
    top: centerY,
    fontSize: 11,
    fill: '#333333',
    fontFamily: 'Arial',
    textAlign: 'center',
    originX: 'center',
    originY: 'center',
    selectable: false,
    evented: false,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    padding: 3,
    fontWeight: 'bold'
  })

  // Box와 연관된 레이블임을 표시
  sizeLabel.userData = {
    type: 'box-size-label',
    boxId: box.userData?.id
  }

  fabricCanvas.add(sizeLabel)
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

  if (wall.userData?.type === 'wall') {
    // 유리벽과 일반벽 모두 Line 객체로 동일하게 처리
    const linePoints = wall.calcLinePoints()
    const matrix = wall.calcTransformMatrix()
    start = fabric.util.transformPoint({ x: linePoints.x1, y: linePoints.y1 }, matrix)
    end = fabric.util.transformPoint({ x: linePoints.x2, y: linePoints.y2 }, matrix)

    const wallType = wall.userData?.isGlass ? '유리벽' : '일반벽'
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



  // 기존 배치 오브젝트와 Box 오브젝트 모두 제거
  const objectsToRemove = (fabricCanvas.getObjects() as Array<fabric.Object & { userData?: any }>).filter((obj) =>
    obj.userData?.type === 'placed-object' || obj.userData?.type === 'custom-box'
  )



  objectsToRemove.forEach(obj => {
    fabricCanvas.remove(obj)
  })

  // Store 데이터 기반으로 모든 오브젝트 재생성
  objectStore.placedObjects.forEach(placedObj => {
    const canvasWidth = fabricCanvas.width || 800
    const canvasHeight = fabricCanvas.height || 600

    // Store 좌표 → 2D Canvas 좌표 변환
    const fabricX = placedObj.position.x * 40 + canvasWidth / 2
    const fabricY = placedObj.position.y * 40 + canvasHeight / 2

    // Box인 경우와 일반 오브젝트인 경우를 구분하여 처리
    if (placedObj.isBox) {
      // Box 오브젝트 생성
      const box = new fabric.Rect({
        left: fabricX - (placedObj.width * 40) / 2,
        top: fabricY - (placedObj.depth * 40) / 2,
        width: placedObj.width * 40,
        height: placedObj.depth * 40,
        fill: placedObj.color || '#FFE082',
        stroke: '#F57F17',
        strokeWidth: 2,
        selectable: true,
        evented: true,
        opacity: 0.8,
        hoverCursor: 'move',
        moveCursor: 'move'
      })

      box.userData = {
        type: 'custom-box',
        id: placedObj.id,
        x: placedObj.position.x,
        y: placedObj.position.y,
        width: placedObj.width,
        height: placedObj.height,
        depth: placedObj.depth,
        isSaved: true
      }

      fabricCanvas.add(box)

      // Box 크기 라벨 추가
      addBoxSizeLabel(box, placedObj.width, placedObj.depth)


    } else {
      // 일반 오브젝트 생성
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

    }
  })


  fabricCanvas.renderAll()
}

// 상자 위의 장비들을 상자와 함께 이동
const moveObjectsOnBox = (boxObject: any) => {
  if (!boxObject || boxObject.userData?.category !== 'etc' || !boxObject.userData?.isBox) return

  const boxId = boxObject.userData?.placedObjectId
  if (!boxId) return

  // 상자 위에 있는 모든 장비 찾기
  const objectsOnBox = objectStore.placedObjects.filter(obj => obj.boxId === boxId)

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
        position: { x: worldX, y: worldY }
      }
      objectStore.updatePlacedObject(obj.id, updatedObject)
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
  const existingObject = objectStore.placedObjects.find(obj => obj.id === placedObjectId)
  if (existingObject) {
    const updatedObject = {
      ...existingObject,
      position: { x: worldX, y: worldY },
      rotation: rotationRadians
    }
    objectStore.updatePlacedObject(placedObjectId, updatedObject)
  }
}

// Object Library에서 오브젝트 배치 처리 (직접 호출용)
const placeObject = (object: any) => {
  if (!fabricCanvas) return
  

  
  // 오브젝트 배치 로직 실행
  executeObjectPlacement(object)
}

// Object Library에서 오브젝트 배치 처리 (이벤트용)
const handlePlaceObject = (event: any) => {
  if (!fabricCanvas) return

  const { object } = event.detail
  

  
  // 오브젝트 배치 로직 실행
  executeObjectPlacement(object)
}

// 실제 오브젝트 배치 로직
const executeObjectPlacement = (object: any) => {

  if (!fabricCanvas) return

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

  } else if (object.x !== undefined && object.y !== undefined) {
    // 사용자가 지정한 좌표가 있는 경우 해당 좌표 사용
    const scale = 40 // 1m = 40px
    
    // 기본 회색 바닥의 위치를 찾기
    const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
      obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
    )
    
    if (defaultFloor) {
      // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 좌표 변환
      const baseX = defaultFloor.left
      const baseY = defaultFloor.top
      
      // 미터 단위를 픽셀 단위로 변환하여 바닥 기준으로 배치
      centerX = baseX + (object.x * scale)
      centerY = baseY + (object.y * scale)
    } else {
      // 기본 바닥을 찾을 수 없는 경우 캔버스 중앙에 배치
      const canvasWidth = fabricCanvas.width || 800
      const canvasHeight = fabricCanvas.height || 600
      centerX = canvasWidth / 2
      centerY = canvasHeight / 2
    }
  } else {
    // 일반 배치 - 캔버스 중앙에 배치
    const canvasWidth = fabricCanvas.width || 800
    const canvasHeight = fabricCanvas.height || 600
    centerX = canvasWidth / 2
    centerY = canvasHeight / 2
  }

  // 오브젝트 크기 (미터 단위를 픽셀로 변환) - 2D에서는 width(가로), height(세로) 사용
  const meterToPixel = 40 // 1m = 40px
  let objectWidth = (object.width || 1) * meterToPixel   // 가로
  let objectHeight = (object.height || 1) * meterToPixel  // 세로 (2D 표현용)

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

  objectStore.addPlacedObject(placedObjectData)

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
  objectStore.clearPlacedObjects()
  zoneStore.clearZones()
  floorplanStore.clearWalls()
  boxStore.clearBoxes()

  // 캔버스 크기 정보 업데이트
  const canvasWidth = fabricCanvas.width || 800
  const canvasHeight = fabricCanvas.height || 600
  floorplanStore.setCanvasSize({ width: canvasWidth, height: canvasHeight })
}

// Zone 변경사항 확인 팝업 닫기
const closeChangeConfirmDialog = () => {
  showChangeConfirmDialog.value = false
}

// Zone, Wall, Box 변경사항 확인 및 저장
const confirmAndSaveZones = async () => {
  try {
    // Zone, Wall, Box 동기화를 병렬로 실행
    const [zoneSuccess, wallSuccess, boxSuccess] = await Promise.all([
      zoneStore.syncZones(zoneChangeSummary.value),
      floorplanStore.syncWalls(wallChangeSummary.value),
      boxStore.syncBoxes(boxChangeSummary.value)
    ])
    
    if (zoneSuccess && wallSuccess && boxSuccess) {
      // 기존 데이터 초기화
      await clearCanvasData()
      
      // 성공 시 최신 데이터 다시 로드 (mount 시와 동일하게)
      await Promise.all([
        loadSavedZones(),
        loadSavedWalls(),
        loadBoxes()
      ])
      alert('✅ Zone, Wall, Box changes have been saved successfully!')
    } else {
      alert('❌ An error occurred while saving.')
    }
  } catch (error) {
    console.error('Save failed:', error)
    alert('❌ An error occurred while saving.')
  } finally {
    closeChangeConfirmDialog()
  }
}

// 캔버스의 Zone과 Wall 데이터 초기화 (기본 바닥과 그리드는 유지)
const clearCanvasData = async () => {
  if (!fabricCanvas) return
  
  try {

    
    // Zone, Wall, Box 객체만 제거 (기본 바닥과 그리드는 유지)
    const objectsToRemove = fabricCanvas.getObjects().filter((obj: any) => {
      const type = obj.userData?.type
      return type === 'zone-floor' || 
             type === 'wall' || 
             type === 'custom-box' ||
             type === 'placed-object'
    })
    
    // 객체들을 캔버스에서 제거
    objectsToRemove.forEach((obj: any) => {
      fabricCanvas.remove(obj)
    })
    
    
    
    // Store의 Zone, Wall, Box 데이터도 초기화
    zoneStore.setZones([])
    floorplanStore.setWalls([])
    boxStore.setBoxes([])
    
    
    
  } catch (error) {
    console.error('❌ Failed to initialize canvas data:', error)
  }
}

// 평면도 저장 (백엔드 API로 Zone 정보 전송)
const saveFloorPlan = async () => {
  if (!fabricCanvas) {
    alert('No floor plan to save.')
    return
  }

  try {
    // 현재 캔버스에 그려진 Zone들 수집
    const zones = fabricCanvas.getObjects().filter((obj: any) => 
      obj.userData?.type === 'zone-floor'
    )

    // Zone 정보를 백엔드 형식으로 변환
    const zonesToSave = zones.map((zone: any) => {
      const scale = 40 // 1m = 40px
      
      // 기본 회색 바닥의 위치를 찾기
      const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
        obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
      )
      
      if (!defaultFloor) {
        throw new Error('Default floor not found.')
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


    
    // 디버깅: 각 Zone의 상세 정보 출력
    zonesToSave.forEach((zone: any, index: number) => {

    })

    // 현재 캔버스에 그려진 Wall들 수집
    const walls = fabricCanvas.getObjects().filter((obj: any) => 
      obj.userData?.type === 'wall'
    )



    // Wall 정보를 백엔드 형식으로 변환
    const wallsToSave = walls.map((wall: any) => {
      const scale = 40 // 1m = 40px
      
      // 기본 회색 바닥의 위치를 찾기
      const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
        obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
      )
      
      if (!defaultFloor) {
        throw new Error('Default floor not found.')
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
        isGlass: wall.userData?.isGlass || false
      }
    })

    // 현재 캔버스에 그려진 Box들 수집
    const boxes = fabricCanvas.getObjects().filter((obj: any) => 
      obj.userData?.type === 'custom-box'
    )


    // Box 정보를 백엔드 형식으로 변환
    const boxesToSave = boxes.map((box: any) => {
      const scale = 40 // 1m = 40px
      
      // 기본 회색 바닥의 위치를 찾기
      const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
        obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
      )
      
      if (!defaultFloor) {
        console.error('Default floor not found.')
        return null
      }
      
      // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 Box 위치 계산
      const baseX = defaultFloor.left
      const baseY = defaultFloor.top
      const boxX = (box.left - baseX) / scale
      const boxY = (box.top - baseY) / scale
      

      
      return {
        id: box.userData?.id,
        x: Math.round(boxX * 100) / 100, // 소수점 2자리까지
        y: Math.round(boxY * 100) / 100,
        width: box.userData?.width || 1.0,
        depth: box.userData?.depth || 1.0,
        height: box.userData?.height || 1.0,
        color: (box as any).fill || '#D2B48C'
      }
    }).filter((box: unknown) => box !== null)

    // 백엔드에서 최신 Zone, Wall, Box 데이터 가져오기
    const [savedZones, savedWalls, savedBoxes] = await Promise.all([
      zoneStore.fetchZones(),
      floorplanStore.fetchWalls(),
      boxStore.fetchBoxes()
    ])
    

    
    // 디버깅: 백엔드 Zone 데이터 상세 정보 출력
    savedZones.forEach((zone: any, index: number) => {

    })
    
    // 디버깅: 백엔드 Wall 데이터 상세 정보 출력
    savedWalls.forEach((wall: any, index: number) => {

    })

    // Store의 analyzeZoneChanges, analyzeWallChanges, analyzeBoxChanges 함수로 변경사항 분석
    const zoneChanges = zoneStore.analyzeZoneChanges(zonesToSave, savedZones)
    const wallChanges = floorplanStore.analyzeWallChanges(wallsToSave, savedWalls)
    const boxChanges = boxStore.analyzeBoxChanges(boxesToSave, savedBoxes)
    
    zoneChangeSummary.value = zoneChanges
    wallChangeSummary.value = wallChanges
    boxChangeSummary.value = boxChanges



    // 변경사항이 있으면 팝업 표시
    const hasChanges = zoneChanges.toCreate.length > 0 || zoneChanges.toUpdate.length > 0 || zoneChanges.toDelete.length > 0 ||
                      wallChanges.toCreate.length > 0 || wallChanges.toUpdate.length > 0 || wallChanges.toDelete.length > 0 ||
                      boxChanges.toCreate.length > 0 || boxChanges.toUpdate.length > 0 || boxChanges.toDelete.length > 0
    
    if (hasChanges) {
      showChangeConfirmDialog.value = true
    } else {
      alert('✅ No changes detected.')
    }
    
  } catch (error: any) {
    console.error('❌ Failed to analyze zone changes:', error)
    
    let errorMessage = 'Unknown error'
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      errorMessage = `Server error (${error.response.status}): ${error.response.data?.message || error.response.statusText}`
    } else if (error.request) {
      // 요청이 전송되었지만 응답이 없음
      errorMessage = 'Cannot connect to server. Please check if the server is running.'
    } else {
      // 요청 설정 중 에러
      errorMessage = error.message || 'Request configuration error'
    }
    
    alert(`Failed to analyze zone changes: ${errorMessage}`)
  }
}

// 저장된 Wall 정보 불러오기
const loadSavedWalls = async () => {
  if (!fabricCanvas) return

  try {

    
    // 백엔드 API에서 저장된 Wall 정보 가져오기
    const savedWalls = await floorplanStore.fetchWalls()
    

    if (savedWalls.length === 0) {
      
      floorplanStore.setWalls([])
      return
    }

    // 각 Wall을 캔버스에 그리기
    savedWalls.forEach((wallData: any) => {
      createWallFromSavedData(wallData)
    })

    
    
  } catch (error: any) {
    console.error('❌ Failed to load wall information:', error)
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      if (error.response.status === 404) {

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
    // 로딩 상태는 fetchWalls 함수에서 자동으로 관리됨
  }
}

// 저장된 Zone 정보 불러오기
const loadSavedZones = async () => {
  if (!fabricCanvas) return

  try {

    
    // 백엔드 API에서 저장된 Zone 정보 가져오기
    const savedZones = await zoneStore.fetchZones()
    

    if (savedZones.length === 0) {
      
      zoneStore.setZones([])
      return
    }

    // Store에 Zone 데이터 저장
    zoneStore.setZones(savedZones)

    // 각 Zone을 캔버스에 그리기
    savedZones.forEach((zoneData: any) => {
      createZoneFromSavedData(zoneData)
    })

    
    
  } catch (error: any) {
    console.error('❌ Failed to load zone information:', error)
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      if (error.response.status === 404) {

        zoneStore.setZones([])
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
    // 로딩 상태는 fetchZones 함수에서 자동으로 관리됨
  }
}

// 저장된 Box 데이터 불러오기
const loadBoxes = async () => {
  try {

    
    // 백엔드 API에서 저장된 Box 정보 가져오기
    const savedBoxes = await boxStore.fetchBoxes()
    
    if (savedBoxes.length === 0) {

      boxStore.setBoxes([])
      return
    }

    // Store에 Box 데이터 저장
    boxStore.setBoxes(savedBoxes)

    // 각 Box를 캔버스에 그리기 (유효한 데이터만 처리)
    savedBoxes.forEach((boxData: any) => {
      // Box 데이터 유효성 체크
      if (boxData && typeof boxData === 'object') {
        createBoxFromSavedData(boxData)
      } else {

      }
    })


    
  } catch (error: any) {
    console.error('❌ Failed to load box information:', error)
    
    // axios 에러 처리
    if (error.response) {
      // 서버가 응답했지만 에러 상태 코드
      if (error.response.status === 404) {

      } else {
        console.error('서버 에러:', error.response.status, error.response.data)
      }
    } else if (error.request) {
      // 요청이 전송되었지만 응답을 받지 못함
      console.error('네트워크 에러: 서버에 연결할 수 없습니다.')
    } else {
      // 요청 설정 중 에러 발생
      console.error('요청 설정 에러:', error.message)
    }
    
    // 로딩 상태는 fetchBoxes 함수에서 자동으로 관리됨
  }
}

// 저장된 데이터로부터 Box 생성
const createBoxFromSavedData = (boxData: any) => {
  if (!fabricCanvas) return

  // Box 데이터 유효성 체크 및 안전한 기본값 설정
  const safeBoxData = {
    id: boxData.id || 'unknown',
    x: boxData.x || 0,
    y: boxData.y || 0,
    width: boxData.width || 1.0,
    depth: boxData.depth || 1.0,
    height: boxData.height || 1.0,
    color: boxData.color || '#D2B48C'
  }

  const scale = 40 // 1m = 40px
  
  // 기본 회색 바닥의 위치를 찾기 (Box 생성 시와 동일한 방식)
  const defaultFloor = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'base-floor' && obj.userData?.floorId === 'default-floor'
  )
  
  if (!defaultFloor) {
    console.error('기본 바닥을 찾을 수 없습니다.')
    return
  }
  
  // 회색 바닥의 왼쪽 위 모서리를 (0,0) 기준으로 좌표 변환 (Box 생성 시와 동일)
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  
  // Box의 픽셀 좌표 계산 (Box 생성 시와 동일한 방식)
  const boxX = baseX + safeBoxData.x * scale
  const boxY = baseY + safeBoxData.y * scale
  

  const boxWidth = safeBoxData.width * scale
  const boxHeight = safeBoxData.depth * scale // 2D에서는 depth가 세로
  
  // Box 생성 (직사각형으로 표현)
  const box = new fabric.Rect({
    left: boxX,
    top: boxY,
    width: boxWidth,
    height: boxHeight,
    fill: safeBoxData.color,
    stroke: '#8A7B78',
    strokeWidth: 2,
    selectable: true,
    evented: true,
    opacity: 0.9,
    hoverCursor: 'move',
    moveCursor: 'move'
  })

  box.userData = {
    type: 'custom-box',
    id: safeBoxData.id,
    x: safeBoxData.x,
    y: safeBoxData.y,
    width: safeBoxData.width,
    height: safeBoxData.height,
    depth: safeBoxData.depth,
    isSaved: true
  }

  fabricCanvas.add(box)

  // Box 크기 라벨 추가 (안전한 값 사용)
  addBoxSizeLabel(box, safeBoxData.width, safeBoxData.depth)

  // Store에 Box를 placedObjects에도 추가 (3D 렌더링을 위해)
  // 중복 추가 방지: 이미 존재하는지 확인
  const existingObject = objectStore.placedObjects.find(obj => obj.id === safeBoxData.id)
  if (!existingObject) {
    const placedObjectData = {
      id: safeBoxData.id,
      name: `Box_${safeBoxData.id}`,
      category: 'etc',
      width: safeBoxData.width,
      depth: safeBoxData.depth,
      height: safeBoxData.height,
      position: { x: safeBoxData.x, y: safeBoxData.y },
      boundsPx: {
        left: boxX,    // 픽셀 좌표 (새로 생성된 Box와 동일한 방식)
        top: boxY,
        right: boxX + boxWidth,
        bottom: boxY + boxHeight
      },
      color: safeBoxData.color,
      rotation: 0,
      isOnBox: false,
      boxId: undefined,
      isBox: true,
      instancing: false,
      description: 'DB에서 불러온 Box'
    }
    
    objectStore.addPlacedObject(placedObjectData)
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

  // Wall 생성 - isGlass에 따라 색상 설정
  const isGlassWall = wallData.isGlass || false
  const wallColor = isGlassWall ? '#4682B4' : '#8A7B78' // 유리벽: 파란색, 일반벽: 갈색
  
  const wall = new fabric.Line([startX, startY, endX, endY], {
    stroke: wallColor,
    strokeWidth: 5, // 두께 증가
    strokeLineCap: 'round',
    selectable: true,
    evented: true,
    hoverCursor: 'move',
    moveCursor: 'move',
  })

  wall.userData = { 
    type: 'wall', // 모든 벽은 'wall' 타입으로 통일
    id: wallData.id, // 백엔드의 실제 ID 사용
    isGlass: isGlassWall, // 유리벽 여부만 별도 저장
    isSaved: true,
    startX: wallData.startX, // 미터 단위 좌표 저장 (base floor 기준)
    startY: wallData.startY,
    endX: wallData.endX,
    endY: wallData.endY
  }



  fabricCanvas.add(wall)

  // Wall 길이 라벨 추가
  addWallLengthLabel(wall, { x: startX, y: startY }, { x: endX, y: endY })

  // Store에 Wall 정보 추가 (통합된 함수 사용)
  floorplanStore.addWall({
    start: { x: startX, y: startY },
    end: { x: endX, y: endY },
    id: wallData.id,
    isGlass: wallData.isGlass || false
  })

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
    zoneStore.addZone({
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
  link.download = `floorplan_export.png`
  link.href = dataURL
  link.click()
}

// 선택된 오브젝트 삭제 (멀티 선택 지원)
const deleteSelectedObject = () => {
  if (!fabricCanvas) {
    alert('Please select an object to delete first.')
    return
  }

  // 멀티 선택된 객체들이 있으면 모두 삭제
  if (selectedObjects.value.length > 1) {

    
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
    alert('Please select an object to delete first.')
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
    case 'zone-floor':
      return 'Zone Floor'
    case 'wall':
      return 'Wall'
    default:
      return type || 'Unknown'
  }
}

// 객체 타입별 갯수 계산 함수
const getObjectTypeCounts = () => {
  const typeCounts: { [key: string]: number } = {}
  
  selectedObjects.value.forEach(obj => {
    const type = obj.userData?.type || 'unknown'
    const displayName = getObjectTypeDisplayName(type)
    typeCounts[displayName] = (typeCounts[displayName] || 0) + 1
  })
  
  return typeCounts
}

// 객체 타입 표시 이름 반환 함수
const getObjectTypeDisplayName = (type: string): string => {
  switch (type) {
    case 'placed-object':
      return 'Object'
    case 'zone-floor':
      return 'Zone Floor'
    case 'wall':
      return 'Wall'
    case 'custom-box':
      return 'Box'
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
        const objectsOnBox = objectStore.placedObjects.filter(obj => obj.boxId === placedObjectId)

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
          objectStore.removePlacedObject(obj.id)
        })
      }

      objectStore.removePlacedObject(placedObjectId)

      // 🚀 핵심 개선: Store 기반 2D 재구성 (3D와 동일한 방식)
      rerender2DObjectsFromStore()
    }

  } else if (objectType === 'wall') {
    // 벽 삭제 (통합된 로직)
    const associatedLabel = fabricCanvas.getObjects().find((obj: any) =>
      obj.userData?.type === 'wall-length-label' && obj.userData?.wallId === objectId
    )

    if (associatedLabel) {
      fabricCanvas.remove(associatedLabel)
    }

    fabricCanvas.remove(objectToDelete)

    const allObjects = fabricCanvas.getObjects()
    const wallsToRemove = allObjects.filter((obj: any) =>
      obj.userData?.id === objectId && obj.userData?.type === 'wall'
    )

    wallsToRemove.forEach((wall: any) => {
      fabricCanvas.remove(wall)
    })

    // Store에서 벽 제거 (통합된 함수 사용)
    if (objectId) {
      floorplanStore.removeWall(objectId)
      // 벽 삭제 이벤트 emit
      emit('wallDeleted')
    }

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
  } else if (objectType === 'custom-box') {
    // Box 삭제: 관련된 크기 라벨도 함께 제거하고 Store에서도 제거
    const boxId = objectToDelete.userData?.id
    if (boxId) {

      
      // Box 크기 라벨 제거
      const boxLabels = fabricCanvas.getObjects().filter((obj: any) => obj.userData?.type === 'box-size-label' && obj.userData?.boxId === boxId)
      if (boxLabels.length > 0) {
        boxLabels.forEach((lbl: any) => {
          fabricCanvas.remove(lbl)

        })
      } else {

      }
      
      // Store에서 Box 제거 - boxId가 이미 문자열인지 확인
      let boxIdString = boxId
      if (typeof boxId === 'number') {
        boxIdString = boxId.toString()
      }
      

      
      const placedObject = objectStore.placedObjects.find(obj => obj.id === boxIdString)
      if (placedObject) {
        objectStore.removePlacedObject(boxIdString)

      } else {

      }
      
      // Box 사각형 제거
      fabricCanvas.remove(objectToDelete)

      
      // 🚀 핵심 개선: Store 기반 2D 재구성 (3D와 동기화)
      rerender2DObjectsFromStore()
    } else {

      // boxId가 없는 경우도 안전하게 제거
      fabricCanvas.remove(objectToDelete)
      
      // Store 기반 2D 재구성
      rerender2DObjectsFromStore()
    }
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
  () => objectStore.placedObjects,
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

  // 저장된 데이터 로드
  await loadBoxes()

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

// 외부에서 호출할 수 있는 함수들
defineExpose({
  placeObject
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

// Box 크기 라벨 업데이트
const updateBoxSizeLabel = (box: any) => {
  if (!fabricCanvas) return

  const boxId = box.userData?.id
  if (!boxId) return

  // 기존 라벨 찾기 및 제거
  const existingLabel = fabricCanvas.getObjects().find((obj: any) =>
    obj.userData?.type === 'box-size-label' && obj.userData?.boxId === boxId
  )

  if (existingLabel) {
    fabricCanvas.remove(existingLabel)
  }

  // 새로운 위치로 라벨 재생성
  const width = box.userData?.width || 1.0
  const height = box.userData?.height || 1.0
  addBoxSizeLabel(box, width, height)
}

// Object의 위치 정보를 가져오는 함수
const getObjectPosition = (obj: any) => {
  if (!fabricCanvas) return { x: 0, y: 0 }
  
  // 기본 회색 바닥의 위치를 찾기
  const defaultFloor = fabricCanvas.getObjects().find((o: any) =>
    o.userData?.type === 'base-floor' && o.userData?.floorId === 'default-floor'
  )
  
  if (!defaultFloor) return { x: 0, y: 0 }
  
  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  const scale = 40 // 1m = 40px
  
  // 픽셀 좌표를 미터 단위로 변환
  const worldX = (obj.left - baseX) / scale
  const worldY = (obj.top - baseY) / scale
  
  return { x: worldX, y: worldY }
}

// Object의 크기 정보를 가져오는 함수
const getObjectSize = (obj: any) => {
  const objType = obj.userData?.type
  
  switch (objType) {
    case 'custom-box':
      const width = obj.userData?.width || 1.0
      const height = obj.userData?.height || 1.0
      const depth = obj.userData?.depth || 1.0
      return `${width.toFixed(1)}m × ${height.toFixed(1)}m × ${depth.toFixed(1)}m`
    
    case 'wall':
      const startX = obj.userData?.startX || 0
      const startY = obj.userData?.startY || 0
      const endX = obj.userData?.endX || 0
      const endY = obj.userData?.endY || 0
      const length = Math.sqrt(Math.pow(endX - startX, 2) + Math.pow(endY - startY, 2))
      return `${(length / 40).toFixed(2)}m`
    
    case 'zone-floor':
    case 'room-floor':
      const zoneWidth = obj.userData?.originalWidth || (obj.width / 40)
      const zoneHeight = obj.userData?.originalHeight || (obj.height / 40)
      return `${zoneWidth.toFixed(1)}m × ${zoneHeight.toFixed(1)}m`
    
    case 'placed-object':
      const objWidth = obj.userData?.width || 1.0
      const objDepth = obj.userData?.depth || 1.0
      const objHeight = obj.userData?.height || 1.0
      return `${objWidth.toFixed(1)}m × ${objHeight.toFixed(1)}m × ${objDepth.toFixed(1)}m`
    
    default:
      return '크기 정보 없음'
  }
}

// 카테고리 표시 이름을 가져오는 함수
const getCategoryDisplayName = (category: string) => {
  const categoryMap: { [key: string]: string } = {
    'robot': '로봇',
    'equipment': '설비',
    'appliances': '가전',
    'etc': '기타',
    'av': 'AV 장비',
    'wall': '벽',
    'zone-floor': 'Zone 바닥',
    'room-floor': 'Room 바닥',
    'base-floor': '기본 바닥'
  }
  return categoryMap[category] || category
}

// Box를 Store에 업데이트하는 함수
const updateBoxInStore = (box: any) => {
  if (!fabricCanvas) return

  const boxId = box.userData?.id
  if (!boxId) return

  // Zone과 동일한 방식: fabricCanvas 픽셀 좌표를 미터 단위로 변환하여 저장
  const defaultFloor = fabricCanvas.getObjects().find((o: any) =>
    o.userData?.type === 'base-floor' && o.userData?.floorId === 'default-floor'
  )
  
  if (!defaultFloor) return

  const baseX = defaultFloor.left
  const baseY = defaultFloor.top
  const scale = 40 // 1m = 40px

  // 픽셀 좌표를 미터 단위로 변환 (Zone과 동일한 계산 방식)
  const worldX = (box.left - baseX) / scale
  const worldY = (box.top - baseY) / scale

  // Store에서 해당 Box 찾기 및 업데이트 (placedObjects)
  const existingBox = objectStore.placedObjects.find(obj => obj.id === boxId)
  if (existingBox) {
    const updatedBox = {
      ...existingBox,
      position: { x: worldX, y: worldY }, // 미터 단위로 변환된 값 저장
      boundsPx: {
        left: box.left,
        top: box.top,
        right: box.left + (box.width * box.scaleX),
        bottom: box.top + (box.height * box.scaleY)
      }
    }
    objectStore.updatePlacedObject(boxId, updatedBox)
  }

  // Store에서 해당 Box 찾기 및 업데이트 (boxes)
  const existingBoxData = boxStore.boxes.find(boxData => boxData.id === boxId)
  if (existingBoxData) {
    const updatedBoxData = {
      ...existingBoxData,
      x: worldX, // 미터 단위로 변환된 값 저장
      y: worldY
    }
    boxStore.updateBox(boxId, updatedBoxData)

  }
}
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

.color-section {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.custom-color-input {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.custom-color-input label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.color-input-group {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.color-hex-input {
  width: 80px;
  padding: 0.25rem 0.5rem;
  border: 1px solid #ccc;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.8rem;
}

.color-hex-input.invalid {
  border-color: #e74c3c;
  background-color: #fdf2f2;
}

.color-opacity-slider {
  width: 80px;
}

.opacity-value {
  font-size: 0.8rem;
  color: #666;
  min-width: 35px;
}

.custom-color-preview {
  width: 100%;
  height: 24px;
  border: 1px solid #ccc;
  border-radius: 4px;
  margin-top: 0.25rem;
}

/* 색상 선택 팝업 스타일 */
.color-picker-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.color-picker-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  width: 95%;
  max-width: 800px;
  max-height: 90vh;
  overflow-y: auto;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 1.5rem 1rem;
  border-bottom: 1px solid #eee;
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
  padding: 0.25rem;
  border-radius: 4px;
}

.close-btn:hover {
  background: #f5f5f5;
  color: #333;
}

.dialog-content {
  padding: 1.5rem;
}

.preset-colors-section,
.custom-color-section,
.selected-color-info {
  margin-bottom: 2rem;
}

.preset-colors-section h4,
.custom-color-section h4,
.selected-color-info h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
}

.preset-colors-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(120px, 1fr));
  gap: 0.75rem;
}

.preset-color-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 1rem 0.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.preset-color-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.preset-color-item.selected {
  border-color: #3498db;
  box-shadow: 0 0 0 3px rgba(52, 152, 219, 0.2);
}

.color-label {
  margin-top: 0.5rem;
  font-size: 0.8rem;
  color: #333;
  text-align: center;
  font-weight: 500;
}

.custom-color-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.color-input-row {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-input-row label {
  min-width: 80px;
  font-weight: 500;
  color: #2c3e50;
}

.opacity-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.color-preview-section {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-preview-box {
  width: 60px;
  height: 40px;
  border: 2px solid #ddd;
  border-radius: 6px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.selected-color-display {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem;
  background: #f8f9fa;
  border-radius: 8px;
}

.selected-color-preview {
  width: 60px;
  height: 40px;
  border: 2px solid #ddd;
  border-radius: 6px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.selected-color-details {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-name {
  font-weight: 600;
  color: #2c3e50;
}

.color-hex,
.color-rgba {
  font-family: monospace;
  font-size: 0.9rem;
  color: #666;
}

.dialog-footer {
  display: flex;
  justify-content: flex-end;
  gap: 1rem;
  padding: 1rem 1.5rem;
  border-top: 1px solid #eee;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
}

/* 색상 선택 버튼 스타일 */
.color-selector {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.color-selector label {
  font-size: 0.9rem;
  font-weight: 500;
  color: #2c3e50;
}

.color-picker-button {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border: 2px solid #ddd;
  border-radius: 6px;
  background: white;
  cursor: pointer;
  transition: all 0.2s;
  min-width: 150px;
}

.color-picker-button:hover {
  border-color: #3498db;
  box-shadow: 0 2px 8px rgba(52, 152, 219, 0.2);
}

.color-preview-text {
  color: #333;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
}

.color-picker-icon {
  font-size: 1.2rem;
}

/* 고급 색상 선택기 스타일 */
.advanced-color-section {
  margin-bottom: 2rem;
}

.color-wheel-section {
  display: flex;
  gap: 2rem;
  margin-bottom: 2rem;
  align-items: flex-start;
}

.color-wheel-container {
  position: relative;
  flex-shrink: 0;
}

.color-wheel-canvas {
  border: 2px solid #ddd;
  border-radius: 50%;
  cursor: crosshair;
}

.color-wheel-cursor {
  position: absolute;
  width: 12px;
  height: 12px;
  border: 2px solid white;
  border-radius: 50%;
  pointer-events: none;
  box-shadow: 0 0 0 1px #333;
}

.color-sliders {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  flex: 1;
}

.slider-group {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.slider-group label {
  min-width: 80px;
  font-weight: 500;
  color: #2c3e50;
}

.color-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
}

.color-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

.slider-value {
  min-width: 40px;
  font-size: 0.9rem;
  color: #666;
  text-align: right;
}

.color-input-fields {
  margin-bottom: 2rem;
}

.input-row {
  display: grid;
  grid-template-columns: 1fr 1fr 1fr;
  gap: 1.5rem;
  margin-bottom: 1.5rem;
}

.input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.input-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.color-input {
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-family: monospace;
  font-size: 0.9rem;
}

.color-input.invalid {
  border-color: #e74c3c;
  background-color: #fdf2f2;
}

.rgb-inputs,
.hsl-inputs {
  display: flex;
  gap: 0.25rem;
}

.rgb-input,
.hsl-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.opacity-section {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.opacity-section label {
  min-width: 80px;
  font-weight: 500;
  color: #2c3e50;
}

.opacity-controls {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex: 1;
}

.opacity-slider {
  flex: 1;
  height: 6px;
  border-radius: 3px;
  background: #ddd;
  outline: none;
  -webkit-appearance: none;
}

.opacity-slider::-webkit-slider-thumb {
  -webkit-appearance: none;
  appearance: none;
  width: 18px;
  height: 18px;
  border-radius: 50%;
  background: #3498db;
  cursor: pointer;
  border: 2px solid white;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
}

/* Zone Creator 팝업 스타일 */
.zone-creator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.zone-creator-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  width: 95%;
  max-width: 800px;
  max-height: 95vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.zone-creator-dialog .dialog-header {
  padding: 1rem 1.5rem;
  flex-shrink: 0;
}

.zone-creator-dialog .dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.zone-creator-dialog .dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  flex-shrink: 0;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.zone-inputs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  flex: 1;
}

.zone-inputs .input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.zone-inputs .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.zone-inputs .input-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.zone-inputs .input-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.zone-inputs .input-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.zone-create-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.zone-create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.zone-create-btn:active {
  transform: translateY(0);
}

/* Wall Creator 팝업 스타일 */
.wall-creator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.wall-creator-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  width: 95%;
  max-width: 600px;
  max-height: 90vh;
  overflow-y: auto;
}

.wall-inputs {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
}

.wall-inputs .input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.5rem;
}

.wall-inputs .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.wall-inputs .input-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.9rem;
}

.wall-inputs .input-group input {
  padding: 0.75rem;
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.wall-inputs .input-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.checkbox-section {
  margin-top: 1rem;
}

.checkbox-group {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.wall-checkbox {
  width: 18px;
  height: 18px;
  accent-color: #3498db;
}

.checkbox-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 1rem;
}

.checkbox-description {
  color: #666;
  font-size: 0.85rem;
}

.wall-create-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #e74c3c 0%, #c0392b 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(231, 76, 60, 0.4);
}

.wall-create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(231, 76, 60, 0.6);
}

.wall-create-btn:active {
  transform: translateY(0);
}

/* Box Creator 팝업 스타일 */
.box-creator-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.box-creator-dialog {
  background: white;
  border-radius: 12px;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
  width: 95%;
  max-width: 700px;
  max-height: 95vh;
  overflow: hidden;
  display: flex;
  flex-direction: column;
}

.box-inputs {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding: 1rem;
  flex: 1;
}

.box-inputs .input-row {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 1.2rem; /* 간격 축소 */
}

.box-inputs .input-row.three-columns {
  grid-template-columns: 1fr 1fr 1fr; /* 3열 배치 */
  gap: 1rem; /* 3열일 때는 더 좁은 간격 */
}

.box-inputs .input-group {
  display: flex;
  flex-direction: column;
  gap: 0.4rem; /* 라벨과 입력 필드 간격 축소 */
}

.box-inputs .input-group label {
  font-weight: 500;
  color: #2c3e50;
  font-size: 0.85rem; /* 폰트 크기 축소 */
  margin-bottom: 0.2rem;
}

.box-inputs .input-group input {
  padding: 0.6rem; /* 패딩 축소 */
  border: 1px solid #ddd;
  border-radius: 6px;
  font-size: 0.9rem;
  transition: border-color 0.2s;
}

.box-inputs .input-group input:focus {
  outline: none;
  border-color: #3498db;
  box-shadow: 0 0 0 2px rgba(52, 152, 219, 0.2);
}

.box-create-btn {
  padding: 0.75rem 1.5rem;
  font-size: 1rem;
  font-weight: 600;
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: white;
  border: none;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
}

.box-create-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.6);
}

.box-create-btn:active {
  transform: translateY(0);
}

/* Box 팝업 헤더와 푸터 최적화 */
.box-creator-dialog .dialog-header {
  padding: 1rem 1.5rem;
  flex-shrink: 0;
}

.box-creator-dialog .dialog-header h3 {
  font-size: 1.2rem;
  margin: 0;
}

.box-creator-dialog .dialog-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 1.5rem;
}

.box-creator-dialog .dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  flex-shrink: 0;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

/* Box Creator 팝업 푸터 스타일 */
.box-creator-dialog .dialog-footer {
  padding: 1rem 1.5rem;
  border-top: 1px solid #e9ecef;
  background: #f8f9fa;
  border-radius: 0 0 12px 12px;
  display: flex;
  gap: 1rem;
  justify-content: center;
}

.box-creator-dialog .dialog-footer .btn {
  min-width: 100px;
  padding: 0.75rem 1.5rem;
  font-size: 0.9rem;
  font-weight: 600;
  border-radius: 6px;
  transition: all 0.2s ease;
}

.box-creator-dialog .dialog-footer .btn:hover {
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(0,0,0,0.2);
}

/* 색상 선택 섹션 최적화 */
.color-section {
  margin-top: 1rem;
  margin-bottom: 1rem;
  flex: 1;
  display: flex;
  flex-direction: column;
}

.color-section .advanced-color-picker {
  flex: 1;
  min-height: 500px;
  max-height: 600px;
  overflow: visible;
}



/* 공통 도구 스타일 */
.common-tools {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid #eee;
}

.common-tools .btn {
  flex: 1;
}

/* 선택된 객체 정보 텍스트 스타일 */
.selection-text {
  font-size: 1rem;
  color: #2c3e50;
  font-weight: 500;
  line-height: 1.4;
}

.selected-object-item {
  font-size: 0.95rem;
  color: #495057;
  margin: 0.25rem 0;
}



/* 우측 정렬된 도구 그룹 스타일 */
.right-tool-group {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
  justify-content: flex-end;
  align-items: center;
}

.right-tool-group .btn {
  min-width: 120px;
}

/* Clear 버튼 색상 스타일 */
.btn-warning {
  background: linear-gradient(135deg, #f39c12 0%, #e67e22 100%);
  color: white;
  border: none;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(243, 156, 18, 0.4);
}

.btn-warning:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(243, 156, 18, 0.6);
}

.btn-warning:active {
  transform: translateY(0);
}

.color-preview-container {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.color-preview-box {
  width: 80px;
  height: 50px;
  border: 2px solid #ddd;
  border-radius: 8px;
  box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.1);
}

.color-info {
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.color-hex-display,
.color-rgba-display {
  font-family: monospace;
  font-size: 0.9rem;
  color: #666;
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

.left-tool-group {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
}

.zone-controls {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0;
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
  margin-top: 0;
}

.wall-tools h4 {
  margin: 0;
  font-size: 1rem;
  color: #2c3e50;
}

.box-tools {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-top: 0;
}

.box-tools h4 {
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

.selected-objects-summary {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.type-count {
  display: inline-block;
  padding: 0.25rem 0.5rem;
  background-color: #e8f4fd;
  border: 1px solid #b3d9f7;
  border-radius: 4px;
  font-size: 0.8rem;
  color: #1e4a72;
  font-weight: 500;
}

.single-selection-info {
  margin-top: 0.5rem;
}

.object-details {
  margin-top: 0.75rem;
  padding: 0.75rem;
  background-color: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 6px;
  font-size: 0.85rem;
}

.detail-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
  padding: 0.25rem 0;
}

.detail-item:last-child {
  margin-bottom: 0;
}

.detail-label {
  font-weight: 600;
  color: #495057;
  min-width: 60px;
}

.detail-value {
  color: #212529;
  font-family: 'Courier New', monospace;
  background-color: #e9ecef;
  padding: 0.125rem 0.375rem;
  border-radius: 3px;
  font-size: 0.8rem;
}

.color-preview {
  display: inline-block;
  width: 16px;
  height: 16px;
  border-radius: 2px;
  border: 1px solid #ccc;
  margin-right: 0.5rem;
  vertical-align: middle;
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
  color: #8A7B78;
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

/* Box 스타일 */
.box-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.box-item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem;
  background: #f8f9fa;
  border-radius: 8px;
  border: 1px solid #e9ecef;
}

.box-info {
  font-size: 0.9rem;
  color: #495057;
  font-weight: 500;
}

.box-color {
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