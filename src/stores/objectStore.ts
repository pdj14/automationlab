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
  instancingEnabled?: boolean // 인스턴싱 활성화 여부
  boundsPx?: {      // 2D 캔버스에서의 픽셀 좌표 (3D 위치 계산에 필요)
    left: number
    top: number
    right: number
    bottom: number
  }
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

// 저장된 Objects 타입 정의 (API에서 가져오는 데이터) - Java DTO와 동일
interface SavedObject {
  id: string
  name: string
  description?: string
  degrees: number  // 0-360도 범위의 회전 각도 (필수)
  x: number        // X 좌표 (필수)
  y: number        // Y 좌표 (필수)
  templateName: string  // 템플릿 이름 (필수)
}

// Object Store
export const useObjectStore = defineStore('object', () => {
  // 상태 (state)
  const placedObjects = ref<PlacedObject[]>([]) // 배치된 오브젝트들
  const objectTemplates = ref<Object3DTemplate[]>([]) // Object3D 템플릿 데이터
  const savedObjects = ref<SavedObject[]>([]) // 저장된 Objects (API에서 가져온 데이터)
  const isLoadingObjectTemplates = ref(false) // Object3D 템플릿 로딩 상태
  const isLoadingSavedObjects = ref(false) // 저장된 Objects 로딩 상태

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

  // 저장된 Objects 관리 액션들
  const setSavedObjects = (objects: SavedObject[]) => {
    savedObjects.value = objects
  }

  const addSavedObject = (object: SavedObject) => {
    savedObjects.value.push(object)
  }

  const updateSavedObject = (objectId: string, updatedObject: SavedObject) => {
    const index = savedObjects.value.findIndex(obj => obj.id === objectId)
    if (index > -1) {
      savedObjects.value[index] = updatedObject
    }
  }

  const removeSavedObject = (objectId: string) => {
    savedObjects.value = savedObjects.value.filter(obj => obj.id !== objectId)
  }

  const clearSavedObjects = () => {
    savedObjects.value = []
  }

  const setLoadingSavedObjects = (loading: boolean) => {
    isLoadingSavedObjects.value = loading
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

  // 저장된 Objects를 가져오는 함수
  const fetchSavedObjects = async (): Promise<SavedObject[]> => {
    try {
      setLoadingSavedObjects(true)
      console.log('📦 저장된 Objects 가져오기 시작...')
      const response = await axios.get('http://localhost:8080/api/v1/objects')
      console.log('📦 저장된 Objects 가져오기 성공:', response.data.length, '개')
      
      // Store에 저장된 Objects 저장
      setSavedObjects(response.data)
      
      // // 저장된 Objects를 PlacedObjects로 변환하여 placedObjects에 저장
      // const convertedPlacedObjects = getSavedObjectsAsPlacedObjects()
      
      // // 기존 placedObjects에서 Box가 아닌 것들만 제거하고 새 데이터로 교체
      // const existingBoxes = placedObjects.value.filter(obj => obj.isBox === true)
      // placedObjects.value = [...existingBoxes, ...convertedPlacedObjects]
      
      // console.log('🔄 SavedObjects를 PlacedObjects로 변환 완료:', convertedPlacedObjects.length, '개')
      
      return response.data
    } catch (error) {
      console.error('저장된 Objects 가져오기 실패:', error)
      return []
    } finally {
      setLoadingSavedObjects(false)
    }
  }

  // SavedObject를 PlacedObject로 변환하는 유틸리티 함수
  const convertSavedObjectToPlacedObject = (savedObj: SavedObject, template?: Object3DTemplate): PlacedObject => {
    // 템플릿이 없으면 기본값 사용
    if (!template) {
      console.warn(`⚠️ 템플릿을 찾을 수 없습니다 (${savedObj.templateName}):`, savedObj.name)
      return {
        id: savedObj.id,
        name: savedObj.name,
        category: 'Unknown',
        description: savedObj.description,
        width: 1,
        depth: 1,
        height: 1,
        position: {
          x: savedObj.x,
          y: savedObj.y
        },
        rotation: (savedObj.degrees * Math.PI) / 180, // degrees를 radians로 변환
        color: '#888888'
      }
    }

    return {
      id: savedObj.id,
      name: savedObj.name,
      category: template.category,
      description: savedObj.description,
      glbUrl: template.glbUrl,
      lodUrl: template.lodUrl,
      width: template.width,
      depth: template.depth,
      height: template.height,
      position: {
        x: savedObj.x,
        y: savedObj.y
      },
      rotation: (savedObj.degrees * Math.PI) / 180, // degrees를 radians로 변환
      color: template.color,
      isOnBox: false,
      isBox: false,
      instancingEnabled: template.instancingEnabled
    }
  }

  // 저장된 Objects를 PlacedObjects로 변환하는 함수
  const getSavedObjectsAsPlacedObjects = (): PlacedObject[] => {
    return savedObjects.value.map(savedObj => {
      // 템플릿 이름으로 해당 템플릿 찾기
      const template = objectTemplates.value.find(t => t.name === savedObj.templateName)
      return convertSavedObjectToPlacedObject(savedObj, template)
    })
  }

  // 모든 배치된 오브젝트의 인스턴싱 값 업데이트
  const updateAllPlacedObjectsInstancing = (enabled: boolean) => {
    placedObjects.value.forEach(obj => {
      obj.instancingEnabled = enabled
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
    savedObjects,
    isLoadingObjectTemplates,
    isLoadingSavedObjects,
    
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
    setSavedObjects,
    addSavedObject,
    updateSavedObject,
    removeSavedObject,
    clearSavedObjects,
    setLoadingSavedObjects,
    fetchSavedObjects,
    convertSavedObjectToPlacedObject,
    getSavedObjectsAsPlacedObjects,
    updateAllPlacedObjectsInstancing,
    base64ToBlobUrl,
    processTemplateFiles
  }
})

// Export types for use in other files
export type { PlacedObject, Object3DTemplate, SavedObject, Point }
