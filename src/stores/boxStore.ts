import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// Box 데이터 타입 정의 (백엔드용)
export interface BoxData {
  id?: string
  x: number
  y: number
  width: number
  depth: number
  height: number
  color: string
}

// Box 변경사항 타입 정의
export interface BoxChangeSummary {
  toCreate: BoxData[]
  toUpdate: { id: string; oldData: BoxData; newData: BoxData }[]
  toDelete: BoxData[]
}

// Box Store
export const useBoxStore = defineStore('box', () => {
  // 상태 (state)
  const boxes = ref<BoxData[]>([])
  const isLoadingBoxes = ref(false)

  // Getters (computed)
  const boxCount = computed(() => boxes.value.length)
  const hasBoxes = computed(() => boxes.value.length > 0)

  // Actions (methods)
  const setBoxes = (newBoxes: BoxData[]) => {
    boxes.value = newBoxes
  }

  const addBox = (box: BoxData) => {
    boxes.value.push(box)
  }

  const updateBox = (boxId: string, updatedBox: Partial<BoxData>) => {
    const index = boxes.value.findIndex(box => box.id === boxId)
    if (index > -1) {
      boxes.value[index] = { ...boxes.value[index], ...updatedBox }
    }
  }

  const removeBox = (boxId: string) => {
    boxes.value = boxes.value.filter(box => box.id !== boxId)
  }

  const clearBoxes = () => {
    boxes.value = []
  }

  const setLoadingBoxes = (loading: boolean) => {
    isLoadingBoxes.value = loading
  }

  // 부동소수점 정밀도를 고려한 데이터 비교 함수 (1cm 정밀도)
  const isDataEqual = (data1: any, data2: any, precision: number = 0.01): boolean => {
    if (typeof data1 !== typeof data2) return false
    
    if (typeof data1 === 'number') {
      return Math.abs(data1 - data2) < precision
    }
    
    if (Array.isArray(data1)) {
      if (data1.length !== data2.length) return false
      return data1.every((item, index) => isDataEqual(item, data2[index], precision))
    }
    
    if (typeof data1 === 'object' && data1 !== null) {
      const keys1 = Object.keys(data1)
      const keys2 = Object.keys(data2)
      
      // 모든 고유 키를 수집
      const allKeys = new Set([...keys1, ...keys2])
      
      return Array.from(allKeys).every(key => {
        if (key === 'id') return true // ID는 비교하지 않음
        
        const value1 = data1[key]
        const value2 = data2[key]
        
        // 한쪽에만 key가 있는 경우 처리
        if (!(key in data1) || !(key in data2)) {
          // 한쪽에만 key가 있고 해당 값이 null, undefined, 또는 빈 문자열인 경우는 동일하게 처리
          const missingValue = !(key in data1) ? value2 : value1
          return missingValue === null || missingValue === undefined || missingValue === ''
        }
        
        // 양쪽 모두 key가 있는 경우 비교
        return isDataEqual(value1, value2, precision)
      })
    }
    
    return data1 === data2
  }

  // Box 변경사항 분석
  const analyzeBoxChanges = (currentBoxes: BoxData[], savedBoxes: BoxData[]): BoxChangeSummary => {
    const toCreate: BoxData[] = []
    const toUpdate: { id: string; oldData: BoxData; newData: BoxData }[] = []
    const toDelete: BoxData[] = []

    // 현재 Box들을 ID로 맵핑
    const currentBoxMap = new Map<string, BoxData>()
    currentBoxes.forEach(box => {
      if (box.id) {
        currentBoxMap.set(box.id, box)
      }
    })

    // 저장된 Box들을 ID로 맵핑
    const savedBoxMap = new Map<string, BoxData>()
    savedBoxes.forEach(box => {
      if (box.id) {
        savedBoxMap.set(box.id, box)
      }
    })

    // 새로 생성할 Box들 (ID가 없거나 저장된 목록에 없는 것들)
    currentBoxes.forEach(box => {
      if (!box.id || !savedBoxMap.has(box.id)) {
        toCreate.push(box)
      }
    })

    // 업데이트할 Box들 (ID가 있고 저장된 목록에도 있지만 데이터가 다른 것들)
    currentBoxes.forEach(box => {
      if (box.id && savedBoxMap.has(box.id)) {
        const savedBox = savedBoxMap.get(box.id)!
        if (!isDataEqual(box, savedBox)) {
          toUpdate.push({
            id: box.id,
            oldData: savedBox,
            newData: box
          })
        }
      }
    })

    // 삭제할 Box들 (저장된 목록에는 있지만 현재 목록에는 없는 것들)
    savedBoxes.forEach(box => {
      if (box.id && !currentBoxMap.has(box.id)) {
        toDelete.push(box)
      }
    })

    return { toCreate, toUpdate, toDelete }
  }

  // Box 동기화 실행
  const syncBoxes = async (changeSummary: BoxChangeSummary): Promise<boolean> => {
    try {
      // 새로 생성할 Box들
      for (const box of changeSummary.toCreate) {
        await axios.post('http://localhost:8080/api/boxes', box)
      }

      // 업데이트할 Box들
      for (const update of changeSummary.toUpdate) {
        await axios.put(`http://localhost:8080/api/boxes/${update.id}`, update.newData)
      }

      // 삭제할 Box들
      for (const box of changeSummary.toDelete) {
        if (box.id) {
          await axios.delete(`http://localhost:8080/api/boxes/${box.id}`)
        }
      }

      return true
    } catch (error) {
      console.error('Box 동기화 실패:', error)
      return false
    }
  }

  // API 호출 함수
  const fetchBoxes = async (): Promise<BoxData[]> => {
    try {
      setLoadingBoxes(true)
      const response = await axios.get('http://localhost:8080/api/boxes')
      return response.data
    } catch (error) {
      console.log('📦 Box API not available, using empty array')
      return []
    } finally {
      setLoadingBoxes(false)
    }
  }

  return {
    // State
    boxes,
    isLoadingBoxes,
    
    // Getters
    boxCount,
    hasBoxes,
    
    // Actions
    setBoxes,
    addBox,
    updateBox,
    removeBox,
    clearBoxes,
    setLoadingBoxes,
    analyzeBoxChanges,
    syncBoxes,
    fetchBoxes
  }
})
