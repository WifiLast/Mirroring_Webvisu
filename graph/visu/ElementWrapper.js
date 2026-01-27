var LineChartElementWrapper;

(function () {
	/* HTML5 control wrapper for Chart.js Line Chart */
	LineChartElementWrapper = function (idGenerator) {
		this.domNode = document.createElement("div");
		this.domNode.className = "line-chart-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative"; // Important for Chart.js responsiveness

		// Create canvas for Chart.js
		this.canvasFrom = document.createElement("canvas");
		this.domNode.appendChild(this.canvasFrom);

		document.body.appendChild(this.domNode);

		var self = this;
		this.chart = null;

		// Initialize chart after a short delay to ensure DOM is ready and size is calculated
		setTimeout(function () {
			self.initChart();
		}, 100);
	};

	LineChartElementWrapper.prototype = {
		initChart: function () {
			if (typeof Chart === 'undefined') {
				this.domNode.innerHTML = "Chart.js library not loaded!";
				return;
			}

			var ctx = this.canvasFrom.getContext('2d');
			this.chart = new Chart(ctx, {
				type: 'line',
				data: {
					labels: ['January', 'February', 'March', 'April', 'May', 'June', 'July'],
					datasets: [{
						label: 'Demo Data',
						data: [65, 59, 80, 81, 56, 55, 40],
						fill: false,
						borderColor: 'rgb(75, 192, 192)',
						tension: 0.1
					}]
				},
				options: {
					responsive: true,
					maintainAspectRatio: false
				}
			});
		},

		// Keep existing property helpers if needed, or simply ignore them for now.
		// We can add methods to update data later.
		setText: function (value) {
			// Example: Update chart title or something
			if (this.chart && this.chart.options.plugins.title) {
				this.chart.options.plugins.title.text = value;
				this.chart.update();
			}
		},

		setColor: function (value) {
			// Example: Change border color
		},

		setFont: function (value, type, typeid) {
			// Example: Change font
		},

		setInputLabels: function (value) {
			if (!this.chart) return;
			try {
				// Determine if value is JSON string or array, though type is string in XML
				var labels = JSON.parse(value);
				if (Array.isArray(labels)) {
					this.chart.data.labels = labels;
					this.chart.update();
				}
			} catch (e) {
				console.error("Invalid Labels JSON:", e);
			}
		},

		setDatasets: function (value) {
			if (!this.chart) return;
			try {
				// Expecting value to be an array of dataset objects or a single dataset object inside a JSON string
				var datasets = JSON.parse(value);
				if (Array.isArray(datasets)) {
					this.chart.data.datasets = datasets;
					this.chart.update();
				}
			} catch (e) {
				console.error("Invalid Datasets JSON:", e);
			}
		}
	};
}());