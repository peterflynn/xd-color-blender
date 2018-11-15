const {Rectangle, Color} = require("scenegraph"); 
const commands = require("commands");

const DIALOG_CANCELED = "reasonCanceled";


function menuHandler(selection) {
    if (selection.items.length < 2) {
        return showOnboarding();
    } else if (selection.items.length === 2) {
        return showCloneSettings().then(function (nCopies) {
            if (nCopies) {
                cloneAndBlend(selection, nCopies);
            } // else dialog was canceled or input wasn't a number
        });
    } else {
        blendColors(selection);
    }
}

function blend(color1, color2, percent) {
    return new Color({
        r: Math.round(color1.r + percent*(color2.r - color1.r)),
        g: Math.round(color1.g + percent*(color2.g - color1.g)),
        b: Math.round(color1.b + percent*(color2.b - color1.b)),
        a: Math.round(color1.a + percent*(color2.a - color1.a))
    });
}

function sortSiblings(items) {
    var parent = items[0].parent;
    parent.children.forEach((node, i) => {
        node._zIndex = i;
    });
    items.sort((a, b) => {
        return a._zIndex - b._zIndex;
    });
    return items;
}

function sortByZ(selection) {
    if (selection.editContext.parent) {
        // Edit context is a container node, so all nodes have that container as their parent
        return sortSiblings(selection.items);
    } else {
        // Root edit context: selection may be spread across multiple artboards and the pasteboard
        // First, bucket selection by parent
        var selectionByParent = new Map();
        selection.items.forEach(node => {
            if (!selectionByParent.has(node.parent)) {
                selectionByParent.set(node.parent, []);
            }
            selectionByParent.get(node.parent).push(node);
        });

        // Sort the set of siblings in each bucket
        var sortedRanges = [];
        selectionByParent.forEach((nodes, parent) => {
            var range = sortSiblings(nodes);
            range.parent = parent;
            sortedRanges.push(range);
        });

        // Sort the buckets themselves by parent z-order, then merge together the pre-sorted buckets in order
        selection.editContext.children.forEach((node, i) => {
            node._zIndex = i;
        });
        selection.editContext._zIndex = -1;
        sortedRanges.sort((a, b) => {
            return a.parent._zIndex - b.parent._zIndex;
        });
        return [].concat(...sortedRanges);
    }
}

function blendColors(selection) {
    // Sort items by Z order for predictability, since marquee selection order depends on which nodes the marquee drag touched first, which is pretty arbitrary
    var items = sortByZ(selection);

    var color1 = items[0].fill;
    var color2 = items[items.length - 1].fill;

    for (var i = 1; i < items.length - 1; i++) {
        var percent = i / (items.length - 1);
        items[i].fill = blend(color1, color2, percent);
    }
}

function cloneAndBlend(selection, nCopies) {
    var original = selection.items[0];
    var final = selection.items[selection.items.length - 1];
    var dx = final.boundsInParent.x - original.boundsInParent.x;
    var dy = final.boundsInParent.y - original.boundsInParent.y;

    var color1 = selection.items[0].fill;
    var color2 = selection.items[selection.items.length - 1].fill;

    var clones = [];

    for (var i = nCopies; i > 0; i--) {  // clone last to first so Z order is nicer
        selection.items = [original];
        commands.duplicate();
        var clone = selection.items[0];

        var percent = i / (nCopies + 1);
        clone.fill = blend(color1, color2, percent);
        clone.moveInParentCoordinates(dx*percent, dy*percent);
        clones.push(clone);
    }

    selection.items = [original, ...clones, final];
}

function showOnboarding() {
    var dialog = document.createElement("dialog");
    dialog.innerHTML = `
        <form method="dialog">
            <h1>Color Blender</h1>
            <hr>
            <ul>
                <li>• Select two items to create a series of clones with colors blended between them, or</li>
                <li>• Select more items to apply the blend to existing objects</li>
            </ul>
            <footer>
                <button id="ok" type="submit" uxp-variant="cta">OK</button>
            </footer>
        </form>`;
    document.appendChild(dialog);

    return dialog.showModal().then(function () {
        dialog.remove();
    });
}

function showCloneSettings() {
    // TODO: remember last-used numSteps value
    var dialog = document.createElement("dialog");
    dialog.innerHTML = `
        <style>
        .row {
            display: flex;
            align-items: center;
        }
        </style>
        <form method="dialog">
            <h1>Color Blender</h1>
            <hr>
            <div class="row">
                <label>Number of steps:</label>
                <input type="text" uxp-quiet="true" id="numSteps" value="3" />
            </div>
            <footer>
                <button id="cancel" type="reset" uxp-variant="primary">Cancel</button>
                <button id="ok" type="submit" uxp-variant="cta">OK</button>
            </footer>
        </form>`;
    document.appendChild(dialog);

    // Ok button & Enter key automatically 'submit' the form
    // Esc key automatically cancels
    // Cancel button has no default behavior
    document.getElementById("cancel").onclick = () => dialog.close(DIALOG_CANCELED);

    return dialog.showModal().then(function (reason) {
        dialog.remove();

        if (reason === DIALOG_CANCELED) {
            return null;
        } else {
            return parseInt(dialog.querySelector("#numSteps").value);
        }
    });
}

module.exports = {
    commands: {
        blendCommand: menuHandler
    }
};