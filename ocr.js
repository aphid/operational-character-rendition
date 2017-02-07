/*global compare: true, OCRAD: true; */

var container, full, fullCtx, line, lineCtx, img, words, wat, type, typeCtx, rawdict, suspectdict, randomDoc;
var begin, end, linetrack, lines = [],
    theword, worddata,
    otop, json,
    docs,
    text = [],
    txt,
    ls = [],
    read,
    lstemp = [],
    busy = false,
    count = 0;
var suspect, dict;
var statement;
var interval = 85;
var letterInterval = 250;
//var interval = 50;
var stahp = false;
var block = ['-', '.', '`', '--', '='];
var util = {};

util.wait = async function (ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, (ms));
    });

};

var word = function (options) {
    var wd = this;
    if (!options.text || (block.indexOf(options.text.trim()) !== -1) || options.text.trim().length === 0) {
        options.text = "?";
        options.fail = true;
    }
    //console.log("word #" + statement.words.length + ": " + options.text);
    for (var opt in options) {
        this[opt] = options[opt];
    }
    this.potentials = [];
    this.potpos = 0;
    return wd;


};

word.prototype.draw = async function () {
    var word = this;
    return new Promise(async function (resolve) {
        word.span.style.display = "none";
        var delay = 1250;
        //console.log("Drawing!" + this.text);
        busy = true;
        if (word.endpos) {
            read.style.fontSize = "13vh";
            var fsize;
            var wordw = word.endpos.x - word.pos.x;
            var wordh = word.endpos.y - word.pos.y;
            type.width = wordw || 1;
            type.height = wordh || 1;
            //console.log(wordw, wordh);
            typeCtx.clearRect(0, 0, type.width, type.height);
            txt.textContent = "";
            read.textContent = "";
            var readMsg = "";
            var wlist = [];
            if (word.potentials.length > 1) {
                for (var i = 0; i < word.potentials.length; i++) {
                    if (i !== word.potentials.length - 1) {
                        fsize = 30 / word.potentials.length;
                        if (fsize < 8) {
                            fsize = 8;
                        }
                        delay = 5000;
                    }
                    wlist.push(word.potentials[i].word);
                }
                //read.style.fontSize = fsize + "vh";
                //readMsg = JSON.stringify(wlist);

            } else {
                readMsg = word.text;
            }
            //console.log(type.width, type.height, word.pos.x);
            type.style.width = "100%";
            type.style.auto = "auto";
            typeCtx.drawImage(img, word.pos.x, word.pos.y, type.width, type.height, 0, 0, type.width, type.height);
            read.textContent = readMsg;
        }
        console.log("starting cycle", word.text)
        await word.setUpCycle();
        console.log("ending cycle", word.text);
        //await (util.wait(delay))
        word.span.style.display = "inline";
        if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
            word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
            word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
        }
        await util.wait(delay);
        console.log("returning draw");
        return resolve("finished");
    });
};

word.prototype.setUpCycle = async function () {
    var wrd = this

    return new Promise(async function (resolve) {
        var source = wrd.text.toLowerCase();
        //console.log(this.potentials.length, ":", this.potentials);
        if (wrd.potentials.length < 2) {
            await util.wait(1200);
        }
        wrd.cProcess = [wrd.word];
        //weed out potentials that match the word
        if (wrd.potentials.length === 1 && wrd.potentials[0].distance === 0) {
            return resolve();
        }
        for (let word of wrd.potentials) {
            console.dir(word);
            var result = wrd.processLev(source, word);
            word.process = result;

        }
        console.log("??????????????" + wrd.potentials.length)

        for (let wd of wrd.potentials) {
            wrd.cProcess.push(wd.word);
            var src;
            read.textContent = wd.word;
            if (wd.type === "dict") {
                src = "aspell linux dictionary";
                read.style.color = "papayaWhip";
            } else if (wd.type === "suspect") {
                src = "DHS Watchwords List";
                read.style.color = "red";
            } else if (wd.type === "witness") {
                src = "Hearing Witness List";
                read.style.color = "green";
            } else if (wd.type === "committee") {
                src = "Committee membership list";
                read.style.color = "green";

            }
            readdata.textContent = "match: " + src + " distance: " + wd.distance;
            for (let proc of wd.process) {
                let time = null;
                if (wrd.cProcess.includes(proc)) {
                    console.log("woohoo");
                    time = 1000;
                }
                console.log("awaiting queue");
                await readQueue(proc, time);
                console.log("queue read");
            }
        }
        readdata.textContent = "";
        read.textContent = "";
        console.log("returning cycle")
        return resolve();

    });
};

readQueue = async function (wd, ms) {
    read.textContent = wd;
    if (!ms) {
        ms = 125;
    }
    console.log("boop: ", wd);
    await util.wait(ms);
    return Promise.resolve();
};

//return an array of all the steps between source and word
word.prototype.processLev = function (source, word) {
    var process = [source];
    var a = source;
    var b = word.word;
    var lev = new Levenshtein(a, b);
    console.log(source, word);
    var steps = lev.getSteps();
    var tmp = a;
    for (var step of steps) {
        if (step[0] === "substitute") {
            console.log("subbing");
            //console.log(step[0], step[1], step[2]);
            tmp = tmp.substring(0, step[1] - 1) + b[step[2] - 1] + tmp.substring(step[1], a.length);
            process.push(tmp);
        } else if (step[0] === "insert") {
            console.log("inserting");

            //console.log(step[0], step[1], step[2]);
            //console.log("adding ", b[step[2] - 1], " after " + a[step[1] - 1]);
            tmp = tmp.substring(0, step[1]) + b[step[2] - 1] + tmp.substring(step[1], tmp.length);
            process.push(tmp);
        } else if (step[0] === "delete") {
            console.log("deleting");

            //console.log(step[0], step[1], step[2]);
            tmp = tmp.substring(0, step[1] - 1) + tmp.substring(step[1], a.length);
            process.push(tmp);
        } else {
            console.log("oh word", step[0], step[1], step[2]);
        }
    }
    if (!process.includes(b)) {
        process.push(b);
    }
    return process;
};



word.prototype.pots = async function () {
    if (this.rawResults) {
        for (var res of this.rawResults) {
            this.potentials.push({
                "word": res.word,
                "distance": res.distance,
                "type": "dict"
            });
        }
    }
    if (this.suspResults) {
        var susps = this.suspResults;
        for (var sus of this.suspResults) {
            this.potentials.push({
                "word": sus.word,
                "distance": sus.distance,
                "type": "suspicious"
            });
        }
    }
    if (this.potentials.length > 1) {
        this.flip();
    }
    await this.draw();

    return Promise.resolve();
};

word.prototype.flip = function () {
    var wd = this;
    var span = this.span;
    var thispot = this.potentials[this.potpos];

    span.textContent = thispot.word + " ";
    if (thispot.type === "suspicious") {
        span.style.color = "red";
    } else if (thispot.type === "dict") {
        span.style.color = "papayaWhip";
    } else {
        span.style.color = "white";
    }
    if (this.lineDiv.offsetHeight > this.lineDiv.dataset.highest) {
        this.lineDiv.dataset.highest = this.lineDiv.offsetHeight;
        this.lineDiv.style.minHeight = this.lineDiv.offsetHeight + "px";
    }
    words.scrollTop = words.scrollHeight;
    this.potpos++;
    if (this.potpos >= this.potentials.length) {
        this.potpos = 0;
    }

    window.setTimeout(function () {
        /*if (thispot.type === "suspicious") {
          console.log("flipping from " + thispot.distance + " " + thispot.type + " " + thispot.word + " in " + (300 / thispot.distance + 250));
          console.table(wd.potentials);
        }*/
        wd.flip();
    }, 300 / (thispot.distance || 1) + 250);

};

document.addEventListener("DOMContentLoaded", function (event) {
    console.log("setting up");

    //set up all the things.  fold thes into the object at some point
    container = document.querySelector('#container');
    full = document.querySelector('#full');
    fullCtx = full.getContext('2d');
    img = document.querySelector('img');
    words = document.querySelector('#words');
    theword = document.querySelector('#theword');
    worddata = document.querySelector('#worddata');
    var imgData;
    otop = document.querySelector('#top');
    txt = document.querySelector('#text');
    read = document.querySelector('#readword');
    readdata = document.querySelector('#readdata');
    json = document.querySelector('#json');
    type = document.querySelector("#type");
    typeCtx = type.getContext("2d");

    Promise.all([get('dict.json'), get('suspect.json')]).then(function (values) {
        rawdict = JSON.parse(values[0]);
        suspectdict = JSON.parse(values[1]);

        docs = [{
                "title": "buckleyStatement",
                "pages": ['questionnaire00.jpg', 'questionnaire01.jpg', 'questionnaire02.jpg', 'questionnaire03.jpg', 'page0.jpg', 'page1.jpg', 'page2.jpg']
        },
            {
                "title": "litt",
                "pages": ['090521_litt-0.jpg', '090521_litt-1.jpg', '090521_litt-2.jpg']
}];
        var littResponses = {
            title: "littResponses",
            root: "090521_littresponses",
            last: 23
        };
        var clapperPost = {
            title: "clapperPost",
            root: "100720_clapperpost",
            last: 23
        };
        var clapperQfrs = {
            title: "clapperQfrs",
            root: "100720_clapperqfrs",
            last: 14
        };
        var prehearing = {
            "title": "prehearing",
            "root": "100921_prehearing",
            "last": 8
        };
        var attach1 = {
            "title": "attach1",
            "root": "110203_attach1",
            "last": 1
        };
        var attach21 = {
            "title": "attach2(1)",
            "root": "110203_attach2(1)",
            "last": 2
        };

        var dni = {
            "title": "dni",
            "root": "110216_dni",
            last: 33
        };

        var moreResponses = {
            "title": "110623_responses",
            "root": "110623_responses(1)",
            "last": 6
        };

        var clapper1 = {
            "title": "clapper1",
            "root": "110913_clapper(1)",
            "last": 10
        };

        var prehear = {
            "title": "110922_prehearing(4)",
            "root": "110922_prehearing(4)",
            "last": 20
        };

        var prehear5 = {
            "title": "130207_prehearing(5)",
            "root": "130207_prehearing(5)",
            "last": 27
        };
        var krasspre = {
            "title": "131217_krassprehearing",
            "root": "131217_krassprehearing",
            "last": 10
        };
        var pompeo = {
            "title": "170112_pre-hearing-011217",
            "root": "170112_pre-hearing-011217",
            "last": 39
        };
        var pompeoB = {
            "title": "170112_pre-hearing-b-011217",
            "root": "170112_pre-hearing-b-011217",
            "last": 20
        }
        var pompeoQ = {
            "title": "170112_questionnaire-011217",
            "root": "170112_questionnaire-011217",
            "last": 14
        }

        docs.push(buildPages(littResponses));
        docs.push(buildPages(clapperPost));
        docs.push(buildPages(prehearing));
        docs.push(buildPages(attach1));
        docs.push(buildPages(attach21));
        docs.push(buildPages(dni));
        docs.push(buildPages(moreResponses));
        docs.push(buildPages(clapper1));
        docs.push(buildPages(prehear));
        docs.push(buildPages(prehear5));
        docs.push(buildPages(krasspre));
        docs.push(buildPages(clapperQfrs));
        docs.push(buildPages(pompeo));
        docs.push(buildPages(pompeoB));




        randomDoc = docs[Math.floor(Math.random() * docs.length)];
        //randomDoc = docs.pop();
        console.log(randomDoc.title);


        statement = new Doc({
            pages: randomDoc.pages,
            title: randomDoc.title,
            root: randomDoc.root
        });



    });


});
//doc constructinator

var Doc = function (options) {
    var doc = this;
    this.pages = options.pages;
    this.hearingId = options.hearingId;
    this.root = options.root;
    this.title = options.title;
    this.currentPage = 0;
    console.log("hello");
    console.log(options.root);
    get("texts/" + options.root + ".json").then(function (result) {
        json.textContent = result;
    });
    window.setTimeout(function () {
        json.style.display = "none";
        otop.style.display = "block";
        container.style.display = "block";

        doc.init();

    }, 1000);
    //this.newline;
};


function buildPages(doc) {
    doc.pages = [];
    console.log(doc);
    for (var i = 0; i < doc.last + 1; i++) {
        doc.pages[i] = doc.root + "-" + i + ".jpg";
    }
    return doc;
}



Doc.prototype.init = function () {
    this.lines = [];
    this.text = "";
    this.letters = [];
    this.words = [];
    this.word = {
        text: ''
    };
    this.dLetters = [];
    this.currentLine = 0;
    this.currentChr = 0;


    var doc = this;
    console.log("init");
    document.querySelector('img').onload = function () {
        full.width = this.width;
        full.height = this.height;
        fullCtx.clearRect(0, 0, full.width, full.height);
        fullCtx.drawImage(this, 0, 0);
        doc.process();
    };

    this.loadPage();

};

Doc.prototype.process = function () {
    this.getLines().processLines();

};

Doc.prototype.processLines = function () {
    var doc = this;
    console.log("got " + this.lines.length + " lines, processing");
    for (var i = 0; i < this.lines.length; i++) {
        var line = this.lines[i];

        fullCtx.fillStyle = "rgb(0,0,0)";
        //console.dir(line);
        var lineHeight = line.height;
        for (var j = 0; j < line.letters.length; j++) {
            var letter = line.letters[j];
            letter.lineNum = line.num;
            if (j === line.letters.length - 1) {
                letter.wordEnd = true;
                letter.lineEnd = true;
            }
            letter.lineHeight = line.height;
            if (letter.height > 100 || letter.width > 200) {
                //big letter, idk.
                this.letters.push(letter);

            } else {
                this.letters.push(letter);
            }
        }
    }
    doc.drawLetters();


};


//takes cluster of letters, "reads" and processes
Doc.prototype.addWord = function (word) {
    console.log("&&&&&&&&&&&&&&&& adding word " + word.text);
    var doc = this;
    return new Promise(async function (resolve) {
        if (!word || word.fail) {
            console.log("%%%%%%%%%%%% no word");
            return resolve("no word");
        } else {
            console.log(word.lineNum);
            word.pageDiv = document.querySelector("#page" + doc.currentPage);
            //sees if we need a newline
            if (!document.querySelector("#line" + doc.currentPage + "_" + word.lineNum)) {
                word.lineDiv = document.createElement('div');
                word.lineDiv.id = "line" + doc.currentPage + "_" + word.lineNum;
                word.lineDiv.classList.add('line');
                word.pageDiv.appendChild(word.lineDiv);

            } else {
                word.lineDiv = document.querySelector("#line" + doc.currentPage + "_" + word.lineNum);
            }
            word.rawResults = [];
            var span = document.createElement('span');
            span.style.display = "none";
            var ssize;
            ssize = word.lineHeight;

            //kinda arbitrary size for text
            if (ssize > 40) {
                ssize = 40;
            }
            if (ssize < 15) {
                ssize = 15;
            }
            span.style.fontSize = ssize + "px";
            console.log(span.style.fontSize);
            //i forget this use case
            if (word.text !== "? ") {
                doc.words.push(word);
            }
            //adds space
            span.textContent = word.text + " ";
            word.span = span;

            word.lineDiv.appendChild(span);
            word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
            //scrolls into view
            words.scrollTop = words.scrollHeight;
            var comp;

            if (word.text.length > 2) {
                word.clean = word.text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, "");
                comp = compare(word.clean, rawdict);
                if (comp) {
                    //one result
                    if (comp.low === 0 || comp.words.length === 1) {
                        span.textContent = comp.words[0].word + " ";
                    } else {
                        span.textContent = comp.words[0].word + " ";

                        //lolidk
                        if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
                            word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
                            word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
                        }
                    }

                    word.rawResults = comp.words;
                } else {
                    console.log("no results for ", word.text, " in dict");
                    word.compFailed = true;
                    span.classList.add('iffy');
                }
                comp = compare(word.clean, suspectdict, true);
                if (comp) {
                    span.classList.add('suspect');
                    if (comp.low === 0) {
                        span.textContent = comp.words[0].word + " ";
                    } else {
                        span.textContent = comp.words[0].word + " ";


                        if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
                            word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
                            word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
                        }
                        //span.textContent = span.textContent + JSON.stringify(comp);
                    }
                    word.suspResults = comp.words;

                } else {
                    console.log("no results in susp for ", word.text);
                    //word.compFailed = true;
                    //span.classList.add('iffy');
                }
                await word.pots();
                console.log("&&&&&& ending word", word.text)
                return resolve();
            } else {
                return resolve();
            }
        }
    });
};

Doc.prototype.drawLetters = async function () {
    var altWord;
    var doc = this,
        pct;
    var startWord,
        matches = "";
    this.dLetters.push(this.letters[this.currentChr]);

    this.currentChr++;
    //we're at the end, start over.
    if (this.currentChr >= this.letters.length) {
        console.log("doc finished?")
        this.dLetters = [];
        this.init();
    }

    var letter = this.letters[this.currentChr];
    //console.dir(letter);
    if (!letter) {
        console.log('no letter at ' + this.currentChr);
        return false;
    }
    pct = (letter.y / img.height) - 0.2;
    if (pct < 0) {
        pct = 0;
    }
    full.style.top = "-" + (full.offsetHeight * pct) +
        "px";

    if (letter.matches.length) {
        for (var match of letter.matches) {

            matches = matches + match.letter;
            //console.log(matches);
        }
        if (letter.wordEnd || matches.indexOf(' ') !== -1 || matches.indexOf(',') !== -1) {
            letter.wordEnd = true;

            if (letter.wordEnd) {
                //console.log("wordend, matches: " + matches);
                this.word.text = "" + this.word.text + letter.matches[0].letter;
            }
            if (letter.lineEnd) {
                this.word.lineEnd = true;
            }
            this.word.lineNum = letter.lineNum;
            this.word.lineHeight = letter.lineHeight;

            this.word.pos = {
                "x": this.letters[this.currentChr - (this.word.text.length - 1)].x,
                "y": this.letters[this.currentChr - (this.word.text.length - 1)].y
            };
            var lastlet = this.letters[this.currentChr];
            this.word.endpos = {
                "x": lastlet.x + lastlet.width,
                "y": lastlet.y + lastlet.height
            };

            if (this.word.text === "" || this.word.text === "-") {
                this.word = {
                    text: ''
                };
            } else if (this.word.text.includes('--')) {
                var idx = this.word.text.indexOf('--');
                altWord = JSON.parse(JSON.stringify(this.word));
                altWord.text = this.word.text.split('--')[1];
                altWord.pos = {
                    "x": this.letters[this.currentChr - (altWord.text.length - 1)].x,
                    "y": this.letters[this.currentChr - (altWord.text.length - 1)].y
                };
                this.word.text = this.word.text.split('--')[0];
                this.word.endpos = {
                    "x": this.letters[this.currentChr - (this.word.text.length - 1 + idx)].x,
                    "y": this.letters[this.currentChr - (this.word.text.length - 1 + idx)].y
                };
                await this.addWord(new word(this.word));
                await this.addWord(new word(altWord));
            } else if (this.word.text.includes(':')) {
                altWord = JSON.parse(JSON.stringify(this.word));
                altWord.text = this.word.text.split(':')[1];
                this.word.text = this.word.text.split(':')[0];
                await this.addWord(new word(this.word));
                //ugh need to figure out positioning
                await this.addWord(new word(altWord));
            } else {
                await this.addWord(new word(this.word));
            }

            this.word = {
                text: ''
            };

            //start of word
        } else {
            this.word.text = "" + this.word.text + letter.matches[0].letter;
        }
        //blank letter image
        fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
        fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
        pct = (letter.y / img.height) - 0.02;
        full.style.top = "-" + (full.offsetHeight * pct) +
            "px";
        //full.style.top = "-" + (letter.y - 430) + "px";

        //full.style.left = "-" + (letter.x - 130) + "px";
        type.width = letter.width;
        type.height = letter.height;
        type.style.width = "auto";
        type.style.height = "100%";
        type.style.maxHeight = "25vh";
        typeCtx.clearRect(0, 0, type.width, type.height);
        //copy letter image
        typeCtx.drawImage(img, letter.x, letter.y, letter.width, letter.height, 0, 0, type.width, type.height);
        read.style.fontSize = "15vh";
        read.style.color = "white";
        //blank letter
        read.textContent = "";
        read.textContent = matches;
    } else {
        //letter unknown
        read.style.fontSize = "15vh";
        read.textContent = "???";
    }

    //console.log("done drawing letter");


    if (this.dLetters.length === this.letters.length) {
        console.log("length reached");
        console.log('done');
        this.dLetters = [];
        return true;
    } else {
        //console.log("another");
        await util.wait(letterInterval);

        doc.drawLetters();



    }
};


Doc.prototype.loadPage = function () {
    var page;
    var pageDiv = document.createElement('div');

    if (this.currentPage >= this.pages.length) {
        location.reload();
    }

    if (!img.src) {
        console.log("no image, starting out, page 0");
        page = this.pages[0];

    } else if (this.currentPage >= this.pages.length - 1) {
        console.log("starting over");
        location.reload();

    } else {
        console.log(this.currentPage);
        this.currentPage = this.currentPage + 1;
        console.log(this.currentPage);
        console.log("iterating page, now " + this.currentPage);
        page = this.pages[this.currentPage];
        var pageDivs = document.querySelectorAll('.page');
        for (var i = 0; i < pageDivs.length; i++) {
            if (i < this.currentPage - 1) {
                pageDivs[i].style.display = "none";
            }
        }
        words.scrollTop = words.scrollHeight;


    }
    pageDiv.classList.add('page');
    pageDiv.id = "page" + this.currentPage;
    words.appendChild(pageDiv);


    img.src = "texts/" + page;
    console.log("loaded " + this.pages[this.currentPage]);
};


Doc.prototype.getLines = function () {

    //get line data from OCRAD
    var lines = OCRAD(img, {
        verbose: true
    }).lines;

    //filter out small lines and lines with no characters
    this.currentLine = 0;
    for (var line of lines) {
        if (line.height > 8 && line.letters.length) {
            line.num = this.currentLine;
            this.lines.push(line);
            this.currentLine++;

        }
    }

    return this;
};


function get(url) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open('GET', url);

        req.onload = function () {
            // This is called even on 404 etc
            // so check the status
            if (req.status == 200) {
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

function hasNumber(myString) {
    return (
        /\d/.test(
            myString));
}