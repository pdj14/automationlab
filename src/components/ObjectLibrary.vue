<template>
  <div class="object-library">
    <div class="library-header">
      <h3>📦 Object Template</h3>
      <button @click="showUploadModal = true" class="btn-add-object" title="Add Object">
        ➕
      </button>
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
            
            <div class="form-group">
              <label>GLB File:</label>
              <input 
                @change="handleFileSelect" 
                type="file" 
                accept=".glb,.gltf" 
                required
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
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

// 타입 정의
interface NewObject {
  name: string
  category: string
  description: string
  width: number  // 가로
  depth: number  // 세로
  height: number // 높이
  etcType?: string // ETC 타입 (general)
}

// 상태 관리
const showUploadModal = ref(false)
const uploading = ref(false)

const newObject = ref<NewObject>({
  name: '',
  category: 'robot',
  description: '',
  width: 1.0,
  depth: 1.0,
  height: 2.0,
  etcType: 'general'
})

let selectedFile: File | null = null
let selectedThumbnail: File | null = null

// 카테고리 변경 핸들러
const handleCategoryChange = () => {
  if (newObject.value.category === 'etc') {
    // ETC 카테고리 선택 시 기본값 설정
    newObject.value.etcType = 'general'
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

// 오브젝트 업로드
const uploadObject = async () => {
  if (!selectedFile) {
    alert('GLB 파일을 선택해주세요.')
    return
  }

  uploading.value = true

  try {
    const objectUrl = URL.createObjectURL(selectedFile!)
    let thumbnailUrl = ''
    
    if (selectedThumbnail) {
      thumbnailUrl = URL.createObjectURL(selectedThumbnail)
    }

    // 여기에 실제 업로드 로직을 구현할 수 있습니다
    console.log('New Object:', {
      ...newObject.value,
      glbUrl: objectUrl,
      thumbnail: thumbnailUrl
    })

    alert('Object added successfully!')
    closeModal()

  } catch (error) {
    console.error('업로드 실패:', error)
    alert('파일 업로드에 실패했습니다.')
  } finally {
    uploading.value = false
  }
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
    etcType: 'general'
  }
  selectedFile = null
  selectedThumbnail = null
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
  min-height: 40px;
}

.library-header h3 {
  margin: 0;
  font-size: 1rem;
  color: var(--color-text-primary, #f7f8f8);
  white-space: nowrap;
  flex: 1;
}

.btn-add-object {
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  border: 1px solid var(--color-border-primary, #23252a);
  border-radius: 50%;
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  font-size: 16px;
  transition: all 0.2s ease;
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
}

.btn-add-object:hover {
  background: var(--color-bg-level-2, #141516);
  border-color: var(--color-border-secondary, #2a2d33);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.15);
}

.btn-add-object:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0,0,0,0.1);
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