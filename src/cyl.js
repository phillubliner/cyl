'use strict'

import * as THREE from 'three'
import TWEEN from '@tweenjs/tween.js'

var GUID = 0
var instances = {}

/**
 * 
 * @param {*} el 
 * @param {*} options 
 */
export function Cyl(el, options) {
  const TAU = Math.PI * 2.0
  this.time = 0.0
  this.rafId = 0
  this.currentIndex = 0
  this.transitioning = false

  // init functions
  this._init = function() {
    // extract info from DOM
    this.imageUrls = []
    this.captions = []

    const figureEls = Array.from(el.querySelectorAll('figure'))

    figureEls.forEach(fig => {
      const imgEl = fig.querySelector('img')
      const captionEl = fig.querySelector('figcaption')

      this.imageUrls.push(imgEl.src)
      this.captions.push(captionEl.innerText)
    })
  }

  this._loadTextures = function() {
    this.textures = []
    this.textureWidths = []
    this.textureHeights = []
    this.textureRatios = []

    for (let i = 0; i < this.imageUrls.length; i++) {
      this.textures[i] = new THREE.TextureLoader().load(this.imageUrls[i], (texture) => {
        // store texture metadata
        const image = texture.image
        this.textureWidths.push(image.width)
        this.textureHeights.push(image.height)
        this.textureRatios.push(image.height / image.width)
  
        const doneLoading = this.textureWidths.length === this.imageUrls.length
        if (doneLoading) {
          this._createScene()
          this._createGeometries()
        }
      })
    }
  }

  this._createScene = function() {
    // init scene, renderer, camera
    this.scene = new THREE.Scene()

    const renderSize = new THREE.Vector2(el.offsetWidth, el.offsetHeight)

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true
    })
    this.renderer.setPixelRatio( window.devicePixelRatio )
    this.renderer.setSize(renderSize.x, renderSize.y)
    this.renderer.setClearColor(options.backgroundColor, 1.0)

    el.appendChild(this.renderer.domElement)

    this.camera = new THREE.PerspectiveCamera(24, renderSize.x / renderSize.y, 0.1, 1000)
    this.camera.position.z = 4 
    this.camera.lookAt(new THREE.Vector3(0.0,0.0,0.0))
  }

  this._createGeometries = function () {
    this.carouselGroup = new THREE.Group()
    this.textureMidpoints = []
    this.thetas = []
    this.meshes = []

    let totalWidth = 0
    const gutter = 0.5 // percentage of TAU 
    const gutterRadians = (gutter / 100) * TAU

    // calculate total width
    for (let i = 0; i < this.textureWidths.length; i++) {
      totalWidth += this.textureWidths[i]
    }

    // calculate and store theta length for each image
    for (let i = 0; i < this.textureWidths.length; i++) {
      const textureWidth = this.textureWidths[i]
      const thetaLength = (textureWidth / totalWidth) * TAU
      this.thetas.push(thetaLength)

      // store texuture midpoints
      let accumulatedWidth = 0

      for (let j = 0; j < i; j++) {
        accumulatedWidth += this.textureWidths[j]
      }

      const midpoint = (textureWidth / 2) + accumulatedWidth
      const midpointRadians = (midpoint / totalWidth) * TAU - (gutterRadians / 2)
      this.textureMidpoints.push(midpointRadians)
    }

    // console.log('widths', textureWidths)
    // console.log('thetas', thetas)
    // console.log('midpoints', textureMidpoints)

    // create and rotate cylinder segments using calculated thetas
    for (let i = 0; i < this.textures.length; i++) {
      const relativeHeight = this.thetas[i] * this.textureRatios[i] // cylinder height is 1 so derive height from theta using unitless ratio 

      let geo = new THREE.CylinderGeometry( 1, 1, relativeHeight, 32, 1, true, 0, this.thetas[i] - gutterRadians)
      let mat = new THREE.MeshBasicMaterial({
        // wireframe: true,
        // side: THREE.DoubleSide,
        // color: Math.random() * 0xffffff,
        transparent: true,
        map: this.textures[i]
      })

      let mesh = new THREE.Mesh(geo, mat)
      this.meshes.push(mesh)

      // calculate rotation
      let calculatedRotation = 0
      for (let j = 0; j < i; j++) {
        calculatedRotation += (this.thetas[j])
      }
      mesh.rotation.y = calculatedRotation 

      this.carouselGroup.add(mesh)
    }

    this.carouselGroup.rotation.y -= this.textureMidpoints[0]
    this.scene.add(this.carouselGroup)

    fitCameraToCenteredObject(this.camera, this.carouselGroup)

    window.addEventListener('resize', () => {
      const renderSize = new THREE.Vector2(el.offsetWidth, el.offsetHeight)
      this.renderer.setSize(renderSize.x, renderSize.y)
      this.camera.aspect = (el.offsetWidth / el.offsetHeight)
      this.camera.updateProjectionMatrix();
      fitCameraToCenteredObject(this.camera, this.carouselGroup)
    })

    this._draw()
  }

  this._draw = function() {
    this.time += 0.01
    this.rafId = requestAnimationFrame(this._draw.bind(this))
    TWEEN.update()
    this.renderer.render(this.scene, this.camera, this.renderTarget)
  }

  // nav functions
  this.next = function() {
    this.handleClick('right')
  }

  this.prev = function() {
    this.handleClick('left')
  }

  this.handleClick = function(dir) {
    if (this.transitioning) { return }

    let { currentIndex, textureWidths, textures, carouselGroup,  } = this

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
    if (currentIndex === this.textures.length - 1 && prevIndex === 0) {
      deltaRadians = deltaRadians - TAU
    } 
    else if (currentIndex === 0 && prevIndex === textures.length - 1) {
      deltaRadians = deltaRadians + TAU
    }
  
    this.transitioning = true
  
    this.tween = new TWEEN.Tween(carouselGroup.rotation).to({
      x: carouselGroup.rotation.x,
      y: carouselGroup.rotation.y - deltaRadians,
      z: carouselGroup.rotation.z 
    }, 500)
      .easing(TWEEN.Easing.Quadratic.InOut)
  
    this.tween.start()
  
    setTimeout(() => {
      this.transitioning = false
    }, 500)
  }

  // kickoff
  this._init()
  this._loadTextures() // calls create fns after textures have loaded
}

/**
 * ---------- Utils ---------- 
 */
function accumulateToIndex(arr, index) {
  let result = 0

  for (let i = 0; i < index; i++) {
    result += arr[i]
  }

  return result
}

// https://discourse.threejs.org/t/camera-zoom-to-fit-object/936/23
const fitCameraToCenteredObject = function (camera, object, offset) {
  offset = offset || 1.5

  const boundingBox = new THREE.Box3()
  
  boundingBox.setFromObject( object )
  
  const center = boundingBox.getCenter( new THREE.Vector3() )
  const size = boundingBox.getSize( new THREE.Vector3() )
  
  const startDistance = center.distanceTo(camera.position)
  // here we must check if the screen is horizontal or vertical, because camera.fov is
  // based on the vertical direction.
  const endDistance = camera.aspect > 1 ?
    ((size.y/2)+offset) / Math.abs(Math.tan(camera.fov/2)) :
    ((size.y/2)+offset) / Math.abs(Math.tan(camera.fov/2)) / camera.aspect 
  
  
  camera.position.set(
    camera.position.x * endDistance / startDistance,
    camera.position.y * endDistance / startDistance,
    camera.position.z * endDistance / startDistance,
  )
  camera.lookAt(center)
}
