var stats = initStats();

function initStats() {
	stats = new Stats();
	stats.setMode(0); // 0: fps, 1: ms

	// Align top-left
	stats.domElement.style.position = 'absolute';
	stats.domElement.style.left ='200px';
	stats.domElement.style.top = '0px';

	document.body.appendChild(stats.domElement);


	return stats;
}

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