import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import axios from 'axios'

// Zone 데이터 타입 정의
export interface ZoneData {
  id?: string
  x: number
  y: number
  width: number
  height: number
  color: string
}

// Zone 변경사항 타입 정의
export interface ZoneChangeSummary {
  toCreate: ZoneData[]
  toUpdate: { id: string; oldData: ZoneData; newData: ZoneData }[]
  toDelete: ZoneData[]
}

// Zone Store
export const useZoneStore = defineStore('zone', () => {
  // 상태 (state)
  const zones = ref<ZoneData[]>([])
  const isLoadingZones = ref(false)

  // Getters (computed)
  const zoneCount = computed(() => zones.value.length)
  const hasZones = computed(() => zones.value.length > 0)

  // Actions (methods)
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

  // API 호출 함수
  const fetchZones = async (): Promise<ZoneData[]> => {
    try {
      setLoadingZones(true)
      const response = await axios.get('http://localhost:8080/api/zones')
      return response.data
    } catch (error) {
      console.error('Zone 데이터 가져오기 실패:', error)
      return []
    } finally {
      setLoadingZones(false)
    }
  }

  return {
    // State
    zones,
    isLoadingZones,
    
    // Getters
    zoneCount,
    hasZones,
    
    // Actions
    setZones,
    addZone,
    updateZone,
    removeZone,
    clearZones,
    setLoadingZones,
    analyzeZoneChanges,
    syncZones,
    fetchZones
  }
})
