import { defineStore } from 'pinia'
import { ref } from 'vue'
import axios from 'axios'

// Point interface (shared with floorplan)
interface Point {
  x: number
  y: number
}

// 배치된 오브젝트 타입 정의
interface PlacedObject {
  id: string
  name: string
  category: string
  glbUrl?: string   // GLB 파일 URL (Box의 경우 선택사항)
  lodUrl?: string   // LOD 모델 URL (선택사항)
  description?: string
  width: number  // 가로
  depth: number  // 세로
  height: number // 높이
  position: Point
  rotation: number // 회전 각도 (라디안)
  color?: string   // GLB에서 추출한 주요 색상 (hex)
  isOnBox?: boolean // 상자 위 배치 여부
  boxId?: string    // 상자 ID (상자 위에 배치된 경우)
  isBox?: boolean   // 상자 여부
  instancing?: boolean // 인스턴싱 활성화 여부
}

// Object3D 템플릿 데이터 타입 정의
interface Object3DTemplate {
  id: string
  name: string
  category: string
  description?: string
  glbUrl?: string
  lodUrl?: string
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
  // Base64 인코딩된 파일 데이터
  files?: {
    glb?: string      // Base64 인코딩된 GLB 파일
    thumbnail?: string // Base64 인코딩된 썸네일 파일
    lod?: string      // Base64 인코딩된 LOD 파일
  }
}

// Object Store
export const useObjectStore = defineStore('object', () => {
  // 상태 (state)
  const placedObjects = ref<PlacedObject[]>([]) // 배치된 오브젝트들
  const objectTemplates = ref<Object3DTemplate[]>([]) // Object3D 템플릿 데이터
  const isLoadingObjectTemplates = ref(false) // Object3D 템플릿 로딩 상태

  // 배치된 오브젝트 관리 액션들
  const addPlacedObject = (object: PlacedObject) => {
    placedObjects.value.push(object)
  }
  
  const updatePlacedObject = (objectId: string, updatedObject: PlacedObject) => {
    const index = placedObjects.value.findIndex(obj => obj.id === objectId)
    if (index > -1) {
      placedObjects.value[index] = updatedObject
    }
  }
  
  const removePlacedObject = (objectId: string) => {
    placedObjects.value = placedObjects.value.filter(obj => obj.id !== objectId)
  }
  
  const clearPlacedObjects = () => {
    placedObjects.value = []
  }

  // Object3D 템플릿 관련 액션들
  const setObjectTemplates = (newTemplates: Object3DTemplate[]) => {
    objectTemplates.value = newTemplates
  }

  const addObjectTemplate = (template: Object3DTemplate) => {
    objectTemplates.value.push(template)
  }

  const updateObjectTemplate = (templateId: string, updatedTemplate: Partial<Object3DTemplate>) => {
    const index = objectTemplates.value.findIndex(template => template.id === templateId)
    if (index > -1) {
      objectTemplates.value[index] = { ...objectTemplates.value[index], ...updatedTemplate }
    }
  }

  const removeObjectTemplate = (templateId: string) => {
    objectTemplates.value = objectTemplates.value.filter(template => template.id !== templateId)
  }

  const clearObjectTemplates = () => {
    objectTemplates.value = []
  }

  const setLoadingObjectTemplates = (loading: boolean) => {
    isLoadingObjectTemplates.value = loading
  }

  // Object3D 템플릿 API 호출 함수들
  const fetchObjectTemplates = async (): Promise<Object3DTemplate[]> => {
    try {
      setLoadingObjectTemplates(true)
      const response = await axios.get('http://localhost:8080/api/object3d-templates/with-files')
      console.log('📦 Object3D 템플릿 데이터 (파일 포함) 가져오기 성공:', response.data.length, '개')
      
      // Base64 파일 데이터를 Blob URL로 변환하여 처리
      const processedTemplates = response.data.map((template: Object3DTemplate) => {
        return processTemplateFiles(template)
      })
      
      // Store에 템플릿 데이터 저장
      setObjectTemplates(processedTemplates)
      
      console.log('🔄 Base64 파일 데이터를 Blob URL로 변환 완료')
      return processedTemplates
    } catch (error) {
      console.error('Object3D 템플릿 데이터 가져오기 실패:', error)
      return []
    } finally {
      setLoadingObjectTemplates(false)
    }
  }

  const deleteObjectTemplate = async (templateId: string): Promise<boolean> => {
    try {
      setLoadingObjectTemplates(true)
      await axios.delete(`http://localhost:8080/api/object3d-templates/${templateId}`)
      return true
    } catch (error) {
      console.error('Object3D 템플릿 삭제 실패:', error)
      return false
    } finally {
      setLoadingObjectTemplates(false)
    }
  }

  const uploadObjectTemplate = async (formData: FormData): Promise<Object3DTemplate | null> => {
    try {
      setLoadingObjectTemplates(true)
      const response = await axios.post('http://localhost:8080/api/object3d-templates/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      return response.data
    } catch (error) {
      console.error('Object3D 템플릿 업로드 실패:', error)
      return null
    } finally {
      setLoadingObjectTemplates(false)
    }
  }

  // 모든 배치된 오브젝트의 인스턴싱 값 업데이트
  const updateAllPlacedObjectsInstancing = (enabled: boolean) => {
    placedObjects.value.forEach(obj => {
      obj.instancing = enabled
    })
  }

  // Base64 데이터를 Blob URL로 변환하는 유틸리티 함수
  const base64ToBlobUrl = (base64Data: string, mimeType: string): string => {
    try {
      // Base64 데이터를 바이너리로 변환
      const byteCharacters = atob(base64Data)
      const byteNumbers = new Array(byteCharacters.length)
      for (let i = 0; i < byteCharacters.length; i++) {
        byteNumbers[i] = byteCharacters.charCodeAt(i)
      }
      const byteArray = new Uint8Array(byteNumbers)
      
      // Blob 생성
      const blob = new Blob([byteArray], { type: mimeType })
      
      // Blob URL 생성
      return URL.createObjectURL(blob)
    } catch (error) {
      console.error('Base64 to Blob URL 변환 실패:', error)
      return ''
    }
  }

  // 템플릿의 Base64 파일 데이터를 Blob URL로 변환
  const processTemplateFiles = (template: Object3DTemplate): Object3DTemplate => {
    if (!template.files) return template

    const processedTemplate = { ...template }

    // GLB 파일 처리
    if (template.files.glb) {
      processedTemplate.glbUrl = base64ToBlobUrl(template.files.glb, 'model/gltf-binary')
    }

    // LOD 파일 처리
    if (template.files.lod) {
      processedTemplate.lodUrl = base64ToBlobUrl(template.files.lod, 'model/gltf-binary')
    }

    // 썸네일 파일 처리
    if (template.files.thumbnail) {
      processedTemplate.thumbnailUrl = base64ToBlobUrl(template.files.thumbnail, 'image/png')
    }

    return processedTemplate
  }
  
  return {
    // State
    placedObjects,
    objectTemplates,
    isLoadingObjectTemplates,
    
    // Actions
    addPlacedObject,
    updatePlacedObject,
    removePlacedObject,
    clearPlacedObjects,
    setObjectTemplates,
    addObjectTemplate,
    updateObjectTemplate,
    removeObjectTemplate,
    clearObjectTemplates,
    setLoadingObjectTemplates,
    fetchObjectTemplates,
    deleteObjectTemplate,
    uploadObjectTemplate,
    updateAllPlacedObjectsInstancing,
    base64ToBlobUrl,
    processTemplateFiles
  }
})

// Export types for use in other files
export type { PlacedObject, Object3DTemplate, Point }
