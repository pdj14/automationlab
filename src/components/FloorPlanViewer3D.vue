<template>
  <div class="viewer-3d-container">
    <!-- 3D 컨트롤 툴바 -->
    <div class="controls-toolbar">
      <div class="control-group">
        <button @click="resetCamera" class="btn btn-secondary" title="Reset Camera">
          🏠 Reset View
        </button>
        <button @click="toggleCulling" class="btn btn-secondary" title="Toggle Frustum Culling">
          {{ cullingEnabled ? '👁️' : '🙈' }} Culling
        </button>
                 <button @click="toggleLOD" class="btn btn-secondary" title="Toggle LOD">
           {{ lodEnabled ? '🎯' : '🎲' }} LOD
         </button>
         <button @click="toggleWallTransparency" class="btn btn-secondary" title="Toggle Wall Transparency">
           {{ wallTransparencyEnabled ? '🔍' : '🧱' }} Wall Transparency
         </button>
         <button @click="toggleStatusSpheres" class="btn btn-secondary" title="Toggle Status Spheres">
           {{ statusSpheresVisible ? '🔵' : '⚪' }} Status Spheres
         </button>
      </div>
      
      <div class="control-group">
        <button @click="make3D" class="btn btn-primary" title="Convert 2D to 3D">
          🎯 Make3D
        </button>
        <button @click="clearAll3D" class="btn btn-danger" title="Clear All 3D Objects">
          🗑️ Clear 3D
        </button>
      </div>
      
             <div class="control-group">
         <label>
           Height: {{ wallHeight }}m
           <input 
             type="range" 
             v-model="wallHeight" 
             min="2" 
             max="5" 
             step="0.1"
             @input="updateWallHeight"
           />
         </label>
                   <label v-if="wallTransparencyEnabled">
            Opacity: {{ wallOpacity }}%
            <input 
              type="range" 
              v-model="wallOpacity" 
              min="10" 
              max="100" 
              step="5"
              @input="updateWallOpacity"
            />
          </label>
       </div>
    </div>

    <!-- 3D 캔버스 -->
    <div class="canvas-3d" ref="canvas3dContainer">
      <canvas ref="canvas3d" />
      
      <!-- 로딩 표시 -->
      <div v-if="loading" class="loading-overlay">
        <div class="loading"></div>
        <p>Loading 3D models...</p>
      </div>
    </div>

    <!-- 정보 패널 -->
    <div class="info-panel">
      <div class="stats">
        <span>Objects: {{ objects.length }}</span>
        <span>Visible: {{ visibleObjects }}</span>
        <span>Polygons: {{ polygonCount }}</span>
        <span>FPS: {{ fps }}</span>
        <span>Zoom: {{ currentZoom.toFixed(1) }}x (0.2단계, 최대20x)</span>
        <span>PAN Speed: {{ currentPanSpeed.toFixed(1) }}</span>
        <span v-if="lodEnabled" class="lod-status">
          LOD: {{ shouldUseLOD() ? 'ON' : 'OFF' }} (통일된 회색)
        </span>
        <span v-else class="lod-status lod-disabled">
          LOD: OFF
        </span>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, watch, nextTick } from 'vue'
import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { TextGeometry } from 'three/examples/jsm/geometries/TextGeometry.js'
import { FontLoader } from 'three/examples/jsm/loaders/FontLoader.js'
import { useFloorplanStore } from '../stores/floorplanStore'

// Three.js LOD 클래스는 THREE.LOD로 사용 가능

// 상태 관리
const canvas3d = ref<HTMLCanvasElement>()
const canvas3dContainer = ref<HTMLDivElement>()

let scene: THREE.Scene
let camera: THREE.PerspectiveCamera
let renderer: THREE.WebGLRenderer
let controls: OrbitControls
let animationId: number
let frustum: THREE.Frustum
let projScreenMatrix: THREE.Matrix4

const loading = ref(false)
const wallHeight = ref(2.5)
const wallOpacity = ref(50) // 벽 투명도 (10-100%) - 기본값 50%
const wallTransparencyEnabled = ref(true) // 벽 투명도 활성화 여부 - 기본값 true
const objects = ref<THREE.Object3D[]>([])
const polygonCount = ref(0)
const fps = ref(0)
const visibleObjects = ref(0)
const cullingEnabled = ref(true)
const lodEnabled = ref(true)
const lodThreshold = ref(10) // LOD 활성화 임계값 (보이는 객체 수)
const statusSpheresVisible = ref(false) // 상태 표시 구체 표시 여부 - 기본값 false

// Zoom 및 PAN 속도 모니터링
const currentZoom = ref(1.0)
const currentPanSpeed = ref(3.0)
const targetZoom = ref(1.0) // 부드러운 Zoom 전환을 위한 목표값

// 3D 팝업 관련 상태
const raycaster = new THREE.Raycaster()
const mouse = new THREE.Vector2()
let current3DPopup: THREE.Group | null = null

// Pinia Store 사용
const floorplanStore = useFloorplanStore()

// Frustum Culling 관련 함수들
const updateFrustum = () => {
  if (!camera) {
    return
  }
  
  try {
    projScreenMatrix = new THREE.Matrix4()
    projScreenMatrix.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
    frustum = new THREE.Frustum()
    frustum.setFromProjectionMatrix(projScreenMatrix)
  } catch (error) {
    console.error('❌ updateFrustum 오류:', error)
  }
}

const isObjectVisible = (object: THREE.Object3D): boolean => {
  if (!cullingEnabled.value || !frustum) return true
  
  // 객체의 바운딩 박스 계산
  const box = new THREE.Box3()
  box.setFromObject(object)
  
  // Frustum과 바운딩 박스 교차 테스트
  return frustum.intersectsBox(box)
}

const updateObjectVisibility = () => {
  if (!scene) return
  
  let visibleCount = 0
  
  scene.traverse((child) => {
    if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
      const isVisible = isObjectVisible(child)
      
      // LOD 객체가 아닌 경우에만 직접 가시성 설정
      if (child.userData.type !== 'placed-object-lod') {
        child.visible = isVisible
        child.userData.wasVisible = isVisible // LOD를 위한 가시성 상태 저장
        
        // LOD 객체가 연결된 경우, LOD 객체의 가시성도 업데이트
        if (child.userData.lodObject) {
          child.userData.lodObject.userData.wasVisible = isVisible
        }
      }
      
      // Three.js LOD 객체는 카운트하지 않음 (중복 방지)
      if (isVisible && child.userData.type !== 'placed-object-lod') {
        visibleCount++
      }
    }
  })
  
  // Three.js LOD는 자동으로 처리되므로 수동 스케줄링 불필요
  visibleObjects.value = visibleCount
}

// Three.js 내장 LOD 시스템 사용 - 수동 전환 로직 제거
const shouldUseLOD = (): boolean => {
  // Three.js LOD는 자동으로 거리 기반 전환을 처리하므로 항상 true 반환
  return lodEnabled.value
}

// 통일된 LOD 색상 (모든 객체에 동일한 회색 적용)
const getLODColor = (): number => {
  return 0xCCCCCC // #CCCCCC - 밝은 회색
}

// Three.js LOD 상태 추적용 변수
let lastVisibleCount = 0

// Three.js 내장 LOD 사용 - 수동 업데이트 불필요
const updateLOD = () => {
  // Three.js LOD는 자동으로 거리 기반 전환을 처리하므로 수동 업데이트 불필요
}

// Three.js LOD는 자동으로 처리되므로 스케줄링 불필요
const scheduleLODUpdate = () => {
  // Three.js LOD는 자동으로 거리 기반 전환을 처리하므로 수동 스케줄링 불필요
}

// Three.js 초기화
const initThreeJS = () => {
  if (!canvas3d.value || !canvas3dContainer.value) {
    return
  }

  const container = canvas3dContainer.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  if (width === 0 || height === 0) {
    return
  }

  // 씬 생성
  scene = new THREE.Scene()
  scene.background = new THREE.Color(0xf0f0f0)

  // 카메라 생성
  camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000)
  camera.position.set(0, 25, 0)
  camera.lookAt(0, 0, 0)

  // 렌더러 생성
  renderer = new THREE.WebGLRenderer({ 
    canvas: canvas3d.value,
    antialias: true,
    alpha: true,
    preserveDrawingBuffer: false,
    powerPreference: "high-performance"
  })
  renderer.setSize(width, height)
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.outputColorSpace = THREE.SRGBColorSpace
  renderer.toneMapping = THREE.NoToneMapping
  renderer.toneMappingExposure = 1.0
  renderer.shadowMap.enabled = false

  // 카메라 컨트롤 설정
  controls = new OrbitControls(camera, renderer.domElement)
  controls.enableDamping = false  // 줌인 후 이동 속도 문제 해결을 위해 비활성화
  controls.maxPolarAngle = Math.PI / 2.5
  controls.minPolarAngle = 0
  controls.target.set(0, 0, 0)
  controls.screenSpacePanning = true
  controls.enablePan = true
  controls.enableZoom = true
  controls.enableRotate = true
  controls.mouseButtons = {
    LEFT: THREE.MOUSE.ROTATE,
    MIDDLE: THREE.MOUSE.DOLLY,
    RIGHT: THREE.MOUSE.PAN
  }
  controls.rotateSpeed = 1.0
  controls.zoomSpeed = 12.0  // Zoom 속도 극대화 (8.0 -> 12.0)
  controls.panSpeed = 3.0  // PAN 속도 증가 (1.5 -> 3.0)
  controls.maxDistance = 150
  controls.minDistance = 0.01  // 더 높은 Zoom을 위해 최소 거리 감소 (0.05 -> 0.01)
  controls.update()

  // 조명 설정
  setupLights()

  // Frustum 초기화
  updateFrustum()
  
  // 기본 폰트 로딩
  loadDefaultFont()
  
  // 클릭 이벤트 리스너 추가
  canvas3d.value.addEventListener('click', handleCanvasClick)
  
  // 마우스 이벤트 리스너 추가 (PAN 경험 개선)
  canvas3d.value.addEventListener('mousedown', handleMouseDown)
  canvas3d.value.addEventListener('mousemove', handleMouseMove)
  canvas3d.value.addEventListener('mouseup', handleMouseUp)
  
  // 마우스 휠 이벤트 리스너 추가 (Zoom 경험 개선)
  canvas3d.value.addEventListener('wheel', handleMouseWheel)
  
  // 우클릭 컨텍스트 메뉴 비활성화 (PAN 동작 개선)
  canvas3d.value.addEventListener('contextmenu', (e) => e.preventDefault())
  
  // 렌더링 시작
  animate()
  
  console.log('✅ Three.js 초기화 완료:', {
    hasScene: !!scene,
    hasCamera: !!camera,
    hasRenderer: !!renderer,
    hasControls: !!controls
  })
  
}

// 조명 설정
const setupLights = () => {
  if (!scene) {
    return
  }
  
  try {
    const ambientLight = new THREE.AmbientLight(0xffffff, 2.0)
    scene.add(ambientLight)

    const directionalLight = new THREE.DirectionalLight(0xffffff, 1.5)
    directionalLight.position.set(5, 8, 3)
    directionalLight.castShadow = false
    scene.add(directionalLight)

    const fillLight = new THREE.DirectionalLight(0xffffff, 1.0)
    fillLight.position.set(-5, 5, -3)
    fillLight.castShadow = false
    scene.add(fillLight)
  } catch (error) {
    console.error('❌ setupLights 오류:', error)
  }
}

// 3D 바닥 생성 (2D 룸 사이즈 기반) - 개선된 버전
const create3DFloorFromRoom = (data: any) => {
  if (!scene || !data?.roomSize || !data?.canvasSize) return

  // 기존 바닥 제거
  const existingFloors = scene.children.filter(child => 
    child.userData.type === 'room-floor' || child.userData.type === 'base-floor' || child.userData.type === 'zone-floor'
  )
  existingFloors.forEach(f => {
    scene.remove(f)
    if ((f as any).geometry) (f as any).geometry.dispose()
    if ((f as any).material) {
      const mat = (f as any).material
      if (Array.isArray(mat)) mat.forEach(m => m.dispose())
      else if ('dispose' in mat) mat.dispose()
    }
  })

  // 1단계: 기본 바닥 생성 (가장 아래 레이어)
  if (data.roomSize) {
    const widthMeters = data.roomSize.width
    const depthMeters = data.roomSize.height
    const geo = new THREE.PlaneGeometry(widthMeters, depthMeters)
    const mat = new THREE.MeshStandardMaterial({
      color: 0xD3D3D3, // 밝은 회색 (기본 바닥)
      roughness: 0.9,
      metalness: 0.0,
      transparent: false, // 기본 바닥은 불투명
      opacity: 1.0
    })
    const baseFloor = new THREE.Mesh(geo, mat)
    baseFloor.rotation.x = -Math.PI / 2
    baseFloor.position.set(0, -0.01, 0) // 약간 아래에 배치하여 Z-fighting 방지
    baseFloor.renderOrder = -1 // 가장 뒤에 렌더링
    baseFloor.userData.type = 'base-floor'
    scene.add(baseFloor)
  }

  // 2단계: 추가 바닥들 생성 (기본 바닥 위에)
  if (Array.isArray(data.floors)) {
    data.floors.forEach((f: any, index: number) => {
      // 기본 바닥과 겹치는 부분은 건너뛰기
      if (f.isZone || f.color === '#D3D3D3') {
        return
      }

      const widthMeters = f.width
      const depthMeters = f.height
      const geo = new THREE.PlaneGeometry(widthMeters, depthMeters)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(f.color || '#FFE082'),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.8, // 투명도 증가
        depthWrite: false, // 깊이 버퍼 쓰기 비활성화로 겹침 문제 해결
        depthTest: true, // 깊이 테스트는 활성화
        side: THREE.DoubleSide // 양면 렌더링
      })
      
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      
      // 좌표 변환 (2D px → 3D m)
      const cx = (f.boundsPx.left + f.boundsPx.right) / 2
      const cy = (f.boundsPx.top + f.boundsPx.bottom) / 2
      const posX = (cx - data.canvasSize.width / 2) / 40
      const posZ = (cy - data.canvasSize.height / 2) / 40
      
      mesh.position.set(posX, 0.01, posZ) // 기본 바닥보다 약간 위에 배치
      mesh.renderOrder = index + 1 // 순서대로 렌더링
      mesh.userData.type = 'room-floor'
      mesh.userData.floorId = f.id
      
      scene.add(mesh)
    })
  }

  // 3단계: Zone 바닥들 생성 (가장 위 레이어)
  if (Array.isArray(data.floors)) {
    const zoneFloors = data.floors.filter((f: any) => f.isZone)
    zoneFloors.forEach((f: any, index: number) => {
      const widthMeters = f.width
      const depthMeters = f.height
      const geo = new THREE.PlaneGeometry(widthMeters, depthMeters)
      const mat = new THREE.MeshStandardMaterial({
        color: new THREE.Color(f.color || '#FFE082'),
        roughness: 0.9,
        metalness: 0.0,
        transparent: true,
        opacity: 0.9, // Zone은 더 불투명하게
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide
      })
      
      const mesh = new THREE.Mesh(geo, mat)
      mesh.rotation.x = -Math.PI / 2
      
      // 좌표 변환
      const cx = (f.boundsPx.left + f.boundsPx.right) / 2
      const cy = (f.boundsPx.top + f.boundsPx.bottom) / 2
      const posX = (cx - data.canvasSize.width / 2) / 40
      const posZ = (cy - data.canvasSize.height / 2) / 40
      
      mesh.position.set(posX, 0.02, posZ) // Zone은 가장 위에 배치
      mesh.renderOrder = 100 + index // 높은 렌더 순서
      mesh.userData.type = 'zone-floor'
      mesh.userData.zoneId = f.id
      
      scene.add(mesh)
    })
  }

  // 4단계: 씬 정리 및 렌더링 순서 최적화
  if (scene) {
    // 바닥들을 렌더링 순서대로 정렬
    const floors = scene.children.filter(child => 
      child.userData.type === 'base-floor' || 
      child.userData.type === 'room-floor' || 
      child.userData.type === 'zone-floor'
    )
    
    floors.sort((a, b) => {
      const orderA = (a as any).renderOrder || 0
      const orderB = (b as any).renderOrder || 0
      return orderA - orderB
    })
    
    // 정렬된 순서대로 씬에 재배치
    floors.forEach((floor, index) => {
      scene.remove(floor)
      scene.add(floor)
    })
  }
}

// 2D 평면도에서 3D 벽 생성
const create3DWalls = (wallsData: any) => {
  const existingWalls: any[] = []
  scene.traverse((child) => {
    if (child.userData.type === 'exterior-wall' || child.userData.type === 'interior-wall') {
      existingWalls.push(child)
    }
  })
  
  existingWalls.forEach(wall => {
    scene.remove(wall)
    if (wall.geometry) wall.geometry.dispose()
    if (wall.material) wall.material.dispose()
  })

  if ((!wallsData.exteriorWalls || wallsData.exteriorWalls.length === 0) && 
      (!wallsData.interiorWalls || wallsData.interiorWalls.length === 0)) {
    return
  }

  const canvasWidth = wallsData.canvasSize?.width || 800
  const canvasHeight = wallsData.canvasSize?.height || 600

  if (wallsData.exteriorWalls) {
    wallsData.exteriorWalls.forEach((wall: any) => {
      createWall(wall, 'exterior-wall', 0xd3d3d3, canvasWidth, canvasHeight)
    })
  }

  if (wallsData.interiorWalls) {
    wallsData.interiorWalls.forEach((wall: any) => {
      createWall(wall, 'interior-wall', 0xd3d3d3, canvasWidth, canvasHeight)
    })
  }
}

// 개별 벽 생성 함수
const createWall = (wall: any, wallType: string, color: number, canvasWidth: number, canvasHeight: number) => {
  const start = wall.start
  const end = wall.end
  
  const length = Math.sqrt(
    Math.pow(end.x - start.x, 2) + Math.pow(start.y - end.y, 2)
  )
  const angle = Math.atan2(start.y - end.y, end.x - start.x)
  
  const wallGeometry = new THREE.BoxGeometry(length / 40, wallHeight.value, 0.1)
  const opacity = wallTransparencyEnabled.value ? wallOpacity.value / 100 : 1.0
  const wallMaterial = new THREE.MeshLambertMaterial({ 
    color: color,
    transparent: wallTransparencyEnabled.value && opacity < 1,
    opacity: opacity
  })
  
  const wallMesh = new THREE.Mesh(wallGeometry, wallMaterial)
  
  const centerX = (start.x + end.x) / 2
  const centerY = (start.y + end.y) / 2
  
  const pos3D_X = (centerX - canvasWidth / 2) / 40
  const pos3D_Y = wallHeight.value / 2
  const pos3D_Z = (centerY - canvasHeight / 2) / 40
  
  wallMesh.position.set(pos3D_X, pos3D_Y, pos3D_Z)
  wallMesh.rotation.y = angle
  wallMesh.castShadow = false
  wallMesh.receiveShadow = false
  wallMesh.userData.type = wallType
  
  if (wall.id) {
    wallMesh.userData.wallId = wall.id
  }
  
  scene.add(wallMesh)
}



// 애니메이션 루프
let lastTime = 0
const animate = (currentTime = 0) => {
  animationId = requestAnimationFrame(animate)
  
  // 필수 컴포넌트들이 초기화되었는지 확인
  if (!scene || !camera || !renderer || !controls) {
    console.log('⚠️ animate: 필요한 컴포넌트가 초기화되지 않음', {
      hasScene: !!scene,
      hasCamera: !!camera,
      hasRenderer: !!renderer,
      hasControls: !!controls
    })
    return
  }
  
  // FPS 계산
  if (currentTime - lastTime >= 1000) {
    fps.value = Math.round(1000 / (currentTime - lastTime))
    lastTime = currentTime
  }
  
  try {
    // Zoom 레벨에 따른 PAN 속도 동적 조정
    updatePanSpeedBasedOnZoom()
    
    // Zoom 및 PAN 속도 모니터링 업데이트
    updateZoomAndPanInfo()
    
    controls.update()
    
    // Frustum Culling 업데이트
    updateFrustum()
    updateObjectVisibility()
    
    // 상태 표시 구체 가시성 업데이트
    updateStatusSpheresVisibility()
    
    // 3D 팝업 빌보딩 업데이트
    if (current3DPopup) {
      current3DPopup.lookAt(camera.position)
    }
    
    // Three.js LOD는 자동으로 처리됨 - 수동 업데이트 불필요
    
    // 폴리곤 수 계산
    updatePolygonCount()
    
    renderer.render(scene, camera)
  } catch (error) {
    console.error('❌ animate 함수 오류:', error)
  }
}

// 폴리곤 수 업데이트
const updatePolygonCount = () => {
  if (!scene) {
    return
  }
  
  try {
    let count = 0
    scene.traverse((object) => {
      if (object instanceof THREE.Mesh && object.visible) {
        const geometry = object.geometry
        if (geometry.index) {
          count += geometry.index.count / 3
        } else {
          count += geometry.attributes.position.count / 3
        }
      }
    })
    polygonCount.value = Math.round(count)
  } catch (error) {
    console.error('❌ updatePolygonCount 오류:', error)
  }
}

// 마우스 이벤트 상태 관리
let isPanning = false
let lastMousePosition = { x: 0, y: 0 }

// 마우스 이벤트 핸들러들
const handleMouseDown = (event: MouseEvent) => {
  if (event.button === 2) { // 우클릭
    isPanning = true
    lastMousePosition = { x: event.clientX, y: event.clientY }
    event.preventDefault()
  }
}

const handleMouseMove = (event: MouseEvent) => {
  if (isPanning && controls) {
    const deltaX = event.clientX - lastMousePosition.x
    const deltaY = event.clientY - lastMousePosition.y
    
    // 마우스 이동 거리에 따른 PAN 속도 조정
    const moveDistance = Math.sqrt(deltaX * deltaX + deltaY * deltaY)
    if (moveDistance > 1) { // 1px 이상 이동했을 때만 PAN 적용
      controls.panSpeed = Math.max(controls.panSpeed, moveDistance * 0.1)
    }
    
    lastMousePosition = { x: event.clientX, y: event.clientY }
  }
}

const handleMouseUp = (event: MouseEvent) => {
  if (event.button === 2) { // 우클릭
    isPanning = false
  }
}

const handleMouseWheel = (event: WheelEvent) => {
  if (!controls || !camera) return
  
  // 휠 델타에 따른 Zoom 속도 조정
  const delta = event.deltaY
  const currentDistance = camera.position.distanceTo(controls.target)
  
  // Zoom 레벨에 따른 추가 속도 보정
  let zoomMultiplier = 1.0
  
  if (currentDistance < 5) {
    // 매우 가까운 경우 (극도로 확대) - Zoom 속도 극대화
    zoomMultiplier = 20.0
  } else if (currentDistance < 15) {
    // 가까운 경우 (대폭 확대) - Zoom 속도 대폭 증가
    zoomMultiplier = 12.0
  } else if (currentDistance < 30) {
    // 중간 거리 (확대) - Zoom 속도 증가
    zoomMultiplier = 8.0
  } else if (currentDistance < 60) {
    // 보통 거리 - 기본 속도
    zoomMultiplier = 5.0
  }
  
  // 휠 델타가 클수록 더 빠른 Zoom
  const speedMultiplier = Math.min(Math.abs(delta) / 100, 2.0)
  
  // 최종 Zoom 속도 계산
  controls.zoomSpeed = 4.0 * zoomMultiplier * speedMultiplier
  
  // Zoom 동작 후 속도 재조정을 위해 약간의 지연
  setTimeout(() => {
    updatePanSpeedBasedOnZoom()
  }, 50)
}

// Zoom 레벨에 따른 PAN 및 Zoom 속도 동적 조정 - 0.2 배수 단계에 맞춰 조정
const updatePanSpeedBasedOnZoom = () => {
  if (!controls || !camera) return
  
  // 카메라와 타겟 사이의 거리 계산
  const distance = camera.position.distanceTo(controls.target)
  
  // 기본 속도들
  const basePanSpeed = 3.0
  const baseZoomSpeed = 8.0
  
  // 0.2 배수 Zoom 단계에 맞춘 PAN 속도 조정
  // Zoom이 높을수록 (가까운 거리) PAN 속도를 느리게, Zoom이 낮을수록 (먼 거리) PAN 속도를 빠르게
  let adjustedPanSpeed = basePanSpeed
  
  if (distance < 0.5) {
    // 극도 확대 (15x~20x) - PAN 속도 극도 감소 (매우 정밀한 조작)
    adjustedPanSpeed = basePanSpeed * 0.1
  } else if (distance < 1) {
    // 극도 확대 (12x~15x) - PAN 속도 대폭 감소 (정밀한 조작)
    adjustedPanSpeed = basePanSpeed * 0.15
  } else if (distance < 2) {
    // 대폭 확대 (8x~12x) - PAN 속도 대폭 감소 (정밀한 조작)
    adjustedPanSpeed = basePanSpeed * 0.2
  } else if (distance < 5) {
    // 확대 (4x~8x) - PAN 속도 감소
    adjustedPanSpeed = basePanSpeed * 0.4
  } else if (distance < 10) {
    // 약간 확대 (2.5x~4x) - PAN 속도 약간 감소
    adjustedPanSpeed = basePanSpeed * 0.6
  } else if (distance < 20) {
    // 보통 (1.5x~2.5x) - 기본 PAN 속도
    adjustedPanSpeed = basePanSpeed
  } else if (distance < 40) {
    // 축소 (0.8x~1.5x) - PAN 속도 약간 증가
    adjustedPanSpeed = basePanSpeed * 1.8
  } else if (distance < 80) {
    // 대폭 축소 (0.4x~0.8x) - PAN 속도 증가
    adjustedPanSpeed = basePanSpeed * 2.5
  } else {
    // 극도 축소 (0.2x~0.4x) - PAN 속도 대폭 증가
    adjustedPanSpeed = basePanSpeed * 4.0
  }
  
  // 0.2 배수 Zoom 단계에 맞춘 Zoom 속도 조정
  // Zoom이 높을수록 (가까운 거리) Zoom 속도를 느리게, Zoom이 낮을수록 (먼 거리) Zoom 속도를 빠르게
  let adjustedZoomSpeed = baseZoomSpeed
  
  if (distance < 1) {
    // 극도 가까운 거리 (15x~20x) - Zoom 속도 극도 감소 (매우 정밀한 조정)
    adjustedZoomSpeed = baseZoomSpeed * 0.3
  } else if (distance < 3) {
    // 가까운 거리 (8x~15x) - Zoom 속도 감소 (정밀한 조정)
    adjustedZoomSpeed = baseZoomSpeed * 0.5
  } else if (distance < 8) {
    // 중간-가까운 거리 (4x~8x) - Zoom 속도 약간 감소
    adjustedZoomSpeed = baseZoomSpeed * 0.7
  } else if (distance < 15) {
    // 중간 거리 (2.5x~4x) - 기본 Zoom 속도
    adjustedZoomSpeed = baseZoomSpeed
  } else if (distance > 50) {
    // 먼 거리 (0.2x~1.5x) - Zoom 속도 증가 (빠른 조정)
    adjustedZoomSpeed = baseZoomSpeed * 2.0
  } else {
    // 중간 거리 - 기본 Zoom 속도
    adjustedZoomSpeed = baseZoomSpeed
  }
  
  controls.panSpeed = adjustedPanSpeed
  controls.zoomSpeed = adjustedZoomSpeed
}

// Zoom 및 PAN 속도 정보 업데이트
const updateZoomAndPanInfo = () => {
  if (!controls || !camera) return
  
  try {
    // 현재 Zoom 레벨 계산 (카메라와 타겟 사이의 거리 기반)
    const distance = camera.position.distanceTo(controls.target)
    const baseDistance = 15 // 기본 거리 (카메라 초기 위치)
    
    // 0.2 배수 단계별 Zoom 계산 - 더 체계적이고 예측 가능한 Zoom
    // 거리가 가까울수록 Zoom이 높아지도록 (0.2x ~ 20x 범위)
    let zoomLevel = 1.0
    
    if (distance <= 0) {
      // 극도로 가까운 경우 (최대 확대)
      zoomLevel = 20.0
    } else if (distance < 0.5) {
      // 극도로 가까운 경우 (극도 확대)
      zoomLevel = 20.0 / (distance + 0.02)
    } else if (distance < 1) {
      // 매우 가까운 경우 (대폭 확대)
      zoomLevel = 15.0 / (distance + 0.05)
    } else if (distance < 2) {
      // 가까운 경우 (확대)
      zoomLevel = 12.0 / (distance + 0.1)
    } else if (distance < 3) {
      // 중간-가까운 경우 (약간 확대)
      zoomLevel = 10.0 / (distance + 0.2)
    } else if (distance < 5) {
      // 보통-가까운 경우 (약간 확대)
      zoomLevel = 8.0 / (distance + 0.5)
    } else if (distance < 8) {
      // 기본 거리 근처 (약간 확대)
      zoomLevel = 6.0 / (distance + 1.0)
    } else if (distance < 12) {
      // 기본 거리 근처 (약간 확대)
      zoomLevel = 4.0 / (distance + 1.5)
    } else if (distance < baseDistance) {
      // 기본 거리 근처 (약간 확대)
      zoomLevel = 3.0 / (distance + 2.0)
    } else if (distance < 20) {
      // 기본 거리보다 약간 먼 경우 (약간 축소)
      zoomLevel = 2.5 / (distance / baseDistance)
    } else if (distance < 30) {
      // 기본 거리보다 먼 경우 (축소)
      zoomLevel = 2.0 / (distance / 25.0)
    } else if (distance < 45) {
      // 먼 경우 (약간 축소)
      zoomLevel = 1.5 / (distance / 35.0)
    } else if (distance < 70) {
      // 매우 먼 경우 (축소)
      zoomLevel = 1.0 / (distance / 50.0)
    } else if (distance < 100) {
      // 극도로 먼 경우 (대폭 축소)
      zoomLevel = 0.6 / (distance / 70.0)
    } else {
      // 극도로 먼 경우 (극도 축소)
      zoomLevel = 0.2 / (distance / 100.0)
    }
    
    // Zoom 수치를 합리적인 범위로 제한 (0.2x ~ 20x)
    zoomLevel = Math.max(0.2, Math.min(zoomLevel, 20.0))
    
    // 0.2 배수 단계로 반올림하여 더 체계적인 Zoom 제공
    zoomLevel = Math.round(zoomLevel * 5) / 5
    
    // 부드러운 Zoom 전환을 위한 보간 적용
    targetZoom.value = zoomLevel
    currentZoom.value += (targetZoom.value - currentZoom.value) * 0.12 // 12% 보간으로 더 부드럽게
    
    // NaN이나 Infinity 방지
    if (!isFinite(currentZoom.value)) {
      currentZoom.value = 1.0
    }
    
    // PAN 속도 업데이트
    currentPanSpeed.value = controls.panSpeed
    
  } catch (error) {
    console.error('❌ updateZoomAndPanInfo 오류:', error)
  }
}

// 컨트롤 함수들
const resetCamera = () => {
  camera.position.set(0, 15, 0)
  camera.lookAt(0, 0, 0)
  controls.target.set(0, 0, 0)
  controls.update()
}



const toggleCulling = () => {
  cullingEnabled.value = !cullingEnabled.value
  
  if (!cullingEnabled.value) {
    // Culling이 비활성화되면 모든 객체를 보이게 함
    scene.traverse((child) => {
      if (child instanceof THREE.Mesh || child instanceof THREE.Group) {
        child.visible = true
      }
    })
    visibleObjects.value = objects.value.length
  }
}

const toggleLOD = () => {
  lodEnabled.value = !lodEnabled.value
  
  // LOD 상태 변경 시 기존 객체들의 LOD 적용/해제
  if (floorplanStore.placedObjects.length > 0) {
    updatePlacedObjectsIn3D(floorplanStore.placedObjects)
  }
}

const updateWallHeight = () => {
  scene.traverse((object) => {
    if ((object.userData.type === 'exterior-wall' || object.userData.type === 'interior-wall') && object instanceof THREE.Mesh) {
      // 기존 지오메트리 제거하고 새로운 높이로 재생성
      object.geometry.dispose()
      
      // 현재 벽의 길이와 두께 계산
      const boundingBox = new THREE.Box3().setFromObject(object)
      const width = boundingBox.max.x - boundingBox.min.x
      const depth = 0.2 // 벽 두께 고정
      
      // 새 지오메트리 생성
      object.geometry = new THREE.BoxGeometry(width, wallHeight.value, depth)
      object.position.y = wallHeight.value / 2
    }
  })
}

const updateWallOpacity = () => {
  scene.traverse((object) => {
    if ((object.userData.type === 'exterior-wall' || object.userData.type === 'interior-wall') && object instanceof THREE.Mesh) {
      if (object.material instanceof THREE.MeshLambertMaterial) {
        const opacity = wallOpacity.value / 100
        object.material.transparent = opacity < 1
        object.material.opacity = opacity
        object.material.needsUpdate = true
      }
    }
  })
}

const toggleWallTransparency = () => {
  wallTransparencyEnabled.value = !wallTransparencyEnabled.value
  
  scene.traverse((object) => {
    if ((object.userData.type === 'exterior-wall' || object.userData.type === 'interior-wall') && object instanceof THREE.Mesh) {
      if (object.material instanceof THREE.MeshLambertMaterial) {
        if (wallTransparencyEnabled.value) {
          // 투명도 활성화: 설정된 투명도 적용
          const opacity = wallOpacity.value / 100
          object.material.transparent = opacity < 1
          object.material.opacity = opacity
        } else {
          // 투명도 비활성화: 완전 불투명으로 설정
          object.material.transparent = false
          object.material.opacity = 1.0
        }
        object.material.needsUpdate = true
      }
    }
  })
  
  console.log(`🧱 벽 투명도 ${wallTransparencyEnabled.value ? '활성화' : '비활성화'}`)
}

const toggleStatusSpheres = () => {
  statusSpheresVisible.value = !statusSpheresVisible.value
  
  scene.traverse((object) => {
    if (object.userData.type === 'status-sphere') {
      object.visible = statusSpheresVisible.value
    }
  })
  
  // 상태 표시 구체가 숨겨지면 3D 팝업도 함께 숨김
  if (!statusSpheresVisible.value && current3DPopup) {
    remove3DPopup()
  }
  
  console.log(`🔵 상태 표시 구체 ${statusSpheresVisible.value ? '표시' : '숨김'}`)
}

const updateStatusSpheresVisibility = () => {
  if (!scene) return
  
  scene.traverse((object) => {
    if (object.userData.type === 'status-sphere') {
      object.visible = statusSpheresVisible.value
    }
  })
}

// 실시간 3D 오브젝트 업데이트 (Store 변경 감지용)
const updatePlacedObjectsIn3D = async (placedObjects: any[]) => {

  
  if (!scene) {
    
    return
  }
  
  // 3D 팝업 제거
  remove3DPopup()

  // 기존 배치 오브젝트와 상태 표시 구체, 3D 팝업 모두 제거
  const existingObjects = scene.children.filter(child => 
    child.userData.type === 'placed-object' || child.userData.type === 'status-sphere' || child.userData.type === '3d-popup'
  )
  
  existingObjects.forEach((obj) => {
    scene.remove(obj)
    if (obj.traverse) {
      obj.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  })

  // 새로운 오브젝트들 추가
  if (placedObjects.length > 0) {
    await create3DObjects(placedObjects)
  }

  // 강제 렌더링 업데이트
  if (renderer && camera) {
    scene.updateMatrixWorld(true)
    renderer.render(scene, camera)
    
    requestAnimationFrame(() => {
      renderer.render(scene, camera)
    })
  }
}

// 인스턴싱용 큐브 지오메트리와 머티리얼 (전역 변수)
let instancedCubeGeometry: THREE.BoxGeometry | null = null
let instancedCubeMaterial: THREE.MeshStandardMaterial | null = null
// 여러 모델을 각각의 InstancedMesh로 관리
let instancedMeshes: THREE.InstancedMesh[] = []

// 3D 오브젝트 생성 (GLB 모델 로딩) - Three.js 내장 LOD 사용
const create3DObjects = async (placedObjects: any[]) => {
  if (!scene || !placedObjects || placedObjects.length === 0) {
    return
  }

  // 기존 배치 오브젝트와 상태 표시 구체, 3D 팝업 제거
  const existingObjects = scene.children.filter(child => 
    child.userData.type === 'placed-object' || child.userData.type === 'placed-object-lod' || child.userData.type === 'status-sphere' || child.userData.type === '3d-popup'
  )
  existingObjects.forEach(obj => {
    scene.remove(obj)
    if (obj.traverse) {
      obj.traverse((child: any) => {
        if (child.geometry) child.geometry.dispose()
        if (child.material) {
          if (Array.isArray(child.material)) {
            child.material.forEach((mat: any) => mat.dispose())
          } else {
            child.material.dispose()
          }
        }
      })
    }
  })

  // 이전 인스턴싱 메쉬가 남아있는 경우 정리 (인스턴싱 오브젝트가 0개가 되는 경우 대비)
  if (instancedMeshes.length > 0) {
    instancedMeshes.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material && 'dispose' in mesh.material) {
        mesh.material.dispose()
      }
    })
    instancedMeshes = []
  }

  // 인스턴싱이 활성화된 오브젝트들 분리 (상자가 아닌 것들만)
  const instancedObjects = placedObjects.filter(obj => obj.instancing && !obj.isBox)
  const normalObjects = placedObjects.filter(obj => !obj.instancing || obj.isBox)
  
  // 인스턴싱 오브젝트가 있으면 GLB 기반 InstancedMesh 생성
  if (instancedObjects.length > 0) {
    createInstancedObjectsFromGLB(instancedObjects)
  }
  
  // GLTFLoader 사용하여 GLB 모델 로딩
  const loader = new GLTFLoader()
  
  for (const placedObj of normalObjects) {
    // 상자인 경우 특별한 3D 상자 모델 생성
    if (placedObj.category === 'etc' && placedObj.isBox) {
      create3DBox(placedObj, placedObj.color || '#D2B48C')
      continue
    }
    
    try {
      console.log('loader.load', placedObj)
      
      // 메인 모델 로드
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(
          placedObj.glbUrl,
          (gltf) => resolve(gltf),
          undefined,
          (error) => reject(error)
        )
      })

      const model = gltf.scene.clone()
      
      // LOD 모델이 있는 경우 로드
      let lodModel: THREE.Object3D | null = null

      if (placedObj.lodUrl) {
        try {
          const lodGltf = await new Promise<any>((resolve, reject) => {
            loader.load(
              placedObj.lodUrl,
              (gltf) => {
                console.log(`✅ ${placedObj.name} LOD GLB 로딩 성공`)
                resolve(gltf)
              },
              undefined,
              (error) => {
                console.error(`❌ ${placedObj.name} LOD GLB 로딩 실패:`, error)
                console.error(`   - 시도한 URL: ${placedObj.lodUrl}`)
                reject(error)
              }
            )
          })
          
          lodModel = lodGltf.scene.clone()
          
          // LOD 모델의 메시 정보 확인
          let lodMeshCount = 0
          if (lodModel) {
            lodModel.traverse((child: any) => {
              if (child.isMesh) {
                lodMeshCount++
                console.log(`📊 ${placedObj.name} LOD 모델 메시: ${lodMeshCount}개`)
              }
            })
          }
        } catch (lodError) {
          console.warn(`${placedObj.name} LOD 모델 로드 실패:`, lodError)
        }
      } else {
        console.log(`ℹ️ ${placedObj.name} LOD 모델 없음`)
      }
      
      // 모델 크기 조정 (width, depth, height 기준)
      const box = new THREE.Box3().setFromObject(model)
      const size = box.getSize(new THREE.Vector3())
      const scaleX = placedObj.width / size.x   // 가로 (X축)
      const scaleZ = placedObj.depth / size.z   // 세로 (Z축)  
      const scaleY = placedObj.height / size.y  // 높이 (Y축)
      
      model.scale.set(scaleX, scaleY, scaleZ)
      
      // 모델 위치 설정
      const isTV = placedObj.category === 'av'
      const pos3D = {
        x: placedObj.position.x,
        y: isTV ? 0 : placedObj.height / 2,
        z: placedObj.position.y
      }
      
      // 모델 회전 설정 (Y축 수직 회전)
      const rotationValue = placedObj.rotation
      
      // LOD 모델이 있는 경우 동일한 스케일 적용 (위치는 LOD 객체에서 설정)
      if (lodModel) {
        lodModel.scale.set(scaleX, scaleY, scaleZ)
        // LOD 모델의 위치는 (0,0,0)으로 설정 (LOD 객체가 위치를 관리)
        lodModel.position.set(0, 0, 0)
        lodModel.rotation.y = -rotationValue
        
        // LOD 모델의 모든 머티리얼을 단일 색상으로 변경
        lodModel.traverse((child: any) => {
          if (child.isMesh && child.material) {
            // 기존 머티리얼의 색상 정보 저장
            if (!child.userData.originalMaterial) {
              child.userData.originalMaterial = {
                color: child.material.color?.clone()
              }
            }
            
                         // 통일된 색상 머티리얼로 교체
             const lodColor = getLODColor()
            const newMaterial = new THREE.MeshStandardMaterial({
              color: lodColor,
              roughness: 0.5,
              metalness: 0.0
            })
            
            if (child.material.dispose) {
              child.material.dispose()
            }
            
            child.material = newMaterial
          }
        })
      }
      
             // 단순한 토글 기반 LOD 사용
       let finalObject: THREE.Object3D
       
       if (lodEnabled.value) {
         // LOD 모드: 통일된 회색 모델 사용
         if (lodModel) {
           // LOD 모델을 메인으로 사용
           lodModel.position.set(pos3D.x, pos3D.y, pos3D.z)
           lodModel.rotation.y = -rotationValue
           finalObject = lodModel
           // LOD 모델을 메인으로 사용
           lodModel.position.set(pos3D.x, pos3D.y, pos3D.z)
           lodModel.rotation.y = -rotationValue
           finalObject = lodModel
         } else {
           // LOD 모델이 없으면 원본 모델에 회색 적용
           model.traverse((child: any) => {
             if (child.isMesh && child.material) {
               const newMaterial = new THREE.MeshStandardMaterial({
                 color: getLODColor(),
                 roughness: 0.5,
                 metalness: 0.0
               })
               if (child.material.dispose) {
                 child.material.dispose()
               }
               child.material = newMaterial
             }
           })
           model.position.set(pos3D.x, pos3D.y, pos3D.z)
           model.rotation.y = -rotationValue
           finalObject = model
         }
       } else {
         // 일반 모드: 원본 모델 사용
         model.position.set(pos3D.x, pos3D.y, pos3D.z)
         model.rotation.y = -rotationValue
         finalObject = model
       }
      
      // 메타데이터 설정
      finalObject.userData = {
        type: 'placed-object',
        placedObjectId: placedObj.id,
        objectName: placedObj.name,
        category: placedObj.category,
        height: placedObj.height,
        boxId: placedObj.boxId,
        glbUrl: placedObj.glbUrl,
        lodUrl: placedObj.lodUrl,
                 usesLOD: lodEnabled.value
      }
      
      scene.add(finalObject)
      
      // 상태 표시용 구체 추가
      addStatusSphere(finalObject, placedObj)
      
    } catch (error) {
      console.error(`❌ GLB 모델 로딩 실패 (${placedObj.name}):`, error)
      
      // 오류 시 기본 큐브로 대체
      const fallbackGeometry = new THREE.BoxGeometry(placedObj.width, placedObj.height, placedObj.depth)
      const fallbackMaterial = new THREE.MeshStandardMaterial({ 
        color: '#ff0000' // 빨간색으로 오류 표시
      })
      const fallbackMesh = new THREE.Mesh(fallbackGeometry, fallbackMaterial)
      fallbackMesh.position.set(placedObj.position.x, placedObj.height / 2, placedObj.position.y)
      fallbackMesh.userData = {
        type: 'placed-object',
        placedObjectId: placedObj.id,
        objectName: placedObj.name + ' (오류)',
        category: placedObj.category,
        height: placedObj.height,
        boxId: placedObj.boxId
      }
      scene.add(fallbackMesh)
      
      // 오류 객체에도 상태 표시 구체 추가
      addStatusSphere(fallbackMesh, placedObj)
    }
  }
}

// 상태 표시용 구체 생성 함수
const addStatusSphere = (object: THREE.Object3D, placedObj: any) => {
  // 객체의 바운딩 박스 계산
  const box = new THREE.Box3().setFromObject(object)
  const size = box.getSize(new THREE.Vector3())
  
  // 구체 크기 계산 (객체 크기의 15%로 설정, 최소 0.1, 최대 0.3)
  // 더미 그룹(지오메트리 없음)일 경우 placedObj의 크기를 사용
  const hasGeometryBounds = size.x > 0 || size.y > 0 || size.z > 0
  const refWidth = hasGeometryBounds ? Math.max(size.x, size.y, size.z) : Math.max(placedObj.width || 1, placedObj.height || 1, placedObj.depth || 1)
  const sphereRadius = Math.max(0.1, Math.min(0.3, refWidth * 0.15))
  
  // 구체 지오메트리와 머티리얼 생성
  const sphereGeometry = new THREE.SphereGeometry(sphereRadius, 16, 16)
  const sphereMaterial = new THREE.MeshStandardMaterial({
    color: 0xA0B8D9, // 파스텔 파란색
    transparent: true,
    opacity: 0.8,
    roughness: 0.3,
    metalness: 0.1
  })
  
  const sphere = new THREE.Mesh(sphereGeometry, sphereMaterial)
  
  // 구체 위치 설정 (객체 상단 중앙)
  // 더미 그룹인 경우 바운딩이 0이므로 높이 절반을 더해 상단을 추정
  const objectTop = hasGeometryBounds ? box.max.y : (object.position.y + (placedObj.height || 0) / 2)
  sphere.position.set(
    object.position.x,
    objectTop + sphereRadius * 1.2, // 객체 위에 약간의 간격을 두고 배치
    object.position.z
  )
  
  // 구체 메타데이터 설정
  sphere.userData = {
    type: 'status-sphere',
    parentObjectId: placedObj.id,
    parentObjectName: placedObj.name,
    category: placedObj.category
  }
  
  // 초기 가시성 상태 설정
  sphere.visible = statusSpheresVisible.value
  
  // 씬에 구체 추가
  scene.add(sphere)
  
  console.log(`🔵 상태 표시 구체 추가: ${placedObj.name} (반지름: ${sphereRadius.toFixed(2)})`)
}

// 폰트 로딩 및 텍스트 렌더링 시스템
let loadedFont: any = null
const fontLoader = new FontLoader()

// 기본 폰트 로딩 (실제 폰트 파일 사용)
const loadDefaultFont = () => {
  try {
    // 기본 폰트 데이터 (실제 폰트 파일이 없을 때 사용할 fallback)
    const fontData = {
      familyName: 'Arial',
      ascender: 0.8,
      descender: -0.2,
      underlinePosition: -0.1,
      underlineThickness: 0.05,
      boundingBox: {
        yMin: -0.2,
        yMax: 0.8,
        xMin: 0,
        xMax: 0
      },
      glyphs: {}
    }
    
    // 기본 문자들에 대한 간단한 기하학적 형태 정의
    const basicGlyphs = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789가나다라마바사아자차카타파하:()×°'
    basicGlyphs.split('').forEach(char => {
      (fontData.glyphs as any)[char] = {
        ha: 0.6, // 기본 너비
        x_min: 0,
        x_max: 0.5,
        o: `m 0 0 l 0.5 0 l 0.5 0.6 l 0 0.6 z` // 간단한 사각형 형태
      }
    })
    
    loadedFont = fontData
    console.log('📝 기본 폰트 로딩 완료')
  } catch (error) {
    console.error('❌ loadDefaultFont 오류:', error)
  }
}

// 3D 텍스트 생성 함수 (개선된 버전)
const create3DText = (text: string, size: number = 0.1, color: number = 0x000000, position: THREE.Vector3 = new THREE.Vector3()) => {
  if (!loadedFont) {
    loadDefaultFont()
  }
  
  // 텍스트 그룹 생성
  const textGroup = new THREE.Group()
  
  // 텍스트를 여러 개의 작은 평면으로 표현 (개선된 버전)
  const charWidth = size * 0.5
  const charHeight = size * 0.7
  const charSpacing = size * 0.05
  
  // 한글과 영문을 구분하여 처리
  const processText = (text: string) => {
    const chars = []
    for (let i = 0; i < text.length; i++) {
      const char = text[i]
      const charCode = char.charCodeAt(0)
      
      // 한글 범위: 44032-55203 (가-힣)
      if (charCode >= 44032 && charCode <= 55203) {
        chars.push({ char, isKorean: true })
      } else {
        chars.push({ char, isKorean: false })
      }
    }
    return chars
  }
  
  const processedChars = processText(text)
  
  processedChars.forEach((charInfo, index) => {
    const { char, isKorean } = charInfo
    
    // 한글과 영문에 따라 크기 조정
    const finalCharWidth = isKorean ? charWidth * 1.2 : charWidth
    const finalCharHeight = isKorean ? charHeight * 1.1 : charHeight
    
    const charGeometry = new THREE.PlaneGeometry(finalCharWidth, finalCharHeight)
    const charMaterial = new THREE.MeshBasicMaterial({ 
      color: color,
      transparent: true,
      opacity: 0.95,
      side: THREE.DoubleSide
    })
    const charMesh = new THREE.Mesh(charGeometry, charMaterial)
    
    // 위치 계산 (한글과 영문의 크기 차이 고려)
    let xOffset = 0
    for (let i = 0; i < index; i++) {
      const prevChar = processedChars[i]
      const prevWidth = prevChar.isKorean ? charWidth * 1.2 : charWidth
      xOffset += prevWidth + charSpacing
    }
    
    charMesh.position.set(
      xOffset - (processedChars.reduce((total, c) => total + (c.isKorean ? charWidth * 1.2 : charWidth), 0) + (processedChars.length - 1) * charSpacing) / 2,
      0,
      0
    )
    
    // 한글 문자에 대한 시각적 표시 (디버깅용)
    if (isKorean) {
      // 한글 문자는 약간 다른 색상으로 표시
      charMaterial.color.setHex(0x0000ff) // 파란색으로 표시
    }
    
    textGroup.add(charMesh)
  })
  
  textGroup.position.copy(position)
  return textGroup
}

// 더 나은 텍스트 렌더링을 위한 Canvas 기반 텍스트 생성
const createCanvasText = (text: string, size: number = 0.1, color: number = 0x000000, position: THREE.Vector3 = new THREE.Vector3()) => {
  // Canvas를 사용하여 텍스트를 텍스처로 렌더링
  const canvas = document.createElement('canvas')
  const context = canvas.getContext('2d')
  
  if (!context) {
    return create3DText(text, size, color, position) // fallback
  }
  
  // Canvas 크기 설정 - 더 큰 해상도로 선명도 향상
  const fontSize = Math.floor(size * 140) // 폰트 크기 더 증가
  canvas.width = text.length * fontSize * 1.3
  canvas.height = fontSize * 1.6
  
  // 배경을 투명하게
  context.clearRect(0, 0, canvas.width, canvas.height)
  
  // 텍스트 그림자 효과 추가 (가독성 향상)
  context.shadowColor = 'rgba(0, 0, 0, 0.7)' // 그림자 더 진하게
  context.shadowBlur = 3
  context.shadowOffsetX = 1
  context.shadowOffsetY = 1
  
  // 폰트 설정 - 더 굵은 폰트로 가독성 향상
  context.font = `bold ${fontSize}px Arial, sans-serif`
  context.fillStyle = `#${color.toString(16).padStart(6, '0')}`
  context.textAlign = 'center'
  context.textBaseline = 'middle'
  
  // 텍스트 그리기
  context.fillText(text, canvas.width / 2, canvas.height / 2)
  
  // 그림자 효과 제거
  context.shadowColor = 'transparent'
  context.shadowBlur = 0
  context.shadowOffsetX = 0
  context.shadowOffsetY = 0
  
  // 텍스처 생성
  const texture = new THREE.CanvasTexture(canvas)
  texture.needsUpdate = true
  
  // 평면 메시 생성
  const aspectRatio = canvas.width / canvas.height
  const planeWidth = size * aspectRatio
  const planeHeight = size
  
  const planeGeometry = new THREE.PlaneGeometry(planeWidth, planeHeight)
  const planeMaterial = new THREE.MeshBasicMaterial({
    map: texture,
    transparent: true,
    side: THREE.DoubleSide
  })
  
  const planeMesh = new THREE.Mesh(planeGeometry, planeMaterial)
  planeMesh.position.copy(position)
  
  return planeMesh
}
const create3DPopup = (objectData: any, spherePosition: THREE.Vector3) => {
  // 기존 팝업 제거
  remove3DPopup()
  
  // 팝업 그룹 생성
  const popupGroup = new THREE.Group()
  popupGroup.userData.type = '3d-popup'
  
  // 팝업 배경 (평면) - 크기 더 축소
  const popupWidth = 2.4
  const popupHeight = 2.1
  const popupGeometry = new THREE.PlaneGeometry(popupWidth, popupHeight)
  const popupMaterial = new THREE.MeshStandardMaterial({
    color: 0xffffff,
    transparent: true,
    opacity: 0.40, // 배경을 더 투명하게
    side: THREE.DoubleSide
  })
  const popupBackground = new THREE.Mesh(popupGeometry, popupMaterial)
  popupBackground.position.z = 0.01 // 약간 앞으로
  popupGroup.add(popupBackground)
  
  // 팝업 테두리
  const borderGeometry = new THREE.EdgesGeometry(popupGeometry)
  const borderMaterial = new THREE.LineBasicMaterial({ color: 0x333333, linewidth: 2 })
  const border = new THREE.LineSegments(borderGeometry, borderMaterial)
  border.position.z = 0.02
  popupGroup.add(border)
  
  // 텍스트 정보 그룹
  const infoGroup = new THREE.Group()
  
  // 제목 배경
  const titleBgGeometry = new THREE.PlaneGeometry(2.1, 0.35)
  const titleBgMaterial = new THREE.MeshBasicMaterial({ color: 0x4a90e2 })
  const titleBg = new THREE.Mesh(titleBgGeometry, titleBgMaterial)
  titleBg.position.set(0, 0.8, 0.05)
  infoGroup.add(titleBg)
  
  // 제목 텍스트 (Canvas 기반 텍스트 렌더링) - 크기 증가로 가독성 향상
  const titleText = createCanvasText(objectData.objectName, 0.25, 0xffffff, new THREE.Vector3(0, 0.8, 0.06))
  infoGroup.add(titleText)
  
  // 정보 라인들 (텍스트 정보를 색상으로 구분) - 크기 축소
  const lineGeometry = new THREE.PlaneGeometry(2.0, 0.25)
  const lineMaterial = new THREE.MeshBasicMaterial({ color: 0xf8f9fa })
  
  const infoLines = [
    { y: 0.5, color: 0xe8f4fd, text: `카테고리: ${objectData.category}` },
    { y: 0.2, color: 0xf0f0f0, text: `크기: ${objectData.width}×${objectData.depth}×${objectData.height}m` },
    { y: -0.1, color: 0xe8f4fd, text: `위치: (${objectData.position.x.toFixed(1)}, ${objectData.position.y.toFixed(1)})` },
    { y: -0.4, color: 0xf0f0f0, text: `회전: ${objectData.rotation}°` },
    { y: -0.7, color: 0xe8f4fd, text: `상태: 정상` }
  ]
  
  infoLines.forEach((line) => {
    // 정보 라인 배경
    const lineMesh = new THREE.Mesh(lineGeometry, lineMaterial.clone())
    lineMesh.material.color.setHex(line.color)
    lineMesh.position.set(0, line.y, 0.05)
    infoGroup.add(lineMesh)
    
    // 실제 텍스트 (Canvas 기반 텍스트 렌더링) - 크기 증가로 가독성 향상
    const textMesh = createCanvasText(line.text, 0.2, 0x000000, new THREE.Vector3(0, line.y, 0.06))
    infoGroup.add(textMesh)
  })
  
  // 버튼 제거 - Focus와 Close 버튼 삭제
  
  popupGroup.add(infoGroup)
  
  // 팝업 위치 설정 (구체 바로 위에 배치)
  popupGroup.position.copy(spherePosition)
  popupGroup.position.y += 1.0 // 구체 위 1.0유닛으로 더 높게 배치
  
  // 카메라를 향하도록 회전
  popupGroup.lookAt(camera.position)
  
  scene.add(popupGroup)
  current3DPopup = popupGroup
}

// 3D 팝업 제거
const remove3DPopup = () => {
  if (current3DPopup) {
    scene.remove(current3DPopup)
    current3DPopup = null
  }
}

// 객체로 카메라 이동
const focusOnObject = (objectData: any) => {
  if (objectData.position) {
    const targetPosition = new THREE.Vector3(
      objectData.position.x,
      objectData.position.y + 5, // 객체 위 5유닛
      objectData.position.z
    )
    
    camera.position.copy(targetPosition)
    controls.target.set(
      objectData.position.x,
      objectData.position.y,
      objectData.position.z
    )
    controls.update()
    
    remove3DPopup()
  }
}

// 캔버스 클릭 이벤트 처리
const handleCanvasClick = (event: MouseEvent) => {
  if (!canvas3d.value || !camera || !scene) return
  
  const rect = canvas3d.value.getBoundingClientRect()
  mouse.x = ((event.clientX - rect.left) / rect.width) * 2 - 1
  mouse.y = -((event.clientY - rect.top) / rect.height) * 2 + 1
  
  raycaster.setFromCamera(mouse, camera)
  
  // 3D 팝업 클릭 검사 (우선순위)
  if (current3DPopup) {
    // 팝업 배경 클릭 검사 (팝업 닫기)
    const popupBackground = current3DPopup.children.find(child => child.type === 'Mesh' && !child.userData.action)
    if (popupBackground) {
      const backgroundIntersects = raycaster.intersectObject(popupBackground, false)
      if (backgroundIntersects.length > 0) {
        remove3DPopup()
        return
      }
    }
    
    // 팝업 내부 클릭 시에도 닫기 (버튼이 제거되었으므로)
    const popupIntersects = raycaster.intersectObject(current3DPopup, true)
    if (popupIntersects.length > 0) {
      remove3DPopup()
      return
    }
  }
  
  // 상태 표시 구체가 숨겨져 있으면 클릭 이벤트 처리하지 않음
  if (!statusSpheresVisible.value) {
    if (current3DPopup) {
      remove3DPopup()
    }
    return
  }
  
  // 상태 표시 구체 클릭 검사
  const statusSpheres = scene.children.filter(child => child.userData.type === 'status-sphere')
  const intersects = raycaster.intersectObjects(statusSpheres, false)
  
  if (intersects.length > 0) {
    const clickedSphere = intersects[0].object
    const parentObjectId = clickedSphere.userData.parentObjectId
    
    // 부모 객체 정보 찾기 (일반 GLB 경로)
    const parentObject = scene.children.find(child =>
      child.userData.type === 'placed-object' &&
      child.userData.placedObjectId === parentObjectId
    )
    
    // Store에서 원본 데이터 찾기 (인스턴싱 경로 포함)
    const originalData = floorplanStore.placedObjects.find(obj => obj.id === parentObjectId)
    
    if (originalData) {
      const objectData = {
        objectName: originalData.name,
        category: originalData.category,
        width: originalData.width,
        depth: originalData.depth,
        height: originalData.height,
        position: {
          x: originalData.position.x,
          y: originalData.position.y
        },
        rotation: originalData.rotation || 0
      }
      
      // 3D 팝업 생성 - 클릭된 구체의 실제 위치 사용
      const spherePosition = clickedSphere.position.clone()
      create3DPopup(objectData, spherePosition)
    }
  } else {
    // 아무것도 클릭되지 않았고 팝업이 열려있다면 팝업 닫기
    if (current3DPopup) {
      remove3DPopup()
    }
  }
}

// 3D 상자 모델 생성
const create3DBox = (placedObj: any, color: string) => {
  const pastelBrown = '#E6D5AC'
  
  const boxGeometry = new THREE.BoxGeometry(placedObj.width, placedObj.height, placedObj.depth)
  const boxMaterial = new THREE.MeshStandardMaterial({ 
    color: pastelBrown,
    transparent: true,
    opacity: 0.9
  })
  const boxMesh = new THREE.Mesh(boxGeometry, boxMaterial)
  
  const boxGroup = new THREE.Group()
  boxGroup.add(boxMesh)
  
  boxGroup.position.set(placedObj.position.x, placedObj.height / 2, placedObj.position.y)
  boxGroup.rotation.y = placedObj.rotation || 0
  
  boxGroup.userData = {
    type: 'placed-object',
    placedObjectId: placedObj.id,
    objectName: placedObj.name,
    category: placedObj.category,
    isBox: true,
    boxId: placedObj.id,
    height: placedObj.height
  }
  
  scene.add(boxGroup)
  
  // 상자에도 상태 표시 구체 추가
  addStatusSphere(boxGroup, placedObj)
}

// GLB 파일을 사용한 인스턴싱 오브젝트들 생성 (InstancedMesh 사용)
// 같은 glbUrl(+lodUrl) 별로 묶어서 각각의 InstancedMesh를 생성
const createInstancedObjectsFromGLB = async (instancedObjects: any[]) => {
  if (instancedObjects.length === 0) return
  
  // glbUrl(+lodUrl) 키로 그룹핑
  const groups = new Map<string, any[]>()
  instancedObjects.forEach(obj => {
    const key = `${(lodEnabled.value && obj.lodUrl) ? obj.lodUrl : obj.glbUrl}`
    if (!groups.has(key)) groups.set(key, [])
    groups.get(key)!.push(obj)
  })

  const loader = new GLTFLoader()
  for (const [key, group] of groups.entries()) {
    try {
      const gltf = await new Promise<any>((resolve, reject) => {
        loader.load(key, resolve, undefined, reject)
      })

      gltf.scene.updateMatrixWorld(true)
      const sourceMesh = gltf.scene.children.find((child: THREE.Object3D) => child.type === 'Mesh') as THREE.Mesh
      if (!sourceMesh) {
        console.error('❌ GLB에서 메시를 찾을 수 없음:', key)
        continue
      }
      const baseQuaternion = new THREE.Quaternion()
      sourceMesh.getWorldQuaternion(baseQuaternion)

      // 지오메트리와 머티리얼 복제 (인스턴싱용)
      const instancedGeometry = sourceMesh.geometry.clone()
      let instancedMaterial: THREE.Material = Array.isArray(sourceMesh.material)
        ? (sourceMesh.material[0] as THREE.Material).clone()
        : (sourceMesh.material as THREE.Material).clone()

      // LOD 모드일 경우, 통일된 회색 머티리얼 적용
      if (lodEnabled.value) {
        if ('dispose' in instancedMaterial) {
          instancedMaterial.dispose()
        }
        instancedMaterial = new THREE.MeshStandardMaterial({
          color: getLODColor(),
          roughness: 0.5,
          metalness: 0.0
        })
      }

      const mesh = new THREE.InstancedMesh(
        instancedGeometry,
        instancedMaterial,
        group.length
      )

      // GLB 모델의 원본 바운딩 박스 계산 (스케일 계산 공통)
      const boundingBox = new THREE.Box3().setFromObject(gltf.scene)
      const originalSize = {
        width: boundingBox.max.x - boundingBox.min.x,
        height: boundingBox.max.y - boundingBox.min.y,
        depth: boundingBox.max.z - boundingBox.min.z
      }

      group.forEach((obj, index) => {
        const matrix = new THREE.Matrix4()
        const position = new THREE.Vector3(obj.position.x, obj.height / 2, obj.position.y)
        const rotation = new THREE.Euler(0, -(obj.rotation || 0), 0)
        const instanceQuaternion = new THREE.Quaternion().setFromEuler(rotation)
        const finalQuaternion = baseQuaternion.clone().multiply(instanceQuaternion)
        const scale = new THREE.Vector3(
          (obj.width || 1) / (originalSize.width || 1),
          (obj.height || 1) / (originalSize.height || 1),
          (obj.depth || 1) / (originalSize.depth || 1)
        )
        matrix.compose(position, finalQuaternion, scale)
        mesh.setMatrixAt(index, matrix)
      })

      mesh.userData = {
        type: 'instanced-objects',
        count: group.length
      }
      scene.add(mesh)
      instancedMeshes.push(mesh)

      // 상태 구체 추가 (더미 그룹으로 위치/높이 계산)
      group.forEach(obj => {
        const dummyGroup = new THREE.Group()
        dummyGroup.position.set(obj.position.x, obj.height / 2, obj.position.y)
        dummyGroup.userData = {
          type: 'placed-object',
          placedObjectId: obj.id,
          objectName: obj.name,
          category: obj.category,
          height: obj.height,
          isInstanced: true
        }
        scene.add(dummyGroup)
        addStatusSphere(dummyGroup, obj)
        scene.remove(dummyGroup)
      })

    } catch (e) {
      console.error('❌ GLB 로딩 실패(그룹):', key, e)
      createInstancedObjects(group)
    }
  }
}

// 큐브 기반 인스턴싱 오브젝트들 생성 (폴백용)
const createInstancedObjects = (instancedObjects: any[]) => {
  // 기존 인스턴스 메시 정리 (폴백 전용 단일 메쉬)
  if (instancedMeshes.length > 0) {
    instancedMeshes.forEach(mesh => {
      scene.remove(mesh)
      mesh.geometry.dispose()
      if (mesh.material && 'dispose' in mesh.material) {
        mesh.material.dispose()
      }
    })
    instancedMeshes = []
  }
  
  if (instancedObjects.length === 0) return
  
  // 공통 큐브 지오메트리와 머티리얼 생성
  if (!instancedCubeGeometry) {
    instancedCubeGeometry = new THREE.BoxGeometry(1, 1, 1)
  }
  
  if (!instancedCubeMaterial) {
    instancedCubeMaterial = new THREE.MeshStandardMaterial({
      color: '#FF6B6B', // 인스턴싱 큐브는 빨간색
      transparent: true,
      opacity: 0.8
    })
  }
  
  // InstancedMesh 생성
  const mesh = new THREE.InstancedMesh(
    instancedCubeGeometry,
    instancedCubeMaterial,
    instancedObjects.length
  )
  // LOD 모드일 경우 폴백 큐브도 동일한 회색 적용
  if (lodEnabled.value && instancedCubeMaterial) {
    instancedCubeMaterial.color = new THREE.Color(getLODColor())
    instancedCubeMaterial.needsUpdate = true
  }
  
  // 각 오브젝트의 변환 행렬 설정
  instancedObjects.forEach((obj, index) => {
    const matrix = new THREE.Matrix4()
    
    // 위치 설정
    const position = new THREE.Vector3(
      obj.position.x,
      obj.height / 2, // 바닥에서 높이의 절반만큼 올림
      obj.position.y
    )
    
    // 회전 설정
    const rotation = new THREE.Euler(0, obj.rotation || 0, 0)
    
    // 스케일 설정 (오브젝트 크기에 맞춤)
    const scale = new THREE.Vector3(
      obj.width || 1,
      obj.height || 1,
      obj.depth || 1
    )
    
    // 변환 행렬 구성
    matrix.compose(position, new THREE.Quaternion().setFromEuler(rotation), scale)
    
    // 인스턴스에 변환 행렬 적용
    if (mesh) {
      mesh.setMatrixAt(index, matrix)
      
      // 각 인스턴스에 고유 색상 설정 (선택사항)
      const color = new THREE.Color('#FF6B6B')
      mesh.setColorAt(index, color)
    }
  })
  
  // InstancedMesh를 씬에 추가
  if (mesh) {
    mesh.userData = {
      type: 'instanced-objects',
      count: instancedObjects.length,
      objects: instancedObjects.map(obj => ({
        id: obj.id,
        name: obj.name,
        category: obj.category
      }))
    }
    scene.add(mesh)
    instancedMeshes.push(mesh)
  }
  
  // 인스턴싱 오브젝트들에 대한 상태 표시 구체들 추가
  instancedObjects.forEach(obj => {
    const dummyGroup = new THREE.Group()
    dummyGroup.position.set(obj.position.x, obj.height / 2, obj.position.y)
    dummyGroup.userData = {
      type: 'instanced-object-dummy',
      placedObjectId: obj.id,
      objectName: obj.name,
      category: obj.category,
      isInstanced: true
    }
    addStatusSphere(dummyGroup, obj)
  })
  
  console.log(`✅ 큐브 기반 인스턴싱 오브젝트 ${instancedObjects.length}개 생성 완료`)
}

// 상자 위 오브젝트 배치 처리
const handleObjectsOnBoxes = () => {
  const storeObjects = floorplanStore.placedObjects
  const boxes = storeObjects.filter(obj => obj.category === 'etc' && obj.isBox)
  const allObjects = storeObjects.filter(obj => !obj.isBox)
  
  boxes.forEach(boxData => {
    const box3D = scene.children.find(child => 
      child.userData?.type === 'placed-object' && 
      child.userData?.placedObjectId === boxData.id
    )
    
    if (!box3D) {
      return
    }
    
    const boxPosition = box3D.position
    const boxHeight = boxData.height || 1.0
    const boxWidth = boxData.width || 1.0
    const boxDepth = boxData.depth || 1.0
    
    // 상자와 겹치는 모든 오브젝트 찾기
    const overlappingObjects = allObjects.filter(objData => {
      const objX = objData.position.x
      const objZ = objData.position.y
      const objWidth = objData.width || 1.0
      const objDepth = objData.depth || 1.0
      
      const boxLeft = boxData.position.x - boxWidth / 2
      const boxRight = boxData.position.x + boxWidth / 2
      const boxTop = boxData.position.y - boxDepth / 2
      const boxBottom = boxData.position.y + boxDepth / 2
      
      const objLeft = objX - objWidth / 2
      const objRight = objX + objWidth / 2
      const objTop = objZ - objDepth / 2
      const objBottom = objZ + objDepth / 2
      
      const overlapsX = !(objRight < boxLeft || objLeft > boxRight)
      const overlapsZ = !(objBottom < boxTop || objTop > boxBottom)
      
      return overlapsX && overlapsZ
    })
    
    overlappingObjects.forEach(objData => {
      const obj3D = scene.children.find(child => 
        child.userData?.type === 'placed-object' && 
        child.userData?.placedObjectId === objData.id
      )
      
      if (!obj3D) {
        return
      }
      
      const objHeight = objData.height || 1.0
      const isTV = objData.category === 'av'
      let newY
      
      if (isTV) {
        newY = boxPosition.y + boxHeight / 2
      } else {
        newY = boxPosition.y + boxHeight / 2 + objHeight / 2
      }
      
      obj3D.position.y = newY
      
      if (box3D.rotation) {
        obj3D.rotation.y = box3D.rotation.y
      }
    })
  })
}

// Store를 사용한 Make3D - 2D 객체들을 상세한 3D로 변환
const make3D = async () => {

  
  if (loading.value) {

    return
  }
  
  loading.value = true

  
  try {
    const data = floorplanStore.floorplanData


    if (!data || !data.roomSize) {

      return
    }

    // 바닥 생성 (2D에서 room-floor만 있는 케이스 지원)
    if (data.roomSize) {
      create3DFloorFromRoom(data)
    }

    // 벽이 있을 때만 3D 벽 생성
    if ((data.exteriorWalls && data.exteriorWalls.length > 0) || 
        (data.interiorWalls && data.interiorWalls.length > 0)) {
      create3DWalls(data)
    }



    await create3DObjects(data.placedObjects || [])
    

    handleObjectsOnBoxes()
    
    // console.log('✨ addEnhanced3DFeatures 호출')
    // addEnhanced3DFeatures()
    
  } catch (error) {
    console.error('❌ Make3D 중 오류 발생:', error)
  } finally {
    loading.value = false
  }
}

// 향상된 3D 기능 추가
const addEnhanced3DFeatures = () => {
  if (!scene) {
    return
  }

  const exteriorWalls = scene.children.filter(child => child.userData.type === 'exterior-wall')
  
  if (exteriorWalls.length === 0) {
    return
  }

  let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
  
  exteriorWalls.forEach(wall => {
    const box = new THREE.Box3().setFromObject(wall)
    minX = Math.min(minX, box.min.x)
    maxX = Math.max(maxX, box.max.x)
    minZ = Math.min(minZ, box.min.z)
    maxZ = Math.max(maxZ, box.max.z)
  })
  
  const roomWidth = maxX - minX
  const roomDepth = maxZ - minZ
  const roomCenterX = (minX + maxX) / 2
  const roomCenterZ = (minZ + maxZ) / 2
  
  addEnhancedLighting(roomCenterX, roomCenterZ, roomWidth, roomDepth)
}

// 향상된 조명 추가
const addEnhancedLighting = (centerX: number, centerZ: number, width: number, depth: number) => {
  const roomLight = new THREE.PointLight(0xffffff, 0.8, Math.max(width, depth) * 1.5)
  roomLight.position.set(centerX, 2, centerZ)
  roomLight.castShadow = false
  roomLight.userData.type = 'room-light'
  scene.add(roomLight)
}

// Clear All 3D - 모든 3D 객체 제거
const clearAll3D = () => {
  if (!scene) return
  
  // 3D 팝업 제거
  remove3DPopup()

  const objectTypesToRemove = [
    'exterior-wall', 'interior-wall', 'room-floor', 'base-floor', 'zone-floor', 'ceiling', 
    'room-light', 'corner-light', 'wall-decoration', 'placed-object', 'status-sphere', '3d-popup',
    'instanced-objects'
  ]
  
  const objectsToRemove: THREE.Object3D[] = []
  
  scene.traverse((child) => {
    if (child !== scene && child.userData.type && objectTypesToRemove.includes(child.userData.type)) {
      objectsToRemove.push(child)
    }
  })
  
  objectsToRemove.forEach(obj => {
    scene.remove(obj)
    
    if (obj instanceof THREE.Mesh) {
      if (obj.geometry) {
        obj.geometry.dispose()
      }
      if (obj.material) {
        if (Array.isArray(obj.material)) {
          obj.material.forEach(mat => mat.dispose())
        } else {
          obj.material.dispose()
        }
      }
    }
  })

  // 인스턴싱 메쉬 전역 캐시 정리
  if (instancedMeshes.length > 0) {
    instancedMeshes.forEach(mesh => {
      mesh.geometry.dispose()
      if (mesh.material && 'dispose' in mesh.material) {
        mesh.material.dispose()
      }
    })
    instancedMeshes = []
  }
  
  objects.value = objects.value.filter(obj => !objectsToRemove.includes(obj))
  
  renderer.render(scene, camera)
}

// 윈도우 리사이즈 처리
const handleResize = () => {
  if (!canvas3dContainer.value) return
  
  const container = canvas3dContainer.value
  const width = container.clientWidth
  const height = container.clientHeight
  
  camera.aspect = width / height
  camera.updateProjectionMatrix()
  renderer.setSize(width, height)
  
  // Store에 캔버스 크기 업데이트
  floorplanStore.setCanvasSize({ width, height })
}

// Store 변경 감지 - 배치된 오브젝트 실시간 동기화
let isUpdating = false
watch(
  () => floorplanStore.placedObjects,
  async (newObjects, oldObjects) => {
    if (!scene || !renderer || !camera || isUpdating) return
    
    const oldLength = oldObjects?.length || 0
    const newLength = newObjects?.length || 0
    
    if (oldLength === newLength && oldObjects && newObjects) {
      const hasPositionChange = newObjects.some((newObj, index) => {
        const oldObj = oldObjects[index]
        return oldObj && (
          Math.abs(newObj.position.x - oldObj.position.x) > 0.001 ||
          Math.abs(newObj.position.y - oldObj.position.y) > 0.001 ||
          Math.abs(newObj.rotation - oldObj.rotation) > 0.001
        )
      })
      
      if (!hasPositionChange) {
        return
      }
    }
    
    isUpdating = true
    
    try {
      await updatePlacedObjectsIn3D(newObjects || [])
    } finally {
      isUpdating = false
    }
  },
  { deep: true, immediate: false }
)

// 라이프사이클
onMounted(() => {
  // IntersectionObserver를 사용하여 컴포넌트가 실제로 보일 때만 초기화
  const observer = new IntersectionObserver((entries) => {
    entries.forEach((entry) => {
      if (entry.isIntersecting) {
        observer.disconnect() // 한 번만 실행되도록 연결 해제
        
        // Three.js 초기화
        initThreeJS()
        
        // Three.js 초기화가 완료된 후에만 resize 이벤트 리스너 추가
        const checkInitAndAddResize = () => {
          if (camera && renderer && scene) {
            window.addEventListener('resize', handleResize)
          } else {
            setTimeout(checkInitAndAddResize, 100)
          }
        }
        
        checkInitAndAddResize()
      }
    })
  }, {
    threshold: 0.1 // 10% 이상 보일 때 감지
  })
  
  // DOM이 완전히 렌더링된 후 관찰 시작
  nextTick(() => {
    if (canvas3dContainer.value) {
      observer.observe(canvas3dContainer.value)
    }
  })
  
  // 컴포넌트 언마운트 시 observer 정리
  onUnmounted(() => {
    observer.disconnect()
  })
})

onUnmounted(() => {
  // 애니메이션 루프 정리
  if (animationId) {
    cancelAnimationFrame(animationId)
  }
  
  // 이벤트 리스너 제거
  window.removeEventListener('resize', handleResize)
  
  // 클릭 이벤트 리스너 제거
  if (canvas3d.value) {
    canvas3d.value.removeEventListener('click', handleCanvasClick)
    canvas3d.value.removeEventListener('mousedown', handleMouseDown)
    canvas3d.value.removeEventListener('mousemove', handleMouseMove)
    canvas3d.value.removeEventListener('mouseup', handleMouseUp)
    canvas3d.value.removeEventListener('wheel', handleMouseWheel)
  }
  
  // 3D 팝업 제거
  remove3DPopup()
  
  // Three.js 리소스 정리
  if (renderer) {
    renderer.dispose()
  }
  
  if (controls) {
    controls.dispose()
  }
  
  // 씬 정리
  if (scene) {
    scene.clear()
  }
  
  // 전역 변수 정리 (타입 안전하게)
  console.log('✅ FloorPlanViewer3D 리소스 정리 완료')
})

// 외부에서 호출할 수 있는 함수들
defineExpose({
  create3DWalls,
  make3D,
  clearAll3D
})

// mounted 이벤트 emit
const emit = defineEmits<{
  mounted: []
}>()

// 컴포넌트 마운트 완료 시 이벤트 emit
onMounted(() => {
  // 3D 뷰어 초기화 완료 후 mounted 이벤트 emit
  nextTick(() => {
    emit('mounted')
  })
})
</script>

<style scoped>
.viewer-3d-container {
  display: flex;
  flex-direction: column;
  height: 100%;
  background: var(--color-bg-level-1, #0f1011);
  color: var(--color-text-primary, #f7f8f8);
  overflow: hidden;
}

.controls-toolbar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.5rem;
  background: white;
  border-bottom: 1px solid #ddd;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

.control-group {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.control-group label {
  display: flex;
  flex-direction: column;
  font-size: 0.85rem;
  color: #666;
}

.control-group input[type="range"] {
  width: 100px;
  margin-top: 0.25rem;
}

.btn {
  padding: 0.5rem 1rem;
  border: none;
  border-radius: 4px;
  cursor: pointer;
  font-size: 0.85rem;
  font-weight: 500;
  transition: all 0.2s;
}

.btn-primary {
  background: #3498db;
  color: white;
}

.btn-primary:hover {
  background: #2980b9;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.btn-secondary {
  background: #95a5a6;
  color: white;
}

.btn-secondary:hover {
  background: #7f8c8d;
}

.btn-danger {
  background: #e74c3c;
  color: white;
}

.btn-danger:hover {
  background: #c0392b;
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0,0,0,0.2);
}

.canvas-3d {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.canvas-3d canvas {
  display: block;
  width: 100%;
  height: 100%;
}

.loading-overlay {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  gap: 1rem;
}

.info-panel {
  padding: 0.5rem;
  background: white;
  border-top: 1px solid #ddd;
}

.stats {
  display: flex;
  gap: 1rem;
  font-size: 0.85rem;
  color: #666;
  flex-wrap: wrap;
  align-items: center;
}

.stats span {
  padding: 0.25rem 0.5rem;
  background: #f8f9fa;
  border-radius: 4px;
  border: 1px solid #e9ecef;
  white-space: nowrap;
}

.stats span:nth-child(4),
.stats span:nth-child(5),
.stats span:nth-child(6) {
  background: #e3f2fd;
  border-color: #2196f3;
  color: #1976d2;
  font-weight: 600;
}

.lod-status {
  color: #e67e22;
  font-weight: 600;
}

.lod-disabled {
  color: #95a5a6;
  font-weight: 400;
}
</style> 