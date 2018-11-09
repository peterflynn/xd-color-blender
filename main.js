const {Rectangle, Color} = require("scenegraph"); 
const commands = require("commands");

function menuHandler(selection) {
    if (selection.items.length < 2) {
        return showOnboarding();
    } else if (selection.items.length === 2) {
        return showCloneSettings().then(function (nCopies) {
            cloneAndBlend(selection, nCopies);
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

function blendColors(selection) {
    var color1 = selection.items[0].fill;
    var color2 = selection.items[selection.items.length - 1].fill;

    for (var i = 1; i < selection.items.length - 1; i++) {
        var percent = i / (selection.items.length - 1);
        selection.items[i].fill = blend(color1, color2, percent);
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
            <h1>Blender</h1>
            <hr>
            <ul>
                <li>• Select two items to create a series of clones with colors blended between them, or</li>
                <li>• Select more items to blend colors between the existing items</li>
            </ul>
            <footer>
                <button id="ok" type="submit" uxp-variant="cta">OK</button>
            </footer>
        </form>`;
    document.appendChild(dialog);

    return dialog.showModal().then(function () {
        console.log("closed!");
        dialog.remove();
    });
}

function showCloneSettings() {
    return Promise.resolve(4);
}

module.exports = {
    commands: {
        blendCommand: menuHandler
    }
};