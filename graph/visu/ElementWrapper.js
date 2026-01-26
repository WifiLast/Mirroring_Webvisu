var HTML5DemoButtonElementWrapper;

(function ()
{
	/* This HTML5 demo button control is used to demonstrate how the input configuration can be used in a HTML5 control.
	* When the input configuration is used in a HTML5 control than mouse events can be sent to IEC and the configured
	* input actions OnMouseDown, OnMouseUp and OnMouseMove can be executed.*/
	HTML5DemoButtonElementWrapper = function(idGenerator)
	{
        this.domNode = document.createElement("div");
		this.domNode.className = "button";
		this.domNode.style.width = "100%";
		this.domNode.style.height = "100%";
		this.domNode.style.overflow = "visible";
		
		document.body.appendChild(this.domNode);
		var self = this;
		this.domNode.onmousedown = function(event) {
			self.sendMouseEvent(event);
		}
		this.domNode.onmousemove = function(event) {
			self.sendMouseEvent(event);
		}
		this.domNode.onmouseup = function(event) {
			self.sendMouseEvent(event);
		}
	};
		
	HTML5DemoButtonElementWrapper.prototype =
	{
		sendMouseEvent: function(event)
		{
			window.CDSWebVisuAccess.sendMouseEvent(event);
		},
		
		setText: function(value)
		{
			this.domNode.innerHTML = value;
		},
		
		setColor: function(value)
		{
			this.domNode.style.backgroundColor = value;
		},
		
		setFont: function(value, type, typeid)
		{
			this.domNode.style.font = value.Font;
		}
	};
}());