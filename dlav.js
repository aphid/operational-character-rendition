/* Reference: https://github.com/cbaatz/damerau-levenshtein.git
   UNLICENSED */
/*
var dict;
fetch('dict.json').then(function (response) {
  return response.json()
}).then(function (json) {
  dict = json;
});
*/

function acompare(a, b) {
    if (a.distance < b.distance)
        return -1;
    else if (a.distance > b.distance)
        return 1;
    else
        return 0;
}

function hasNumber(myString) {
    return (
        /\d/.test(
            myString));
}

var compare = function (ocr, dict, sus) {
    if (!ocr) {
        return false;
    }
    if (hasNumber(ocr) && ocr.length < 3) {
        return false;
    }
    var words = {};
    var ranked = [];
    var dictdiv = document.querySelector('#dict');
    var compdist;
    if (sus) {
        compdist = Math.floor(ocr.length / 3) + 1;
    } else {
        compdist = Math.floor(ocr.length / 4) + 1;
    }
    console.log(ocr, compdist);
    for (var word of dict) {
        var dist = distance(ocr, word);

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

damerau = false;

function insert(c) {
    return 1;
};

function remove(c) {
    return 1;
};

function substitute(from, to) {
    return 1;
};

function transpose(backward, forward) {
    return 1;
};

function distance(down, across) {
    // http://en.wikipedia.org/wiki/Damerau%E2%80%93Levenshtein_distance
    var ds = [];
    if (down === across) {
        return 0;
    } else {
        down = down.split('');
        down.unshift(null);
        across = across.split('');
        across.unshift(null);
        down.forEach(function (d, i) {
            if (!ds[i]) ds[i] = [];
            across.forEach(function (a, j) {
                if (i === 0 && j === 0) ds[i][j] = 0;
                // Empty down (i == 0) -> across[1..j] by inserting
                else if (i === 0) ds[i][j] = ds[i][j - 1] + insert(a);
                // Down -> empty across (j == 0) by deleting
                else if (j === 0) ds[i][j] = ds[i - 1][j] + remove(d);
                else {
                    // Find the least costly operation that turns
                    // the prefix down[1..i] into the prefix
                    // across[1..j] using already calculated costs
                    // for getting to shorter matches.
                    ds[i][j] = Math.min(
                        // Cost of editing down[1..i-1] to
                        // across[1..j] plus cost of deleting
                        // down[i] to get to down[1..i-1].
                        ds[i - 1][j] + remove(d),
                        // Cost of editing down[1..i] to
                        // across[1..j-1] plus cost of inserting
                        // across[j] to get to across[1..j].
                        ds[i][j - 1] + insert(a),
                        // Cost of editing down[1..i-1] to
                        // across[1..j-1] plus cost of
                        // substituting down[i] (d) with across[j]
                        // (a) to get to across[1..j].
                        ds[i - 1][j - 1] + (d === a ? 0 : substitute(d, a))
                    );
                    // Can we match the last two letters of down
                    // with across by transposing them? Cost of
                    // getting from down[i-2] to across[j-2] plus
                    // cost of moving down[i-1] forward and
                    // down[i] backward to match across[j-1..j].
                    if (damerau && i > 1 && j > 1 && down[i - 1] === a && d === across[j - 1]) {
                        ds[i][j] = Math.min(
                            ds[i][j],
                            ds[i - 2][j - 2] + (d === a ? 0 : transpose(d, down[i - 1]))
                        );
                    };
                };
            });
        });
        return ds[down.length - 1][across.length - 1];
    };
};