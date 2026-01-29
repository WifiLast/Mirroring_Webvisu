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
			},
			dataset2: {
				label: null,
				data: null,
				borderColor: null,
				fill: null
			},
			params: {
				showAxis2: true,
				axis1Label: '',
				axis2Label: '',
				limit1: null,
				limit2: null
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

			var self = this;

			// Default initial data
			var initialLabels = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul'];
			var initialDataset1 = {
				label: 'Dataset 1',
				yAxisID: 'y-axis-1',
				data: [65, 59, 80, 81, 56, 55, 40],
				fill: false,
				borderColor: 'rgb(75, 192, 192)',
				tension: 0.1
			};
			var initialDataset2 = {
				label: 'Dataset 2',
				yAxisID: 'y-axis-2',
				data: [28, 48, 40, 19, 86, 27, 90],
				fill: false,
				borderColor: 'rgb(255, 99, 132)',
				tension: 0.1
			};

			// Apply Pending Data
			if (this.pendingData.labels) initialLabels = this.pendingData.labels;

			// Dataset 1
			if (this.pendingData.dataset.label) initialDataset1.label = this.pendingData.dataset.label;
			if (this.pendingData.dataset.data) initialDataset1.data = this.pendingData.dataset.data;
			if (this.pendingData.dataset.borderColor) initialDataset1.borderColor = this.pendingData.dataset.borderColor;
			if (this.pendingData.dataset.fill !== null) initialDataset1.fill = this.pendingData.dataset.fill;

			// Dataset 2
			if (this.pendingData.dataset2.label) initialDataset2.label = this.pendingData.dataset2.label;
			if (this.pendingData.dataset2.data) initialDataset2.data = this.pendingData.dataset2.data;
			if (this.pendingData.dataset2.borderColor) initialDataset2.borderColor = this.pendingData.dataset2.borderColor;
			if (this.pendingData.dataset2.fill !== null) initialDataset2.fill = this.pendingData.dataset2.fill;

			// Params
			var showAxis2 = this.pendingData.params.showAxis2;
			var axis1Label = this.pendingData.params.axis1Label;
			var axis2Label = this.pendingData.params.axis2Label;
			this.limit1 = this.pendingData.params.limit1;
			this.limit2 = this.pendingData.params.limit2;


			// Define Limit Line Plugin
			var limitLinePlugin = {
				id: 'limitLinePlugin',
				afterDraw: function (chart) {
					var ctx = chart.ctx;
					var yAxis = chart.scales['y-axis-1']; // Assume limits are on Axis 1 for simplicity, or make configurable

					if (self.limit1 !== null && !isNaN(self.limit1)) {
						var yPos = yAxis.getPixelForValue(self.limit1);
						if (yPos >= yAxis.top && yPos <= yAxis.bottom) {
							ctx.save();
							ctx.beginPath();
							ctx.moveTo(chart.chartArea.left, yPos);
							ctx.lineTo(chart.chartArea.right, yPos);
							ctx.lineWidth = 2;
							ctx.strokeStyle = 'red';
							ctx.setLineDash([5, 5]);
							ctx.stroke();
							ctx.restore();
						}
					}

					if (self.limit2 !== null && !isNaN(self.limit2)) {
						var yPos = yAxis.getPixelForValue(self.limit2);
						if (yPos >= yAxis.top && yPos <= yAxis.bottom) {
							ctx.save();
							ctx.beginPath();
							ctx.moveTo(chart.chartArea.left, yPos);
							ctx.lineTo(chart.chartArea.right, yPos);
							ctx.lineWidth = 2;
							ctx.strokeStyle = 'orange';
							ctx.setLineDash([5, 5]);
							ctx.stroke();
							ctx.restore();
						}
					}
				}
			};

			var ctx = this.canvasFrom.getContext('2d');
			this.chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: initialLabels,
					datasets: [initialDataset1, initialDataset2]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false,
					scales: {
						'y-axis-1': {
							type: 'linear',
							display: true,
							position: 'left',
							title: {
								display: !!axis1Label,
								text: axis1Label
							}
						},
						'y-axis-2': {
							type: 'linear',
							display: showAxis2,
							position: 'right',
							grid: {
								drawOnChartArea: false // only want the grid lines for one axis to show up
							},
							title: {
								display: !!axis2Label,
								text: axis2Label
							}
						}
					},
					plugins: {
						legend: { display: true }
					}
				},
				plugins: [limitLinePlugin]
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
			console.log("LineChart2: setInputLabels called", String(value).substring(0, 100) + "...");
			try {
				var labels = JSON.parse(value);
				if (Array.isArray(labels)) {
					if (this.chart) {
						this.chart.data.labels = labels;
						this.chart.update();
					} else {
						this.pendingData.labels = labels;
					}
				}
			} catch (e) {
				console.error("Invalid Labels JSON:", e);
			}
		},

		_ensureDataset: function () {
			if (this.chart && (!this.chart.data.datasets || this.chart.data.datasets.length < 2)) {
				// Ensure 2 datasets exist
				while (this.chart.data.datasets.length < 2) {
					this.chart.data.datasets.push({});
				}
			}
		},

		// --- Dataset 1 Setters ---
		setDatasetLabel: function (value) {
			console.log("LineChart2: setDatasetLabel called", value);
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].label = value;
				this.chart.update();
			} else {
				this.pendingData.dataset.label = value;
			}
		},

		setDatasetData: function (value) {
			console.log("LineChart2: setDatasetData called. Length:", String(value).length);
			var dataToParse = value;
			if (typeof value === 'string') {
				if (value.trim().charAt(0) !== '[') {
					dataToParse = "[" + value + "]";
				}
				try {
					var data = JSON.parse(dataToParse);
					if (Array.isArray(data)) {
						console.log("LineChart2: Parsed data array length:", data.length);
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
				if (this.chart) {
					this._ensureDataset();
					this.chart.data.datasets[0].data = value;
					this.chart.update();
				} else {
					this.pendingData.dataset.data = value;
				}
			}
		},

		setDatasetBorderColor: function (value) {
			console.log("LineChart2: setDatasetBorderColor called", value);
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].borderColor = value;
				this.chart.update();
			} else {
				this.pendingData.dataset.borderColor = value;
			}
		},

		setDatasetFill: function (value) {
			console.log("LineChart2: setDatasetFill called", value);
			var fillVal = (value === 'true' || value === true);
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[0].fill = fillVal;
				this.chart.update();
			} else {
				this.pendingData.dataset.fill = fillVal;
			}
		},

		// --- Dataset 2 Setters ---
		setDataset2Label: function (value) {
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[1].label = value;
				this.chart.update();
			} else {
				this.pendingData.dataset2.label = value;
			}
		},

		setDataset2Data: function (value) {
			var dataToParse = value;
			if (typeof value === 'string') {
				if (value.trim().charAt(0) !== '[') {
					dataToParse = "[" + value + "]";
				}
				try {
					var data = JSON.parse(dataToParse);
					if (Array.isArray(data)) {
						if (this.chart) {
							this._ensureDataset();
							this.chart.data.datasets[1].data = data;
							this.chart.update();
						} else {
							this.pendingData.dataset2.data = data;
						}
					}
				} catch (e) { console.error("Invalid Data2 JSON:", e); }
			} else if (Array.isArray(value)) {
				if (this.chart) {
					this._ensureDataset();
					this.chart.data.datasets[1].data = value;
					this.chart.update();
				} else {
					this.pendingData.dataset2.data = value;
				}
			}
		},

		setDataset2BorderColor: function (value) {
			if (this.chart) {
				this._ensureDataset();
				this.chart.data.datasets[1].borderColor = value;
				this.chart.update();
			} else {
				this.pendingData.dataset2.borderColor = value;
			}
		},

		// --- Axis Options ---
		setShowAxis2: function (value) {
			var show = (value === 'true' || value === true);
			if (this.chart) {
				if (this.chart.options.scales['y-axis-2']) {
					this.chart.options.scales['y-axis-2'].display = show;
					this.chart.update();
				}
			} else {
				this.pendingData.params.showAxis2 = show;
			}
		},

		setAxis1Label: function (value) {
			if (this.chart) {
				if (this.chart.options.scales['y-axis-1']) {
					this.chart.options.scales['y-axis-1'].title = { display: !!value, text: value };
					this.chart.update();
				}
			} else {
				this.pendingData.params.axis1Label = value;
			}
		},

		setAxis2Label: function (value) {
			if (this.chart) {
				if (this.chart.options.scales['y-axis-2']) {
					this.chart.options.scales['y-axis-2'].title = { display: !!value, text: value };
					this.chart.update();
				}
			} else {
				this.pendingData.params.axis2Label = value;
			}
		},

		// --- Limit Lines ---
		setLimit1Value: function (value) {
			var val = parseFloat(value);
			this.limit1 = isNaN(val) ? null : val;
			if (this.chart) this.chart.update();
			else this.pendingData.params.limit1 = this.limit1;
		},

		setLimit2Value: function (value) {
			var val = parseFloat(value);
			this.limit2 = isNaN(val) ? null : val;
			if (this.chart) this.chart.update();
			else this.pendingData.params.limit2 = this.limit2;
		}

	};
}());
