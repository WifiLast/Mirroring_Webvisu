var Model_ViewerElementWrapper;

(function () {
	/* HTML5 control wrapper for Three.js implementation */
	Model_ViewerElementWrapper = function (idGenerator) {
		console.log("Model_ViewerElementWrapper (Three.js): Constructor called");
		this.domNode = document.createElement("div");
		this.domNode.className = "model-viewer-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.overflow = "hidden";
		this.domNode.style.backgroundColor = "#f0f0f0"; // Light gray bg

		document.body.appendChild(this.domNode);

		var self = this;
		this.camera = null;
		this.scene = null;
		this.renderer = null;
		this.controls = null;
		this.model = null;

		// Initialize viewer after a short delay to ensure scripts are loaded
		setTimeout(function () {
			self.initViewer();
		}, 100);
	};

	Model_ViewerElementWrapper.prototype = {
		initViewer: function () {
			console.log("Model_ViewerElementWrapper: initViewer called");
			try {
				if (typeof THREE === 'undefined') {
					throw new Error("Three.js not loaded");
				}

				this.initScene();
				this.animate();

			} catch (e) {
				console.error("Model_ViewerElementWrapper: Error in initViewer", e);
				this.domNode.innerHTML = "Error initializing viewer: " + e.message;
			}
		},

		initScene: function () {
			var width = this.domNode.clientWidth;
			var height = this.domNode.clientHeight;

			// 1. Scene
			this.scene = new THREE.Scene();
			this.scene.background = new THREE.Color(0xf0f0f0);

			// 2. Camera
			this.camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
			this.camera.position.set(2, 1, 3); // Default position

			// 3. Renderer
			this.renderer = new THREE.WebGLRenderer({ antialias: true });
			this.renderer.setSize(width, height);
			this.renderer.setPixelRatio(window.devicePixelRatio);
			this.domNode.appendChild(this.renderer.domElement);

			// 4. Lights
			var ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
			this.scene.add(ambientLight);

			var dirLight = new THREE.DirectionalLight(0xffffff, 0.8);
			dirLight.position.set(5, 10, 7);
			this.scene.add(dirLight);

			// 5. Controls
			if (THREE.OrbitControls) {
				this.controls = new THREE.OrbitControls(this.camera, this.renderer.domElement);
				this.controls.enableDamping = true;
				this.controls.autoRotate = true;
			} else {
				console.warn("OrbitControls not loaded");
			}

			// 6. Load Model
			this.loadModel('Fox.glb');

			// Handle resize
			var self = this;
			window.addEventListener('resize', function () {
				self.onWindowResize();
			});
			// Also observe container resize if possible, or poll for dimension changes
			// Simple polling for container size change
			setInterval(function () {
				if (self.domNode.clientWidth !== width || self.domNode.clientHeight !== height) {
					width = self.domNode.clientWidth;
					height = self.domNode.clientHeight;
					self.onWindowResize();
				}
			}, 500);
		},

		loadModel: function (url) {
			var self = this;

			// 1. Check for Embedded Base64 Data (Bypasses CSP)
			if (window.gltfModelData) {
				console.log("Found embedded model data. Parsing...");
				try {
					var loader = new THREE.GLTFLoader();
					var arrayBuffer = this.base64ToArrayBuffer(window.gltfModelData);
					loader.parse(arrayBuffer, './', function (gltf) {
						self.addGltfToScene(gltf);
					}, function (e) {
						console.error("Error parsing embedded model:", e);
						self.loadFallbackCube();
					});
					return;
				} catch (e) {
					console.error("Exception parsing embedded model:", e);
				}
			}

			// 2. Try loading from URL (May trigger CSP error)
			var loader = new THREE.GLTFLoader();
			loader.load(url, function (gltf) {
				self.addGltfToScene(gltf);
			}, undefined, function (error) {
				console.error("An error occurred loading the model (likely CSP):", error);
				// Fallback to a Cube so the user sees something
				self.loadFallbackCube();
			});
		},

		addGltfToScene: function (gltf) {
			this.model = gltf.scene;
			this.scene.add(this.model);

			// Center model
			var box = new THREE.Box3().setFromObject(this.model);
			var center = box.getCenter(new THREE.Vector3());
			this.model.position.sub(center);

			// Animation
			if (gltf.animations && gltf.animations.length) {
				this.mixer = new THREE.AnimationMixer(this.model);
				var action = this.mixer.clipAction(gltf.animations[0]);
				action.play();
			}
			console.log("Model loaded successfully");
		},

		loadFallbackCube: function () {
			console.log("Loading fallback cube...");
			var geometry = new THREE.BoxGeometry(1, 1, 1);
			var material = new THREE.MeshStandardMaterial({ color: 0xff0000 });
			this.model = new THREE.Mesh(geometry, material);
			this.scene.add(this.model);
			// Center camera on it
			this.camera.position.set(2, 2, 2);
			this.controls.update();
		},

		base64ToArrayBuffer: function (base64) {
			var binaryString = window.atob(base64.split(',')[1] || base64); // Handle optional data URI header
			var len = binaryString.length;
			var bytes = new Uint8Array(len);
			for (var i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return bytes.buffer;
		},

		onWindowResize: function () {
			if (!this.camera || !this.renderer) return;
			var width = this.domNode.clientWidth;
			var height = this.domNode.clientHeight;
			this.camera.aspect = width / height;
			this.camera.updateProjectionMatrix();
			this.renderer.setSize(width, height);
		},

		animate: function () {
			var self = this;
			requestAnimationFrame(function () { self.animate(); });

			if (this.controls) this.controls.update();

			if (this.mixer) {
				var delta = 0.016; // Approx 60fps
				this.mixer.update(delta);
			}

			if (this.renderer && this.scene && this.camera) {
				this.renderer.render(this.scene, this.camera);
			}
		},

		// Codesys Interface Methods
		setText: function (value) { },

		setViewAngle: function (value) {
			// Value format: "45deg 55deg 2m" (example string from XML binding)
			// Three.js doesn't use this string format directly. 
			// We'll parse it or simplify. 
			// Simple implementation: if value is "reset", reset camera.
			if (value === "reset" && this.controls) {
				this.controls.reset();
			}
			// For robust parsing, we'd need more logic. 
			// For now, let's assume it might control auto-rotate speed or similar if needed.
		},

		setColor: function (value) { },
		setFont: function (value, type, typeid) { },
		setInputLabels: function (value) { },
		setDatasetLabel: function (value) { },
		setDatasetData: function (value) { },
		setDatasetBorderColor: function (value) { },
		setDatasetFill: function (value) { },
		setShowAxis2: function (value) { },
		setAxis1Label: function (value) { },
		setAxis2Label: function (value) { },
		setLimit1Value: function (value) { },
		setLimit2Value: function (value) { }
	};
}());
