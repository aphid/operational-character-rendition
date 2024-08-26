console.log("once");

importScripts('fastlev.js');


var dicts = {
    raw: 0,
    susp: 0
};

var loaded = 0

Promise.all([get("dict.json"), get("suspect.json")]).then(function (result) {
    //console.dir(dicts);
    dicts.raw = JSON.parse(result[0]);
    dicts.susp = JSON.parse(result[1]);
    console.log("dicts loaded!");
    loaded = 1;
    postMessage("ready");
});
var compare = async function (ocr, dict) {
    //console.log(ocr);
    /* if (!ocr) {
        console.log("nocr");
        return false;
    }
    if (hasNumber(ocr) && ocr.length < 3) {
        console.log("numbery");
        return alse;
    }*/
    var words = {};
    var ranked = [];
    var compdist;

    var compdist = Math.floor(ocr.length / 4) + 1;
    var cnt = 0;
    for (var word of dict) {
        cnt++;

        var lowcr = ocr.toLowerCase();
        var low = word.toLowerCase();
        var dist = FastLev.get(lowcr, low);

        if (dist === 0) {
            console.log("perfect match");
            return ({
                'original': ocr,
                'low': 0,
                'words': [{
                    'word': word,
                    'distance': 0
      }]
            });
        } else if (dist < compdist) {

            ranked.push({
                'word': word,
                'distance': dist
            });
        }

    }
    //console.log(ranked);
    var ranked = ranked.sort(acompare);
    if (ranked.length) {
        words.original = ocr;
        var low = ranked[0].dist;
        var high = ranked[ranked.length - 1];
        words.low = low;
        if (words.high > words.low) {
            words.high = high;
        }
        words.words = ranked;
        return words;
    }
}

function acompare(a, b) {
    if (a.distance < b.distance)
        return -1;
    else if (a.distance > b.distance)
        return 1;
    else
        return 0;
}

onmessage = async function (input) {

    var a = input.data.word;
    var b = input.data.dict;
    var res = await compare(a, dicts[b]);
    //console.log(res);
    postMessage(res);
}


function get(url) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open("GET", url);
        req.onload = function () {
            // This is called even on 404 etc
            // so check the status
            if (req.status === 200) {
                // Resolve the promise with the response text
                resolve(req.response);
            } else {
                // Otherwise reject with the status text
                // which will hopefully be a meaningful error
                reject(Error(req.statusText));
            }
        };
        // Handle network errors
        req.onerror = function () {
            reject(Error("Network Error"));
        };
        // Make the request
        req.send();
    });
}