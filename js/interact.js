///////////////////////////////////////////////////////////////////////////

/************************* interaction ********************************/
var mouseLeftDown = false;
var mouseRightDown = false;
var mouseMidDown = false;
var lastMouseX = null;
var lastMouseY = null;

var pause = false;

function handleMouseDown(event) {
    if (event.button == 2) {
        mouseLeftDown = false;
        mouseRightDown = true;
        mouseMidDown = false;
    }
    else if (event.button == 0) {
        mouseLeftDown = true;
        mouseRightDown = false;
        mouseMidDown = false;
    }
    else if (event.button == 1) {
        mouseLeftDown = false;
        mouseRightDown = false;
        mouseMidDown = true;
    }
    lastMouseX = event.clientX;
    lastMouseY = event.clientY;
}

function handleMouseUp(event) {
    mouseLeftDown = false;
    mouseRightDown = false;
    mouseMidDown = false;
}

function handleMouseMove(event) {
    if (!(mouseLeftDown || mouseRightDown || mouseMidDown)) {
        return;
    }
    var newX = event.clientX;
    var newY = event.clientY;

    var deltaX = newX - lastMouseX;
    var deltaY = newY - lastMouseY;

    if (mouseLeftDown) {
        // update the angles based on how far we moved since last time
        angleY -= deltaX * 0.01;
        angleX += deltaY * 0.01;

        // don't go upside down
        angleX = Math.max(angleX, -Math.PI / 2 + 0.01);
        angleX = Math.min(angleX, Math.PI / 2 - 0.01);

        eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
        eye.y = zoomZ * Math.sin(angleX);
        eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);
    }
    else if (mouseRightDown) {
        zoomZ += 0.01 * deltaY;
        zoomZ = Math.min(Math.max(zoomZ, 4.0), 20.0);

        eye.x = zoomZ * Math.sin(angleY) * Math.cos(angleX);
        eye.y = zoomZ * Math.sin(angleX);
        eye.z = zoomZ * Math.cos(angleY) * Math.cos(angleX);
    }
    else if (mouseMidDown) {
        center.x -= 0.01 * deltaX;
        center.y += 0.01 * deltaY;
        eye.x -= 0.01 * deltaX;
        eye.y += 0.01 * deltaY;
    }

    lastMouseX = newX;
    lastMouseY = newY;

    iterations = 0;
}

function handleKeyDown(event){
	if (event.keyCode == 32)
		pause = !pause;
}