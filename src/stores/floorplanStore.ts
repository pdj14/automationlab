import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// 벽 데이터 타입 정의
interface Point {
  x: number
  y: number
}

interface Wall {
  start: Point
  end: Point
  id: string | number
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
}

interface CanvasSize {
  width: number
  height: number
}

// 배치된 오브젝트 타입 정의
interface PlacedObject {
  id: string
  name: string
  category: string
  glbUrl: string
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

// Zone 데이터 타입 정의
interface ZoneData {
  id?: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

// Zone 변경사항 타입 정의
interface ZoneChangeSummary {
  toCreate: ZoneData[]
  toUpdate: { id: string; oldData: ZoneData; newData: ZoneData }[]
  toDelete: ZoneData[]
}

// Wall 데이터 타입 정의 (백엔드용)
interface WallData {
  id?: string
  startX: number
  startY: number
  endX: number
  endY: number
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
  const interiorWalls = ref<Wall[]>([])
  const exteriorWalls = ref<Wall[]>([]) // 외부벽도 직접 저장
  const placedObjects = ref<PlacedObject[]>([]) // 배치된 오브젝트들
  const canvasSize = ref<CanvasSize>({ width: 800, height: 600 })
  const floors = ref<FloorArea[]>([])
  const zones = ref<ZoneData[]>([]) // Zone 데이터
  const isLoadingZones = ref(false) // Zone 로딩 상태
  const walls = ref<WallData[]>([]) // Wall 데이터
  const isLoadingWalls = ref(false) // Wall 로딩 상태
  
  // Getters (computed)
  const hasRoom = computed(() => currentRoom.value !== null)
  
  // exteriorWalls를 computed에서 ref로 변경했으므로 제거
  // const exteriorWalls = computed(() => { ... }) -> 제거됨
  
  const roomCenterPosition = computed(() => {
    if (!currentRoom.value?.bounds) return { x: 0, y: 0 }
    
    const bounds = currentRoom.value.bounds
    return {
      x: (bounds.left + bounds.right) / 2,
      y: (bounds.top + bounds.bottom) / 2
    }
  })
  
  const floorplanData = computed(() => ({
    exteriorWalls: exteriorWalls.value, // 이제 ref로 직접 접근
    interiorWalls: interiorWalls.value,
    placedObjects: placedObjects.value, // 배치된 오브젝트 정보 추가
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
    interiorWalls.value = []
    exteriorWalls.value = []
    placedObjects.value = []
    floors.value = []
  }
  
  const setCanvasSize = (size: CanvasSize) => {
    canvasSize.value = size
  }
  
  const addInteriorWall = (wall: Wall) => {
    interiorWalls.value.push(wall)
  }
  
  const updateInteriorWall = (wallId: string | number, updatedWall: Wall) => {
    const index = interiorWalls.value.findIndex(wall => wall.id === wallId)
    if (index > -1) {
      interiorWalls.value[index] = updatedWall
    }
  }
  
  const removeInteriorWall = (wallId: string | number) => {
    interiorWalls.value = interiorWalls.value.filter(wall => wall.id !== wallId)
  }
  
  const addExteriorWall = (wall: Wall) => {
    exteriorWalls.value.push(wall)
  }
  
  const updateExteriorWall = (wallId: string | number, updatedWall: Wall) => {
    const index = exteriorWalls.value.findIndex(wall => wall.id === wallId)
    if (index > -1) {
      exteriorWalls.value[index] = updatedWall
    }
  }
  
  const removeExteriorWall = (wallId: string | number) => {
    exteriorWalls.value = exteriorWalls.value.filter(wall => wall.id !== wallId)
  }

  const clearInteriorWalls = () => {
    interiorWalls.value = []
  }
  
  const clearExteriorWalls = () => {
    exteriorWalls.value = []
  }

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

  // Zone 관련 액션들
  const setZones = (newZones: ZoneData[]) => {
    zones.value = newZones
  }

  const addZone = (zone: ZoneData) => {
    zones.value.push(zone)
  }

  const updateZone = (zoneId: string, updatedZone: Partial<ZoneData>) => {
    const index = zones.value.findIndex(zone => zone.id === zoneId)
    if (index > -1) {
      zones.value[index] = { ...zones.value[index], ...updatedZone }
    }
  }

  const removeZone = (zoneId: string) => {
    zones.value = zones.value.filter(zone => zone.id !== zoneId)
  }

  const clearZones = () => {
    zones.value = []
  }

  const setLoadingZones = (loading: boolean) => {
    isLoadingZones.value = loading
  }

  // Wall 관련 액션들
  const setWalls = (newWalls: WallData[]) => {
    walls.value = newWalls
  }

  const addWall = (wall: WallData) => {
    walls.value.push(wall)
  }

  const updateWall = (wallId: string, updatedWall: Partial<WallData>) => {
    const index = walls.value.findIndex(wall => wall.id === wallId)
    if (index > -1) {
      walls.value[index] = { ...walls.value[index], ...updatedWall }
    }
  }

  const removeWall = (wallId: string) => {
    walls.value = walls.value.filter(wall => wall.id !== wallId)
  }

  const clearWalls = () => {
    walls.value = []
  }

  const setLoadingWalls = (loading: boolean) => {
    isLoadingWalls.value = loading
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
        
        // 한쪽에만 key가 있고 해당 값이 null인 경우는 동일하게 처리
        if (value1 === null && !(key in data2)) return true
        if (value2 === null && !(key in data1)) return true
        
        // 양쪽 모두 key가 있는 경우만 비교
        if (key in data1 && key in data2) {
          return isDataEqual(value1, value2, precision)
        }
        
        // 한쪽에만 key가 있고 값이 null이 아닌 경우는 다름
        return false
      })
    }
    
    return data1 === data2
  }

  // Zone 변경사항 분석
  const analyzeZoneChanges = (currentZones: ZoneData[], savedZones: ZoneData[]): ZoneChangeSummary => {
    const toCreate: ZoneData[] = []
    const toUpdate: { id: string; oldData: ZoneData; newData: ZoneData }[] = []
    const toDelete: ZoneData[] = []



    // 현재 Zone들을 ID로 맵핑
    const currentZoneMap = new Map<string, ZoneData>()
    currentZones.forEach(zone => {
      if (zone.id) {
        currentZoneMap.set(zone.id, zone)

      } else {
        // ID가 없는 Zone은 새로 생성할 대상
        
        toCreate.push(zone)
      }
    })

    // 저장된 Zone들을 ID로 맵핑
    const savedZoneMap = new Map<string, ZoneData>()
    savedZones.forEach(zone => {
      if (zone.id) {
        savedZoneMap.set(zone.id, zone)

      }
    })

    // 업데이트할 Zone 찾기
    currentZoneMap.forEach((currentZone, id) => {
      const savedZone = savedZoneMap.get(id)
      if (savedZone) {
        // 데이터가 변경되었는지 확인 (정밀도 0.01m = 1cm 고려)
        const isEqual = isDataEqual(currentZone, savedZone, 0.01)
        if (!isEqual) {

          toUpdate.push({
            id,
            oldData: savedZone,
            newData: currentZone
          })
        } else {

        }
        // 처리된 Zone은 맵에서 제거
        savedZoneMap.delete(id)
      } else {
        // ID가 있지만 저장되지 않은 Zone은 새로 생성할 대상
        toCreate.push(currentZone)
      }
    })

    // 남은 저장된 Zone들은 삭제할 대상
    savedZoneMap.forEach(zone => {
      toDelete.push(zone)
    })

    return { toCreate, toUpdate, toDelete }
  }

  // Zone 동기화 실행
  const syncZones = async (changeSummary: ZoneChangeSummary): Promise<boolean> => {
    try {
      // 새로 생성할 Zone들
      for (const zone of changeSummary.toCreate) {
        await axios.post('http://localhost:8080/api/zones', zone)
      }

      // 업데이트할 Zone들
      for (const update of changeSummary.toUpdate) {
        await axios.put(`http://localhost:8080/api/zones/${update.id}`, update.newData)
      }

      // 삭제할 Zone들
      for (const zone of changeSummary.toDelete) {
        if (zone.id) {
          await axios.delete(`http://localhost:8080/api/zones/${zone.id}`)
        }
      }

      return true
    } catch (error) {
      console.error('Zone 동기화 실패:', error)
      return false
    }
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

  // 모든 배치된 오브젝트의 인스턴싱 값 업데이트
  const updateAllPlacedObjectsInstancing = (enabled: boolean) => {
    placedObjects.value.forEach(obj => {
      obj.instancing = enabled
    })

  }
  
  const logCurrentState = () => {
    // 디버깅용 함수 (빈 함수로 유지)
  }
  
  return {
    // State
    currentRoom,
    interiorWalls,
    exteriorWalls, // 외부벽 추가
    placedObjects, // 배치된 오브젝트 추가
    canvasSize,
    floors,
    zones, // Zone 데이터 추가
    isLoadingZones, // Zone 로딩 상태 추가
    walls, // Wall 데이터 추가
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
    addInteriorWall,
    updateInteriorWall,
    removeInteriorWall,
    clearInteriorWalls,
    addExteriorWall, // 외부벽 액션들 추가
    updateExteriorWall,
    removeExteriorWall,
    clearExteriorWalls,
    addPlacedObject, // 배치된 오브젝트 액션들 추가
    updatePlacedObject,
    removePlacedObject,
    clearPlacedObjects,
    addZone, // Zone 관련 액션들 추가
    updateZone,
    removeZone,
    clearZones,
    setZones,
    setLoadingZones,
    analyzeZoneChanges, // Zone 변경사항 분석 추가
    syncZones, // Zone 동기화 추가
    addWall, // Wall 관련 액션들 추가
    updateWall,
    removeWall,
    clearWalls,
    setWalls,
    setLoadingWalls,
    analyzeWallChanges, // Wall 변경사항 분석 추가
    syncWalls, // Wall 동기화 추가
    updateAllPlacedObjectsInstancing, // 인스턴싱 업데이트 함수 추가
    logCurrentState
  }
}) 