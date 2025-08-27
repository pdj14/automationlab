<template>
  <div class="object-library">
    <div class="library-header">
      <h3>📦 Object Library</h3>
      <button @click="showUploadModal = true" class="btn btn-primary">
        ➕ Add Object
      </button>
    </div>

    <!-- 카테고리 필터 -->
    <div class="category-filter">
      <select v-model="selectedCategory" @change="filterObjects">
        <option value="all">All Categories</option>
        <option value="robot">🤖 Robot</option>
        <option value="equipment">⚙️ Equipment</option>
        <option value="appliances">🔌 Appliances</option>
        <option value="av">📺 AV</option>
        <option value="etc">📂 ETC</option>
      </select>
    </div>

    <!-- 검색 -->
    <div class="search-box">
      <input 
        v-model="searchQuery" 
        type="text" 
        placeholder="Search objects..."
        @input="filterObjects"
      />
    </div>

    <!-- 오브젝트 목록 -->
    <div class="objects-grid">
      <div 
        v-for="object in filteredObjects" 
        :key="object.id"
        class="object-item"
        :class="{ selected: selectedObject?.id === object.id }"
        @click="selectObject(object)"
        @dragstart="startDrag(object, $event)"
        draggable="true"
      >
        <div class="object-preview">
          <img 
            v-if="object.thumbnail" 
            :src="object.thumbnail" 
            :alt="object.name"
            @error="handleImageError"
          />
          <div v-else class="placeholder-icon">📦</div>
        </div>
        <div class="object-info">
          <h4>{{ object.name }}</h4>
          <p>{{ object.category }}</p>
          <small>{{ object.size || 'Unknown size' }}</small>
        </div>
        <div class="object-actions">
          <button @click.stop="editObject(object)" class="btn-icon" title="Edit">✏️</button>
          <button @click.stop="deleteObject(object)" class="btn-icon" title="Delete">🗑️</button>
        </div>
      </div>
    </div>

    <!-- 업로드 모달 -->
    <div v-if="showUploadModal" class="modal-overlay" @click="closeModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Add New Object</h3>
          <button @click="closeModal" class="btn-close">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="uploadObject">
            <div class="form-group">
              <label>Object Name:</label>
              <input v-model="newObject.name" type="text" required />
            </div>
            
            <div class="form-group">
              <label>Category:</label>
              <select v-model="newObject.category" required @change="handleCategoryChange">
                <option value="robot">Robot</option>
                <option value="equipment">Equipment</option>
                <option value="appliances">Appliances</option>
                <option value="av">AV</option>
                <option value="etc">ETC</option>
              </select>
            </div>
            
            <!-- ETC 카테고리 선택 시 상자 생성 옵션 -->
            <div v-if="newObject.category === 'etc'" class="form-group">
              <label>ETC Type:</label>
              <select v-model="newObject.etcType" @change="handleEtcTypeChange">
                <option value="general">General</option>
                <option value="box">📦 Box</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Width (m):</label>
              <input 
                v-model.number="newObject.width" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="가로 크기"
              />
            </div>
            
            <div class="form-group">
              <label>Depth (m):</label>
              <input 
                v-model.number="newObject.depth" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="세로 크기"
              />
            </div>
            
            <div class="form-group">
              <label>Height (m):</label>
              <input 
                v-model.number="newObject.height" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="높이 크기"
              />
            </div>
            
            <!-- 상자 색상 선택 (ETC 상자 타입일 때만 표시) -->
            <div v-if="newObject.category === 'etc' && newObject.etcType === 'box'" class="form-group">
              <label>Box Color:</label>
              <input 
                v-model="newObject.color" 
                type="color" 
              />
            </div>
            
            <div class="form-group">
              <label>GLB File:</label>
              <input 
                @change="handleFileSelect" 
                type="file" 
                accept=".glb,.gltf" 
                :required="!(newObject.category === 'etc' && newObject.etcType === 'box')"
              />
              <small v-if="newObject.category === 'etc' && newObject.etcType === 'box'">(상자는 GLB 파일 없이 생성됩니다)</small>
            </div>
            
            <div class="form-group">
              <label>Thumbnail (optional):</label>
              <input 
                @change="handleThumbnailSelect" 
                type="file" 
                accept="image/*" 
              />
            </div>
            
            <div class="form-group">
              <label>Description:</label>
              <textarea v-model="newObject.description" rows="3"></textarea>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="closeModal" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="uploading">
                {{ uploading ? 'Uploading...' : 'Add Object' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 선택된 오브젝트 정보 -->
    <div v-if="selectedObject" class="selected-object-info">
      <h4>Selected Object</h4>
      <div class="object-details">
        <p><strong>Name:</strong> {{ selectedObject.name }}</p>
        <p><strong>Category:</strong> {{ selectedObject.category }}</p>
        <p><strong>Size:</strong> {{ selectedObject.size || 'Unknown' }}</p>
        <p v-if="selectedObject.width && selectedObject.depth && selectedObject.height">
          <strong>Dimensions:</strong> {{ selectedObject.width }}m (W) × {{ selectedObject.depth }}m (D) × {{ selectedObject.height }}m (H)
        </p>
        <p v-if="selectedObject.description">
          <strong>Description:</strong> {{ selectedObject.description }}
        </p>
      </div>
      
      <div class="placement-controls">
        <button @click="placeObject" class="btn btn-primary">
          Place in 2D View
        </button>
      </div>
    </div>

    <!-- 상자 배치 모달 -->
    <div v-if="showBoxPlacementModal" class="modal-overlay" @click="closeBoxPlacementModal">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>상자 배치 설정</h3>
          <button @click="closeBoxPlacementModal" class="btn-close">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="confirmBoxPlacement">
            <div class="form-group">
              <label>상자 이름:</label>
              <input v-model="boxPlacement.name" type="text" required />
            </div>
            
            <div class="form-group">
              <label>가로 (m):</label>
              <input 
                v-model.number="boxPlacement.width" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="가로 크기"
              />
            </div>
            
            <div class="form-group">
              <label>세로 (m):</label>
              <input 
                v-model.number="boxPlacement.depth" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="세로 크기"
              />
            </div>
            
            <div class="form-group">
              <label>높이 (m):</label>
              <input 
                v-model.number="boxPlacement.height" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="높이 크기"
              />
            </div>
            
            <div class="form-group">
              <label>상자 색상:</label>
              <input 
                v-model="boxPlacement.color" 
                type="color" 
              />
            </div>
            
            <div class="form-group">
              <label>X 위치 (m):</label>
              <input 
                v-model.number="boxPlacement.x" 
                type="number" 
                min="-50" 
                max="50" 
                step="0.1" 
                required 
                placeholder="X 좌표"
              />
            </div>
            
            <div class="form-group">
              <label>Y 위치 (m):</label>
              <input 
                v-model.number="boxPlacement.y" 
                type="number" 
                min="-50" 
                max="50" 
                step="0.1" 
                required 
                placeholder="Y 좌표"
              />
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="closeBoxPlacementModal" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary">
                Place Box
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

// 타입 정의
interface GameObject {
  id: string
  name: string
  category: string
  glbUrl: string
  thumbnail?: string
  description?: string
  size?: string
  width?: number  // 가로
  depth?: number  // 세로
  height?: number // 높이
  color?: string  // 색상 (상자용)
  isBox?: boolean // 상자 여부
  lodUrl?: string // LOD용 GLB 파일 URL
  instancing?: boolean // 인스턴싱 활성화 여부
}

interface NewObject {
  name: string
  category: string
  description: string
  width: number  // 가로
  depth: number  // 세로
  height: number // 높이
  color?: string  // 색상 (상자용)
  etcType?: string // ETC 타입 (box 또는 general)
}



// 상태 관리
const objects = ref<GameObject[]>([])
const filteredObjects = ref<GameObject[]>([])
const selectedCategory = ref('all')
const searchQuery = ref('')
const selectedObject = ref<GameObject | null>(null)
const showUploadModal = ref(false)
const uploading = ref(false)
const showBoxPlacementModal = ref(false)

const newObject = ref<NewObject>({
  name: '',
  category: 'robot',
  description: '',
  width: 1.0,
  depth: 1.0,
  height: 2.0,
  color: '#D2B48C', // 기본 파스텔 브라운 색상
  etcType: 'general'
})

const boxPlacement = ref({
  name: '상자',
  width: 1.0,
  depth: 1.0,
  height: 1.0,
  color: '#D2B48C',
  x: 0.0, // X 좌표 (미터)
  y: 0.0  // Y 좌표 (미터)
})



let selectedFile: File | null = null
let selectedThumbnail: File | null = null

// 기본 오브젝트들
const defaultObjects: GameObject[] = [
  

  {
    id: 'default-robot-arm',
    name: 'Robot Arm',
    category: 'robot',
    glbUrl: '/robotArm.glb',
    thumbnail: '/로봇팔.png',
    description: '산업용 로봇 팔',
    size: '0.8m × 0.8m × 0.8m',
    width: 0.8,
    depth: 0.8,
    height: 0.8,
    instancing: false
  },
  {
    id: 'default-robot2',
    name: '로봇2',
    category: 'robot',
    glbUrl: '/로봇2.glb',
    thumbnail: '/로봇2.png',
    description: '로봇2',
    size: '1.0m × 1.0m × 1.5m',
    width: 1.0,
    depth: 1.0,
    height: 1.5,
    instancing: false
  },
  {
    id: 'default-dubot',
    name: '두봇',
    category: 'robot',
    glbUrl: '/두봇.glb',
    thumbnail: '/두봇.png',
    description: '두봇 로봇',
    size: '1.0m × 1.0m × 1.5m',
    width: 1.0,
    depth: 1.0,
    height: 1.5,
    instancing: false
  },
  {
    id: 'default-robot-cage',
    name: '로봇케이지',
    category: 'robot',
    glbUrl: '/로봇케이지.glb',
    lodUrl: '/로봇케이지_light.glb',
    thumbnail: '/로봇케이지.png',
    description: '로봇을 보호하는 케이지',
    size: '2.0m × 1.2m × 2.0m',
    width: 2.0,
    depth: 1.2,
    height: 2.0,
    instancing: false
  },

  {
    id: 'default-rack1',
    name: 'Rack1',
    category: 'equipment',
    glbUrl: '/Rack1.glb',
    lodUrl: '/Rack1_light.glb',
    thumbnail: '/Rack1.png',
    description: 'Rack1 설비',
    size: '2.0m ×1.0m × 2.0m',
    width: 2.0,
    depth: 1.0,
    height: 2.0,
    instancing: true // RACK1은 인스턴싱 적용
  },


  {
    id: 'default-tv',
    name: 'TV',
    category: 'av',
    glbUrl: '/TV.glb',
    thumbnail: '/TV.png',
    description: '65인치 스마트 TV',
    size: '1.45m × 0.84m × 0.08m',
    width: 1.45,  // 가로 (화면 너비)
    depth: 0.08,  // 세로 (두께) - TV는 얇음
    height: 0.84,  // 높이 (화면 높이) - TV는 세로가 더 큼
    instancing: false
  },

  {
    id: 'default-washing-machine',
    name: '세탁기',
    category: 'appliances',
    glbUrl: '/세탁기.glb',
    lodUrl: '/로봇케이지_light.glb',
    thumbnail: '/세탁기.png',
    description: '드럼 세탁기',
    size: '0.6m × 0.6m × 0.85m',
    width: 0.6,   // 가로
    depth: 0.6,   // 세로
    height: 0.85,  // 높이
    instancing: false
  },
  {
    id: 'default-family-hub',
    name: 'FamilyHub',
    category: 'appliances',
    glbUrl: '/패밀리허브.glb',
    thumbnail: '/패밀리허브.png',
    description: '스마트 패밀리 허브 냉장고',
    size: '1.2m × 1.0m × 2.2m',
    width: 1.2,   // 가로
    depth: 1.0,   // 세로
    height: 2.2,   // 높이
    instancing: false
  },
  {
    id: 'default-refrigerator',
    name: '냉장고',
    category: 'appliances',
    glbUrl: '/pearl_refrigerator_final.glb',
    thumbnail: '/냉장고1.png',
    description: '가정용 양문냉장고',
    size: '1.2m × 1.0m × 2.0m',
    width: 1.2,
    depth: 1.0,
    height: 2.0,
    instancing: false
  },
  {
    id: 'default-box',
    name: '상자',
    category: 'etc',
    glbUrl: 'box://placeholder',
    thumbnail: '/box-icon.png',
    description: '장비를 보관할 수 있는 상자',
    size: '1.0m × 1.0m × 1.0m',
    width: 1.0,
    depth: 1.0,
    height: 1.0,
    color: '#D2B48C',
    isBox: true,
    instancing: false
  }
]

// 계산된 속성
const filteredObjects_computed = computed(() => {
  let result = objects.value

  // 카테고리 필터
  if (selectedCategory.value !== 'all') {
    result = result.filter(obj => obj.category === selectedCategory.value)
  }

  // 검색 필터
  if (searchQuery.value) {
    const query = searchQuery.value.toLowerCase()
    result = result.filter(obj => 
      obj.name.toLowerCase().includes(query) ||
      obj.description?.toLowerCase().includes(query)
    )
  }

  return result
})

// 오브젝트 필터링
const filterObjects = () => {
  filteredObjects.value = filteredObjects_computed.value
}

// 오브젝트 선택
const selectObject = (object: GameObject) => {
  selectedObject.value = object
}

// 드래그 시작
const startDrag = (object: GameObject, event: DragEvent) => {
  if (event.dataTransfer) {
    event.dataTransfer.setData('application/json', JSON.stringify({
      type: 'object',
      object: object
    }))
  }
}

// 카테고리 변경 핸들러
const handleCategoryChange = () => {
  if (newObject.value.category === 'etc') {
    // ETC 카테고리 선택 시 기본값 설정
    newObject.value.etcType = 'general'
  }
}

// ETC 타입 변경 핸들러
const handleEtcTypeChange = () => {
  if (newObject.value.etcType === 'box') {
    // 상자 타입 선택 시 기본값 설정
    newObject.value.name = '상자'
    newObject.value.description = '장비를 보관할 수 있는 상자'
    newObject.value.color = '#D2B48C' // 파스텔 브라운
  } else {
    // 일반 ETC 타입 선택 시 기본값 설정
    newObject.value.name = ''
    newObject.value.description = ''
    newObject.value.color = '#D2B48C'
  }
}

// 파일 선택 핸들러
const handleFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedFile = target.files[0]
  }
}

const handleThumbnailSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedThumbnail = target.files[0]
  }
}

// 이미지 에러 핸들링
const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement
  target.style.display = 'none'
  target.parentElement!.innerHTML = '<div class="placeholder-icon">📦</div>'
}

// 오브젝트 업로드
const uploadObject = async () => {
  // ETC 상자가 아닌 경우에만 파일 체크
  const isBox = newObject.value.category === 'etc' && newObject.value.etcType === 'box'
  if (!isBox && !selectedFile) {
    alert('GLB 파일을 선택해주세요.')
    return
  }

  uploading.value = true

  try {
    let objectUrl = ''
    let thumbnailUrl = ''
    
    if (isBox) {
      // 상자는 GLB 파일 없이 생성
      objectUrl = 'box://placeholder'
    } else {
      // 일반 오브젝트는 파일 업로드
      objectUrl = URL.createObjectURL(selectedFile!)
    }
    
    if (selectedThumbnail) {
      thumbnailUrl = URL.createObjectURL(selectedThumbnail)
    }

    const newObj: GameObject = {
      id: Date.now().toString(),
      name: newObject.value.name,
      category: newObject.value.category,
      description: newObject.value.description,
      glbUrl: objectUrl,
      thumbnail: thumbnailUrl,
      size: `${newObject.value.width}m × ${newObject.value.depth}m × ${newObject.value.height}m`,
      width: newObject.value.width,
      depth: newObject.value.depth,
      height: newObject.value.height,
      color: newObject.value.color,
      isBox: isBox
    }

    objects.value.push(newObj)
    filterObjects()
    closeModal()

  } catch (error) {
    console.error('업로드 실패:', error)
    alert('파일 업로드에 실패했습니다.')
  } finally {
    uploading.value = false
  }
}

// 오브젝트 편집
const editObject = (object: GameObject) => {
  // 편집 모달 표시 로직
  
}

// 오브젝트 삭제
const deleteObject = (object: GameObject) => {
  if (confirm(`"${object.name}"을(를) 삭제하시겠습니까?`)) {
    const index = objects.value.findIndex(obj => obj.id === object.id)
    if (index > -1) {
      objects.value.splice(index, 1)
      filterObjects()
      
      if (selectedObject.value?.id === object.id) {
        selectedObject.value = null
      }
    }
  }
}

// 2D 뷰에 오브젝트 배치
const placeObject = () => {
  if (!selectedObject.value) return

  // 상자인 경우 배치 모달 표시
  if (selectedObject.value.isBox) {
    boxPlacement.value.name = selectedObject.value.name
    boxPlacement.value.width = selectedObject.value.width || 1.0
    boxPlacement.value.depth = selectedObject.value.depth || 1.0
    boxPlacement.value.height = selectedObject.value.height || 1.0
    boxPlacement.value.color = selectedObject.value.color || '#D2B48C'
    showBoxPlacementModal.value = true
  } else {
    // 일반 오브젝트는 바로 배치
    window.dispatchEvent(new CustomEvent('placeObject', {
      detail: {
        object: selectedObject.value
      }
    }))
  }
}

// 상자 배치 모달 닫기
const closeBoxPlacementModal = () => {
  showBoxPlacementModal.value = false
  
  // 입력값 초기화
  boxPlacement.value = {
    name: '상자',
    width: 1.0,
    depth: 1.0,
    height: 1.0,
    color: '#D2B48C',
    x: 0.0,
    y: 0.0
  }
}

// 상자 배치 확인
const confirmBoxPlacement = () => {
  const boxObject = {
    ...selectedObject.value!,
    name: boxPlacement.value.name,
    width: boxPlacement.value.width,
    depth: boxPlacement.value.depth,
    height: boxPlacement.value.height,
    color: boxPlacement.value.color,
    x: boxPlacement.value.x, // X 좌표 추가
    y: boxPlacement.value.y, // Y 좌표 추가
    size: `${boxPlacement.value.width}m × ${boxPlacement.value.depth}m × ${boxPlacement.value.height}m`
  }

  window.dispatchEvent(new CustomEvent('placeObject', {
    detail: {
      object: boxObject
    }
  }))

  closeBoxPlacementModal()
}

// 모달 관련
const closeModal = () => {
  showUploadModal.value = false
  newObject.value = {
    name: '',
    category: 'robot',
    description: '',
    width: 1.0,
    depth: 1.0,
    height: 2.0,
    color: '#D2B48C',
    etcType: 'general'
  }
  selectedFile = null
  selectedThumbnail = null
}

// 라이프사이클
onMounted(() => {
  objects.value = [...defaultObjects]
  filterObjects()
})
</script>

<style scoped>
.object-library {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-level-2, #141516);
  color: var(--color-text-primary, #f7f8f8);
  overflow: hidden;
  padding: 1rem;
}

.library-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.library-header h3 {
  margin: 0;
  font-size: 1.1rem;
  color: #2c3e50;
}

.category-filter, .search-box {
  margin-bottom: 1rem;
}

.category-filter select,
.search-box input {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid #ddd;
  border-radius: 4px;
  font-size: 0.9rem;
}

.objects-grid {
  flex: 1;
  overflow-y: auto;
  display: grid;
  grid-template-columns: 1fr;
  gap: 0.5rem;
  padding-right: 0.5rem;
}

.object-item {
  display: flex;
  flex-direction: column;
  background: var(--color-bg-level-1, #0f1011);
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: 8px;
  padding: 0.5rem;
  cursor: pointer;
  transition: all 0.3s ease;
  position: relative;
}

.object-item:hover {
  transform: translateY(-2px);
  box-shadow: 0 4px 12px rgba(0,0,0,0.1);
  border-color: #3498db;
}

.object-item.selected {
  border-color: var(--color-accent-primary, #3b82f6);
  background: var(--color-bg-tertiary, #232326);
}

.object-preview {
  width: 100%;
  height: 80px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-level-2, #141516);
  border-radius: 4px;
  margin-bottom: 0.5rem;
  overflow: hidden;
}

.object-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: cover;
}

.placeholder-icon {
  font-size: 2rem;
  color: var(--color-text-secondary, #a1a1aa);
}

.object-info h4 {
  margin: 0 0 0.25rem 0;
  font-size: 0.9rem;
  color: var(--color-text-primary, #f7f8f8);
}

.object-info p {
  margin: 0;
  font-size: 0.8rem;
  color: var(--color-text-secondary, #a1a1aa);
  text-transform: capitalize;
}

.object-info small {
  font-size: 0.7rem;
  color: var(--color-text-tertiary, #71717a);
}

.object-actions {
  position: absolute;
  top: 0.5rem;
  right: 0.5rem;
  display: flex;
  gap: 0.25rem;
  opacity: 0;
  transition: opacity 0.3s ease;
}

.object-item:hover .object-actions {
  opacity: 1;
}

.btn-icon {
  background: var(--color-bg-tertiary, #232326);
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: 4px;
  width: 24px;
  height: 24px;
  cursor: pointer;
  font-size: 0.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--color-text-primary, #f7f8f8);
}

.btn-icon:hover {
  background: var(--color-bg-quaternary, #28282c);
  border-color: var(--color-accent-primary, #3b82f6);
}

/* 모달 스타일 */
.modal-overlay {
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

.modal {
  background: var(--color-bg-level-1, #0f1011);
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 8px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  color: var(--color-text-primary, #f7f8f8);
}

.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem;
  border-bottom: 1px solid var(--color-border-primary, #23252a);
}

.modal-header h3 {
  margin: 0;
  color: var(--color-text-primary, #f7f8f8);
}

.btn-close {
  background: none;
  border: none;
  font-size: 1.5rem;
  cursor: pointer;
  color: var(--color-text-secondary, #a1a1aa);
}

.btn-close:hover {
  color: var(--color-text-primary, #f7f8f8);
}

.modal-body {
  padding: 1rem;
}

.form-group {
  margin-bottom: 1rem;
}

.form-group label {
  display: block;
  margin-bottom: 0.5rem;
  font-weight: bold;
  color: var(--color-text-primary, #f7f8f8);
}

.form-group input,
.form-group select,
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  background: var(--color-bg-level-2, #141516);
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--color-text-primary, #f7f8f8);
}

.form-group input:focus,
.form-group select:focus,
.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent-primary, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.2);
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
}

/* 선택된 오브젝트 정보 */
.selected-object-info {
  background: var(--color-bg-level-1, #0f1011);
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 8px;
  padding: 1rem;
  margin-top: 1rem;
}

.selected-object-info h4 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary, #f7f8f8);
  font-weight: 600;
}

.object-details p {
  margin: 0.25rem 0;
  font-size: 0.9rem;
  color: var(--color-text-secondary, #a1a1aa);
}

.object-details strong {
  color: var(--color-text-primary, #f7f8f8);
  font-weight: 600;
}

.placement-controls {
  margin-top: 1rem;
  padding-top: 1rem;
  border-top: 1px solid var(--color-border-secondary, #34343a);
}

/* 버튼 스타일 */
.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 0.9rem;
  font-weight: 500;
  transition: all 0.2s ease;
  text-decoration: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 0.5rem;
}

.btn-primary {
  background: var(--color-accent-primary, #3b82f6);
  color: white;
}

.btn-primary:hover {
  background: var(--color-accent-primary-hover, #2563eb);
  transform: translateY(-1px);
}

.btn-secondary {
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-primary, #f7f8f8);
  border: 1px solid var(--color-border-secondary, #34343a);
}

.btn-secondary:hover {
  background: var(--color-bg-quaternary, #28282c);
  border-color: var(--color-accent-primary, #3b82f6);
}
</style> 