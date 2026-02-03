# HTML5 Control Integration Rules for Codesys

This document outlines critical rules and behaviors observed when creating HTML5 controls for Codesys WebVisu.

## 1. File Structure & XML Definition
*   **Template Alignment**: It is highly recommended to strictly follow the structure of an existing working control (e.g., `Chart`).
*   **XML Definition**: The `ElementDescription.html5control.xml` defines the control's properties and the list of files to be deployed.
*   **File List Order**: The order of files in the `<Files>` section of the XML is critical. Codesys uses this order for renaming files upon deployment.

## 2. File Renaming on Deployment (CRITICAL)
Codesys renames deployed files by appending their **1-based index** from the XML file list to the filename, *before* the file extension (or specific part of it).

**Example:**
If `ElementDescription.html5control.xml` lists:
1. `ButtonStyle.css`
2. `ElementWrapper.js`
3. `gridjs.umd.js`
4. `mermaid.min.css`

**Deployed filenames will be:**
*   `ButtonStyle.css` -> `ButtonStyle1.css`
*   `ElementWrapper.js` -> `ElementWrapper2.js`
*   `gridjs.umd.js` -> `gridjs.umd3.js`
*   `mermaid.min.css` -> `mermaid.min4.css`

**Impact**: Your JavaScript code MUST load these *renamed* files, not the original filenames.

## 3. Resource Loading & Path Detection
*   **Relative Paths**: Resources are not loaded from the root. You must calculate the base path relative to your main script.
*   **Script Detection**: Since `ElementWrapper.js` itself gets renamed (e.g., to `ElementWrapper2.js`), you cannot search for it by exact name.
    *   **Rule**: Search for the script tag containing the substring `ElementWrapper` to find the correct `src` attribute.
    *   **Base Path**: Extract the directory path from this `src` to load other resources.

**Code Example:**
```javascript
var basePath = "";
var scripts = document.getElementsByTagName('script');
for (var i = 0; i < scripts.length; i++) {
    // Looser check to handle ElementWrapper2.js, etc.
    if (scripts[i].src && scripts[i].src.indexOf('ElementWrapper') !== -1) {
        var src = scripts[i].src;
        basePath = src.substring(0, src.lastIndexOf('/') + 1);
        break;
    }
}
// Load resources using base path + INDEXED filename
loadCSS(basePath + 'mermaid.min4.css'); // Index 4 in XML
loadJS(basePath + 'gridjs.umd3.js');    // Index 3 in XML
```

## 4. Wrapper Class Structure
*   **Global Export**: The wrapper class MUST be exported to the `window` object.
*   **Constructor**: 
    *   Accepts `idGenerator`.
    *   Should handle `idGenerator` robustly (check for `.getId()`, `.GetId()`, or string).
*   **Prototype Methods**: Must implement exactly the methods expected by the runtime (e.g., `setText`, `setFont`, `setColor`, `setDatasetData`). Empty stubs are acceptable if functionality is not used.
