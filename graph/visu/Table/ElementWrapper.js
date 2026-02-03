var TableElementWrapper;

(function () {
	/* HTML5 control wrapper for Grid.js Table */
	TableElementWrapper = function (idGenerator) {
		console.log("TableElementWrapper v1.1 - Indexed Resources");
		this.domNode = document.createElement("div");
		this.domNode.className = "table-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.overflow = "auto";
		// User requested font-style
		this.domNode.style.fontFamily = 'system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"';
		this.domNode.style.color = "#333333"; // Ensure text is visible

		// Use robust ID generation just in case, but follow template flow
		var elementId = "grid_" + new Date().getTime();
		try {
			if (idGenerator) {
				if (typeof idGenerator.getId === 'function') elementId = "grid_" + idGenerator.getId();
				else if (typeof idGenerator.GetId === 'function') elementId = "grid_" + idGenerator.GetId();
				else if (typeof idGenerator === 'string') elementId = idGenerator;
			}
		} catch (e) { console.warn("ID Gen Error", e); }
		this.domNode.id = elementId;

		document.body.appendChild(this.domNode);

		var self = this;
		this.grid = null;

		// Buffer object to hold data arriving before init
		this.pendingData = {
			columns: null,
			data: null,
			style: "display",
			opacity: 1.0,
			alarms: null
		};

		// Helper to load resources
		this.loadResources(function () {
			self.initTable();
		});
	};

	TableElementWrapper.prototype = {
		loadResources: function (callback) {
			var head = document.getElementsByTagName('head')[0];

			// Determine base path from script src
			var basePath = "";
			var scripts = document.getElementsByTagName('script');
			for (var i = 0; i < scripts.length; i++) {
				// Looser check for ElementWrapper to handle renaming (e.g. ElementWrapper2.js)
				if (scripts[i].src && scripts[i].src.indexOf('ElementWrapper') !== -1) {
					var src = scripts[i].src;
					basePath = src.substring(0, src.lastIndexOf('/') + 1);
					break;
				}
			}

			function loadCSS(href) {
				var fullHref = basePath + href;
				if (document.querySelector('link[href="' + fullHref + '"]')) return;
				var link = document.createElement('link');
				link.rel = 'stylesheet';
				link.type = 'text/css';
				link.href = fullHref;
				head.appendChild(link);
			}
			function loadJS(src, onLoad) {
				if (typeof gridjs !== 'undefined') { onLoad(); return; }
				var script = document.createElement('script');
				script.src = basePath + src;
				script.onload = onLoad;
				head.appendChild(script);
			}

			// Resources are renamed by Codesys with their index in XML
			loadCSS('mermaid.min4.css');
			loadJS('gridjs.umd3.js', callback);
			// TableStyles.css is index 5 -> TableStyles5.css
			loadCSS('TableStyles5.css');
			loadCSS('tailwind-ui.min6.css');
		},

		initTable: function () {
			if (typeof gridjs === 'undefined') {
				this.domNode.innerHTML = "Grid.js library not loaded!";
				return;
			}

			var config = {
				columns: ["No Data"],
				data: [],
				search: true,
				sort: true,
				pagination: true,
				resizable: true,
				className: {
					table: this.pendingData.style || 'display'
				}
			};

			// Apply pending data
			if (this.pendingData.columns) config.columns = this.pendingData.columns;
			if (this.pendingData.data) config.data = this.pendingData.data;

			// Alarms take precedence if present
			if (this.pendingData.alarms) {
				var alarmCfg = this._processAlarms(this.pendingData.alarms);
				if (alarmCfg) {
					config.columns = alarmCfg.columns;
					config.data = alarmCfg.data;
				}
			}

			this.grid = new gridjs.Grid(config).render(this.domNode);

			// Apply Opacity
			this.setOpacity(this.pendingData.opacity);

			this.pendingData = null;
		},

		setText: function (value) { },
		setColor: function (value) { },
		setFont: function (value, type, typeid) { },

		setInputLabels: function (value) {
			try {
				var columns = typeof value === 'string' ? JSON.parse(value) : value;
				if (this.grid) {
					this.grid.updateConfig({ columns: columns }).forceRender();
				} else {
					this.pendingData.columns = columns;
				}
			} catch (e) { console.error("Invalid InputLabels:", e); }
		},

		setDatasetLabel: function (value) { },

		setDatasetData: function (value) {
			try {
				var data = typeof value === 'string' ? JSON.parse(value) : value;
				if (this.grid) {
					this.grid.updateConfig({ data: data }).forceRender();
				} else {
					this.pendingData.data = data;
				}
			} catch (e) { console.error("Invalid DatasetData:", e); }
		},

		setDatasetBorderColor: function (value) { },
		setDatasetFill: function (value) { },
		setNumberOfData: function (value) { },

		// Custom Methods
		setTableStyle: function (value) {
			if (this.grid) {
				this.grid.updateConfig({ className: { table: value } }).forceRender();
			} else {
				this.pendingData.style = value;
			}
		},

		setOpacity: function (value) {
			var op = parseFloat(value);
			if (isNaN(op)) return;
			if (op > 1) op = op / 100.0;
			if (op > 1) op = 1; else if (op < 0) op = 0;

			this.domNode.style.opacity = op;
			if (!this.grid) this.pendingData.opacity = op;
		},

		_processAlarms: function (value) {
			console.log("TableElementWrapper._processAlarms: Processing value", value);
			var entries = [];
			try {
				var raw = value;
				if (typeof raw === 'string' && raw.trim() !== "") raw = JSON.parse(raw);
				if (raw && Array.isArray(raw.ALARMS)) entries = raw.ALARMS;
				else if (Array.isArray(raw)) entries = raw;
				console.log("TableElementWrapper._processAlarms: Extracted entries", entries);
			} catch (e) {
				console.error("TableElementWrapper._processAlarms: Error parsing", e);
				return null;
			}

			entries = entries.filter(function (e) { return e.ID; });
			console.log("TableElementWrapper._processAlarms: Filtered entries", entries);

			return {
				columns: [
					{ name: "Description", id: "Description" },
					{ name: "ID", id: "ID" },
					{ name: "Equip ID", id: "EQUIP_ID" },
					{ name: "Value", id: "Value" },
					{ name: "Timestamp", id: "TIMESTAMP" }
				],
				data: entries
			};
		},

		setAlarms: function (value) {
			console.log("TableElementWrapper.setAlarms called with:", value);
			var cfg = this._processAlarms(value);
			if (!cfg) {
				console.warn("TableElementWrapper.setAlarms: Invalid configuration generated.");
				return;
			}

			if (this.grid) {
				this.grid.updateConfig({
					columns: cfg.columns,
					data: cfg.data
				}).forceRender();
			} else {
				console.log("TableElementWrapper.setAlarms: Grid not ready, buffering data.");
				this.pendingData.alarms = value;
			}
		}
	};

	// Explicit export
	window.TableElementWrapper = TableElementWrapper;
}());