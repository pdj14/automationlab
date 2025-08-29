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
  isGlass?: boolean // 유리벽 여부
}

// Wall 변경사항 타입 정의
interface WallChangeSummary {
  toCreate: WallData[]
  toUpdate: { id: string; oldData: WallData; newData: WallData }[]
  toDelete: WallData[]
}

// Box 데이터 타입 정의 (백엔드용)
interface BoxData {
  id?: string
  x: number
  y: number
  width: number
  depth: number
  height: number
  color: string
}

// Box 변경사항 타입 정의
interface BoxChangeSummary {
  toCreate: BoxData[]
  toUpdate: { id: string; oldData: BoxData; newData: BoxData }[]
  toDelete: BoxData[]
}

// Floorplan Store
export const useFloorplanStore = defineStore('floorplan', () => {
  // 상태 (state)
  const currentRoom = ref<Room | null>(null)
  const placedObjects = ref<PlacedObject[]>([]) // 배치된 오브젝트들
  const canvasSize = ref<CanvasSize>({ width: 800, height: 600 })
  const floors = ref<FloorArea[]>([])
  const zones = ref<ZoneData[]>([]) // Zone 데이터
  const isLoadingZones = ref(false) // Zone 로딩 상태
  const walls = ref<WallData[]>([]) // Wall 데이터
  const isLoadingWalls = ref(false) // Wall 로딩 상태
  const boxes = ref<BoxData[]>([]) // Box 데이터
  const isLoadingBoxes = ref(false) // Box 로딩 상태
  
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
    walls.value = []
    placedObjects.value = []
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

  // Wall 관련 액션들 (통합된 버전)
  const setWalls = (newWalls: WallData[]) => {
    walls.value = newWalls
  }

  const setLoadingWalls = (loading: boolean) => {
    isLoadingWalls.value = loading
  }

  // Box 관련 액션들
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
    walls, // 통합된 Wall 데이터
    placedObjects, // 배치된 오브젝트 추가
    canvasSize,
    floors,
    zones, // Zone 데이터 추가
    isLoadingZones, // Zone 로딩 상태 추가
    isLoadingWalls, // Wall 로딩 상태 추가
    boxes, // Box 데이터 추가
    isLoadingBoxes, // Box 로딩 상태 추가
    
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
    setWalls,
    setLoadingWalls,
    analyzeWallChanges, // Wall 변경사항 분석 추가
    syncWalls, // Wall 동기화 추가
    // Box 관련 액션들
    setBoxes,
    addBox,
    updateBox,
    removeBox,
    clearBoxes,
    setLoadingBoxes,
    analyzeBoxChanges, // Box 변경사항 분석 추가
    syncBoxes, // Box 동기화 추가
    updateAllPlacedObjectsInstancing, // 인스턴싱 업데이트 함수 추가
    logCurrentState
  }
}) 