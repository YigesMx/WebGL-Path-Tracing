let fetch_urls;
fetch_urls = function(urls, callback) {
    var results = [];
    var countdown = urls.length;
    for (var i = 0; i < urls.length; i++) {
        results.push(null);
        (function(i) {
            var xhr = new XMLHttpRequest();
            xhr.open('GET', urls[i], true);
            xhr.onload = function() {
                results[i] = xhr.responseText;
                if (--countdown === 0)
                    callback.apply(results, results);
            };
            xhr.send();
        }(i));
    }
    return results;
};

async function wait_fetch_urls(urlsDic) {
    let results = {};
    for (let line of urlsDic) {
        let response = await fetch(line.url);
        results[line.name] = await response.text();
    }
    return results;
}

function loadTexture(gl, url) {
    const texture = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, texture);

    const level = 0;
    const internalFormat = gl.RGBA;
    const width = 1;
    const height = 1;
    const border = 0;
    const srcFormat = gl.RGBA;
    const srcType = gl.UNSIGNED_BYTE;
    const pixel = new Uint8Array([0, 0, 0, 255]); // opaque blue
    gl.texImage2D( gl.TEXTURE_2D, level, internalFormat, width, height, border, srcFormat, srcType, pixel,);

    const image = new Image();
    image.onload = () => {
        gl.bindTexture(gl.TEXTURE_2D, texture);
        // gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
        gl.texImage2D(gl.TEXTURE_2D, level, internalFormat, srcFormat, srcType, image,);

        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.bindTexture(gl.TEXTURE_2D, null);
    };
    image.src = url;

    return texture;
}

function isPowerOf2(value) {
    return (value & (value - 1)) === 0;
}

export {fetch_urls, wait_fetch_urls, loadTexture};