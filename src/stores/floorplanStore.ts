import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'
import type { PlacedObject, Point } from './objectStore'

// 벽 데이터 타입 정의

interface Wall {
  start: Point
  end: Point
  id: string | number
  isGlass?: boolean // 유리벽 여부
}

interface Room {
  width: number
  height: number
  bounds?: {
    left: number
    top: number
    right: number
    bottom: number
  }
}

interface FloorArea {
  id: string
  width: number // meters
  height: number // meters
  boundsPx: {
    left: number
    top: number
    right: number
    bottom: number
  }
  color: string // hex like #FFF3B0
  isZone?: boolean // Zone 여부
  zonePosition?: { x: number; y: number } // Zone 위치
}

interface CanvasSize {
  width: number
  height: number
}





// Wall 데이터 타입 정의 (백엔드용)
interface WallData {
  id?: string
  startX: number
  startY: number
  endX: number
  endY: number
  isGlass?: boolean // 유리벽 여부
  type?: string // 벽 타입 (wall, glass-wall)
}

// Wall 변경사항 타입 정의
interface WallChangeSummary {
  toCreate: WallData[]
  toUpdate: { id: string; oldData: WallData; newData: WallData }[]
  toDelete: WallData[]
}





// Floorplan Store
export const useFloorplanStore = defineStore('floorplan', () => {
  // 상태 (state)
  const currentRoom = ref<Room | null>(null)

  const canvasSize = ref<CanvasSize>({ width: 800, height: 600 })
  const floors = ref<FloorArea[]>([])

  const walls = ref<WallData[]>([]) // Wall 데이터
  const isLoadingWalls = ref(false) // Wall 로딩 상태


  
  // Getters (computed)
  const hasRoom = computed(() => currentRoom.value !== null)
    
  const roomCenterPosition = computed(() => {
    if (!currentRoom.value?.bounds) return { x: 0, y: 0 }
    
    const bounds = currentRoom.value.bounds
    return {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    }
  })
  
  const floorplanData = computed(() => ({
    walls: walls.value, // 통합된 walls 배열
    floors: floors.value,
    roomSize: currentRoom.value ? {
      width: currentRoom.value.width,
      height: currentRoom.value.height,
      centerX: roomCenterPosition.value.x,
      centerY: roomCenterPosition.value.y
    } : null,
    canvasSize: canvasSize.value
  }))
  
  // Actions (methods)
  const setRoom = (room: Room) => {
    currentRoom.value = room
  }
  
  const clearRoom = () => {
    currentRoom.value = null
    walls.value = []
    floors.value = []
  }
  
  const setCanvasSize = (size: CanvasSize) => {
    canvasSize.value = size
  }
  
  const addWall = (wall: Wall) => {
    // 기존 walls 배열에 추가 (WallData 타입으로 변환)
    const wallData: WallData = {
      id: wall.id.toString(),
      startX: wall.start.x,
      startY: wall.start.y,
      endX: wall.end.x,
      endY: wall.end.y,
      type: wall.isGlass ? 'glass-wall' : 'wall',
      isGlass: wall.isGlass || false
    }
    walls.value.push(wallData)
    console.log('Store에 벽 추가됨:', wallData) // 디버깅용 로그
  }
  
  const updateWall = (wallId: string | number, updatedWall: Wall) => {
    const index = walls.value.findIndex(wall => wall.id === wallId.toString())
    if (index > -1) {
      walls.value[index] = {
        ...walls.value[index],
        startX: updatedWall.start.x,
        startY: updatedWall.start.y,
        endX: updatedWall.end.x,
        endY: updatedWall.end.y,
        type: updatedWall.isGlass ? 'glass-wall' : 'wall',
        isGlass: updatedWall.isGlass || false
      }
    }
  }
  
  const removeWall = (wallId: string | number) => {
    walls.value = walls.value.filter(wall => wall.id !== wallId.toString())
  }

  const clearWalls = () => {
    walls.value = []
  }



  // Floors actions
  const addFloor = (floor: FloorArea) => {
    floors.value.push(floor)
  }

  const updateFloor = (id: string, updated: Partial<FloorArea>) => {
    const idx = floors.value.findIndex(f => f.id === id)
    if (idx > -1) {
      floors.value[idx] = { ...floors.value[idx], ...updated }
    }
  }

  const removeFloor = (id: string) => {
    floors.value = floors.value.filter(f => f.id !== id)
  }

  const clearFloors = () => {
    floors.value = []
  }



  // Wall 관련 액션들 (통합된 버전)
  const setWalls = (newWalls: WallData[]) => {
    walls.value = newWalls
  }

  const setLoadingWalls = (loading: boolean) => {
    isLoadingWalls.value = loading
  }





  // 부동소수점 정밀도를 고려한 데이터 비교 함수 (1cm 정밀도)
  const isDataEqual = (data1: any, data2: any, precision: number = 0.01): boolean => {
    console.log('isDataEqual', data1, data2)
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



  // Wall 변경사항 분석
  const analyzeWallChanges = (currentWalls: WallData[], savedWalls: WallData[]): WallChangeSummary => {
    const toCreate: WallData[] = []
    const toUpdate: { id: string; oldData: WallData; newData: WallData }[] = []
    const toDelete: WallData[] = []

    // 현재 Wall들을 ID로 맵핑
    const currentWallMap = new Map<string, WallData>()
    currentWalls.forEach(wall => {
      if (wall.id) {
        currentWallMap.set(wall.id, wall)
      } else {
        // ID가 없는 Wall은 새로 생성할 대상
        toCreate.push(wall)
      }
    })

    // 저장된 Wall들을 ID로 맵핑
    const savedWallMap = new Map<string, WallData>()
    savedWalls.forEach(wall => {
      if (wall.id) {
        savedWallMap.set(wall.id, wall)
      }
    })

    // 업데이트할 Wall 찾기
    currentWallMap.forEach((currentWall, id) => {
      const savedWall = savedWallMap.get(id)
      if (savedWall) {
        // 데이터가 변경되었는지 확인 (정밀도 0.01m = 1cm 고려)
        const isEqual = isDataEqual(currentWall, savedWall, 0.01)
        if (!isEqual) {
          toUpdate.push({
            id,
            oldData: savedWall,
            newData: currentWall
          })
        }
        // 처리된 Wall은 맵에서 제거
        savedWallMap.delete(id)
      } else {
        // ID가 있지만 저장되지 않은 Wall은 새로 생성할 대상
        toCreate.push(currentWall)
      }
    })

    // 남은 저장된 Wall들은 삭제할 대상
    savedWallMap.forEach(wall => {
      toDelete.push(wall)
    })

    return { toCreate, toUpdate, toDelete }
  }

  // Wall 동기화 실행
  const syncWalls = async (changeSummary: WallChangeSummary): Promise<boolean> => {
    try {
      // 새로 생성할 Wall들
      for (const wall of changeSummary.toCreate) {
        await axios.post('http://localhost:8080/api/walls', wall)
      }

      // 업데이트할 Wall들
      for (const update of changeSummary.toUpdate) {
        await axios.put(`http://localhost:8080/api/walls/${update.id}`, update.newData)
      }

      // 삭제할 Wall들
      for (const wall of changeSummary.toDelete) {
        if (wall.id) {
          await axios.delete(`http://localhost:8080/api/walls/${wall.id}`)
        }
      }

      return true
    } catch (error) {
      console.error('Wall 동기화 실패:', error)
      return false
    }
  }



  // API 호출 함수들


  const fetchWalls = async (): Promise<WallData[]> => {
    try {
      setLoadingWalls(true)
      const response = await axios.get('http://localhost:8080/api/walls')
      return response.data
    } catch (error) {
      console.error('Wall 데이터 가져오기 실패:', error)
      return []
    } finally {
      setLoadingWalls(false)
    }
  }




  
  const logCurrentState = () => {
    // 디버깅용 함수 (빈 함수로 유지)
  }
  
  return {
    // State
    currentRoom,
    walls, // 통합된 Wall 데이터
    canvasSize,
    floors,

    isLoadingWalls, // Wall 로딩 상태 추가
    
    // Getters
    hasRoom,
    roomCenterPosition,
    floorplanData,
    
    // Actions
    setRoom,
    clearRoom,
    setCanvasSize,
    addFloor,
    updateFloor,
    removeFloor,
    clearFloors,
    addWall, // 통합된 Wall 액션들
    updateWall,
    removeWall,
    clearWalls,

    setWalls,
    setLoadingWalls,
    analyzeWallChanges, // Wall 변경사항 분석 추가
    syncWalls, // Wall 동기화 추가

    fetchWalls, // Wall API 호출 함수 추가
    logCurrentState
  }
}) 