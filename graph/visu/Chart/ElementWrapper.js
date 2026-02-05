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
		// Create canvas for Chart.js
		this.canvasFrom = document.createElement("canvas");
		this.domNode.appendChild(this.canvasFrom);

		// Create Time Interval Selector
		this.createTimeSelector();

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
		createTimeSelector: function () {
			var self = this;
			var select = document.createElement("select");
			select.style.position = "absolute";
			select.style.width = "150px"; // Increased from 100px
			select.style.top = "1px";
			select.style.right = "1px";
			select.style.zIndex = "100";
			select.style.padding = "10px"; // Increased padding
			select.style.fontSize = "18px"; // Increased font size
			select.style.borderRadius = "4px";
			select.style.border = "1px solid #ccc";

			var options = [
				{ val: 900, text: "15 min" },
				{ val: 1800, text: "30 min" },
				{ val: 3600, text: "1 hour" },
				{ val: 21600, text: "6 hours" },
				{ val: 43200, text: "12 hours" },
				{ val: 86400, text: "24 hours" }
			];

			options.forEach(function (opt) {
				var el = document.createElement("option");
				el.value = opt.val;
				el.innerText = opt.text;
				if (opt.val === 1800) el.selected = true; // Default
				select.appendChild(el);
			});

			// Add Custom Option (Hidden by default, used for zoom)
			var customOpt = document.createElement("option");
			customOpt.value = "-1";
			customOpt.innerText = "Custom";
			customOpt.hidden = true; // Hide from dropdown list initially
			select.appendChild(customOpt);
			self.customOptionNode = customOpt;

			select.onchange = function () {
				self.timeWindow = parseInt(this.value, 10);
				self.updateVisibleData();
			};

			this.domNode.appendChild(select);
			this.timeSelector = select; // Save ref
		},

		initChart: function () {
			var self = this;
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


			// Extract Unit from initial label if present
			var initialUnit = "";
			if (initialDataset.label) {
				var match = initialDataset.label.match(/[\[\(](.*?)[\)\]]/);
				if (match && match.length > 1) {
					initialUnit = match[1];
					console.log("LineChart init: Extracted unit:", initialUnit);
				}
			}

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
					layout: {
						padding: {
							top: 50, // Increased gap at top
							left: 10,
							right: 10,
							bottom: 10
						}
					},
					scales: {
						xAxes: [{
							ticks: {
								maxTicksLimit: 8, // Limit to max 8 ticks on x-axis
								autoSkip: true,
								maxRotation: 45,
								minRotation: 0,
								fontSize: 14 // Increased font size
							}
						}],
						yAxes: [{
							ticks: {
								fontSize: 14 // Increased font size
							},
							scaleLabel: {
								display: (initialUnit !== ""), // Will be enabled if unit is set
								labelString: initialUnit,
								fontSize: 16,
								fontStyle: 'bold'
							}
						}]
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

			// Add Zoom/Scroll Handler
			this.canvasFrom.onwheel = function (event) {
				event.preventDefault();

				// Determine direction: deltaY < 0 is scrolling UP (Zoom In), deltaY > 0 is scrolling DOWN (Zoom Out)
				var zoomingIn = event.deltaY < 0;

				// Smooth Zooming: Change window by 10%
				var currentWindow = self.timeWindow;
				var changeStep = Math.max(1, Math.round(currentWindow * 0.1));

				var newValue = currentWindow;
				if (zoomingIn) {
					newValue -= changeStep;
				} else {
					newValue += changeStep;
				}

				// Clamp values (Min: 60s, Max: 24h)
				if (newValue < 60) newValue = 60;
				if (newValue > 86400) newValue = 86400;

				if (newValue !== currentWindow) {
					self.setTimeWindow(newValue);
				}
			};

			// Add Touch Pinch-to-Zoom Handler
			this.lastPinchDist = null;

			this.canvasFrom.addEventListener('touchstart', function (e) {
				if (e.touches.length === 2) {
					var dx = e.touches[0].clientX - e.touches[1].clientX;
					var dy = e.touches[0].clientY - e.touches[1].clientY;
					self.lastPinchDist = Math.sqrt(dx * dx + dy * dy);
				}
			});

			this.canvasFrom.addEventListener('touchmove', function (e) {
				if (e.touches.length === 2 && self.lastPinchDist !== null) {
					e.preventDefault(); // Prevent page scroll

					var dx = e.touches[0].clientX - e.touches[1].clientX;
					var dy = e.touches[0].clientY - e.touches[1].clientY;
					var dist = Math.sqrt(dx * dx + dy * dy);

					// Threshold to avoid jitter
					if (Math.abs(dist - self.lastPinchDist) > 10) {
						var zoomingIn = dist > self.lastPinchDist; // Spread = Zoom In

						// Smooth Zooming: Change window by 5% (finer for touch)
						var currentWindow = self.timeWindow;
						var changeStep = Math.max(1, Math.round(currentWindow * 0.05));

						var newValue = currentWindow;
						if (zoomingIn) {
							newValue -= changeStep;
						} else {
							newValue += changeStep;
						}

						// Clamp values (Min: 60s, Max: 24h)
						if (newValue < 60) newValue = 60;
						if (newValue > 86400) newValue = 86400;

						if (newValue !== currentWindow) {
							self.setTimeWindow(newValue);
							self.lastPinchDist = dist; // Update for continuous zoom
						}
					}
				}
			});

			this.canvasFrom.addEventListener('touchend', function (e) {
				if (e.touches.length < 2) {
					self.lastPinchDist = null;
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

			// Sync Selector if exists
			// Sync Selector if exists
			if (this.timeSelector) {
				// Check if value exists in standard options
				var found = false;
				for (var i = 0; i < this.timeSelector.options.length; i++) {
					var opt = this.timeSelector.options[i];
					if (parseInt(opt.value, 10) === this.timeWindow) {
						this.timeSelector.selectedIndex = i;
						found = true;
						break;
					}
				}

				if (!found && this.customOptionNode) {
					// Select Custom
					this.customOptionNode.hidden = false;
					this.customOptionNode.selected = true;
					this.customOptionNode.innerText = "Custom"; // Just "Custom" as requested
				}
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

			// Dynamically adjust maxTicksLimit based on time window
			// For shorter windows, show more detail; for longer windows, show less
			var maxTicks;
			if (windowSeconds <= 900) { // 15 min or less
				maxTicks = 10;
			} else if (windowSeconds <= 3600) { // 1 hour or less
				maxTicks = 8;
			} else if (windowSeconds <= 21600) { // 6 hours or less
				maxTicks = 6;
			} else { // More than 6 hours
				maxTicks = 5;
			}
			// Update maxTicksLimit for Chart.js v2
			this.chart.options.scales.xAxes[0].ticks.maxTicksLimit = maxTicks;

			this.chart.update();
		},

		_ensureDataset: function () {
			if (this.chart && (!this.chart.data.datasets || this.chart.data.datasets.length === 0)) {
				this.chart.data.datasets = [{}];
			}
		},

		setDatasetLabel: function (value) {
			console.log("=== LineChart2 setDatasetLabel called ===", value);

			// Extract Unit: Look for text in [] or ()
			var unit = "";
			var match = value.match(/[\[\(](.*?)[\)\]]/);
			if (match && match.length > 1) {
				unit = match[1];
				console.log("LineChart2: Extracted unit:", unit);
			} else {
				console.log("LineChart2: No unit found in label");
			}

			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].label = value;

				// Update Y-Axis Title with Unit (Chart.js v2 syntax)
				if (this.chart.options.scales.yAxes && this.chart.options.scales.yAxes[0]) {
					if (!this.chart.options.scales.yAxes[0].scaleLabel) {
						this.chart.options.scales.yAxes[0].scaleLabel = {
							display: false,
							labelString: '',
							fontSize: 16,
							fontStyle: 'bold'
						};
					}
					// Only display if we have a unit
					if (unit) {
						console.log("LineChart2: Setting y-axis scaleLabel to:", unit);
						this.chart.options.scales.yAxes[0].scaleLabel.display = true;
						this.chart.options.scales.yAxes[0].scaleLabel.labelString = unit;
					} else {
						console.log("LineChart2: Hiding y-axis scaleLabel (no unit)");
						this.chart.options.scales.yAxes[0].scaleLabel.display = false;
					}
				}
				console.log("LineChart2: Updating chart...");
				this.chart.update();
			} else {
				console.log("LineChart2: Chart not initialized yet, storing in pendingData");
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
		/* Helper: Convert Codesys DT string (DT#2018-6-6-10:24:54) to JS Date */
		parseCodesysTime: function (sDT) {
			if (!sDT || typeof sDT !== 'string') return null;
			// Remove "DT#" prefix
			var cleanStr = sDT.replace(/^DT#/, '');

			// Expected format: YYYY-MM-DD-HH:mm:ss
			// Example: 2018-6-6-10:24:54

			// Split by '-' to get date parts and time string
			var parts = cleanStr.split('-');
			if (parts.length >= 4) {
				var year = parseInt(parts[0], 10);
				var month = parseInt(parts[1], 10) - 1; // JS months are 0-11
				var day = parseInt(parts[2], 10);

				// Time part is the last element ("10:24:54")
				var timeStr = parts[3];
				var timeParts = timeStr.split(':');

				var hour = 0, min = 0, sec = 0;
				if (timeParts.length >= 2) {
					hour = parseInt(timeParts[0], 10);
					min = parseInt(timeParts[1], 10);
					if (timeParts.length >= 3) {
						sec = parseInt(timeParts[2], 10);
					}
				}

				// Constructor: new Date(year, monthIndex, day, hours, minutes, seconds) - treating as Local Time
				var d = new Date(year, month, day, hour, min, sec);
				if (!isNaN(d.getTime())) return d;
			}
			return new Date(); // Fallback
		}

	};
}());