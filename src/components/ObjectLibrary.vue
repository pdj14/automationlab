<template>
  <div class="object-library">
    <div class="library-header">
      <h3>📦 Object Library</h3>
      <div class="header-actions">
        <button @click="fetchObjectTemplates" class="btn btn-secondary" :disabled="loading">
          🔄 {{ loading ? 'Loading...' : 'Refresh' }}
        </button>
        <button @click="showUploadModal = true" class="btn btn-primary">
          ➕ Add New
        </button>
      </div>
    </div>

    <!-- 에러 메시지 -->
    <div v-if="error" class="error-message">
      ❌ {{ error }}
    </div>

    <!-- 로딩 상태 -->
    <div v-if="loading" class="loading-message">
      ⏳ Loading object templates...
    </div>

    <!-- 오브젝트 목록 -->
    <div v-else-if="objectTemplates.length > 0" class="object-grid">
      <div 
        v-for="template in objectTemplates" 
        :key="template.id" 
        class="object-card"
      >
        <div class="object-thumbnail">
          <img 
            v-if="template.thumbnailUrl" 
            :src="template.thumbnailUrl" 
            :alt="template.name"
            @error="handleImageError"
          />
          <div v-else class="no-thumbnail">
            📦
          </div>
        </div>
        
        <div class="object-info">
          <div class="object-header">
            <h4 class="object-name">{{ template.name }}</h4>
            <div class="header-actions">
              <button 
                @click.stop="placeObject(template)" 
                class="btn-place"
                title="Place object on floor plan"
              >
                <span class="btn-icon">📍</span>
                <span class="btn-text">Place</span>
              </button>
              <button 
                @click.stop="editObject(template)" 
                class="btn-edit btn-icon-only"
                title="Edit object template"
              >
                <span class="btn-icon">✏️</span>
              </button>
              <button 
                @click.stop="confirmDelete(template)" 
                class="btn-delete btn-icon-only"
                title="Delete object"
              >
                <span class="btn-icon">🗑️</span>
              </button>
            </div>
          </div>
          <div class="object-category">{{ template.category }}</div>
          <div class="object-dimensions">
            {{ template.width }}m × {{ template.height }}m × {{ template.depth }}m
          </div>
          <div v-if="template.description" class="object-description">
            {{ template.description }}
          </div>
          <div class="object-meta">
            <span class="instancing-badge" :class="{ enabled: template.instancingEnabled }">
              {{ template.instancingEnabled ? 'Instancing ON' : 'Instancing OFF' }}
            </span>
            <span v-if="template.color" class="color-badge" :style="{ backgroundColor: template.color }">
              {{ template.color }}
            </span>
          </div>

        </div>
      </div>
    </div>

    <!-- 빈 상태 -->
    <div v-else class="empty-state">
      <div class="empty-icon">📦</div>
      <h3>No objects found</h3>
      <p>Add your first 3D object to get started!</p>
      <button @click="showUploadModal = true" class="btn btn-primary">
        ➕ Add Object Template
      </button>
    </div>

    <!-- 업로드 모달 -->
    <div v-if="showUploadModal" class="modal-overlay">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Add New Object Template</h3>
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
                <option value="ROBOT">ROBOT</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="APPLIANCES">APPLIANCES</option>
                <option value="AV">AV</option>
                <option value="RACK">RACK</option>
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
              <label>Height (m):</label>
              <input 
                v-model.number="newObject.height" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="세로 크기"
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
                placeholder="높이 크기"
              />
            </div>
            
            <div class="form-group">
              <label>GLB File (optional):</label>
              <input 
                @change="handleFileSelect" 
                type="file" 
                accept=".glb,.gltf" 
              />
            </div>
            
            <div class="form-group">
              <label>LOD File (optional):</label>
              <input 
                @change="handleLodFileSelect" 
                type="file" 
                accept=".glb,.gltf" 
              />
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
              <label>Color (hex):</label>
              <div class="color-input-group">
                <input 
                  v-model="newObject.color" 
                  type="color" 
                  class="color-picker"
                />
                <span class="color-hex-display">{{ newObject.color }}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>
                <input 
                  v-model="newObject.instancingEnabled" 
                  type="checkbox" 
                />
                Enable Instancing
              </label>
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

    <!-- 편집 모달 -->
    <div v-if="showEditModal" class="modal-overlay">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Edit Object Template</h3>
          <button @click="closeEditModal" class="btn-close">✕</button>
        </div>
        
        <div class="modal-body">
          <form @submit.prevent="updateObject">
            <div class="form-group">
              <label>Object Name:</label>
              <input v-model="editObjectData.name" type="text" readonly class="readonly-field" />
              <small class="field-note">Object name cannot be changed</small>
            </div>
            
            <div class="form-group">
              <label>Category:</label>
              <select v-model="editObjectData.category" required @change="handleCategoryChange">
                <option value="ROBOT">ROBOT</option>
                <option value="EQUIPMENT">EQUIPMENT</option>
                <option value="APPLIANCES">APPLIANCES</option>
                <option value="AV">AV</option>
                <option value="RACK">RACK</option>
              </select>
            </div>
            
            <div class="form-group">
              <label>Width (m):</label>
              <input 
                v-model.number="editObjectData.width" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="가로 크기"
              />
            </div>
            
            <div class="form-group">
              <label>Height (m):</label>
              <input 
                v-model.number="editObjectData.height" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="세로 크기"
              />
            </div>

            <div class="form-group">
              <label>Depth (m):</label>
              <input 
                v-model.number="editObjectData.depth" 
                type="number" 
                min="0.1" 
                max="10" 
                step="0.1" 
                required 
                placeholder="높이 크기"
              />
            </div>
            
            
            <div class="form-group">
              <label>Color (hex):</label>
              <div class="color-input-group">
                <input 
                  v-model="editObjectData.color" 
                  type="color" 
                  class="color-picker"
                />
                <span class="color-hex-display">{{ editObjectData.color }}</span>
              </div>
            </div>
            
            <div class="form-group">
              <label>
                <input 
                  v-model="editObjectData.instancingEnabled" 
                  type="checkbox" 
                />
                Enable Instancing
              </label>
            </div>
            
            <div class="form-group">
              <label>Description:</label>
              <textarea v-model="editObjectData.description" rows="3"></textarea>
            </div>
            
            <div class="modal-actions">
              <button type="button" @click="closeEditModal" class="btn btn-secondary">
                Cancel
              </button>
              <button type="submit" class="btn btn-primary" :disabled="updating">
                {{ updating ? 'Updating...' : 'Update Object' }}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>

    <!-- 삭제 확인 모달 -->
    <div v-if="showDeleteModal" class="modal-overlay">
      <div class="modal" @click.stop>
        <div class="modal-header">
          <h3>Delete Object</h3>
          <button @click="closeDeleteModal" class="btn-close">✕</button>
        </div>
        
        <div class="modal-body">
          <div class="delete-warning">
            <div class="warning-icon">⚠️</div>
            <p>Are you sure you want to delete <strong>{{ objectToDelete?.name }}</strong>?</p>
            <p class="warning-text">This action cannot be undone.</p>
          </div>
          
          <div class="modal-actions">
            <button @click="closeDeleteModal" class="btn btn-secondary" :disabled="deleting">
              Cancel
            </button>
            <button @click="deleteObject" class="btn btn-danger" :disabled="deleting">
              {{ deleting ? 'Deleting...' : 'Delete' }}
            </button>
          </div>
        </div>
      </div>
    </div>

    <!-- Object Placement Popup -->
    <div v-if="showPlacementPopup" class="popup-overlay">
      <div class="popup-content" @click.stop>
        <div class="popup-header">
          <h3>📍 Place Object</h3>
          <button @click="closePlacementPopup" class="btn-close">×</button>
        </div>
        
        <div class="popup-body">
          <div class="object-preview">
            <div class="preview-thumbnail">
              <img 
                v-if="selectedTemplate?.thumbnailUrl" 
                :src="selectedTemplate.thumbnailUrl" 
                :alt="selectedTemplate.name"
              />
              <div v-else class="no-thumbnail">📦</div>
            </div>
            <div class="preview-info">
              <h4>{{ selectedTemplate?.name }}</h4>
              <p>{{ selectedTemplate?.width }}m × {{ selectedTemplate?.height }}m × {{ selectedTemplate?.depth }}m</p>
            </div>
          </div>
          
          <div class="placement-form">
            <div class="form-group">
              <label for="placement-x">X Position (meters):</label>
              <input 
                id="placement-x"
                v-model.number="placementData.x" 
                type="number" 
                step="0.1" 
                min="0" 
                max="100"
                placeholder="0.0"
              />
            </div>
            
            <div class="form-group">
              <label for="placement-y">Y Position (meters):</label>
              <input 
                id="placement-y"
                v-model.number="placementData.y" 
                type="number" 
                step="0.1" 
                min="0" 
                max="100"
                placeholder="0.0"
              />
            </div>
            
            <div class="form-group">
              <label for="placement-rotation">Rotation (degrees):</label>
              <input 
                id="placement-rotation"
                v-model.number="placementData.rotation" 
                type="number" 
                step="1" 
                min="0" 
                max="360"
                placeholder="0"
              />
            </div>
            
            <div class="form-group">
              <label for="placement-description">Description (optional):</label>
              <textarea 
                id="placement-description"
                v-model="placementData.description" 
                rows="3"
                placeholder="Enter object description..."
                maxlength="200"
              ></textarea>
              <div class="char-count">{{ placementData.description?.length || 0 }}/200</div>
            </div>
          </div>
        </div>
        
        <div class="popup-footer">
          <button @click="closePlacementPopup" class="btn btn-secondary">Cancel</button>
          <button @click="confirmPlacement" class="btn btn-primary">Place Object</button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { storeToRefs } from 'pinia'
import { useObjectStore } from '../stores/objectStore'

// Props와 Emits 정의
const emit = defineEmits<{
  objectSelected: [object: ObjectTemplate]
}>()

// 타입 정의
interface NewObject {
  name: string
  category: string
  description: string
  width: number  // 가로
  depth: number  // 세로
  height: number // 높이
  color?: string // 색상 (hex)
  instancingEnabled?: boolean // 인스턴싱 활성화
  etcType?: string // ETC 타입 (general)
}

interface ObjectTemplate {
  id: string
  name: string
  category: string
  description?: string
  width: number
  depth: number
  height: number
  color?: string
  instancingEnabled: boolean
  etcType?: string
  glbFileUrl?: string
  lodFileUrl?: string
  thumbnailUrl?: string
  createdAt: string
  updatedAt: string
}

// 상태 관리
const showUploadModal = ref(false)
const uploading = ref(false)
const error = ref<string | null>(null)
const showDeleteModal = ref(false)
const deleting = ref(false)
const objectToDelete = ref<ObjectTemplate | null>(null)

// 편집 모달 관련 상태
const showEditModal = ref(false)
const updating = ref(false)
const objectToEdit = ref<ObjectTemplate | null>(null)
const editObjectData = ref<NewObject>({
  name: '',
  category: 'ROBOT',
  description: '',
  width: 1.0,
  depth: 1.0,
  height: 1.0,
  color: '#3B82F6',
  instancingEnabled: true,
  etcType: 'general'
})


// Placement Popup 관련
const showPlacementPopup = ref(false)
const selectedTemplate = ref<ObjectTemplate | null>(null)
const placementData = ref({
  x: 0,
  y: 0,
  rotation: 0,
  description: ''
})

const newObject = ref<NewObject>({
  name: '',
  category: 'ROBOT',
  description: '',
  width: 1.0,
  depth: 1.0,
  height: 1.0,
  color: '#3B82F6',
  instancingEnabled: true,
  etcType: 'general'
})

let selectedFile: File | null = null
let selectedThumbnail: File | null = null
let selectedLodFile: File | null = null

// objectStore 인스턴스
const objectStore = useObjectStore()

// Store에서 상태 가져오기
const { objectTemplates, isLoadingObjectTemplates: loading } = storeToRefs(objectStore)

// API 함수들
const fetchObjectTemplates = async () => {
  error.value = null
  
  try {
    await objectStore.fetchObjectTemplates()
    console.log('Fetched templates from store')
  } catch (err) {
    error.value = `Network error: ${err}`
    console.error('Fetch error:', err)
  }
}

// 컴포넌트 마운트 시에는 별도 로드하지 않음 (2D 에디터에서 로드됨)

// 오브젝트 배치 핸들러
const placeObject = (template: ObjectTemplate) => {
  console.log('Placing object:', template)
  
  // Placement Popup 표시
  selectedTemplate.value = template
  placementData.value = {
    x: 0,
    y: 0,
    rotation: 0,
    description: ''
  }
  showPlacementPopup.value = true
}

// 오브젝트 편집 핸들러
const editObject = (template: ObjectTemplate) => {
  console.log('Editing object:', template)
  
  // 편집할 오브젝트 정보 설정
  objectToEdit.value = template
  editObjectData.value = {
    name: template.name,
    category: template.category,
    description: template.description || '',
    width: template.width,
    depth: template.depth,
    height: template.height,
    color: template.color || '#3B82F6',
    instancingEnabled: template.instancingEnabled,
    etcType: template.etcType || 'general'
  }
  
  
  showEditModal.value = true
}

// Placement Popup 관련 함수들
const closePlacementPopup = () => {
  showPlacementPopup.value = false
  selectedTemplate.value = null
  placementData.value = {
    x: 0,
    y: 0,
    rotation: 0,
    description: ''
  }
}

const confirmPlacement = () => {
  if (!selectedTemplate.value) return
  
  // 선택된 템플릿에 위치, 회전, 설명 정보 추가
  const objectWithPlacement = {
    ...selectedTemplate.value,
    x: placementData.value.x,
    y: placementData.value.y,
    rotation: placementData.value.rotation,
    description: placementData.value.description || selectedTemplate.value.description || ''
  }
  
  // 2D 에디터에 오브젝트 배치 이벤트 전달
  emit('objectSelected', objectWithPlacement)
  
  // Popup 닫기
  closePlacementPopup()
}

// 이미지 로드 에러 핸들러
const handleImageError = (event: Event) => {
  const img = event.target as HTMLImageElement
  img.style.display = 'none'
  const parent = img.parentElement
  if (parent) {
    parent.innerHTML = '<div class="no-thumbnail">📦</div>'
  }
}

// 삭제 확인
const confirmDelete = (template: ObjectTemplate) => {
  objectToDelete.value = template
  showDeleteModal.value = true
}

// 오브젝트 삭제
const deleteObject = async () => {
  if (!objectToDelete.value) return
  
  deleting.value = true
  
  try {
    const success = await objectStore.deleteObjectTemplate(objectToDelete.value.id)
    
    if (success) {
      console.log('Object deleted successfully')
      alert('Object deleted successfully!')
      closeDeleteModal()
      // 삭제 성공 후 목록 새로고침
      await fetchObjectTemplates()
    } else {
      console.error('Delete failed')
      alert('Failed to delete object. Please try again.')
    }
  } catch (err) {
    console.error('Delete error:', err)
    alert('Failed to delete object. Please check your connection.')
  } finally {
    deleting.value = false
  }
}

// 삭제 모달 닫기
const closeDeleteModal = () => {
  showDeleteModal.value = false
  objectToDelete.value = null
}

// 카테고리 변경 핸들러
const handleCategoryChange = () => {
  // 카테고리 변경 시 필요한 로직이 있다면 여기에 추가
  console.log('Category changed to:', newObject.value.category)
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

const handleLodFileSelect = (event: Event) => {
  const target = event.target as HTMLInputElement
  if (target.files && target.files[0]) {
    selectedLodFile = target.files[0]
  }
}




// 오브젝트 업로드
const uploadObject = async () => {
  uploading.value = true

  try {
    // FormData 생성
    const formData = new FormData()
    
    // 필수 필드
    formData.append('name', newObject.value.name)
    formData.append('category', newObject.value.category)
    formData.append('width', newObject.value.width.toString())
    formData.append('depth', newObject.value.depth.toString())
    formData.append('height', newObject.value.height.toString())
    
    // 선택적 필드
    if (newObject.value.description && newObject.value.description.trim()) {
      formData.append('description', newObject.value.description)
    }
    
    if (newObject.value.color) {
      formData.append('color', newObject.value.color)
    }
    
    formData.append('instancingEnabled', newObject.value.instancingEnabled ? 'true' : 'false')
    
    // 파일 첨부
    if (selectedFile) {
      formData.append('glbFile', selectedFile)
    }
    
    if (selectedThumbnail) {
      formData.append('thumbnailFile', selectedThumbnail)
    }
    
    if (selectedLodFile) {
      formData.append('lodFile', selectedLodFile)
    }

    // API 호출
    const createdTemplate = await objectStore.uploadObjectTemplate(formData)

    if (createdTemplate) {
      console.log('Created template:', createdTemplate)
      alert('Object added successfully!')
      closeModal()
      // 업로드 성공 후 목록 새로고침
      await fetchObjectTemplates()
    } else {
      console.error('Upload failed')
      alert('Failed to add object. Please check the form data.')
    }

  } catch (error) {
    console.error('Upload error:', error)
    alert('Failed to upload object. Please try again.')
  } finally {
    uploading.value = false
  }
}

// 오브젝트 업데이트
const updateObject = async () => {
  if (!objectToEdit.value) return
  
  updating.value = true
  
  try {
    // FormData 생성
    const formData = new FormData()
    
    // 필수 필드
    formData.append('name', editObjectData.value.name)
    formData.append('category', editObjectData.value.category)
    formData.append('width', editObjectData.value.width.toString())
    formData.append('depth', editObjectData.value.depth.toString())
    formData.append('height', editObjectData.value.height.toString())
    
    // 선택적 필드
    if (editObjectData.value.description && editObjectData.value.description.trim()) {
      formData.append('description', editObjectData.value.description)
    }
    
    if (editObjectData.value.color) {
      formData.append('color', editObjectData.value.color)
    }
    
    formData.append('instancingEnabled', editObjectData.value.instancingEnabled ? 'true' : 'false')

    // API 호출 (업데이트용) - 파일 없이 텍스트 데이터만 전송
    const success = await objectStore.updateObjectTemplateText(objectToEdit.value.name, {
      name: editObjectData.value.name,
      category: editObjectData.value.category,
      width: editObjectData.value.width,
      depth: editObjectData.value.depth,
      height: editObjectData.value.height,
      description: editObjectData.value.description,
      color: editObjectData.value.color,
      instancingEnabled: editObjectData.value.instancingEnabled,
      etcType: editObjectData.value.etcType
    })

    if (success) {
      console.log('Object updated successfully')
      alert('Object updated successfully!')
      // 페이지 reload
      window.location.reload()
    } else {
      console.error('Update failed')
      alert('Failed to update object. Please try again.')
    }

  } catch (error) {
    console.error('Update error:', error)
    alert('Failed to update object. Please try again.')
  } finally {
    updating.value = false
  }
}

// 모달 관련
const closeModal = () => {
  showUploadModal.value = false
  newObject.value = {
    name: '',
    category: 'ROBOT',
    description: '',
    width: 1.0,
    depth: 1.0,
    height: 2.0,
    color: '#3B82F6',
    instancingEnabled: true,
    etcType: 'general'
  }
  selectedFile = null
  selectedThumbnail = null
  selectedLodFile = null
}

const closeEditModal = () => {
  showEditModal.value = false
  objectToEdit.value = null
  editObjectData.value = {
    name: '',
    category: 'ROBOT',
    description: '',
    width: 1.0,
    depth: 1.0,
    height: 1.0,
    color: '#3B82F6',
    instancingEnabled: true,
    etcType: 'general'
  }
}
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

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

/* 에러 및 로딩 메시지 */
.error-message {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  border-radius: 6px;
  padding: 1rem;
  margin-bottom: 1rem;
  color: #fca5a5;
  font-size: 0.9rem;
}

.loading-message {
  text-align: center;
  padding: 2rem;
  color: var(--color-text-secondary, #a1a1aa);
  font-size: 1rem;
}

/* 오브젝트 그리드 */
.object-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 0.75rem;
  padding: 0.5rem 0;
  max-height: calc(100vh - 200px);
  overflow-y: auto;
}

.object-card {
  background: var(--color-bg-level-1, #0f1011);
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 8px;
  padding: 0.75rem;
  transition: all 0.2s ease;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  width: 100%;
  height: auto;
}

.object-card:hover {
  border-color: var(--color-border-secondary, #34343a);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.object-thumbnail {
  width: 100%;
  height: 80px;
  background: var(--color-bg-level-2, #141516);
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
  border: 1px solid var(--color-border-secondary, #34343a);
}

.object-thumbnail img {
  max-width: 80%;
  max-height: 80%;
  width: auto;
  height: auto;
  object-fit: contain;
  border-radius: 4px;
}

.no-thumbnail {
  font-size: 1.5rem;
  color: var(--color-text-secondary, #a1a1aa);
}

.object-info {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 0.25rem;
}

.object-header {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 0.5rem;
}

.header-actions {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.object-name {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 600;
  color: var(--color-text-primary, #f7f8f8);
  line-height: 1.2;
  flex: 1;
}

.btn-place {
  background: var(--color-accent-primary, #3b82f6);
  border: none;
  color: white;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 70px;
  height: 28px;
  font-weight: 500;
}

.btn-place:hover {
  background: var(--color-accent-secondary, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

.btn-edit {
  background: rgba(34, 197, 94, 0.1);
  border: 1px solid rgba(34, 197, 94, 0.3);
  color: #4ade80;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 70px;
  height: 28px;
  font-weight: 500;
}

.btn-edit:hover {
  background: rgba(34, 197, 94, 0.2);
  border-color: rgba(34, 197, 94, 0.5);
  color: #22c55e;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(34, 197, 94, 0.2);
}

.btn-edit.btn-icon-only {
  min-width: 32px;
  width: 32px;
  padding: 0.4rem;
  justify-content: center;
}

.btn-delete {
  background: rgba(239, 68, 68, 0.1);
  border: 1px solid rgba(239, 68, 68, 0.3);
  color: #fca5a5;
  cursor: pointer;
  padding: 0.4rem 0.6rem;
  border-radius: 6px;
  transition: all 0.2s ease;
  font-size: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.25rem;
  min-width: 70px;
  height: 28px;
  font-weight: 500;
}

.btn-delete:hover {
  background: rgba(239, 68, 68, 0.2);
  border-color: rgba(239, 68, 68, 0.5);
  color: #f87171;
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(239, 68, 68, 0.2);
}

.btn-delete.btn-icon-only {
  min-width: 32px;
  width: 32px;
  padding: 0.4rem;
  justify-content: center;
}

.btn-icon {
  font-size: 0.8rem;
  line-height: 1;
}

.btn-icon-only .btn-icon {
  font-size: 0.9rem;
}

.btn-text {
  font-size: 0.7rem;
  line-height: 1;
}

.object-category {
  font-size: 0.75rem;
  color: var(--color-accent-primary, #3b82f6);
  font-weight: 500;
  text-transform: uppercase;
  letter-spacing: 0.5px;
}

.object-dimensions {
  font-size: 0.8rem;
  color: var(--color-text-secondary, #a1a1aa);
  font-family: monospace;
}

.object-description {
  font-size: 0.85rem;
  color: var(--color-text-secondary, #a1a1aa);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.object-meta {
  display: flex;
  gap: 0.5rem;
  flex-wrap: nowrap;
  align-items: center;
  justify-content: space-between;
}

.instancing-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-secondary, #a1a1aa);
  border: 1px solid var(--color-border-secondary, #34343a);
  white-space: nowrap;
}

.instancing-badge.enabled {
  background: rgba(34, 197, 94, 0.1);
  color: #4ade80;
  border-color: rgba(34, 197, 94, 0.3);
}

.color-badge {
  font-size: 0.7rem;
  padding: 0.2rem 0.4rem;
  border-radius: 4px;
  color: white;
  font-weight: 500;
  text-shadow: 0 1px 2px rgba(0, 0, 0, 0.5);
  min-width: 50px;
  text-align: center;
  white-space: nowrap;
}

/* 빈 상태 */
.empty-state {
  text-align: center;
  padding: 3rem 1rem;
  color: var(--color-text-secondary, #a1a1aa);
}

.empty-icon {
  font-size: 4rem;
  margin-bottom: 1rem;
  opacity: 0.5;
}

.empty-state h3 {
  margin: 0 0 0.5rem 0;
  color: var(--color-text-primary, #f7f8f8);
  font-size: 1.2rem;
}

.empty-state p {
  margin: 0 0 1.5rem 0;
  font-size: 0.9rem;
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

.color-input-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.color-picker {
  width: 40px;
  height: 40px;
  padding: 0;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  background: none;
}

.color-hex-display {
  min-width: 80px;
  padding: 0.5rem;
  background: var(--color-bg-level-2, #141516);
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: 4px;
  font-size: 0.9rem;
  color: var(--color-text-primary, #f7f8f8);
  font-family: monospace;
  text-align: center;
  text-transform: uppercase;
  user-select: all;
}



.form-group input[type="checkbox"] {
  width: auto;
  margin-right: 0.5rem;
}

.form-group label {
  display: flex;
  align-items: center;
  cursor: pointer;
}

.modal-actions {
  display: flex;
  gap: 0.5rem;
  justify-content: flex-end;
  margin-top: 1rem;
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

.btn-danger {
  background: #ef4444;
  color: white;
}

.btn-danger:hover {
  background: #dc2626;
  transform: translateY(-1px);
}

.btn-danger:disabled {
  background: #6b7280;
  cursor: not-allowed;
  transform: none;
}

/* 삭제 확인 모달 스타일 */
.delete-warning {
  text-align: center;
  padding: 1rem 0;
}

.warning-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.delete-warning p {
  margin: 0.5rem 0;
  color: var(--color-text-primary, #f7f8f8);
}

.warning-text {
  color: var(--color-text-secondary, #a1a1aa);
  font-size: 0.9rem;
}

/* Placement Popup Styles */
.popup-overlay {
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

.popup-content {
  background: var(--color-bg-level-1, #0f1011);
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  max-height: 90vh;
  overflow-y: auto;
  box-shadow: 0 20px 40px rgba(0, 0, 0, 0.3);
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem;
  border-bottom: 1px solid var(--color-border-primary, #23252a);
}

.popup-header h3 {
  margin: 0;
  color: var(--color-text-primary, #f7f8f8);
  font-size: 1.2rem;
}

.btn-close {
  background: none;
  border: none;
  color: var(--color-text-secondary, #a1a1aa);
  font-size: 1.5rem;
  cursor: pointer;
  padding: 0;
  width: 30px;
  height: 30px;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 4px;
  transition: all 0.2s ease;
}

.btn-close:hover {
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-primary, #f7f8f8);
}

.popup-body {
  padding: 1.5rem;
}

.object-preview {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin-bottom: 1.5rem;
  padding: 1rem;
  background: var(--color-bg-level-2, #1a1b1e);
  border-radius: 8px;
  border: 1px solid var(--color-border-secondary, #34343a);
}

.preview-thumbnail {
  width: 60px;
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: var(--color-bg-tertiary, #232326);
  border-radius: 6px;
  overflow: hidden;
}

.preview-thumbnail img {
  width: 100%;
  height: 100%;
  object-fit: contain;
}

.preview-thumbnail .no-thumbnail {
  font-size: 1.5rem;
  color: var(--color-text-secondary, #a1a1aa);
}

.preview-info h4 {
  margin: 0 0 0.25rem 0;
  color: var(--color-text-primary, #f7f8f8);
  font-size: 1rem;
}

.preview-info p {
  margin: 0;
  color: var(--color-text-secondary, #a1a1aa);
  font-size: 0.85rem;
}

.placement-form {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.placement-form .form-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.placement-form label {
  color: var(--color-text-primary, #f7f8f8);
  font-size: 0.9rem;
  font-weight: 500;
}

.placement-form input {
  padding: 0.75rem;
  border: 1px solid var(--color-border-secondary, #34343a);
  border-radius: 6px;
  background: var(--color-bg-level-2, #1a1b1e);
  color: var(--color-text-primary, #f7f8f8);
  font-size: 0.9rem;
  transition: all 0.2s ease;
}

.placement-form input:focus {
  outline: none;
  border-color: var(--color-accent-primary, #3b82f6);
  box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.1);
}

.placement-form input::placeholder {
  color: var(--color-text-tertiary, #71717a);
}

.popup-footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  padding: 1.5rem;
  border-top: 1px solid var(--color-border-primary, #23252a);
}

.popup-footer .btn {
  padding: 0.75rem 1.5rem;
  border-radius: 6px;
  font-size: 0.9rem;
  font-weight: 500;
  cursor: pointer;
  transition: all 0.2s ease;
  border: none;
}

.popup-footer .btn-secondary {
  background: var(--color-bg-tertiary, #232326);
  color: var(--color-text-primary, #f7f8f8);
  border: 1px solid var(--color-border-secondary, #34343a);
}

.popup-footer .btn-secondary:hover {
  background: var(--color-bg-quaternary, #28282c);
  border-color: var(--color-accent-primary, #3b82f6);
}

.popup-footer .btn-primary {
  background: var(--color-accent-primary, #3b82f6);
  color: white;
}

.popup-footer .btn-primary:hover {
  background: var(--color-accent-secondary, #2563eb);
  transform: translateY(-1px);
  box-shadow: 0 4px 8px rgba(59, 130, 246, 0.3);
}

/* Description textarea and char count styles */
.form-group textarea {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 6px;
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  font-family: inherit;
  font-size: 0.9rem;
  resize: vertical;
  min-height: 60px;
}

.form-group textarea:focus {
  outline: none;
  border-color: var(--color-accent-primary, #3b82f6);
  box-shadow: 0 0 0 2px rgba(59, 130, 246, 0.1);
}

.char-count {
  text-align: right;
  font-size: 0.75rem;
  color: var(--color-text-secondary, #a1a1aa);
  margin-top: 0.25rem;
}

.file-info {
  display: block;
  font-size: 0.75rem;
  color: var(--color-accent-primary, #3b82f6);
  margin-top: 0.25rem;
  padding: 0.25rem 0.5rem;
  background: rgba(59, 130, 246, 0.1);
  border-radius: 4px;
  border: 1px solid rgba(59, 130, 246, 0.2);
}

.readonly-field {
  background: var(--color-bg-tertiary, #232326) !important;
  color: var(--color-text-secondary, #a1a1aa) !important;
  cursor: not-allowed !important;
  border-color: var(--color-border-secondary, #34343a) !important;
}

.field-note {
  display: block;
  font-size: 0.75rem;
  color: var(--color-text-tertiary, #71717a);
  margin-top: 0.25rem;
  font-style: italic;
}

</style>