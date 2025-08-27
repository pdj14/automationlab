<template>
  <div class="advanced-color-picker">
    <div class="color-section">
      <div class="color-selector">
        <label>Zone Color:</label>
        <div class="color-preview-container">
          <div class="color-preview-box" :style="{ backgroundColor: selectedColor.hex }"></div>
          <div class="color-info">
            <span class="color-hex-display">{{ selectedColor.hex }}</span>
            <span class="color-rgba-display">{{ selectedColor.rgba }}</span>
          </div>
        </div>
      </div>
    </div>

    <!-- 고급 색상 선택기 -->
    <div class="advanced-color-section">
      <h4>Advanced Color Selection</h4>
      
      <!-- 색상 휠 및 밝기/채도 조절 -->
      <div class="color-wheel-section">
        <div class="color-wheel-container">
          <canvas ref="colorWheelCanvas" class="color-wheel-canvas" @mousedown="startColorWheelDrag" @mousemove="updateColorFromWheel" @mouseup="stopColorWheelDrag"></canvas>
          <div class="color-wheel-cursor" :style="{ left: colorWheelCursor.x + 'px', top: colorWheelCursor.y + 'px' }"></div>
        </div>
        
        <!-- 밝기/채도 슬라이더 -->
        <div class="color-sliders">
          <div class="slider-group">
            <label>Saturation (S):</label>
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
            <label>Value (V):</label>
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
        </div>
      </div>

      <!-- 프리셋 색상들 -->
      <div class="preset-colors-section">
        <h4>Preset Colors</h4>
        <div class="preset-colors-grid">
          <div 
            v-for="color in presetColors" 
            :key="color.hex"
            @click="selectPresetColor(color)"
            class="preset-color-item"
            :style="{ backgroundColor: color.hex }"
          >
            <span class="color-name">{{ color.label }}</span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, computed, watch, nextTick } from 'vue'

interface ColorInfo {
  label: string
  hex: string
  rgba: string
}

interface Props {
  modelValue: ColorInfo
}

interface Emits {
  (e: 'update:modelValue', value: ColorInfo): void
}

const props = defineProps<Props>()
const emit = defineEmits<Emits>()

// 프리셋 색상들
const presetColors = ref([
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

// 선택된 색상
const selectedColor = computed({
  get: () => props.modelValue,
  set: (value) => emit('update:modelValue', value)
})

// 색상 휠 관련 상태
const colorWheelCanvas = ref<HTMLCanvasElement>()
const colorWheelCursor = ref({ x: 100, y: 100 })
const isDraggingColorWheel = ref(false)

// 색상 값들 (HSV 기반)
const colorHue = ref(45)        // 색조 (0-360)
const colorSaturation = ref(100) // 채도 (0-100)
const colorValue = ref(100)      // 밝기 (0-100)

// RGB 값들
const colorRed = ref(255)
const colorGreen = ref(224)
const colorBlue = ref(130)

// 커스텀 색상 관련 상태
const customColorHex = ref('#FFE082')
const customColorOpacity = ref(0.65)
const isValidHexColor = ref(true)

// 프리셋 색상 선택
const selectPresetColor = (color: ColorInfo) => {
  selectedColor.value = color
  // HEX를 RGB로 변환
  const hex = color.hex.slice(1)
  colorRed.value = parseInt(hex.slice(0, 2), 16)
  colorGreen.value = parseInt(hex.slice(2, 4), 16)
  colorBlue.value = parseInt(hex.slice(4, 6), 16)
  
  // RGB를 HSV로 변환
  updateColorFromRGB()
  
  // 커서 위치 업데이트
  updateColorWheelCursor()
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
  updateSelectedColor()
}

const stopColorWheelDrag = () => {
  isDraggingColorWheel.value = false
}

// 색상 변환 함수들
const updateColorFromSliders = () => {
  updateColorFromHSV()
  updateSelectedColor()
}

// 선택된 색상을 업데이트하는 함수
const updateSelectedColor = () => {
  // 현재 색상 값들을 HEX로 변환
  const hex = rgbToHex(colorRed.value, colorGreen.value, colorBlue.value)
  customColorHex.value = hex
  
  // selectedColor 업데이트
  selectedColor.value = {
    label: `Custom Color (${hex})`,
    hex: hex,
    rgba: getRGBAString()
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
    // selectedColor 업데이트
    updateSelectedColor()
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
  
  // 색조(Hue) 계산
  if (delta === 0) {
    colorHue.value = 0
  } else if (max === r) {
    colorHue.value = ((g - b) / delta) % 6 * 60
  } else if (max === g) {
    colorHue.value = ((b - r) / delta + 2) * 60
  } else {
    colorHue.value = ((r - g) / delta + 4) * 60
  }
  
  if (colorHue.value < 0) colorHue.value += 360
  
  // 채도(Saturation) 계산
  colorSaturation.value = max === 0 ? 0 : (delta / max) * 100
  
  // 밝기(Value) 계산
  colorValue.value = max * 100
  
  // 커서 위치 업데이트
  updateColorWheelCursor()
}

const updateColorFromHSV = () => {
  const rgb = hsvToRgb(colorHue.value, colorSaturation.value, colorValue.value)
  colorRed.value = rgb.r
  colorGreen.value = rgb.g
  colorBlue.value = rgb.b
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

const validateAndUpdateColor = () => {
  if (isValidHexColor.value) {
    updateColorFromHex()
  }
}

const getRGBAString = () => {
  return `rgba(${colorRed.value}, ${colorGreen.value}, ${colorBlue.value}, ${customColorOpacity.value})`
}

// 컴포넌트 마운트 시 색상 휠 그리기
onMounted(() => {
  nextTick(() => {
    drawColorWheel()
    // 현재 선택된 색상으로 초기화
    if (selectedColor.value) {
      const hex = selectedColor.value.hex.slice(1)
      colorRed.value = parseInt(hex.slice(0, 2), 16)
      colorGreen.value = parseInt(hex.slice(2, 4), 16)
      colorBlue.value = parseInt(hex.slice(4, 6), 16)
      updateColorFromRGB()
      updateColorWheelCursor()
    }
  })
})

// 선택된 색상이 변경될 때마다 색상 값들 동기화
watch(() => props.modelValue, (newColor) => {
  if (newColor) {
    const hex = newColor.hex.slice(1)
    colorRed.value = parseInt(hex.slice(0, 2), 16)
    colorGreen.value = parseInt(hex.slice(2, 4), 16)
    colorBlue.value = parseInt(hex.slice(4, 6), 16)
    updateColorFromRGB()
    updateColorWheelCursor()
  }
}, { immediate: true })
</script>

<style scoped>
.advanced-color-picker {
  margin-top: 1rem;
  min-height: 500px;
  max-height: 600px;
  overflow-y: auto;
  display: flex;
  flex-direction: column;
}

.color-section {
  margin-bottom: 1.5rem;
}

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

.advanced-color-section {
  margin-bottom: 2rem;
  flex: 1;
  overflow-y: auto;
}

.advanced-color-section h4 {
  margin: 0 0 1rem 0;
  color: #2c3e50;
  font-size: 1.1rem;
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
  grid-template-columns: 1fr 1fr;
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

.rgb-inputs {
  display: flex;
  gap: 0.25rem;
}

.rgb-input {
  flex: 1;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  text-align: center;
  font-size: 0.9rem;
}

.preset-colors-section {
  margin-bottom: 2rem;
}

.preset-colors-section h4 {
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
  align-items: center;
  justify-content: center;
  padding: 1rem 0.5rem;
  border: 2px solid transparent;
  border-radius: 8px;
  cursor: pointer;
  transition: all 0.2s;
  background: white;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  min-height: 60px;
}

.preset-color-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
  border-color: #3498db;
}

.color-name {
  color: #333;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.8);
  text-align: center;
}
</style>
