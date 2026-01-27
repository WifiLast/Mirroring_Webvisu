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
			console.log("LineChart: setDatasetData called. Length:", String(value).length);
			// Handle raw Codesys array string (e1, e2, e3) by wrapping in brackets if needed
			var dataToParse = value;
			if (typeof value === 'string') {
				if (value.trim().charAt(0) !== '[') {
					dataToParse = "[" + value + "]";
				}
				try {
					var data = JSON.parse(dataToParse);
					if (Array.isArray(data)) {
						console.log("LineChart: Parsed data array length:", data.length);
						if (this.chart) {
							this._ensureDataset();
							this.chart.data.datasets[0].data = data;
							this.chart.update();
						} else {
							this.pendingData.dataset.data = data;
						}
					}
				} catch (e) {
					console.error("Invalid Data JSON:", e, String(value).substring(0, 50));
				}
			} else if (Array.isArray(value)) {
				console.log("LineChart: Received direct array. Length:", value.length);
				// Direct array input (unlikely from simple string var, but possible)
				if (this.chart) {
					this._ensureDataset();
					this.chart.data.datasets[0].data = value;
					this.chart.update();
				} else {
					this.pendingData.dataset.data = value;
				}
			} else {
				console.error("Invalid Data Type:", typeof value);
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
			var fillVal = (value === 'true' || value === true);
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