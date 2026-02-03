var TableElementWrapper;

(function () {
	/* HTML5 control wrapper for DataTables */
	TableElementWrapper = function (idGenerator) {
		this.domNode = document.createElement("div");
		this.domNode.className = "table-container";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.position = "relative";
		this.domNode.style.overflow = "hidden"; // DataTables handles scrolling usually

		// Create table element
		this.tableNode = document.createElement("table");
		this.tableNode.id = "table_" + idGenerator.getId(); // Unique ID
		this.tableNode.className = "display";
		this.tableNode.style.width = "100%";
		this.domNode.appendChild(this.tableNode);

		document.body.appendChild(this.domNode);

		var self = this;
		this.table = null;

		// Buffer object to hold data arriving before lib init
		this.pendingData = {
			columns: null,
			data: null
		};

		// Determine path to current script to load siblings
		var scriptPath = "";
		try {
			// Attempt to find the script path for this control
			// This is a heuristic; might need adjustment based on Codesys generic loading
			// Often scripts are loaded via XHR or injected. 
			// If injected, document.currentScript might not work reliably or point to something else.
			// We'll try a relative path first.
			scriptPath = "";
		} catch (e) { }

		this.loadResources(function () {
			self.initTable();
		});
	};

	TableElementWrapper.prototype = {
		loadResources: function (callback) {
			var self = this;
			var head = document.getElementsByTagName('head')[0];

			// Helper to load CSS
			function loadCSS(href) {
				if (document.querySelector('link[href="' + href + '"]')) return;
				var link = document.createElement('link');
				link.rel = 'stylesheet';
				link.type = 'text/css';
				link.href = href;
				head.appendChild(link);
			}

			// Helper to load JS
			function loadJS(src, onLoad) {
				var script = document.createElement('script');
				script.type = 'text/javascript';
				script.src = src;
				script.onload = onLoad;
				script.onerror = function () { console.error("Failed to load script: " + src); };
				head.appendChild(script);
			}

			loadCSS('dataTables.dataTables.min.css');

			// Function to load DataTables after jQuery is ready
			var loadDataTables = function () {
				if (typeof DataTable === 'undefined' && typeof $.fn.DataTable === 'undefined') {
					loadJS('dataTables.js', callback);
				} else {
					callback();
				}
			};

			// Load jQuery if not present
			if (typeof jQuery === 'undefined') {
				loadJS('jquery.min.js', loadDataTables);
			} else {
				loadDataTables();
			}
		},

		initTable: function () {
			if (typeof DataTable === 'undefined') {
				this.domNode.innerHTML = "DataTables library not loaded!";
				return;
			}

			var options = {
				// Default options
				responsive: true,
				destroy: true, // Allow re-initialization
				data: [],
				columns: [{ title: "No Data" }] // Placeholder
			};

			// Apply pending columns if available
			if (this.pendingData.columns) {
				options.columns = this.pendingData.columns;
			}

			// Apply pending data if available
			if (this.pendingData.data) {
				options.data = this.pendingData.data;
			}

			// Apply pending style if available (default to 'display')
			if (this.pendingData.style) {
				this.tableNode.className = this.pendingData.style;
			} else if (!this.tableNode.className) {
				this.tableNode.className = "display";
			}

			this.table = new DataTable(this.tableNode, options);

			this.pendingData = null;
		},

		setTableStyle: function (value) {
			// value e.g. "display compact cell-border"
			if (this.tableNode) {
				this.tableNode.className = value;
			}
			// If table exists, style change usually applies immediately via CSS class
			// No need to re-draw usually, unless sizing changes significantly? 
			// DataTables might calculate widths, so a redraw is safer.
			if (this.table) {
				this.table.columns.adjust().draw();
			} else {
				if (!this.pendingData) this.pendingData = {};
				this.pendingData.style = value;
			}
		},

		setAlarms: function (value) {
			console.log("Table: setAlarms called");
			var entries = [];

			try {
				// Handle JSON string or Object
				if (typeof value === 'string') {
					if (value.trim() === "") return;
					value = JSON.parse(value);
				}

				// Extract array from STRUCT { ALARMS: [...] }
				if (value && Array.isArray(value.ALARMS)) {
					entries = value.ALARMS;
				} else if (Array.isArray(value)) {
					entries = value;
				} else {
					console.warn("Table: setAlarms expected object with ALARMS array or array.");
					return;
				}
			} catch (e) {
				console.error("Invalid Alarms Data:", e);
				return;
			}

			// Define Columns for Alarms
			var columns = [
				{ title: "Description", data: "Description", defaultContent: "" },
				{ title: "ID", data: "ID", defaultContent: "" },
				{ title: "Equip ID", data: "EQUIP_ID", defaultContent: "" },
				{ title: "Value", data: "Value", defaultContent: false },
				{ title: "Timestamp", data: "TIMESTAMP", defaultContent: "" }
			];

			// Filter out empty entries if needed? 
			// CODESYS arrays are fixed size, so we might have many empty entries.
			// Check if ID is empty or Description is empty to filter
			entries = entries.filter(function (e) {
				return e.ID !== "" && e.ID !== null && e.ID !== undefined;
			});

			if (this.table) {
				var currentData = this.table.data().toArray();
				// We need to re-init to change columns if they were different
				// Since we are switching to Alarms mode, we enforce Alarms columns.
				this.table.destroy();
				this.tableNode.innerHTML = "";

				this.table = new DataTable(this.tableNode, {
					data: entries,
					columns: columns,
					destroy: true
				});
			} else {
				if (!this.pendingData) this.pendingData = {};
				this.pendingData.data = entries;
				this.pendingData.columns = columns;
			}
		},

		setOpacity: function (value) {
			// value can be number (0-1) or string "0.5" or "50" depending on Codesys mapping
			// Assuming 0.0 to 1.0
			var op = parseFloat(value);
			if (!isNaN(op)) {
				// Determine if user sends 0-100 or 0-1. Usually Opacity property is 0-255 or 0-100 in Visu?
				// Standard HTML5 control opacity is 0-1.
				// If value > 1, assume 0-100 or 0-255. 
				// Let's assume 0-1 for now, but handle > 1 by dividing.
				if (op > 1) op = op / 100.0;
				if (op > 1) op = 1; // Cap at 1
				if (op < 0) op = 0;

				this.domNode.style.opacity = op;
			}
		},

		// Map 'InputLabels' property to Columns
		// Expected format: ["Col1", "Col2"] or JSON string
		setInputLabels: function (value) {
			console.log("Table: setInputLabels called", value);
			var columns = [];
			try {
				if (typeof value === 'string') {
					if (value.trim().startsWith('[')) {
						var parsed = JSON.parse(value);
						// Convert ["Name", "Age"] to [{title:"Name"}, {title:"Age"}]
						columns = parsed.map(function (c) {
							return (typeof c === 'string') ? { title: c } : c;
						});
					} else {
						// Comma separated
						columns = value.split(',').map(function (c) { return { title: c.trim() }; });
					}
				}
			} catch (e) {
				console.error("Invalid Columns Data:", e);
				return;
			}

			if (this.table) {
				// DataTables doesn't support changing columns easily on the fly without destroy
				// We will re-init or just ignore if structure changes significantly,
				// But normally we destroy and recreate for structure alignment.
				// However, destroying loses state.
				// For now, let's assume columns are set once or trigger full reload.

				// If we must update columns, we often need to destroy and re-init.
				// We'll store current data, destroy, and re-init.
				var currentData = this.table.data().toArray();
				this.table.destroy();
				this.tableNode.innerHTML = ""; // Clear header/body

				this.table = new DataTable(this.tableNode, {
					columns: columns,
					data: currentData,
					destroy: true
				});
			} else {
				if (!this.pendingData) this.pendingData = {};
				this.pendingData.columns = columns;
			}
		},

		// Map 'data' (setDatasetData) property to Table Data
		// Expected format: [[val1, val2], [val3, val4]] or JSON string
		setDatasetData: function (value) {
			// console.log("Table: setDatasetData called");
			var data = [];

			try {
				// Handle JSON string
				if (typeof value === 'string') {
					var trimmed = value.trim();
					if (trimmed === "") {
						data = [];
					} else {
						if (!trimmed.startsWith('[')) {
							// Maybe comma separated list? Unlikely for 2D table.
							// Treat as single row? Or error.
							console.warn("Table: Data string should be JSON Array of Arrays.");
							return;
						}
						data = JSON.parse(trimmed);
					}
				} else if (Array.isArray(value)) {
					data = value;
				}
			} catch (e) {
				console.error("Invalid Table Data JSON:", e);
				return;
			}

			if (this.table) {
				this.table.clear();
				this.table.rows.add(data);
				this.table.draw();
			} else {
				this.pendingData.data = data;
			}
		},

		// Keep other methods as stubs or map them if applicable
		setText: function (value) {
			// Could be table caption or title
		},
		setColor: function (value) { },
		setFont: function (value, type, typeid) { },
		setDatasetLabel: function (value) { },
		setDatasetBorderColor: function (value) { },
		setDatasetFill: function (value) { },
		setNumberOfData: function (value) { }
	};

	// Explicitly export to window to ensure global availability
	window.TableElementWrapper = TableElementWrapper;
	console.log("TableElementWrapper module loaded.");
}());