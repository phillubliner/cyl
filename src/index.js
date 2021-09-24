import * as THREE from 'three'

const container = document.querySelector('#three')

const TAU = Math.PI * 2.0

let kaje
let scene, camera, renderer
let renderSize, renderTarget
let time = 0.0
let rafId

let images = [
  'static/1.png',
  'static/2.png',
  'static/3.png',
  'static/4.png',
  'static/5.png',
]
let textures = []
let textureMetaData = []
let thetas = []

function createTextures() {
  for (let i = 0; i < images.length; i++) {
    textures[i] = new THREE.TextureLoader().load(images[i], (texture) => {
      textureMetaData.push(texture.image.width)

      const doneLoading = textureMetaData.length === images.length
      if (doneLoading) {
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

  // camera = new THREE.PerspectiveCamera(35, renderSize.x/renderSize.y, 0.01, 100)
  camera = new THREE.PerspectiveCamera(45, renderSize.x / renderSize.y, 1, 1000)
  // camera.position.y = 50
  camera.position.z = 100

  container.appendChild(renderer.domElement)

  kaje = new KAJE(renderer, scene, camera)

  draw()
}

init()

function draw() {
  rafId = requestAnimationFrame(draw)
  time += 0.01

  kaje.update()

  camera.lookAt(new THREE.Vector3(0.0,0.0,0.0))
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
  const CELL_COUNT = 5.0

  this.renderer = RENDERER
  this.scene = SCENE
  this.camera = CAMERA
  this.carousel = new THREE.Object3D()
  this.segments = []
	this.markers = []
	this.mesh
	this.textures = textures
	this.FACEINDEX
	this.FACEPORTION

  this.meshes = []

  this.init = function() {
    console.log('kaje init')
    this.createGeometry()
  }

  this.createGeometry = function() {

    let totalWidth = 0
    const gutter = 0 // percentage of TAU 
    // const gutterRadians = (gutter / 100) * TAU
    const gutterRadians = 0

    for (let z = 0; z < textureMetaData.length; z++) {
      totalWidth += textureMetaData[z]
    }

    for (let z = 0; z < textureMetaData.length; z++) {
      // calculate theta length for each image
      const textureWidth = textureMetaData[z]
      const thetaLength = (textureWidth / totalWidth) * TAU + gutterRadians
      thetas.push(thetaLength)
    }

    console.log('thetas', thetas)

    for (let i = 0; i < textures.length; i++) {
      console.log(textureMetaData[i], totalWidth, gutterRadians, thetas[i])
      let geo = new THREE.CylinderGeometry( 40, 40, 20, 32, 1, true, 0, thetas[i])
      let mat = new THREE.MeshBasicMaterial({
        // color: 0x00ff00,
        color: Math.random() * 0xffffff,
        transparent: true,
        // wireframe: false,
        // wireframe: true,
        side: THREE.DoubleSide,
        map: textures[i]
      })

      let mesh = new THREE.Mesh(geo, mat)
      this.meshes.push(mesh)

      // calculate rotation
      let calculatedRotation = 0
      for (let j = 0; j < i; j++) {
        calculatedRotation += (thetas[j] + gutterRadians)
      }
      console.log("calc'd rotation", calculatedRotation)
      mesh.rotation.y = calculatedRotation 

      this.scene.add(mesh)
    }
  }

  this.update = function() {
    for (let i = 0; i < this.meshes.length; i++) {
      this.meshes[i].rotation.y += 0.003
    }
  }

}
