"use strict";

import * as THREE from "three";
import TWEEN from "@tweenjs/tween.js";

var GUID = 0;
var instances = {};

/**
 *
 * @param {*} el
 * @param {*} options
 */
export function Cyl(el, options) {
  const TAU = Math.PI * 2.0;
  this.time = 0.0;
  this.rafId = 0;
  this.currentIndex = 0;
  this.transitioning = false;

  // init functions
  this._init = function () {
    // extract info from DOM
    this.imageUrls = [];
    this.captions = [];

    const figureEls = Array.from(el.querySelectorAll("figure"));

    for (let i = 0; i < figureEls.length; i++) {
      const fig = figureEls[i];
      const imgEl = fig.querySelector("img");
      const captionEl = fig.querySelector("figcaption");

      this.imageUrls.push(imgEl.src);
      this.captions.push(captionEl.innerText);
    }

    // duplicate images to get a wider cylinder
    if (this.imageUrls.length <= 4) {
      this.imageUrls = [...this.imageUrls, ...this.imageUrls];

      this.captions = [...this.captions, ...this.captions];
    }
  };

  this._loadTextures = function () {
    this.textures = Array(this.imageUrls.length);
    this.textureWidths = Array(this.imageUrls.length);
    this.textureHeights = Array(this.imageUrls.length);
    this.textureRatios = Array(this.imageUrls.length);

    this.loadedTextures = 0;

    for (let i = 0; i < this.imageUrls.length; i++) {
      this.textures[i] = new THREE.TextureLoader().load(
        this.imageUrls[i],
        (texture) => {
          // store texture metadata
          const image = texture.image;
          this.textureWidths[i] = image.width;
          this.textureHeights[i] = image.height;
          this.textureRatios[i] = image.height / image.width;

          this.loadedTextures++;

          const doneLoading = this.loadedTextures === this.imageUrls.length;
          if (doneLoading) {
            this._createScene();
            this._createGeometries();
          }
        }
      );
    }
  };

  this._createScene = function () {
    // init scene, renderer, camera
    this.scene = new THREE.Scene();

    const renderSize = new THREE.Vector2(el.offsetWidth, el.offsetHeight);

    this.renderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    this.renderer.setPixelRatio(window.devicePixelRatio);
    this.renderer.setSize(renderSize.x, renderSize.y);
    this.renderer.setClearColor(
      options.backgroundColor,
      options.backgroundOpacity
    );

    el.appendChild(this.renderer.domElement);

    this.camera = new THREE.PerspectiveCamera(
      24,
      renderSize.x / renderSize.y,
      0.01,
      1000
    );
    // this.camera.position.x = 5
    // this.camera.position.y = 10
    this.camera.position.z = 4;
  };

  this._createGeometries = function () {
    this.carouselGroup = new THREE.Group();
    this.textureMidpoints = [];
    this.thetas = [];
    this.meshes = [];

    let totalWidth = 0;
    const gutterPct = 0.5 / 100; // percentage of TAU
    const gutterRadians = gutterPct * TAU;
    // calculate total width
    for (let i = 0; i < this.textureWidths.length; i++) {
      totalWidth += this.textureWidths[i];
    }

    // calculate and store theta length for each image
    for (let i = 0; i < this.textureWidths.length; i++) {
      const textureWidth = this.textureWidths[i];
      const thetaLength = (textureWidth / totalWidth) * TAU;
      this.thetas.push(thetaLength);

      // store texuture midpoints
      let accumulatedWidth = 0;

      for (let j = 0; j < i; j++) {
        accumulatedWidth += this.textureWidths[j];
      }

      const midpoint = textureWidth / 2 + accumulatedWidth;
      const midpointRadians = (midpoint / totalWidth) * TAU - gutterRadians / 2;
      this.textureMidpoints.push(midpointRadians);
    }

    // console.log('widths', textureWidths)
    // console.log('thetas', thetas)
    // console.log('midpoints', textureMidpoints)

    // create and rotate cylinder segments using calculated thetas
    for (let i = 0; i < this.textures.length; i++) {
      const relativeHeight = this.thetas[i] * this.textureRatios[i]; // cylinder height is 1 so derive height from theta using unitless ratio

      let geo = new THREE.CylinderGeometry(
        1,
        1,
        relativeHeight,
        32,
        1,
        true,
        0,
        this.thetas[i] - gutterRadians
      );
      let mat = new THREE.MeshBasicMaterial({
        wireframe: options.debug ? true : false,
        side: options.debug ? THREE.DoubleSide : false,
        // color: Math.random() * 0xffffff,
        transparent: true,
        map: this.textures[i],
      });

      let mesh = new THREE.Mesh(geo, mat);
      this.meshes.push(mesh);

      // calculate rotation
      let calculatedRotation = 0;
      for (let j = 0; j < i; j++) {
        calculatedRotation += this.thetas[j];
      }
      mesh.rotation.y = calculatedRotation;

      this.carouselGroup.add(mesh);
    }

    this.carouselGroup.rotation.y -= this.textureMidpoints[0];
    this.scene.add(this.carouselGroup);

    if (options.debug) {
      // center dot
      var dotGeometry = new THREE.BufferGeometry();
      dotGeometry.setAttribute(
        "position",
        new THREE.Float32BufferAttribute(new THREE.Vector3().toArray(), 3)
      );
      var dotMaterial = new THREE.PointsMaterial({ size: 0.1 });
      var dot = new THREE.Points(dotGeometry, dotMaterial);
      this.scene.add(dot);

      // outline bounding box
      const box = new THREE.BoxHelper(this.carouselGroup, 0xffff00);
      this.scene.add(box);
    }

    fitCameraToCenteredObject2(this.camera, this.carouselGroup, 1, this.scene);

    window.addEventListener("resize", () => {
      const renderSize = new THREE.Vector2(el.offsetWidth, el.offsetHeight);
      this.renderer.setSize(renderSize.x, renderSize.y);
      this.camera.aspect = el.offsetWidth / el.offsetHeight;
      this.camera.updateProjectionMatrix();
      fitCameraToCenteredObject2(
        this.camera,
        this.carouselGroup,
        1,
        this.scene
      );
      this.renderer.render(this.scene, this.camera);
    });

    // initial render
    this.renderer.render(this.scene, this.camera);

    // kickoff recursive draw loop
    this._draw();
  };

  this._draw = function () {
    this.time += 0.01;
    this.rafId = requestAnimationFrame(this._draw.bind(this));

    if (this.transitioning) {
      TWEEN.update();
      this.renderer.render(this.scene, this.camera);
    }
  };

  // nav functions
  this.next = function () {
    this.handleClick("right");
  };

  this.prev = function () {
    this.handleClick("left");
  };

  this.handleClick = function (dir) {
    if (this.transitioning) {
      return;
    }

    let { textureWidths, textures, carouselGroup } = this;

    const prevIndex = this.currentIndex;

    if (dir === "left") {
      this.currentIndex =
        this.currentIndex === 0 ? textures.length - 1 : this.currentIndex - 1;
    } else {
      this.currentIndex =
        this.currentIndex === textures.length - 1 ? 0 : this.currentIndex + 1;
    }

    // calculate angle difference
    let oldPos = 0;
    let newPos = 0;

    oldPos = accumulateToIndex(textureWidths, prevIndex);
    oldPos += textureWidths[prevIndex] / 2;

    newPos = accumulateToIndex(textureWidths, this.currentIndex);
    newPos += textureWidths[this.currentIndex] / 2;

    const delta = newPos - oldPos;
    let deltaRadians = (delta / textureWidths.reduce((a, b) => a + b)) * TAU;

    // handle cycles
    if (this.currentIndex === this.textures.length - 1 && prevIndex === 0) {
      deltaRadians = deltaRadians - TAU;
    } else if (this.currentIndex === 0 && prevIndex === textures.length - 1) {
      deltaRadians = deltaRadians + TAU;
    }

    this.transitioning = true;

    this.tween = new TWEEN.Tween(carouselGroup.rotation)
      .to(
        {
          x: 0,
          y: carouselGroup.rotation.y - deltaRadians,
          z: 0,
        },
        500
      )
      .easing(TWEEN.Easing.Quadratic.InOut);

    this.tween.start();

    setTimeout(() => {
      this.transitioning = false;
    }, 500);
  };

  // kickoff
  this._init();
  this._loadTextures(); // calls create fns after textures have loaded
}

/**
 * ---------- Utils ----------
 */
function accumulateToIndex(arr, index) {
  let result = 0;

  for (let i = 0; i < index; i++) {
    result += arr[i];
  }

  return result;
}

function rads(deg) {
  return deg * (Math.PI / 180);
}

function deg(rads) {
  return rads * (180 / Math.PI);
}

// https://discourse.threejs.org/t/camera-zoom-to-fit-object/936/23
const fitCameraToCenteredObject = function (camera, object, offset = 0, scene) {
  const boundingBox = new THREE.Box3().setFromObject(object);

  const center = boundingBox.getCenter(new THREE.Vector3());
  const size = boundingBox.getSize(new THREE.Vector3());

  const startDistance = center.distanceTo(camera.position);
  // here we must check if the screen is horizontal or vertical, because camera.fov is
  // based on the vertical direction.
  const endDistance =
    camera.aspect > 1
      ? (size.y / 2 + offset) / Math.abs(Math.tan(camera.fov / 2))
      : (size.y / 2 + offset) /
        Math.abs(Math.tan(camera.fov / 2)) /
        camera.aspect;

  camera.position.set(0, 0, (camera.position.z * endDistance) / startDistance);

  camera.lookAt(0, 0, 0);
};

// https://wejn.org/2020/12/cracking-the-threejs-object-fitting-nut/
const fitCameraToCenteredObject2 = function (
  camera,
  object,
  offset = 0,
  scene
) {
  const boundingBox = new THREE.Box3();
  boundingBox.setFromObject(object);

  var middle = new THREE.Vector3();
  var size = new THREE.Vector3();
  boundingBox.getSize(size);

  // figure out how to fit the box in the view:
  // 1. figure out horizontal FOV (on non-1.0 aspects)
  // 2. figure out distance from the object in X and Y planes
  // 3. select the max distance (to fit both sides in)
  //
  // The reason is as follows:
  //
  // Imagine a bounding box (BB) is centered at (0,0,0).
  // Camera has vertical FOV (camera.fov) and horizontal FOV
  // (camera.fov scaled by aspect, see fovh below)
  //
  // Therefore if you want to put the entire object into the field of view,
  // you have to compute the distance as: z/2 (half of Z size of the BB
  // protruding towards us) plus for both X and Y size of BB you have to
  // figure out the distance created by the appropriate FOV.
  //
  // The FOV is always a triangle:
  //
  //  (size/2)
  // +--------+
  // |       /
  // |      /
  // |     /
  // | F° /
  // |   /
  // |  /
  // | /
  // |/
  //
  // F° is half of respective FOV, so to compute the distance (the length
  // of the straight line) one has to: `size/2 / Math.tan(F)`.
  //
  // FTR, from https://threejs.org/docs/#api/en/cameras/PerspectiveCamera
  // the camera.fov is the vertical FOV.

  const fov = camera.fov * (Math.PI / 180);
  const fovh = 2 * Math.atan(Math.tan(fov / 2) * camera.aspect);
  let dx = size.z / 2 + Math.abs(size.x / 2 / Math.tan(fovh / 2));
  let dy = size.z / 2 + Math.abs(size.y / 2 / Math.tan(fov / 2));
  let cameraZ = Math.max(dx, dy);

  // offset the camera, if desired (to avoid filling the whole canvas)
  if (offset !== undefined && offset !== 0) cameraZ *= offset;

  camera.position.set(0, 0, cameraZ);

  // set the far plane of the camera so that it easily encompasses the whole object
  const minZ = boundingBox.min.z;
  const cameraToFarEdge = minZ < 0 ? -minZ + cameraZ : cameraZ - minZ;

  camera.far = cameraToFarEdge * 3;
  camera.updateProjectionMatrix();
};

/**
 *
 * @param {*} depth
 * @param {*} camera
 * @returns
 */
const visibleHeightAtZDepth = (depth, camera) => {
  // compensate for cameras not positioned at z=0
  const cameraOffset = camera.position.z;
  if (depth < cameraOffset) depth -= cameraOffset;
  else depth += cameraOffset;
  console.log("depth: ", depth);

  // vertical fov in radians
  const vFOV = (camera.fov * Math.PI) / 180;

  // Math.abs to ensure the result is always positive
  return 2 * Math.tan(vFOV / 2) * Math.abs(depth);
};

const visibleWidthAtZDepth = (depth, camera) => {
  const height = visibleHeightAtZDepth(depth, camera);
  return height * camera.aspect;
};
