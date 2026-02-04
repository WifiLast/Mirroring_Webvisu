var LineChart2ElementWrapper;

(function () {
	/* HTML5 control wrapper for Chart.js Line Chart */
	LineChart2ElementWrapper = function (idGenerator) {
		this.domNode = document.createElement("div");
		this.domNode.className = "line-chart-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.backgroundColor = "#ffffff";

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
			// Default initial data
			var initialLabels = [];
			var initialDataset = {
				label: '',
				data: [],
				fill: false,
				borderColor: 'rgb(75, 192, 192)',
				tension: 0.1
			};

			// Initialize internal state for number of data points
			if (this.currentNumberOfData === undefined) {
				this.currentNumberOfData = -1; // -1 means use all
			}

			// Override defaults with pending data if available
			if (this.pendingData.labels) {
				initialLabels = this.pendingData.labels;
			}
			if (this.pendingData.dataset.label) initialDataset.label = this.pendingData.dataset.label;

			// Data handling with potential slicing
			var pendingData = this.pendingData.dataset.data;
			if (pendingData) {
				if (this.currentNumberOfData > 0 && Array.isArray(pendingData) && pendingData.length > this.currentNumberOfData) {
					console.log("LineChart init: Slicing pending data to " + this.currentNumberOfData);
					initialDataset.data = pendingData.slice(0, this.currentNumberOfData);
				} else {
					initialDataset.data = pendingData;
				}
			}

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
					maintainAspectRatio: false,
					scales: {
						x: {
							ticks: {
								font: {
									size: 14 // Increased font size
								}
							}
						},
						y: {
							ticks: {
								font: {
									size: 14 // Increased font size
								}
							}
						}
					},
					interaction: {
						mode: 'index',
						intersect: false,
					},
					plugins: {
						legend: {
							labels: {
								font: {
									size: 16
								}
							}
						},
						tooltip: {
							titleFont: {
								size: 18
							},
							bodyFont: {
								size: 16
							},
							padding: 15,
							displayColors: true,
							boxWidth: 15,
							titleSpacing: 5,
							bodySpacing: 5
						}
					}
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
			// console.log("LineChart: setInputLabels called", String(value).substring(0, 100) + "...");
			var labels = [];
			try {
				if (Array.isArray(value)) {
					labels = value;
				} else {
					labels = JSON.parse(value);
				}

				if (Array.isArray(labels)) {
					// Store raw labels for filtering
					this.rawLabels = labels;
					this.updateVisibleData();
				}
			} catch (e) {
				console.error("Invalid Labels Data:", e);
			}
		},

		setTimeWindow: function (value) {
			console.log("LineChart: setTimeWindow called with value: " + value);
			this.timeWindow = parseInt(value, 10);
			if (isNaN(this.timeWindow) || this.timeWindow <= 0) {
				this.timeWindow = 1800; // Default 30 min
			}
			this.updateVisibleData();
		},

		updateVisibleData: function () {
			if (!this.rawLabels || !this.rawData || !this.chart) return;

			var windowSeconds = this.timeWindow || 1800; // Default 30 min

			// Process Labels and find start index
			var processedLabels = [];
			var processedData = [];

			// 1. Convert last label to time to define window end (assuming sorted)
			// Need to parse timestamps first to perform logic
			var parsedTimestamps = [];
			var self = this;

			this.rawLabels.forEach(function (lbl) {
				var dt = null;
				if (typeof lbl === 'string' && lbl.indexOf('DT#') !== -1) {
					dt = self.parseCodesysTime(lbl);
				} else if (typeof lbl === 'string') {
					// Try standard date parse if not DT#
					dt = new Date(lbl);
				} else if (lbl instanceof Date) {
					dt = lbl;
				}
				parsedTimestamps.push(dt);
			});

			// Determine window
			// Find max time (usually the last one)
			var validTimes = parsedTimestamps.filter(t => t instanceof Date && !isNaN(t));
			if (validTimes.length === 0) {
				// If no valid time, show all (fallback)
				processedLabels = this.rawLabels;
				processedData = this.rawData;
			} else {
				var maxTime = validTimes[validTimes.length - 1]; // Last point is current
				var cutoffTime = new Date(maxTime.getTime() - (windowSeconds * 1000));

				// Filter
				for (var i = 0; i < parsedTimestamps.length; i++) {
					var t = parsedTimestamps[i];
					if (t && t >= cutoffTime) {
						// Keep this point
						// Format Label: HH:mm:ss
						var hours = t.getHours().toString().padStart(2, '0');
						var minutes = t.getMinutes().toString().padStart(2, '0');
						var seconds = t.getSeconds().toString().padStart(2, '0');
						processedLabels.push(hours + ':' + minutes + ':' + seconds);

						// Push corresponding data if exists
						if (i < this.rawData.length) {
							processedData.push(this.rawData[i]);
						}
					}
				}
			}

			// Update Chart
			this.chart.data.labels = processedLabels;
			this._ensureDataset();
			this.chart.data.datasets[0].data = processedData;
			this.chart.update();
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

			// Round to 3 decimal places
			if (data && Array.isArray(data)) {
				data = data.map(function (num) {
					if (typeof num === 'number') {
						return parseFloat(num.toFixed(3));
					}
					return num;
				});
			}

			// Store Raw Data
			this.rawData = data;
			this.updateVisibleData();
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

		setNumberOfData: function (value) {
			// console.log("LineChart: setNumberOfData called", value);
			var num = parseInt(value, 10);
			if (!isNaN(num)) {
				this.currentNumberOfData = num;
				// If we already have data pending or in chart, we might need to update
				if (this.chart) {
					// We need to re-apply data if we have the full source available. 
					// However, we don't store the full source in this wrapper after init/update to save memory.
					// So acts as a config for *next* data update or init.
					console.log("LineChart: NumberOfData updated. Will apply on next data set.");
				}
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
		},

		/* Helper: Convert Codesys DT string (DT#2018-6-6-10:24:54) to JS Date */
		parseCodesysTime: function (sDT) {
			if (!sDT || typeof sDT !== 'string') return null;
			// Remove "DT#" prefix if present
			var cleanStr = sDT.replace(/^DT#/, '');
			// Format is usually YYYY-MM-DD-HH:mm:ss
			// JS Date expects YYYY-MM-DDTHH:mm:ss (ISO) or similar
			// Let's replace the 3rd dash with T? 
			// Check format: 2018-6-6-10:24:54
			// Split by '-'
			var parts = cleanStr.split('-');
			if (parts.length >= 4) {
				var datePart = parts[0] + '-' + parts[1] + '-' + parts[2]; // 2018-6-6
				var timePart = parts[3]; // 10:24:54
				// Combine
				var isoString = datePart + 'T' + timePart;
				var d = new Date(isoString);
				if (!isNaN(d.getTime())) return d;
			}
			return new Date(); // Fallback
		}
	};
}());