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

  const updateObjectTemplateLocal = (templateId: string, updatedTemplate: Partial<Object3DTemplate>) => {
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

  // API 호출을 하는 함수들
  const addSavedObjectAPI = async (object: SavedObject): Promise<boolean> => {
    try {
      const response = await axios.post('http://localhost:8080/api/v1/objects', object)
      savedObjects.value.push(response.data)
      return true
    } catch (error) {
      console.error('Object 추가 실패:', error)
      return false
    }
  }

  const updateSavedObjectAPI = async (objectId: string, updatedObject: SavedObject): Promise<boolean> => {
    try {
      const response = await axios.put(`http://localhost:8080/api/v1/objects/${objectId}`, updatedObject)
      const index = savedObjects.value.findIndex(obj => obj.id === objectId)
      if (index > -1) {
        savedObjects.value[index] = response.data
      }
      return true
    } catch (error) {
      console.error('Object 업데이트 실패:', error)
      return false
    }
  }

  const removeSavedObjectAPI = async (objectId: string): Promise<boolean> => {
    try {
      await axios.delete(`http://localhost:8080/api/v1/objects/${objectId}`)
      savedObjects.value = savedObjects.value.filter(obj => obj.id !== objectId)
      return true
    } catch (error) {
      console.error('Object 삭제 실패:', error)
      return false
    }
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

  const updateObjectTemplate = async (templateId: string, formData: FormData): Promise<boolean> => {
    try {
      setLoadingObjectTemplates(true)
      const response = await axios.put(`http://localhost:8080/api/object3d-templates/${templateId}`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      })
      
      // 로컬 상태도 업데이트
      const updatedTemplate = response.data
      const index = objectTemplates.value.findIndex(template => template.id === templateId)
      if (index > -1) {
        objectTemplates.value[index] = { ...objectTemplates.value[index], ...updatedTemplate }
      }
      
      return true
    } catch (error) {
      console.error('Object3D 템플릿 업데이트 실패:', error)
      return false
    } finally {
      setLoadingObjectTemplates(false)
    }
  }

  const updateObjectTemplateText = async (templateName: string, updateData: Partial<Object3DTemplate>): Promise<boolean> => {
    try {
      setLoadingObjectTemplates(true)
      const response = await axios.patch(`http://localhost:8080/api/object3d-templates/name/${templateName}`, updateData, {
        headers: {
          'Content-Type': 'application/json'
        }
      })
      
      // 로컬 상태도 업데이트
      const updatedTemplate = response.data
      const index = objectTemplates.value.findIndex(template => template.name === templateName)
      if (index > -1) {
        objectTemplates.value[index] = { ...objectTemplates.value[index], ...updatedTemplate }
      }
      
      return true
    } catch (error) {
      console.error('Object3D 템플릿 텍스트 업데이트 실패:', error)
      return false
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
      
      // 저장된 Objects를 PlacedObjects로 변환하여 placedObjects에 저장
      const convertedPlacedObjects = getSavedObjectsAsPlacedObjects()
      
      // 기존 placedObjects에서 Box와 새로 만든 Object들을 보존
      const existingBoxes = placedObjects.value.filter(obj => obj.isBox === true)
      const existingNewObjects = placedObjects.value.filter(obj => !obj.isBox && !convertedPlacedObjects.some(converted => converted.id === obj.id))
      
      console.log('🔍 fetchSavedObjects - 기존 placedObjects:', placedObjects.value.length, '개')
      console.log('🔍 fetchSavedObjects - existingBoxes:', existingBoxes.length, '개')
      console.log('🔍 fetchSavedObjects - existingNewObjects:', existingNewObjects.length, '개')
      console.log('🔍 fetchSavedObjects - convertedPlacedObjects:', convertedPlacedObjects.length, '개')
      
      placedObjects.value = [...existingBoxes, ...existingNewObjects, ...convertedPlacedObjects]
      
      console.log('🔍 fetchSavedObjects - 최종 placedObjects:', placedObjects.value.length, '개')
      
      // console.log('🔄 SavedObjects를 PlacedObjects로 변환 완료:', convertedPlacedObjects.length, '개')
      
      return response.data
    } catch (error) {
      console.error('저장된 Objects 가져오기 실패:', error)
      return []
    } finally {
      setLoadingSavedObjects(false)
    }
  }

  // PlacedObject를 SavedObject로 변환하는 함수
  const convertPlacedObjectToSavedObject = (placedObj: PlacedObject, templateName: string): SavedObject => {
    return {
      id: placedObj.id,
      description: placedObj.description,
      degrees: Math.round((placedObj.rotation * 180) / Math.PI), // 라디안을 도로 변환
      x: placedObj.position.x,
      y: placedObj.position.y,
      templateName: templateName
    }
  }

  // Object 변경사항 분석 함수
  const analyzeObjectChanges = (currentObjects: SavedObject[], savedObjects: SavedObject[]) => {
    console.log('🔍 Object 변경사항 분석 시작')
    console.log('📊 currentObjects 총 개수:', currentObjects.length)
    console.log('📊 savedObjects 총 개수:', savedObjects.length)
    
    const toCreate: SavedObject[] = []
    const toUpdate: SavedObject[] = []
    const toDelete: SavedObject[] = []

    console.log('📊 currentObjects 상세:', currentObjects.map(obj => ({ 
      id: obj.id, 
      templateName: obj.templateName,
      x: obj.x,
      y: obj.y 
    })))
    console.log('📊 savedObjects 상세:', savedObjects.map(obj => ({ 
      id: obj.id, 
      templateName: obj.templateName,
      x: obj.x,
      y: obj.y 
    })))

    // 새로 생성된 객체 찾기 (currentObjects에는 있지만 savedObjects에는 없는 것)
    currentObjects.forEach(currentObj => {
      const existsInSaved = savedObjects.find(savedObj => savedObj.id === currentObj.id)
      console.log(`🔍 ${currentObj.templateName} (${currentObj.id}) 검사:`, existsInSaved ? '존재함' : '없음')
      if (!existsInSaved) {
        console.log(`➕ 새로 생성된 객체 추가: ${currentObj.templateName} (${currentObj.id})`)
        toCreate.push(currentObj)
      }
    })

    // 업데이트된 객체 찾기 (currentObjects와 savedObjects 모두에 있지만 내용이 다른 것)
    currentObjects.forEach(currentObj => {
      const savedObj = savedObjects.find(savedObj => savedObj.id === currentObj.id)
      if (savedObj) {
        // 위치, 회전, 설명이 다른지 확인
        const hasChanged = 
          Math.abs(savedObj.x - currentObj.x) > 0.01 ||
          Math.abs(savedObj.y - currentObj.y) > 0.01 ||
          Math.abs(savedObj.degrees - currentObj.degrees) > 0.01 ||
          savedObj.description !== currentObj.description ||
          savedObj.templateName !== currentObj.templateName

        if (hasChanged) {
          console.log(`🔄 업데이트된 객체 추가: ${currentObj.templateName} (${currentObj.id})`)
          toUpdate.push(currentObj)
        }
      }
    })

    // 삭제된 객체 찾기 (savedObjects에는 있지만 currentObjects에는 없는 것)
    savedObjects.forEach(savedObj => {
      const existsInCurrent = currentObjects.find(currentObj => currentObj.id === savedObj.id)
      console.log(`🔍 삭제 검사: ${savedObj.templateName} (${savedObj.id})`, existsInCurrent ? '존재함' : '없음')
      if (!existsInCurrent) {
        console.log(`🗑️ 삭제된 객체 추가: ${savedObj.templateName} (${savedObj.id})`)
        toDelete.push(savedObj)
      }
    })

    console.log('✅ 분석 결과:')
    console.log('  ➕ toCreate:', toCreate.length, '개')
    console.log('  🔄 toUpdate:', toUpdate.length, '개') 
    console.log('  🗑️ toDelete:', toDelete.length, '개')
    
    return {
      toCreate,
      toUpdate,
      toDelete
    }
  }

  // Object 변경사항을 백엔드에 동기화하는 함수
  const syncObjects = async (objectChanges: { toCreate: SavedObject[], toUpdate: SavedObject[], toDelete: SavedObject[] }): Promise<boolean> => {
    try {
      console.log('🎯 Object 변경사항 동기화 시작...')
      
      // 병렬로 Create, Update, Delete 실행
      const promises: Promise<any>[] = []
      
      // Create
      objectChanges.toCreate.forEach(obj => {
        promises.push(addSavedObjectAPI(obj))
      })
      
      // Update
      objectChanges.toUpdate.forEach(obj => {
        promises.push(updateSavedObjectAPI(obj.id, obj))
      })
      
      // Delete
      objectChanges.toDelete.forEach(obj => {
        promises.push(removeSavedObjectAPI(obj.id))
      })
      
      await Promise.all(promises)
      
      console.log(`🎯 Object 동기화 완료: Create ${objectChanges.toCreate.length}, Update ${objectChanges.toUpdate.length}, Delete ${objectChanges.toDelete.length}`)
      return true
    } catch (error) {
      console.error('❌ Object 동기화 실패:', error)
      return false
    }
  }

  // SavedObject를 PlacedObject로 변환하는 유틸리티 함수
  const convertSavedObjectToPlacedObject = (savedObj: SavedObject, template?: Object3DTemplate): PlacedObject => {
    // 템플릿이 없으면 기본값 사용
    if (!template) {
      console.warn(`⚠️ 템플릿을 찾을 수 없습니다 (${savedObj.templateName})`)
      return {
        id: savedObj.id,
        name: savedObj.templateName,
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
      name: template.name,
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
    updateObjectTemplateLocal,
    updateObjectTemplate,
    updateObjectTemplateText,
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
    convertPlacedObjectToSavedObject,
    analyzeObjectChanges,
    syncObjects,
    convertSavedObjectToPlacedObject,
    getSavedObjectsAsPlacedObjects,
    updateAllPlacedObjectsInstancing,
    base64ToBlobUrl,
    processTemplateFiles
  }
})

// Export types for use in other files
export type { PlacedObject, Object3DTemplate, SavedObject, Point }