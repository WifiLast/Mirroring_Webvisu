(function (global) {
    if (global.cdnFallbacks) {
        return;
    }

    function appendScript(src, type) {
        var script = document.createElement('script');
        if (type) {
            script.type = type;
        }
        script.src = src;
        (document.head || document.getElementsByTagName('head')[0]).appendChild(script);
        return script;
    }

    var modelViewerFallbackLoaded = false;
    var modelViewerCheckScheduled = false;

    function loadModelViewerFallback() {
        if (modelViewerFallbackLoaded) {
            return;
        }
        modelViewerFallbackLoaded = true;
        appendScript('/js/model-viewer.min.js', 'module');
    }

    function ensureModelViewerDefined() {
        if (!global.customElements || !global.customElements.get) {
            return;
        }
        if (!global.customElements.get('model-viewer')) {
            loadModelViewerFallback();
        }
    }

    var modelFallbacks = Object.create(null);

    function registerModelFallback(remoteSrc, localSrc) {
        if (!remoteSrc || !localSrc) {
            return;
        }
        modelFallbacks[remoteSrc] = localSrc;
    }

    function handleModelViewerError(event) {
        var target = event && event.target;
        if (!target || !target.tagName || target.tagName.toUpperCase() !== 'MODEL-VIEWER') {
            return;
        }
        var currentSrc = target.getAttribute('src') || target.src || '';
        var fallbackSrc = modelFallbacks[currentSrc];
        if (!fallbackSrc || currentSrc === fallbackSrc) {
            return;
        }
        target.setAttribute('src', fallbackSrc);
    }

    document.addEventListener('error', handleModelViewerError, true);

    global.cdnFallbacks = {
        modelViewerFallback: loadModelViewerFallback,
        scheduleModelViewerCheck: function () {
            if (modelViewerCheckScheduled) {
                return;
            }
            modelViewerCheckScheduled = true;

            var runCheck = function () {
                ensureModelViewerDefined();
            };

            if (document.readyState === 'complete' || document.readyState === 'interactive') {
                runCheck();
            } else {
                document.addEventListener('DOMContentLoaded', runCheck);
            }
        },
        registerModelFallback: registerModelFallback
    };
})(window);
