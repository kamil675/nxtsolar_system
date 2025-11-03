"use client";
import React, { useEffect, useRef, useCallback } from "react";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader";
import {
  CSS2DRenderer,
  CSS2DObject,
} from "three/examples/jsm/renderers/CSS2DRenderer";
import { gsap } from "gsap";

export default function MyMainCode() {
  const rootRef = useRef(null);
  const rendererRef = useRef(null);
  const labelRendererRef = useRef(null);
  const animRef = useRef(null);
  const mouseMoveHandlerGlobalRef = useRef(null);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;

    // --- build DOM (same structure as your HTML version) ---
    root.innerHTML = `
      <div id="loader">
        <canvas id="loaderCanvas" width="300" height="300"></canvas>
        <div id="loading-bar-container"><div id="loading-bar"></div></div>
      </div>
      <div id="topText"></div>
      <div id="solarText"></div>
      <div id="welcomeText" class="corner-text left"></div>
    <div id="solarIntroText" class="corner-text right"></div>
    
      <div id="videoSection">
        <video id="astronautVideo" src="/textures/models/video.mp4" type="video/mp4"
        muted
        playsinline
        webkit-playsinline
        preload="auto"
        crossorigin="anonymous"
        loop></video>
      </div>
      <div id="scrollContainer"></div>
    `;

    // elements
    const loaderDiv = root.querySelector("#loader");
    const loaderCanvas = root.querySelector("#loaderCanvas");
    const loaderCtx = loaderCanvas.getContext("2d");
    const loadingBar = root.querySelector("#loading-bar");
    const topText = root.querySelector("#topText");
    const solarText = root.querySelector("#solarText");
    const astronautVideo = root.querySelector("#astronautVideo");
    const videoSection = root.querySelector("#videoSection");
    const scrollContainer = root.querySelector("#scrollContainer");

    // scroll container sizing (match HTML)
    scrollContainer.style.height =
      window.innerWidth <= 768 ? "1200vh" : "800vh";
    scrollContainer.style.width = "100%";
    scrollContainer.style.position = "relative";
    scrollContainer.style.zIndex = "10";
    scrollContainer.style.background = "transparent";

    // --- THREE setup closely matching your HTML file ---
    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    camera.position.set(0, 50, 350);

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);

    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.outputEncoding = THREE.sRGBEncoding;
    // --- Simple environment reflection setup ---

    renderer.domElement.classList.add("three-canvas");
    renderer.domElement.style.opacity = 0;
    renderer.domElement.style.visibility = "hidden";
    rendererRef.current = renderer;

    // label renderer
    const labelRenderer = new CSS2DRenderer();
    labelRenderer.setSize(window.innerWidth, window.innerHeight);
    labelRenderer.domElement.style.position = "absolute";
    labelRenderer.domElement.style.top = "0px";
    labelRenderer.domElement.style.pointerEvents = "none";
    labelRenderer.domElement.style.zIndex = "9999";
    labelRenderer.domElement.style.opacity = 0;
    labelRenderer.domElement.style.visibility = "visible";
    labelRendererRef.current = labelRenderer;

    root.appendChild(renderer.domElement);
    root.appendChild(labelRenderer.domElement);

    const controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.enableZoom = false;
    controls.enablePan = false;

    // lighting
    scene.add(new THREE.AmbientLight(0xffffff, 0.15));
    const fillLight1 = new THREE.PointLight(0xffffff, 0.3, 2000);
    fillLight1.position.set(500, 200, 500);
    scene.add(fillLight1);
    const fillLight2 = new THREE.PointLight(0xffffff, 0.25, 2000);
    fillLight2.position.set(-400, -200, -300);
    scene.add(fillLight2);
    // --- EXTRA LIGHTS to brighten planets ---
    scene.add(new THREE.HemisphereLight(0xffffff, 0x404040, 0.35)); // soft fill

    // Rim / key light from camera direction (gives visible highlights)
    const rimLight = new THREE.DirectionalLight(0xffffff, 0.6);
    rimLight.position.set(0, 200, 400);
    rimLight.castShadow = false;
    scene.add(rimLight);

    // // Strong point light placed at Sun position so planets catch direct light
    // const sunLight = new THREE.PointLight(0xfff7e8, 1.8, 2000, 2);
    // sunLight.position.set(0, 0, 0);
    // scene.add(sunLight);

    // Small fill light behind camera
    const backLight = new THREE.PointLight(0xffffff, 0.25, 1500);
    backLight.position.set(0, -200, -500);
    scene.add(backLight);

    // Slightly increase renderer exposure
    renderer.toneMappingExposure = 1;

    // === NEW STARS: SEPARATE SCENE + RENDERER (LIKE CompleteNext) ===
    const starsScene = new THREE.Scene();
    const starsCamera = new THREE.PerspectiveCamera(
      75,
      window.innerWidth / window.innerHeight,
      0.1,
      10000
    );
    starsCamera.position.z = 400;

    const starsRenderer = new THREE.WebGLRenderer({
      antialias: true,
      alpha: true,
    });
    starsRenderer.setSize(window.innerWidth, window.innerHeight);
    starsRenderer.setClearColor(0x000000, 0);
    starsRenderer.domElement.style.position = "fixed";
    starsRenderer.domElement.style.top = "0";
    starsRenderer.domElement.style.left = "0";
    starsRenderer.domElement.style.zIndex = "8001";
    starsRenderer.domElement.style.pointerEvents = "none";
    starsRenderer.domElement.style.opacity = "0";
    starsRenderer.domElement.classList.add("three-canvas");
    root.appendChild(starsRenderer.domElement);

    const starGeometry = new THREE.BufferGeometry();
    const starCount = window.innerWidth < 768 ? 4000 : 10000;
    const starVertices = [];
    const spreadX = 2500,
      spreadY = 2500,
      spreadZ = 2500;

    for (let i = 0; i < starCount; i++) {
      const x = (Math.random() - 0.5) * spreadX;
      const y = (Math.random() - 0.5) * spreadY;
      const z = (Math.random() - 0.5) * spreadZ;
      starVertices.push(x, y, z);
    }

    starGeometry.setAttribute(
      "position",
      new THREE.Float32BufferAttribute(starVertices, 3)
    );

    const starTexture = new THREE.TextureLoader().load(
      "https://raw.githubusercontent.com/mrdoob/three.js/master/examples/textures/sprites/circle.png"
    );

    const starMaterial = new THREE.PointsMaterial({
      color: 0xffffff,
      size: 2.5,
      map: starTexture,
      transparent: true,
      opacity: 0.8,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    const starsBg = new THREE.Points(starGeometry, starMaterial);
    starsScene.add(starsBg);
    // === END NEW STARS ===

    const gltfLoader = new GLTFLoader();

    // Solar system group
    const solarSystem = new THREE.Group();
    solarSystem.scale.set(0.01, 0.01, 0.01);
    solarSystem.userData.visible = false;
    scene.add(solarSystem);

    const planets = [
      {
        name: "Sun",
        radius: 46,
        distance: 0,
        speed: 0,
        rotation: 0.001,
        file: "the_star_sun.glb",
        info: "The Sun, star at center.",
      },
      {
        name: "Mercury",
        radius: 6,
        distance: 40,
        speed: 0.008,
        rotation: 0.004,
        file: "mercury.glb",
        info: "Closest planet to Sun.",
      },
      {
        name: "Venus",
        radius: 9,
        distance: 60,
        speed: 0.006,
        rotation: 0.002,
        file: "venus.glb",
        info: "Very hot planet.",
      },
      {
        name: "Earth",
        radius: 11,
        distance: 80,
        speed: 0.004,
        rotation: 0.01,
        file: "earth.glb",
        info: "Our home planet.",
      },
      {
        name: "Mars",
        radius: 13,
        distance: 100,
        speed: 0.003,
        rotation: 0.008,
        file: "mars.glb",
        info: "Red planet.",
      },
      {
        name: "Jupiter",
        radius: 17,
        distance: 130,
        speed: 0.0015,
        rotation: 0.005,
        file: "jupiter.glb",
        info: "Largest planet.",
      },
      {
        name: "Saturn",
        radius: 16,
        distance: 155,
        speed: 0.0012,
        rotation: 0.008,
        file: "saturn.glb",
        info: "Has rings.",
      },
      {
        name: "Uranus",
        radius: 13,
        distance: 180,
        speed: 0.0009,
        rotation: 0.003,
        file: "uranus.glb",
        info: "Rotates on side.",
      },
      {
        name: "Neptune",
        radius: 10,
        distance: 200,
        speed: 0.0009,
        rotation: 0.003,
        file: "neptune.glb",
        info: "Far gas giant.",
      },
    ];

    const planetMeshes = [];
    const orbitMeshes = [];
    let loadedAssets = 0;
    let deferredLoaded = 0;
    const totalAssets = 1 + planets.length; // Video + 9 planets = 10

    function updateProgress() {
      const totalLoaded = loadedAssets + deferredLoaded;
      const loadingProgress = Math.floor((totalLoaded / totalAssets) * 100);
      loadingBar.style.width = `${loadingProgress}%`;

      if (totalLoaded === totalAssets) {
        gsap.to(loaderDiv, {
          opacity: 0,
          duration: 0.5,
          onComplete: () => {
            loaderDiv.style.display = "none";
            window.scrollTo(0, 0);
            astronautVideo.currentTime = 0;
            astronautVideo.style.visibility = "visible";
            astronautVideo.style.opacity = 1;
            videoSection.style.visibility = "visible";
            videoSection.style.display = "flex";
            document.body.style.overflowY = "auto";

            renderer.render(scene, camera);
            labelRenderer.render(scene, camera);

            showTextAnimation();
            initSolarText();
            initCornerTexts();
            initScrollControl();
          },
        });
      }
    }

    astronautVideo.addEventListener("canplaythrough", () => {
      loadedAssets++;
      updateProgress();
    });

    let topSpans = [];
    let weAreSpans = [];
    let currentProgress = 0; // Global for text parallax

    function showTextAnimation() {
      const text = "Hey, we are Fynix";
      topText.innerHTML = "";
      const parts = text.split(", we are");
      const before = parts[0];
      const after = ", we are ";
      const last = parts[1];

      const weAreSpan = document.createElement("span");
      weAreSpan.id = "weAreSpan";
      weAreSpan.style.display = "inline-block";
      weAreSpan.style.whiteSpace = "nowrap";

      before.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.opacity = 0;
        span.style.transform = "translateY(30px)";
        span.style.display = "inline-block";
        topText.appendChild(span);
      });

      after.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char === " " ? "\u00A0" : char;
        span.style.opacity = 0;
        span.style.transform = "translateY(30px)";
        span.style.display = "inline-block";
        weAreSpan.appendChild(span);
      });
      topText.appendChild(weAreSpan);

      last.split("").forEach((char) => {
        const span = document.createElement("span");
        span.textContent = char;
        span.style.opacity = 0;
        span.style.transform = "translateY(30px)";
        span.style.display = "inline-block";
        topText.appendChild(span);
      });

      topSpans = Array.from(topText.querySelectorAll("span"));
      weAreSpans = Array.from(
        document.getElementById("weAreSpan").querySelectorAll("span")
      );

      gsap.to(topText, { opacity: 1, duration: 0.5, ease: "power2.out" });
      gsap.to(topSpans, {
        opacity: 1,
        y: 0,
        stagger: 0.08,
        ease: "power2.out",
        duration: 0.6,
        delay: 0.3,
        onStart: () => {
          topSpans.forEach((s) => {
            s.style.transform = "translateY(0)";
          });
        },
      });

      // 🔥 EXACT SAME 3D PARALLAX EFFECT AS HTML VERSION 🔥
      let isHovering = false;

      // Mouse Enter/Leave (same as HTML)
      topText.addEventListener("mouseenter", () => {
        isHovering = true;
        topText.classList.add("hovered");
      });

      topText.addEventListener("mouseleave", () => {
        isHovering = false;
        topText.classList.remove("hovered");
        const videoProgress = Math.min(Math.max(currentProgress / 0.5, 0), 1);
        const heyFynixProgress = Math.max((videoProgress - 0.25) / 0.75, 0);
        const scale = 1 - heyFynixProgress * 0.5;
      });

      // 🔥 MAIN MOUSEMOVE - EXACT SAME AS HTML 🔥
      const mouseMoveHandler = (e) => {
        if (!isHovering) return;

        const rect = topText.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        const deltaX = e.clientX - centerX;
        const deltaY = e.clientY - centerY;

        // EXACT SAME VALUES AS HTML
        const moveX = deltaX * 0.008;
        const moveY = deltaY * 0.008;
        const rotateY = deltaX * 0.0015;
        const rotateX = -deltaY * 0.0015;

        topText.style.transform = `translateX(-50%) translate(${moveX}px, ${moveY}px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) scale(1)`;
      };

      topText.addEventListener("mousemove", mouseMoveHandler);
      mouseMoveHandlerGlobalRef.current = mouseMoveHandler;
    }

    function initSolarText() {
      const lines = ["A Creative space", "Designed by Designers for Designers"];

      solarText.innerHTML = "";

      lines.forEach((line, lineIndex) => {
        const lineDiv = document.createElement("div");
        lineDiv.style.display = "block";
        lineDiv.style.textAlign = "center";
        lineDiv.style.marginBottom = lineIndex === 0 ? "0.1em" : "0";

        if (lineIndex === 0) {
          lineDiv.style.fontSize = "2em";
          lineDiv.style.fontWeight = "900";
          lineDiv.style.letterSpacing = "0.04em";
        } else {
          lineDiv.style.fontSize = "1.2em";
          lineDiv.style.fontWeight = "400";
          lineDiv.style.letterSpacing = "0.02em";
        }

        line.split("").forEach((char) => {
          const span = document.createElement("span");
          span.textContent = char === " " ? "\u00A0" : char;
          span.style.opacity = 1;
          span.style.transform = "translateY(0)";
          span.style.display = "inline-block";
          span.style.transition = "opacity 0.3s ease, transform 0.3s ease";
          lineDiv.appendChild(span);
        });

        solarText.appendChild(lineDiv);
      });

      solarText.style.visibility = "visible";
    }

    function initCornerTexts() {
      const welcomeText = document.getElementById("welcomeText");
      const solarIntroText = document.getElementById("solarIntroText");

      const welcomeLines = [
        "Every idea stars small",
        "We nurtune it into orbit",
      ];
      const solarLines = ["Big vision need space.We", "give then galaxies"];

      function createText(container, lines) {
        container.innerHTML = "";

        const linesArray = Array.isArray(lines) ? lines : [lines];

        linesArray.forEach((line, lineIndex) => {
          const lineDiv = document.createElement("div");
          lineDiv.style.display = "block";
          lineDiv.style.textAlign = "center";
          lineDiv.style.width = "100%";
          lineDiv.style.margin = "0 auto";

          // Gap kam: 0.2em → 0.1em (ya 0.05em bhi kar sakte ho)
          lineDiv.style.marginBottom =
            lineIndex < linesArray.length - 1 ? "0.01em" : "0";

          line.split("").forEach((char) => {
            const span = document.createElement("span");
            span.textContent = char === " " ? "\u00A0" : char;
            span.style.opacity = 0;
            span.style.transform = "translateY(30px)";
            span.style.display = "inline-block";
            lineDiv.appendChild(span);
          });

          container.appendChild(lineDiv);
        });
      }

      createText(welcomeText, welcomeLines);
      createText(solarIntroText, solarLines);

      // Cache all spans
      window.welcomeSpans = Array.from(welcomeText.querySelectorAll("span"));
      window.solarIntroSpans = Array.from(
        solarIntroText.querySelectorAll("span")
      );
    }
    function loadPlanetModel(planet) {
      gltfLoader.load(
        `/textures/models/${planet.file}`,
        (gltf) => {
          const mesh = gltf.scene;

          mesh.traverse((node) => {
            if (node.isMesh) {
              let mat = node.material;

              const applyMaterialProps = (m) => {
                if (!m) return;

                if (m.isMeshStandardMaterial || m.isMeshPhysicalMaterial) {
                  // SUN KE LIYE SPECIAL CASE
                  // ❌ Sun ke liye koi special effect nahi
                  if (!m.isMeshStandardMaterial && !m.isMeshPhysicalMaterial)
                    return;

                  // Sirf baaki planets ke liye thoda correction
                  if (planet.name !== "Sun") {
                    if (m.color) {
                      const avg = (m.color.r + m.color.g + m.color.b) / 3;
                      if (avg < 0.12) {
                        m.color.lerp(new THREE.Color(0x888888), 0.35);
                      }
                    }

                    m.metalness = Math.min(0.25, m.metalness ?? 0.1);
                    m.roughness = Math.max(0.25, m.roughness ?? 0.6);

                    if (
                      !m.emissive ||
                      m.emissive.equals(new THREE.Color(0x000000))
                    ) {
                      m.emissive = new THREE.Color(0x050505);
                    }
                    m.emissiveIntensity = Math.max(
                      0.2,
                      m.emissiveIntensity ?? 0.4
                    );
                  }

                  m.needsUpdate = true;
                }
              };

              if (Array.isArray(mat)) mat.forEach(applyMaterialProps);
              else applyMaterialProps(mat);

              node.castShadow = true;
              node.receiveShadow = true;
            }
          });

          const bbox = new THREE.Box3().setFromObject(mesh);
          const center = new THREE.Vector3();
          bbox.getCenter(center);
          mesh.position.sub(center);
          const size = new THREE.Vector3();
          bbox.getSize(size);
          let scaleFactor = planet.radius / Math.max(size.x, size.y, size.z);
          if (planet.name === "Sun") scaleFactor *= 0.8;
          mesh.scale.setScalar(scaleFactor);
          const pivot = new THREE.Object3D();
          pivot.rotation.y = Math.random() * Math.PI * 2;
          pivot.userData.speed = planet.speed;
          pivot.userData.isPlanet = true;
          mesh.position.set(planet.distance, 0, 0);
          pivot.add(mesh);
          solarSystem.add(pivot);

          const div = document.createElement("div");
          div.className = "planet-label";
          div.textContent = `${planet.name}: ${planet.info}`;
          const label = new CSS2DObject(div);
          label.position.set(0, planet.radius + 15, 0);
          label.visible = false;
          mesh.add(label);
          mesh.userData.label = label;
          mesh.userData.isPlanet = true;

          if (planet.distance > 0) {
            const ringWidth = Math.max(0.06, planet.radius * 0.02 + 0.02);
            const orbit = new THREE.RingGeometry(
              planet.distance - ringWidth,
              planet.distance + ringWidth,
              256
            );
            const orbitMat = new THREE.MeshBasicMaterial({
              color: 0xffffff,
              side: THREE.DoubleSide,
              transparent: true,
              opacity: 0.25,
              blending: THREE.AdditiveBlending,
              depthWrite: false,
            });
            const orbitMesh = new THREE.Mesh(orbit, orbitMat);
            orbitMesh.rotation.x = Math.PI / 2;
            solarSystem.add(orbitMesh);
            orbitMeshes.push(orbitMesh);
          }
          planetMeshes.push({ mesh, pivot, planet });

          // Success ke baad hi count karo
          if (planet.name === "Sun") {
            loadedAssets++;
          } else {
            deferredLoaded++;
          }
          updateProgress(); // ← Yeh sahi hai
        },
        // onProgress (optional) — keep null
        null,
        // onError
        (error) => {
          console.error(`Failed to load ${planet.file}:`, error);
          // Fail bhi ho jaye, count karo taaki loader na ruke
          if (planet.name === "Sun") {
            loadedAssets++;
          } else {
            deferredLoaded++;
          }
          updateProgress();
        }
      );
    }
    planets.forEach(loadPlanetModel);

    function updateMeshMap() {
      planetMeshes.forEach((p) => {
        if (p.planet.distance > 0) {
          p.pivot.rotation.y += p.planet.speed;
        }
        p.mesh.rotation.y += p.planet.rotation;
      });

      orbitMeshes.forEach((mesh) => (mesh.rotation.z += 0.0002));
    }

    const raycaster = new THREE.Raycaster();
    const mouse = new THREE.Vector2();
    let lastHoveredPlanet = null;
    const mouseMoveHandlerPlanet = (event) => {
      mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
      mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;
      raycaster.setFromCamera(mouse, camera);
      const intersects = raycaster.intersectObjects(
        planetMeshes.map((p) => p.mesh),
        true
      );
      if (lastHoveredPlanet && lastHoveredPlanet.userData.label) {
        lastHoveredPlanet.userData.label.visible = false;
      }
      lastHoveredPlanet = null;
      if (intersects.length > 0) {
        let planetObj = intersects[0].object;
        while (planetObj && !planetObj.userData.isPlanet) {
          planetObj = planetObj.parent;
        }
        if (planetObj && planetObj.userData.label) {
          planetObj.userData.label.visible = true;
          lastHoveredPlanet = planetObj;
        }
      }
    };
    root.addEventListener("mousemove", mouseMoveHandlerPlanet);

    // scroll / video control state
    let targetProgress = 0;
    let smoothTime = 0.05;
    let lastScroll = 0;
    let videoDuration = 0;
    let lastVideoTime = 0;

    astronautVideo.addEventListener("loadedmetadata", () => {
      videoDuration = astronautVideo.duration || 0;
    });
    astronautVideo.pause();

    function initScrollControl() {
      const scrollHandler = () => {
        const now = performance.now();
        if (now - lastScroll > 10) {
          const scrollY = window.scrollY;
          const scrollHeight =
            scrollContainer.offsetHeight - window.innerHeight;
          targetProgress = Math.min(scrollY / scrollHeight, 1);
          lastScroll = now;
        }
      };
      window.addEventListener("scroll", scrollHandler);

      // === USER INTERACTION SE VIDEO PLAY KARO ===
      const playVideoOnInteraction = () => {
        if (astronautVideo.readyState >= 2) {
          astronautVideo.play().catch(() => {});
        }
        // Remove listeners after first play
        root.removeEventListener("mousemove", playVideoOnInteraction);
        root.removeEventListener("click", playVideoOnInteraction);
        root.removeEventListener("touchstart", playVideoOnInteraction);
      };

      root.addEventListener("mousemove", playVideoOnInteraction, {
        once: true,
      });
      root.addEventListener("click", playVideoOnInteraction, { once: true });
      root.addEventListener("touchstart", playVideoOnInteraction, {
        once: true,
      });
      // ==========================================

      astronautVideo.addEventListener("ended", () => {
        gsap.to(astronautVideo, {
          opacity: 0,
          duration: 0.3,
          onComplete: () => {
            astronautVideo.style.visibility = "hidden";
            videoSection.style.display = "none";
          },
        });
      });

      requestAnimationFrame(mainLoop);
    }

    function mainLoop() {
      currentProgress += (targetProgress - currentProgress) * smoothTime;

      const phaseSplit = 0.7;
      const videoProgress = Math.min(
        Math.max(currentProgress / phaseSplit, 0),
        1
      );
      const videoOpacity = 1 - Math.min(1, videoProgress * 1.2);

      if (astronautVideo.readyState >= 2) {
        const desiredTime = videoDuration * videoProgress;
        astronautVideo.currentTime +=
          (desiredTime - astronautVideo.currentTime) * 0.15;
        if (Math.abs(astronautVideo.currentTime - lastVideoTime) < 0.02) {
          astronautVideo.pause();
        } else {
          astronautVideo.play().catch(() => {});
        }
        lastVideoTime = astronautVideo.currentTime;
      }

      const sceneProgress = Math.min(
        Math.max((currentProgress - phaseSplit) / (1 - phaseSplit), 0),
        1
      );
      const shouldShowScene = sceneProgress > 0.01;

      // Canvas visibility
      renderer.domElement.style.opacity = shouldShowScene ? 1 : 0;
      renderer.domElement.style.visibility = shouldShowScene
        ? "visible"
        : "hidden";
      renderer.domElement.style.pointerEvents = shouldShowScene
        ? "auto"
        : "none";

      labelRenderer.domElement.style.opacity = shouldShowScene ? 1 : 0;
      labelRenderer.domElement.style.visibility = shouldShowScene
        ? "visible"
        : "hidden";

      // Video fade
      gsap.to(astronautVideo, {
        opacity: videoOpacity,
        duration: 0.4,
        ease: "power2.out",
      });
      astronautVideo.style.visibility = videoOpacity > 0 ? "visible" : "hidden";
      videoSection.style.display = videoOpacity > 0 ? "flex" : "none";

      // "we are" fade
      const weAreSpan = document.getElementById("weAreSpan");
      if (weAreSpan) {
        let fadeStart = 0.05,
          fadeEnd = 0.25;
        let fadeProgress = (videoProgress - fadeStart) / (fadeEnd - fadeStart);
        fadeProgress = Math.min(Math.max(fadeProgress, 0), 1);
        weAreSpan.style.opacity = 1 - fadeProgress;
        weAreSpan.style.width = `${
          (1 - fadeProgress) * weAreSpan.scrollWidth
        }px`;
      }

      // TEXT TRANSFORM - ONLY WHEN NOT HOVERED
      const heyFynixProgress = Math.max((videoProgress - 0.25) / 0.75, 0);
      const scale = 1 - heyFynixProgress * 0.5;
      const textOpacity = 1 - heyFynixProgress;
      const initialFontSize = 10,
        minFontSize = 1;
      const fontSize =
        initialFontSize - heyFynixProgress * (initialFontSize - minFontSize);

      topText.style.opacity = textOpacity;
      topText.style.fontSize = `${fontSize}vw`;

      // Solar text animations (fade in letter by letter)
      const allSpans = solarText.querySelectorAll("span");
      const letterProgress = sceneProgress * allSpans.length * 1.5;
      allSpans.forEach((span, index) => {
        const letterFadeProgress = Math.min(
          Math.max((letterProgress - index) / 1.5, 0),
          1
        );
        span.style.opacity = letterFadeProgress;
        span.style.transform = `translateY(${(1 - letterFadeProgress) * 30}px)`;
      });

      const solarScale = 1 - sceneProgress * 0.3;
      const initialSolarFontSize = 6,
        minSolarFontSize = 1;
      const solarFontSize =
        initialSolarFontSize -
        sceneProgress * (initialSolarFontSize - minSolarFontSize);
      solarText.style.transform = `translateX(-50%) scale(${solarScale})`;
      solarText.style.fontSize = `${solarFontSize}vw`;
      solarText.style.visibility = sceneProgress > 0 ? "visible" : "hidden";

      // SOLAR TEXT FADE OUT AFTER 85%
      gsap.to(solarText, {
        opacity: sceneProgress > 0.85 ? 0 : 1,
        duration: 1,
        ease: "power2.out",
      });

      // CORNER TEXTS APPEAR AFTER SOLAR TEXT FADES (88% onwards)
      const cornerTextStart = 0.88;
      const cornerTextEnd = 1.0;
      const cornerProgress = Math.min(
        Math.max(
          (sceneProgress - cornerTextStart) / (cornerTextEnd - cornerTextStart),
          0
        ),
        1
      );

      const welcomeText = document.getElementById("welcomeText");
      const solarIntroText = document.getElementById("solarIntroText");

      if (cornerProgress > 0 && window.welcomeSpans && window.solarIntroSpans) {
        // Show containers
        welcomeText.style.visibility = "visible";
        solarIntroText.style.visibility = "visible";

        // Letter-by-letter animation
        const totalLetters =
          Math.max(window.welcomeSpans.length, window.solarIntroSpans.length) *
          2;
        const letterProgress = cornerProgress * totalLetters * 1.2;

        // Welcome Text (left)
        window.welcomeSpans.forEach((span, i) => {
          const prog = Math.min(
            Math.max((letterProgress - i * 0.8) / 1.2, 0),
            1
          );
          span.style.opacity = prog;
          span.style.transform = `translateY(${(1 - prog) * 30}px)`;
        });

        // Solar Intro (right) - delayed
        const delayOffset = window.welcomeSpans.length * 0.8;
        window.solarIntroSpans.forEach((span, i) => {
          const prog = Math.min(
            Math.max((letterProgress - delayOffset - i * 0.8) / 1.2, 0),
            1
          );
          span.style.opacity = prog;
          span.style.transform = `translateY(${(1 - prog) * 30}px)`;
        });

        // Container fade-in + slide up
        const containerOpacity = Math.min(cornerProgress * 3, 1);
        welcomeText.style.opacity = containerOpacity;
        solarIntroText.style.opacity = containerOpacity;
        welcomeText.style.transform = `translateY(${
          (1 - containerOpacity) * 20
        }px)`;
        solarIntroText.style.transform = `translateY(${
          (1 - containerOpacity) * 20
        }px)`;
      } else {
        // Hide if not in range
        if (welcomeText) welcomeText.style.visibility = "hidden";
        if (solarIntroText) solarIntroText.style.visibility = "hidden";
      }

      // Three.js Solar System Scale & Position
      if (shouldShowScene) {
        const scaleFactor = window.innerWidth < 768 ? 0.7 : 1;
        const baseScale = 0.15 + (0.8 - 0.15) * sceneProgress;

        if (!solarSystem.userData.visible) {
          solarSystem.userData.visible = true;
          gsap.fromTo(
            solarSystem.scale,
            { x: 0.01, y: 0.01, z: 0.01 },
            {
              x: baseScale * scaleFactor,
              y: baseScale * scaleFactor,
              z: baseScale * scaleFactor,
              duration: 0.8,
              ease: "back.out(1.6)",
            }
          );
        } else {
          solarSystem.scale.setScalar(baseScale * scaleFactor);
        }

        solarSystem.position.y =
          -window.innerHeight * 2.5 + window.innerHeight * 2.5 * sceneProgress;
        camera.position.z = (350 - 150 * sceneProgress) * scaleFactor;
        camera.lookAt(0, 0, 0);
        controls.enableRotate = sceneProgress > 0.15;
      } else {
        controls.enableRotate = false;
      }

      updateMeshMap();

      // STARS FADE & PARALLAX
      const starsFadeStart = 0.1;
      const starsFadeEnd = 0.3;
      const starsFadeProgress = Math.min(
        Math.max(
          (currentProgress - starsFadeStart) / (starsFadeEnd - starsFadeStart),
          0
        ),
        1
      );

      starsRenderer.domElement.style.opacity = starsFadeProgress;

      const scrollOffset = currentProgress - 0.5;
      const starShiftX = scrollOffset * 250;
      const starShiftY = scrollOffset * 180;
      const starShiftZ = scrollOffset * 300;
      starsBg.position.set(starShiftX, starShiftY, starShiftZ);

      starsCamera.rotation.copy(camera.rotation);
      starsCamera.position.copy(camera.position);
      starsCamera.position.z = 400;
      controls.update();
      starsRenderer.render(starsScene, starsCamera);

      renderer.render(scene, camera);
      labelRenderer.render(scene, camera);
      requestAnimationFrame(mainLoop);
    }
    const resizeHandler = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
      labelRenderer.setSize(window.innerWidth, window.innerHeight);

      // === RESIZE STARS RENDERER ===
      starsCamera.aspect = window.innerWidth / window.innerHeight;
      starsCamera.updateProjectionMatrix();
      starsRenderer.setSize(window.innerWidth, window.innerHeight);
    };
    window.addEventListener("resize", resizeHandler);

    const keydownHandler = (e) => {
      const scrollHeight = scrollContainer.offsetHeight - window.innerHeight;
      const step = scrollHeight * 0.05;
      let scrollY = window.scrollY;
      if (e.key === "ArrowDown") {
        scrollY = Math.min(scrollY + step, scrollHeight);
        window.scrollTo(0, scrollY);
      }
      if (e.key === "ArrowUp") {
        scrollY = Math.max(scrollY - step, 0);
        window.scrollTo(0, scrollY);
      }
    };
    window.addEventListener("keydown", keydownHandler);

    document.body.style.margin = "0";
    document.body.style.padding = "0";
    document.body.style.background = "#000";

    // cleanup
    return () => {
      cancelAnimationFrame(animRef.current);
      window.removeEventListener("resize", resizeHandler);
      window.removeEventListener("scroll", () => {});
      root.removeEventListener("mousemove", mouseMoveHandlerPlanet);
      window.removeEventListener("keydown", keydownHandler);
      if (rendererRef.current) {
        rendererRef.current.dispose();
        if (
          rendererRef.current.domElement &&
          rendererRef.current.domElement.parentNode
        ) {
          rendererRef.current.domElement.parentNode.removeChild(
            rendererRef.current.domElement
          );
        }
      }
      if (
        labelRendererRef.current &&
        labelRendererRef.current.domElement &&
        labelRendererRef.current.domElement.parentNode
      ) {
        labelRendererRef.current.domElement.parentNode.removeChild(
          labelRendererRef.current.domElement
        );
      }
      if (mouseMoveHandlerGlobalRef.current) {
        topText?.removeEventListener(
          "mousemove",
          mouseMoveHandlerGlobalRef.current
        );
      }
      if (starsRenderer) {
        starsRenderer.dispose();
        if (starsRenderer.domElement && starsRenderer.domElement.parentNode) {
          starsRenderer.domElement.parentNode.removeChild(
            starsRenderer.domElement
          );
        }
      }
      root.innerHTML = "";
    };
  }, []);

  return (
    <div
      ref={rootRef}
      style={{
        position: "relative",
        width: "100%",
        height: "100vh",
        overflow: "visible",
      }}
    />
  );
}
