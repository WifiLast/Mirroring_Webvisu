var GoogleModelViewerElementWrapper;

(function () {
	/* HTML5 control wrapper for model-viewer implementation */
	GoogleModelViewerElementWrapper = function (idGenerator) {
		console.log("GoogleModelViewerElementWrapper (model-viewer): Constructor called");
		this.domNode = document.createElement("div");
		this.domNode.className = "model-viewer-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.overflow = "hidden";

		// Create the model-viewer element
		this.modelViewer = document.createElement("model-viewer");
		this.modelViewer.style.width = "100%";
		this.modelViewer.style.height = "100%";

		// Default settings
		this.modelViewer.setAttribute("camera-controls", "");
		this.modelViewer.setAttribute("auto-rotate", "");
		this.modelViewer.setAttribute("shadow-intensity", "1");
		this.modelViewer.setAttribute("camera-target", "0m 0m 0m"); // Start centered

		// Explicitly disable panning if desired, or configure interaction-prompt
		// this.modelViewer.setAttribute("interaction-prompt", "none"); 

		this.domNode.appendChild(this.modelViewer);
		document.body.appendChild(this.domNode);

		var self = this;

		// Initialize viewer after a short delay
		setTimeout(function () {
			self.initViewer();
		}, 100);
	};

	GoogleModelViewerElementWrapper.prototype = {
		initViewer: function () {
			console.log("GoogleModelViewerElementWrapper: initViewer called");
			// Helper to check if model-viewer is defined
			if (customElements.get('model-viewer')) {
				console.log("model-viewer is defined.");
			} else {
				console.error("model-viewer custom element not defined! Check if script is loaded.");
				this.domNode.innerHTML = "Error: model-viewer not loaded.";
				return;
			}

			this.loadModel('CT2_0.glb'); // Default model name, will check embedded data
		},

		loadModel: function (url) {
			var self = this;

			// 1. Check for Embedded Base64 Data (Bypasses CSP & serves offline)
			if (window.gltfModelData) {
				console.log("Found embedded model data. Creating Blob URL...");
				try {
					var blob = this.base64ToBlob(window.gltfModelData, 'model/gltf-binary');
					var blobUrl = URL.createObjectURL(blob);
					this.modelViewer.src = blobUrl;
					console.log("Model loaded from Blob URL:", blobUrl);
					return;
				} catch (e) {
					console.error("Exception parsing embedded model:", e);
				}
			}

			// 2. Try loading from URL (May trigger CSP error if not local/allowed)
			console.log("Loading model from URL:", url);
			this.modelViewer.src = url;
		},

		base64ToBlob: function (base64, type) {
			var binaryString = window.atob(base64.split(',')[1] || base64);
			var len = binaryString.length;
			var bytes = new Uint8Array(len);
			for (var i = 0; i < len; i++) {
				bytes[i] = binaryString.charCodeAt(i);
			}
			return new Blob([bytes], { type: type });
		},

		// Codesys Interface Methods
		setText: function (value) { },

		setViewAngle: function (value) {
			// Value format example: "45deg 55deg 2m"
			// model-viewer uses 'camera-orbit' attribute: "theta phi radius"
			// If we get "reset", we can just remove the attribute to go back to default
			if (value === "reset") {
				this.modelViewer.removeAttribute("camera-orbit");
			} else if (value && value.length > 0) {
				// Basic attempt to pass through if format matches or user adapts
				// this.modelViewer.setAttribute("camera-orbit", value);
			}
		},

		setColor: function (value) {
			// Could be used to set background color
			if (value) {
				// Codesys often sends DWORD colors or hex strings. 
				// Assuming standard CSS string for simplicity here.
				// this.modelViewer.style.backgroundColor = value;
			}
		},

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
