import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'
import { ArrayCamera } from 'three'
import { text } from 'body-parser'

const container = document.querySelector('#three')

const TAU = Math.PI * 2.0

let kaje
let scene, camera, renderer
let renderSize, renderTarget
let time = 0.0
let rafId

// let images = [
  // 'static/1.png',
  // 'static/2.png',
  // 'static/3.png',
  // 'static/4.png',
  // 'static/5.png',
  // 'static/kaje1.png',
  // 'static/kaje2.jpg',
  // 'static/kaje3.png',
  // 'static/kaje4.jpg',
  // 'static/kaje5.jpg',
// ]
let images = [
  'static/lakaje.hotglue.jpg',
  'static/lakaje.hotglue-1.jpg',
  'static/lakaje.hotglue-2.jpg',
  'static/lakaje.hotglue-3.jpg',
  'static/lakaje.hotglue-6.jpg',
  'static/lakaje.hotglue-8.jpg',
  'static/lakaje.hotglue-10.jpg',
  'static/lakaje.hotglue-11.jpg',
  'static/lakaje.hotglue-12.jpg',
]
let textures = []
let textureWidths = []
let textureHeights = []
let minTextureHeight = 0
let thetas = []
let textureMidpoints = []
let currentIndex = 0

const carouselGroup = new THREE.Group()

let tween 

function createTextures() {
  for (let i = 0; i < images.length; i++) {
    textures[i] = new THREE.TextureLoader().load(images[i], (texture) => {
      textureWidths.push(texture.image.width)
      textureHeights.push(texture.image.height)


      const doneLoading = textureWidths.length === images.length
      if (doneLoading) {
        minTextureHeight = Math.min.apply(null, textureHeights)
        kaje.init()
      }
    })
  }
}

createTextures()

function init() {
  scene = new THREE.Scene()

  renderSize = new THREE.Vector2(window.innerWidth, window.innerHeight)
  renderTarget = new THREE.WebGLRenderTarget(renderSize.x * 1.0, renderSize.y * 1.0)

  renderer = new THREE.WebGLRenderer({
    antialias: true,
    alpha: true
  })
  renderer.setPixelRatio( window.devicePixelRatio )
  renderer.setSize(renderSize.x, renderSize.y)
  renderer.setClearColor(0x000000, 1.0)

  camera = new THREE.PerspectiveCamera(45, renderSize.x / renderSize.y, 1, 1000)
  camera.position.z = 80 
  camera.lookAt(new THREE.Vector3(0.0,0.0,0.0))

  container.appendChild(renderer.domElement)

  kaje = new KAJE(renderer, scene, camera)

  draw()
}

init()

function draw() {
  time += 0.01
  rafId = requestAnimationFrame(draw)
  kaje.update()
  TWEEN.update()
  renderer.render(scene, camera, renderTarget)
}

/**
 * KAJE
 * 
 * @param {*} RENDERER 
 * @param {*} SCENE 
 * @param {*} CAMERA 
 */

function KAJE(RENDERER, SCENE, CAMERA) {
  this.renderer = RENDERER
  this.scene = SCENE
  this.camera = CAMERA

	this.textures = textures
  this.meshes = []
  this.carouselGroup = carouselGroup

  this.init = function() {
    console.log('kaje init')
    this.createGeometry()
  }

  this.createGeometry = function() {

    let totalWidth = 0
    const gutter = 0 // percentage of TAU 
    const gutterRadians = (gutter / 100) * TAU

    // calculate total width
    for (let i = 0; i < textureWidths.length; i++) {
      totalWidth += textureWidths[i]
    }

    // calculate and store theta length for each image
    for (let i = 0; i < textureWidths.length; i++) {
      const textureWidth = textureWidths[i]
      const thetaLength = (textureWidth / totalWidth) * TAU + gutterRadians
      thetas.push(thetaLength)

      // store texuture midpoints
      // console.log('reduce', (textureWidth / 2) + textureWidths.slice(0, i + 1).reduce((a, b) => a + b))
      let accumulatedWidth = 0

      for (let j = 0; j < i; j++) {
        accumulatedWidth += textureWidths[j]
      }

      console.log('accumulatedWidth', accumulatedWidth)
      const midpoint = (textureWidth / 2) + accumulatedWidth
      const midpointRadians = (midpoint / totalWidth) * TAU + gutterRadians
      textureMidpoints.push(midpointRadians)
    }

    console.log('widths', textureWidths)
    console.log('thetas', thetas)
    console.log('midpoints', textureMidpoints)

    // create and rotate cylinder segments using calculated thetas
    for (let i = 0; i < textures.length; i++) {
      console.log(textureHeights[i] / minTextureHeight)
      const relativeHeight = (textureHeights[i] / minTextureHeight) * 7 

      let geo = new THREE.CylinderGeometry( 40, 40, relativeHeight, 32, 1, true, 0, thetas[i])
      let mat = new THREE.MeshBasicMaterial({
        // wireframe: true,
        // side: THREE.DoubleSide,
        // color: Math.random() * 0xffffff,
        transparent: true,
        map: textures[i]
      })

      let mesh = new THREE.Mesh(geo, mat)
      this.meshes.push(mesh)

      // calculate rotation
      let calculatedRotation = 0
      for (let j = 0; j < i; j++) {
        calculatedRotation += (thetas[j] + gutterRadians)
      }
      mesh.rotation.y = calculatedRotation 

      this.carouselGroup.add(mesh)
    }

    this.carouselGroup.rotation.y -= textureMidpoints[0]
    this.scene.add(this.carouselGroup)
  }

  this.update = function() {
  }

}

// Event Listeners
document.querySelector('.controls .left').addEventListener('click', () => {
  handleClick('left')
})

document.querySelector('.controls .right').addEventListener('click', () => {
  handleClick('right')
})

function handleClick(dir) {
  const prevIndex = currentIndex

  if (dir === 'left') {
    currentIndex = currentIndex === 0 ? textures.length - 1 : currentIndex - 1
  } else {
    currentIndex = currentIndex === (textures.length - 1) ? 0 : currentIndex + 1
  }

  // calculate angle difference
  let oldPos = 0
  let newPos = 0

  oldPos = accumulateToIndex(textureWidths, prevIndex)
  oldPos += textureWidths[prevIndex] / 2

  newPos = accumulateToIndex(textureWidths, currentIndex)
  newPos += textureWidths[currentIndex] / 2

  const delta = newPos - oldPos
  let deltaRadians = (delta / textureWidths.reduce((a, b) => a + b)) * TAU

  // handle cycles
  if (currentIndex === textures.length - 1 && prevIndex === 0) {
    deltaRadians = deltaRadians - TAU
  } 
  else if (currentIndex === 0 && prevIndex === textures.length - 1) {
    deltaRadians = deltaRadians + TAU
  }

  console.log(deltaRadians)

  tween = new TWEEN.Tween(carouselGroup.rotation).to({
    x: carouselGroup.rotation.x,
    y: carouselGroup.rotation.y - deltaRadians,
    z: carouselGroup.rotation.z 
  }, 500);

  tween.start()
}

function accumulateToIndex(arr, index) {
  let result = 0

  for (let i = 0; i < index; i++) {
    result += arr[i]
  }

  return result
}
