// ExtendScript — runs inside After Effects' JS engine (ES5).
// Called via CSInterface.evalScript() from the panel.

/**
 * Returns active composition and selected layer context as a JSON string.
 * The panel passes this as `context` to the Jasper generation request so the
 * AI knows whether it's writing for a lower-third, title card, etc.
 */
function getLayerContext() {
    var result = {
        compName: '',
        layerName: '',
        layerType: 'none',
        hasTextSelection: false
    };
    try {
        var item = app.project.activeItem;
        if (item && (item instanceof CompItem)) {
            result.compName = item.name;
            var selected = item.selectedLayers;
            if (selected.length > 0) {
                var layer = selected[0];
                result.layerName = layer.name;
                if (layer instanceof TextLayer) {
                    result.layerType = 'text';
                    result.hasTextSelection = true;
                } else {
                    result.layerType = 'other';
                }
            }
        }
    } catch (e) {}
    return JSON.stringify(result);
}

/**
 * Inserts `text` into After Effects.
 * - If a text layer is selected: updates its Source Text, preserving existing
 *   font, size, and style properties.
 * - Otherwise: creates a new text layer named "Jasper Copy".
 *
 * The entire operation is wrapped in an undo group so the artist can ⌘Z it.
 * Returns JSON: { success: true } | { success: false, error: "..." }
 */
function insertText(text) {
    try {
        var comp = app.project.activeItem;
        if (!comp || !(comp instanceof CompItem)) {
            return JSON.stringify({
                success: false,
                error: 'No active composition. Open a comp and try again.'
            });
        }

        app.beginUndoGroup('Jasper: Insert Text');

        var selected = comp.selectedLayers;
        if (selected.length > 0 && (selected[0] instanceof TextLayer)) {
            var prop = selected[0].property('Source Text');
            var doc = prop.value;
            doc.text = text;
            prop.setValue(doc);
        } else {
            var newLayer = comp.layers.addText(text);
            newLayer.name = 'Jasper Copy';
        }

        app.endUndoGroup();
        return JSON.stringify({ success: true });
    } catch (e) {
        return JSON.stringify({ success: false, error: e.toString() });
    }
}
