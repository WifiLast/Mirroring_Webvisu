var TableElementWrapper;

(function () {
	/* HTML5 control wrapper for Grid.js Table */
	TableElementWrapper = function (idGenerator) {
		console.log("TableElementWrapper v1.6 - Debug Row Coloring");
		this.domNode = document.createElement("div");
		this.domNode.className = "table-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.overflow = "hidden";
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

		// Add CSS styles for alarm row coloring
		var style = document.createElement('style');
		style.textContent = `
		/* Make entire table transparent */
		.gridjs-wrapper,
		.gridjs-container,
		.gridjs-table,
		.gridjs-tbody,
		.gridjs-td {
			background-color: transparent !important;
		}
		.gridjs-container {
			height: 100% !important;
			display: flex !important;
			flex-direction: column !important;
		}
		.gridjs-tr {
			background-color: transparent !important;
		}
		.gridjs-tr.alarm-error {
			background-color: rgba(255, 0, 0, 0.6) !important;
		}
		.gridjs-tr.alarm-error:hover {
			background-color: rgba(255, 0, 0, 1.0) !important;
		}
		.gridjs-tr.alarm-warning {
			background-color: rgba(247, 255, 33, 0.6) !important;
		}
		.gridjs-tr.alarm-warning:hover {
			background-color: rgba(247, 255, 33, 1.0) !important;
		}
		.gridjs-tr.alarm-notice {
			background-color: rgba(255, 255, 255, 0.8) !important;
		}
		.gridjs-tr.alarm-notice:hover {
			background-color: rgba(255, 255, 255, 1.0) !important;
		}
	/* Header styling */
	.gridjs-wrapper {
		position: relative !important;
		overflow: auto !important;
		height: 100% !important;
		display: block !important;
		flex: 1 !important;
	}
	.gridjs-thead {
		position: sticky !important;
		top: 0 !important;
		z-index: 100 !important;
		display: table-header-group !important;
	}
	.gridjs-thead,
	.gridjs-th {
		background-color: #62D0F8 !important;
		color: #ffffff !important;
		font-size: 1em !important;
		font-weight: bold !important;
		border-radius: 0 !important;
	}
	.gridjs-td {
		padding: 16px 12px !important;
	}
	`;
		document.head.appendChild(style);

		var self = this;
		this.grid = null;

		// Change detection for setAlarms to prevent unnecessary re-renders
		this._lastData = null;
		this._updateCount = 0;
		this._skipCount = 0;

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
			loadCSS('TableStyles5.css');
			loadCSS('tailwind-ui.min6.css');
		},

		// Apply alarm row coloring based on AlarmType in data
		_applyRowColoring: function () {
			var self = this;
			console.log("_applyRowColoring: Starting...");
			setTimeout(function () {
				console.log("_applyRowColoring: Timeout fired");
				var rows = self.domNode.querySelectorAll('.gridjs-tr');
				console.log("_applyRowColoring: Found", rows.length, "rows");

				if (self.grid && self.grid.config && self.grid.config.data) {
					console.log("_applyRowColoring: Grid data length:", self.grid.config.data.length);
					console.log("_applyRowColoring: Sample data[0]:", JSON.stringify(self.grid.config.data[0]));
				} else {
					console.warn("_applyRowColoring: Grid or grid.config.data is null!");
				}

				var rowIndex = 0;
				rows.forEach(function (row) {
					// Get the corresponding data entry
					if (self.grid && self.grid.config && self.grid.config.data && self.grid.config.data[rowIndex]) {
						var entry = self.grid.config.data[rowIndex];
						var alarmType = entry.AlarmType || 'NOTICE';

						console.log("_applyRowColoring: Row", rowIndex, "AlarmType:", alarmType, "Entry:", JSON.stringify(entry));

						// Remove existing alarm classes
						row.classList.remove('alarm-error', 'alarm-warning', 'alarm-notice');

						// Add appropriate class
						if (alarmType === 'ERROR') {
							row.classList.add('alarm-error');
							console.log("_applyRowColoring: ✓ Added alarm-error to row", rowIndex);
						} else if (alarmType === 'WARNING') {
							row.classList.add('alarm-warning');
							console.log("_applyRowColoring: ✓ Added alarm-warning to row", rowIndex);
						} else if (alarmType === 'NOTICE') {
							row.classList.add('alarm-notice');
							console.log("_applyRowColoring: ✓ Added alarm-notice to row", rowIndex);
						}

						// Verify class was added
						console.log("_applyRowColoring: Row", rowIndex, "classes:", row.className);
					} else {
						console.warn("_applyRowColoring: No data for row", rowIndex);
					}
					rowIndex++;
				});
				console.log("_applyRowColoring: Completed");
			}, 200); // Increased delay to ensure Grid.js has rendered
		},

		initTable: function () {
			if (typeof gridjs === 'undefined') {
				this.domNode.innerHTML = "Grid.js library not loaded!";
				return;
			}

			var config = {
				columns: [],
				data: [
				],
				search: false,
				sort: true,
				pagination: false,
				fixedHeader: true,
				height: '100%',
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
					// Initialize _lastData with the initial data
					this._lastData = JSON.stringify(alarmCfg.data);
				}
			}

			this.grid = new gridjs.Grid(config).render(this.domNode);

			// Apply row coloring after initial render
			this._applyRowColoring();

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

		_parseCodesysDT: function (dtStr) {
			try {
				if (typeof dtStr !== 'string') return String(dtStr || "");
				// Matches DT#yyyy-M-d-H:m:s
				// Example: DT#2018-6-6-10:24:54
				var match = dtStr.match(/DT#(\d+)-(\d+)-(\d+)-(\d+):(\d+):(\d+)/);
				if (match) {
					var year = match[1];
					var month = match[2].padStart(2, '0');
					var day = match[3].padStart(2, '0');
					var hour = match[4].padStart(2, '0');
					var minute = match[5].padStart(2, '0');
					var second = match[6].padStart(2, '0');
					return year + "-" + month + "-" + day + " " + hour + ":" + minute + ":" + second;
				}
				return dtStr;
			} catch (e) {
				return String(dtStr || "");
			}
		},

		_processAlarms: function (value) {
			var self = this;
			var entries = [];
			try {
				var raw = value;
				if (typeof raw === 'string' && raw.trim() !== "") raw = JSON.parse(raw);

				// Robust extraction
				if (raw && Array.isArray(raw.ALARMS)) entries = raw.ALARMS;
				else if (Array.isArray(raw)) entries = raw;

				if (raw && Array.isArray(raw.ALARMS)) entries = raw.ALARMS;
				else if (Array.isArray(raw)) entries = raw;

				// CRITICAL FIX: Check if we have a nested array (Array of Array of Arrays)
				// If entries[0] is an array, and that array's length is > 5 (likely the whole list), unwrap it.
				if (entries.length === 1 && Array.isArray(entries[0]) && entries[0].length > 5) {
					entries = entries[0];
				}

			} catch (e) {
				console.error("TableElementWrapper._processAlarms: Error parsing", e);
				return null;
			}

			// Map data
			entries = entries.map(function (e) {
				// Handle Tuple: [Description, ID, EquipID, Value, Timestamp, AlarmType]
				if (Array.isArray(e) && e.length >= 2) {
					var mapped = {
						TIMESTAMP: self._parseCodesysDT(e[4]),
						ID: e[1],
						EQUIP_ID: e[2],
						Description: e[0],
						AlarmType: e[5] || 'NOTICE'
					};
					// console.log("_processAlarms: Mapped entry:", JSON.stringify(mapped));
					return mapped;
				}
				return e;
			});

			entries = entries.filter(function (e) { return e && e.ID; });

			return {
				columns: [
					{ name: "Time Stamp", id: "TIMESTAMP" },
					{ name: "Plant Nr.", id: "ID" },
					{ name: "Equipment ID", id: "EQUIP_ID" },
					{ name: "Description", id: "Description", width: "70%" }
				],
				data: entries
			};
		},

		setAlarms: function (value) {
			console.log("=== setAlarms CALLED (Call #" + (this._updateCount + this._skipCount + 1) + ") ===");
			console.log("setAlarms: Input type:", typeof value, "| IsArray:", Array.isArray(value));

			// Processing first to extract the actual data
			var cfg = this._processAlarms(value);
			if (!cfg) {
				console.warn("setAlarms: Invalid configuration generated.");
				return;
			}

			console.log("setAlarms: Processed data length:", cfg.data.length);

			// Change Detection on the PROCESSED data
			// This ignores any outer wrapper changes/timestamps from the PLC that don't affect content
			var dataStr = JSON.stringify(cfg.data);
			var dataHash = dataStr.substring(0, 150); // First 150 chars for debugging

			console.log("setAlarms: Current data hash:", dataHash);
			console.log("setAlarms: Last data exists?", this._lastData !== null, "| Length:", this._lastData ? this._lastData.length : 0);

			if (this._lastData !== null) {
				var lastHash = this._lastData.substring(0, 150);
				console.log("setAlarms: Last data hash:", lastHash);
				console.log("setAlarms: Hashes equal?", dataHash === lastHash);
				console.log("setAlarms: Full strings equal?", this._lastData === dataStr);
			}

			if (this._lastData === dataStr) {
				this._skipCount++;
				console.log("✓ setAlarms: Data UNCHANGED, skipping update. (Skip count: " + this._skipCount + ")");
				return;
			}

			this._updateCount++;
			console.log("✗ setAlarms: Data CHANGED, will update table. (Update count: " + this._updateCount + ")");
			this._lastData = dataStr;

			// Debounce mechanism to prevent rapid successive updates
			var self = this;
			if (this._updateTimeout) {
				console.log("setAlarms: Cancelling previous timeout");
				clearTimeout(this._updateTimeout);
			}

			this._updateTimeout = setTimeout(function () {
				console.log("setAlarms: Debounce timeout fired, updating grid...");
				self._updateTimeout = null;

				if (self.grid) {
					self.grid.updateConfig({
						columns: cfg.columns,
						data: cfg.data
					}).forceRender();
					console.log("setAlarms: Grid updated successfully with", cfg.data.length, "entries");

					// Apply row coloring after update
					self._applyRowColoring();
				} else {
					console.log("setAlarms: Grid not ready, buffering data.");
					self.pendingData.alarms = value;
				}
			}, 100); // 100ms debounce
		}
	};

	// Explicit export
	window.TableElementWrapper = TableElementWrapper;
}());