var LineChart2ElementWrapper;

(function () {
	/* HTML5 control wrapper for Chart.js Line Chart */
	LineChart2ElementWrapper = function (idGenerator) {
		this.domNode = document.createElement("div");
		this.domNode.className = "line-chart-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";

		// Create canvas for Chart.js
		this.canvasFrom = document.createElement("canvas");
		this.domNode.appendChild(this.canvasFrom);

		document.body.appendChild(this.domNode);

		var self = this;
		this.chart = null;

		// Change: Buffer object to hold data arriving before chart init
		this.pendingData = {
			labels: null,
			dataset: {
				label: null,
				data: null,
				borderColor: null,
				fill: null
			}
		};

		// Initialize chart after a short delay
		setTimeout(function () {
			self.initChart();
		}, 100);
	};

	LineChart2ElementWrapper.prototype = {
		initChart: function () {
			if (typeof Chart === 'undefined') {
				this.domNode.innerHTML = "Chart.js library not loaded!";
				return;
			}

			// Default initial data (demo) if nothing pending
			var initialLabels = ['January', 'February', 'March', 'April', 'May', 'June', 'July'];
			var initialDataset = {
				label: 'Demo Data',
				data: [65, 59, 80, 81, 56, 55, 40],
				fill: false,
				borderColor: 'rgb(75, 192, 192)',
				tension: 0.1
			};

			// Override defaults with pending data if available
			if (this.pendingData.labels) {
				initialLabels = this.pendingData.labels;
			}
			if (this.pendingData.dataset.label) initialDataset.label = this.pendingData.dataset.label;
			if (this.pendingData.dataset.data) initialDataset.data = this.pendingData.dataset.data;
			if (this.pendingData.dataset.borderColor) initialDataset.borderColor = this.pendingData.dataset.borderColor;
			if (this.pendingData.dataset.fill !== null) initialDataset.fill = this.pendingData.dataset.fill;


			var ctx = this.canvasFrom.getContext('2d');
			this.chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: initialLabels,
					datasets: [initialDataset]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false
				}
			});

			// Clear pending buffer
			this.pendingData = null;
		},

		setText: function (value) {
			if (this.chart && this.chart.options.plugins.title) {
				this.chart.options.plugins.title.text = value;
				this.chart.update();
			}
		},

		setColor: function (value) { },
		setFont: function (value, type, typeid) { },

		setInputLabels: function (value) {
			console.log("LineChart: setInputLabels called", String(value).substring(0, 100) + "...");
			try {
				var labels = JSON.parse(value);
				if (Array.isArray(labels)) {
					if (this.chart) {
						this.chart.data.labels = labels;
						this.chart.update();
					} else {
						// Buffer
						this.pendingData.labels = labels;
					}
				}
			} catch (e) {
				console.error("Invalid Labels JSON:", e);
			}
		},

		_ensureDataset: function () {
			if (this.chart && (!this.chart.data.datasets || this.chart.data.datasets.length === 0)) {
				this.chart.data.datasets = [{}];
			}
		},

		setDatasetLabel: function (value) {
			console.log("LineChart: setDatasetLabel called", value);
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].label = value;
				this.chart.update();
			} else {
				this.pendingData.dataset.label = value;
			}
		},

		setDatasetData: function (value) {
			// console.log("LineChart: setDatasetData called. Length:", String(value).length);

			var data = null;

			// 1. Parsing Logic
			if (typeof value === 'string') {
				var trimmed = value.trim();
				if (trimmed === "") {
					data = [];
				} else {
					// Handle raw Codesys array string (e1, e2, e3) or JSON
					if (trimmed.charAt(0) !== '[') {
						trimmed = "[" + trimmed + "]";
					}
					try {
						data = JSON.parse(trimmed);
					} catch (e) {
						console.error("LineChart: Invalid Data JSON:", e);
						// Fallback: try split by comma if JSON fails (simple CSV)
						var parts = value.split(',');
						data = [];
						for (var i = 0; i < parts.length; i++) {
							var num = parseFloat(parts[i]);
							if (!isNaN(num)) data.push(num);
						}
					}
				}
			} else if (Array.isArray(value)) {
				data = value;
			} else {
				console.error("LineChart: Invalid Data Type:", typeof value);
				return;
			}

			// 2. Downsampling / Optimization Logic
			// Chart.js can handle a few thousand points, but 170k+ will kill it.
			// Simple LTTB (Largest-Triangle-Three-Buckets) or just Nth-sampling is needed.
			// Here we use simple Nth-sampling for performance.
			var MAX_POINTS = 5000;
			if (data && data.length > MAX_POINTS) {
				console.warn("LineChart: Data length (" + data.length + ") exceeds limit (" + MAX_POINTS + "). Downsampling.");
				var sampledData = [];
				var step = Math.ceil(data.length / MAX_POINTS);
				for (var i = 0; i < data.length; i += step) {
					sampledData.push(data[i]);
				}
				data = sampledData;
			}

			// 3. Update Chart
			if (Array.isArray(data)) {
				if (this.chart) {
					this._ensureDataset();
					this.chart.data.datasets[0].data = data;

					// Auto-generate labels if mismatch
					if (this.chart.data.labels && this.chart.data.labels.length !== data.length) {
						// If we have significantly more data than labels, we might want to just show indices or empty labels
						// to ensure the line renders correctly from left to right.
						// However, if labels are meant to be sparse, Chart.js needs equal length for 'category' axis.
						// We will generate numeric indices as labels to match data length if labels are missing/short.
						var diff = data.length - this.chart.data.labels.length;
						if (diff > 0) {
							// Regenerate labels as simple indices if we don't have enough
							// Or just fill the rest?
							// Best approach: If mismatch is huge, replace labels entirely with indices
							if (this.chart.data.labels.length < data.length / 2) {
								this.chart.data.labels = data.map(function (_, i) { return i; });
							}
						}
					}

					this.chart.update();
				} else {
					this.pendingData.dataset.data = data;
				}
			}
		},

		setDatasetBorderColor: function (value) {
			console.log("LineChart: setDatasetBorderColor called", value);
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].borderColor = value;
				this.chart.update();
			} else {
				this.pendingData.dataset.borderColor = value;
			}
		},

		setDatasetFill: function (value) {
			console.log("LineChart: setDatasetFill called", value);
			var fillVal = false;
			if (typeof value === 'boolean') {
				fillVal = value;
			} else if (typeof value === 'string') {
				fillVal = (value.toLowerCase() === 'true');
			}
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].fill = fillVal;
				this.chart.update();
			} else {
				this.pendingData.dataset.fill = fillVal;
			}
		}
	};
}());