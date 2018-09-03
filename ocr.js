/*global compare: true, OCRAD: true; */
var container, full, fullCtx, img, words, type, typeCtx, rawdict, suspectdict, randomDoc, otop, json, txt, read, statement, url, wworker;

var witnesses = [];
var util = {};

//TIMINGS

var timings = {
    letter: 225,
    word: 1225,
    cycle: 1225,
    read: 125,
    start: 0,
    wCycle: 300,
    wordInterval: 1000,
    imgDelay: 16,
    docFinished: 10000
};

for (let t in timings) {
    timings[t] = timings[t] * 0.6;
}

//characters to block
var block = ["-", ".", "`", "--", "="];


util.wait = async function (ms) {
    return new Promise(resolve => {
        setTimeout(() => {
            resolve();
        }, (ms));
    });
};


var Word = function (options) {
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

Word.prototype.draw = async function () {
    var wd = this;
    return new Promise(async function (resolve) {
        wd.span.style.display = "none";
        var delay = timings.word;
        //console.log("Drawing!" + this.text);
        busy = true;
        if (wd.endpos) {
            read.style.fontSize = "13vh";
            var fsize;
            var wordw = wd.endpos.x - wd.pos.x;
            var wordh = wd.wordBot - wd.wordTop;
            type.width = wordw || 1;
            type.height = wordh || 1;
            //console.log(wordw, wordh);
            typeCtx.clearRect(0, 0, type.width, type.height);
            txt.textContent = "";
            read.textContent = "";
            var readMsg = "";
            var wlist = [];
            if (wd.potentials.length > 1) {
                for (var i = 0; i < wd.potentials.length; i++) {
                    if (i !== wd.potentials.length - 1) {
                        fsize = 30 / wd.potentials.length;
                        if (fsize < 8) {
                            fsize = 8;
                        }
                    }
                    wlist.push(wd.potentials[i].word);
                }
                //read.style.fontSize = fsize + "vh";
                //readMsg = JSON.stringify(wlist);
            } else {
                readMsg = wd.text;
                var src = getSource(wd.type);
                //read.style.color = src.color;
                //datadistance.textContent = "Levenshtein distance: 0";
                //datasource.textContent = "Match: " + src.type;
            }
            //console.log(type.width, type.height, word.pos.x);
            type.style.width = "50%";
            type.style.maxHeight = "25vh";
            typeCtx.drawImage(img, wd.pos.x, wd.wordTop, type.width, type.height, 0, 0, type.width, type.height);
            read.textContent = readMsg;
        }
        //console.log("starting cycle", wd.text);
        await wd.setUpCycle();
        //console.log("ending cycle", wd.text);
        //await (util.wait(delay))
        wd.span.style.display = "inline";
        if (wd.lineDiv.offsetHeight > wd.lineDiv.dataset.highest) {
            wd.lineDiv.dataset.highest = wd.lineDiv.offsetHeight;
            wd.lineDiv.style.minHeight = wd.lineDiv.offsetHeight + "px";
        }
        await util.wait(delay);
        console.log("returning draw");
        return resolve("finished");
    });
};
Word.prototype.setUpCycle = async function () {
    var wrd = this;
    var source = wrd.text.toLowerCase();
    //console.log(this.potentials.length, ":", this.potentials);
    if (wrd.potentials.length < 2) {
        await util.wait(timings.cycle);
    }
    wrd.cProcess = [wrd.word];
    //weed out potentials that match the word
    if (wrd.potentials.length === 1 && wrd.potentials[0].distance === 0) {
        datasource.textContent = "";
        datadistance.textContent = "";
        read.textContent = "";
        return Promise.resolve();
    }
    for (let wd of wrd.potentials) {
        //console.dir(wd);
        var result = wrd.processLev(source, wd);
        wd.process = result;
    }
    //console.log("??????????????" + wrd.potentials.length);
    //console.log(wrd);
    for (let wd of wrd.potentials) {
        wrd.cProcess.push(wd.word);
        var src = getSource(wd.type);
        read.style.color = src.color;
        src = src.type;
        datasource.textContent = "Match: " + src;
        datadistance.textContent = "Levenshtein distance: " + wd.distance;
        for (let proc of wd.process) {
            let time = null;
            if (wrd.cProcess.includes(proc)) {
                time = timings.wordInterval;
            }
            //console.log("awaiting queue");
            await readQueue(proc, time);
            //console.log("queue read");
        }
    }
    datasource.textContent = "";
    datadistance.textContent = "";
    read.textContent = "";
    console.log("returning cycle");
    return Promise.resolve();
};
readQueue = async function (wd, ms) {
    read.textContent = wd;
    if (!ms) {
        ms = timings.read;
    }
    await util.wait(ms);
    return Promise.resolve();
};
//return an array of all the steps between source and word
Word.prototype.processLev = function (source, wd) {
    var process = [source];
    var a = source;
    var b = wd.word;
    if (a === b) {
        return [a];
    }
    //console.log("#########", a, b, "#########");
    //console.log(source, wd);
    var lev = new Levenshtein(a, b);
    var steps = lev.getSteps();
    var tmp = a;
    for (var step of steps) {
        if (step[0] === "substitute") {
            //console.log("subbing");
            //console.log(step[0], step[1], step[2]);
            tmp = tmp.substring(0, step[1] - 1) + b[step[2] - 1] + tmp.substring(step[1], a.length);
            process.push(tmp);
        } else if (step[0] === "insert") {
            //console.log("inserting");
            //console.log(step[0], step[1], step[2]);
            //console.log("adding ", b[step[2] - 1], " after " + a[step[1] - 1]);
            tmp = tmp.substring(0, step[1]) + b[step[2] - 1] + tmp.substring(step[1], tmp.length);
            process.push(tmp);
        } else if (step[0] === "delete") {
            //console.log("deleting");
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
    if (!process.length) {
        console.log("process 0");
    }
    //console.log("________________________");
    //console.log(process);
    return process;
};
Word.prototype.color = function (index = 0) {
    //console.dir(this.potentials);
    var wd = this.potentials[index];
    if (!wd.type) {
        wd.type = unknown;
        this.span.color = "white";
    } else if (wd.type === "suspicious") {
        this.span.style.color = "red";
    } else if (wd.type === "dict") {
        this.span.style.color = "papayaWhip";
    } else {
        this.span.style.color = "white";
    }
};
Word.prototype.pots = async function () {
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
        for (var sus of this.suspResults) {
            this.potentials.push({
                "word": sus.word,
                "distance": sus.distance,
                "type": "suspicious"
            });
        }
    }
    if (this.potentials.length >= 1) {
        this.flip();
    }
    await this.draw();
    return Promise.resolve();
};
Word.prototype.flip = async function () {
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
    var wTime = (300 / (thispot.distance || 1)) + 250 + (Math.random() * 100);
    await util.wait(wTime);
    /*if (thispot.type === "suspicious") {
      console.log("flipping from " + thispot.distance + " " + thispot.type + " " + thispot.word + " in " + (300 / thispot.distance + 250));
      console.table(wd.potentials);
    }*/
    wd.flip();
};
document.addEventListener("DOMContentLoaded", async function () {
    console.log("DOM loaded");
    wWorker = new Worker('dist.js');
    wWorker.onmessage = function (result) {
        if (result.data === "ready") {
            init();
        } else {
            return Promise.resolve(result.data);
        }
    }
});
var getSource = function (type) {
    var src = {};
    if (type === "dict") {
        src.type = "aspell dictionary";
        src.color = "papayaWhip";
    } else if (type === "suspicious") {
        src.type = "DHS watchwords List";
        src.color = "red";
    } else if (type === "witness") {
        src.type = "hearing witness list";
        src.color = "green";
    } else if (type === "committee") {
        src.type = "SSCI Committee member";
        src.color = "blue";
    }
    return src;

};

var init = async function () {

    console.log("setting up");
    //set up all the things.  fold thes into the object at some point
    container = document.querySelector("#container");
    full = document.querySelector("#full");
    fullCtx = full.getContext("2d");
    img = document.querySelector("img");
    words = document.querySelector("#words");
    theword = document.querySelector("#theword");
    worddata = document.querySelector("#worddata");
    otop = document.querySelector("#top");
    txt = document.querySelector("#text");
    read = document.querySelector("#readword");
    datasource = document.querySelector("#source");
    datadistance = document.querySelector("#distance")
    json = document.querySelector("#json");
    type = document.querySelector("#type");
    typeCtx = type.getContext("2d");
    if (!rawdict && !suspectdict) {
        var dicts = await Promise.all([get("dict.json"), get("suspect.json")]);
    }
    url = new URL(window.location.href);

    //console.dir(dicts);
    rawdict = JSON.parse(dicts[0]);
    suspectdict = JSON.parse(dicts[1]);

    docs = [];
    var targetDoc = url.searchParams.get("document") || false;
    var targetPage = url.searchParams.get("page") || 0;
    var hearings = await get("hearings.json");
    hearings = JSON.parse(hearings);
    var candidates = [];
    var pick;
    for (var h of hearings.hearings) {
        for (var w of h.witnesses) {
            for (var p of w.pdfs) {
                if (!p.hasText) {
                    let cand = {};
                    //console.log(p);
                    cand.meta = JSON.stringify(h);
                    cand.last = p.metadata.pageCount - 1;
                    //FIX THIS IN SCRAPER JEEZ
                    cand.root = p.localPath.replace("/var/www", "https://").replace(".pdf", "").replace(".PDF", "").replace(".txt", "/").replace("html", "").replace("illegible.us", "oversightmachin.es") + "/";
                    cand.title = p.localName.replace(".pdf", "").replace(".PDF", "");
                    candidates.push(cand);
                }
            }
        }
    }
    if (targetDoc && targetDoc !== "new") {
        console.log("searching for", targetDoc);
        for (var c of candidates) {
            console.log(c.title);
            if (targetDoc === c.title) {
                console.log("MATCHED PICK");
                pick = c;
            }
        }
        if (!pick) {
            console.log("document not found");
        }
    } else {
        pick = candidates[Math.floor(Math.random() * candidates.length)];
    }
    var doc = {
        title: pick.title,
        root: pick.root,
        last: pick.last,
        hTitle: pick.hTitle,
        meta: pick.meta
    }

    docs.push(buildPages(doc));

    var url = new URL(window.location.href);
    var thedoc = docs[Math.floor(Math.random() * docs.length)];
    if (url.searchParams.get("title")) {
        var tDoc = url.searchParams.get("title");
        for (let doc of docs) {
            if (doc.title === tDoc) {
                thedoc = doc;
            }
        }
    }
    console.log(thedoc.title);



    statement = new Doc({
        pages: thedoc.pages,
        title: thedoc.title,
        root: thedoc.root,
        meta: thedoc.meta
    });

};

//doc constructinator
var Doc = function (options) {
    var doc = this;
    this.pages = options.pages;
    this.hearingId = options.hearingId;
    this.root = options.root;
    this.title = options.title;
    document.title = "operational character rendition: " + this.title;
    this.currentPage = 0;
    console.log("hello");
    console.log(options.root);
    get("texts/" + options.root + ".json").then(function (result) {
        json.textContent = result;
        if (result) {
            doc.metadata = JSON.parse(result)[0];
            this.dataIndex = 0;
            //words.style.height = "94vh";

            doc.cycleData();
        } else {
            document.querySelector('#console').style.display = "none";
        }
    }).catch(function () {
        document.querySelector('#console').style.display = "none";
    });

    window.setTimeout(function () {
        json.style.display = "none";
        otop.style.display = "block";
        container.style.display = "block";
        doc.init();
    }, timings.start);
    //this.newline;
};

Doc.prototype.cycleData = async function () {
    if (this.dataIndex < (Object.keys(this.metadata).length - 1)) {
        this.dataIndex++;
    } else {
        this.dataIndex = 0;
    }

    document.querySelector("#data").textContent = Object.keys(this.metadata)[this.dataIndex] + ": " + Object.values(this.metadata)[this.dataIndex];
    //await util.wait(8000);

    this.cycleData();
}
Doc.prototype.upWords = function () {
    let url = this.url.searchParams.get("event");
    form = {
        "page": this.currentPage,
        "words": this.words,
        "root": this.root,
        "title": this.title
    };

    return new Promise(function (resolve) {
        var sData = JSON.stringify(form);
        console.log("sending json");
        try {
            fetch("https://illegible.us:3000", {
                method: "post",
                body: sData
            }).then(json).then(function (data) {
                console.log("Request succeeded with JSON response", data);

                return resolve();
            }).catch(function (error) {
                console.log("Request failed", error);
            });
        } catch (e) {
            console.log("fetch catch backup", e);
        }

    });
};

Doc.prototype.upImage = function () {

    let url = this.url.searchParams.get("event");
    form = {
        "page": this.currentPage,
        "pageImg": full.toDataURL(),
        "root": this.root,
        "title": this.title
    };

    return new Promise(function (resolve) {
        var sData = JSON.stringify(form);
        console.log("sending image");
        try {
            fetch("https://illegible.us:3000", {
                method: "post",
                body: sData
            }).then(json).then(function (data) {
                console.log("Request succeeded with JSON response", data);

                return resolve();
            }).catch(function (error) {
                console.log("Request failed", error);
            });
        } catch (e) {
            console.log("fetch catch backup", e);
        }
    });
};

function buildPages(doc) {
    doc.pages = [];
    //    console.log(doc);
    for (var i = 0; i < doc.last + 1; i++) {
        let n = i + "";
        doc.pages[i] = doc.root + doc.title + "_" + n.padStart(3, "0") + ".jpg";
    }
    return doc;
}
Doc.prototype.init = function () {
    console.log("does this run?");
    this.lines = [];
    this.text = "";
    this.letters = [];
    this.words = [];
    this.word = {
        text: ""
    };
    this.dLetters = [];
    this.currentLine = 0;
    this.currentChr = 0;
    this.url = new URL(window.location.href);

    this.url.searchParams.set('document', this.title);
    var pageparam = parseInt(this.url.searchParams.get('page'), 10);
    console.log("comparing ", pageparam, " from url ", this.currentPage, " currentPage");
    if (pageparam && pageparam < this.pages.length) {
        if (this.currentPage > pageparam) {
            this.url.searchParams.set('page', this.currentPage);

        } else {
            this.currentPage = pageparam;
        }
    }
    if (!pageparam) {
        this.currentPage = 0;
        this.url.searchParams.set('page', this.currentPage);

    }

    history.pushState({}, (this.title + "_" + this.currentPage), this.url.search);

    var doc = this;
    console.log("init");

    document.querySelector("img").addEventListener("load", async function () {

        //typeCtx.clearRect(0, 0, type.width, type.height);
        read.textContent = "";
        console.log("copying img");
        full.style.top = "0";
        await util.copyImage(this);
        doc.process();
    }, {
        once: true
    });
    this.loadPage();
};


util.copyImage = async function (img) {
    full.width = img.width;
    full.height = img.height;
    //fullCtx.clearRect(0, 0, full.width, full.height);
    var line = 0;
    while (line < img.height) {
        //fullCtx.drawImage(this, 0, 0);
        fullCtx.drawImage(img, 0, line, img.width, 1, 0, line, full.width, 1);
        line++;
        if (line % 3 === 0) {
            await util.wait(timings.imgDelay);
        }
    }
    fullCtx.drawImage(img, 0, 0, img.width, img.height);
    console.log("done copying");
    return Promise.resolve();
};

Doc.prototype.process = function () {
    console.log("processing image");
    this.getLines().processLines();
};
Doc.prototype.processLines = async function () {
    console.log("got " + this.lines.length + " lines, processing");
    for (var i = 0; i < this.lines.length; i++) {
        var line = this.lines[i];
        fullCtx.fillStyle = "rgb(0,0,0)";
        //console.dir(line);
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
    await this.drawLetters();
};
//takes cluster of letters, "reads" and processes
Doc.prototype.addWord = function (word) {
    //console.log("&&&&&&&&&&&&&&&& adding word " + word.text);
    var doc = this;
    return new Promise(async function (resolve) {
        if (!word || word.fail) {
            //console.log("%%%%%%%%%%%% no word");
            return resolve("no word");
        } else {
            console.log(word.lineNum);
            word.pageDiv = document.querySelector("#page" + doc.currentPage);
            //sees if we need a newline
            if (!document.querySelector("#line" + doc.currentPage + "_" + word.lineNum)) {
                word.lineDiv = document.createElement("div");
                word.lineDiv.id = "line" + doc.currentPage + "_" + word.lineNum;
                word.lineDiv.classList.add("line");
                word.pageDiv.appendChild(word.lineDiv);
            } else {
                word.lineDiv = document.querySelector("#line" + doc.currentPage + "_" + word.lineNum);
            }
            word.rawResults = [];
            var span = document.createElement("span");
            span.style.display = "none";
            var ssize;
            ssize = word.lineHeight * .7;
            if (ssize > 50) {
                ssize = 50;
            }
            if (ssize < 25) {
                ssize = 25;
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
                word.clean = word.text.replace(/[^a-zA-Z0-9]+/g, "");
                //word.clean = word.text;
                console.time(word.clean);
                comp = await compare(word.clean, "raw");
                console.timeEnd(word.clean);
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
                    span.classList.add("iffy");
                }
                comp = await compare(word.clean, "susp");
                if (comp) {
                    span.classList.add("suspect");
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
                    //span.classList.add("iffy");
                }
                await word.pots();
                console.log("&&&&&& ending word", word.text);
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
    var matches = "";
    this.dLetters.push(this.letters[this.currentChr]);
    this.currentChr++;
    console.log(this.currentChr, this.letters.length);
    //we"re at the end, start over.
    if (this.currentChr >= this.letters.length) {
        console.log("doc finished?");
        this.word.wordTop = 0;
        this.word.wordBot = 0;
        this.dLetters = [];


        typeCtx.clearRect(0, 0, type.width, type.height);
        read.textContent = "";
        await this.upImage()
        await this.upWords();
        await util.wait(timings.docFinished);
        console.log(this.currentPage);
        this.currentPage = this.currentPage + 1;
        console.log(this.currentPage);

        return this.init();
    }
    var letter = this.letters[this.currentChr];
    if (letter.lineNum !== doc.currentLine) {
        this.word.wordTop = 0;
        this.word.wordBot = 0;
        this.currentLine = letter.lineNum;
    }
    //console.dir(letter);
    if (!letter) {
        console.log("no letter at " + this.currentChr);
        return false;
    }
    pct = (letter.y / img.height) - 0.2;
    if (pct < 0) {
        pct = 0;
    }
    full.style.top = "-" + (full.offsetHeight * pct) + "px";
    if (letter.matches.length) {
        for (var match of letter.matches) {
            matches = matches + match.letter;
            //console.log(matches);
        }
        if (letter.wordEnd || matches.indexOf(" ") !== -1 || matches.indexOf(",") !== -1) {
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
                    text: "",
                    wordTop: 0,
                    wordBot: 0
                };
            } else if (this.word.text.includes("--")) {
                var idx = this.word.text.indexOf("--");
                altWord = JSON.parse(JSON.stringify(this.word));
                altWord.wordTop = this.word.wordTop;
                altWord.wordBot = this.word.wordBot;
                altWord.text = this.word.text.split("--")[1];
                altWord.pos = {
                    "x": this.letters[this.currentChr - (altWord.text.length - 1)].x,
                    "y": this.letters[this.currentChr - (altWord.text.length - 1)].y
                };
                this.word.text = this.word.text.split("--")[0];
                this.word.endpos = {
                    "x": this.letters[this.currentChr - (this.word.text.length - 1 + idx)].x,
                    "y": this.letters[this.currentChr - (this.word.text.length - 1 + idx)].y
                };
                await this.addWord(new Word(this.word));
                await this.addWord(new Word(altWord));
            } else if (this.word.text.includes(":")) {
                altWord = JSON.parse(JSON.stringify(this.word));
                altWord.text = this.word.text.split(":")[1];
                this.word.text = this.word.text.split(":")[0];
                await this.addWord(new Word(this.word));
                //ugh need to figure out positioning
                await this.addWord(new Word(altWord));
            } else {
                await this.addWord(new Word(this.word));
            }
            this.word = {
                text: "",
                wordTop: 0,
                wordBot: 0
            };
            //start of word
        } else {
            this.word.text = "" + this.word.text + letter.matches[0].letter;
        }
        //blank letter image
        if (!this.word.wordTop || this.word.wordTop > letter.y) {
            this.word.wordTop = letter.y;
        }
        if (!this.word.wordBot || this.word.wordBot < letter.y + letter.height) {
            this.word.wordBot = letter.y + letter.height;
        }
        fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
        fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
        pct = (letter.y / img.height) - 0.02;
        full.style.top = "-" + (full.offsetHeight * pct) + "px";
        //full.style.top = "-" + (letter.y - 430) + "px";
        //full.style.left = "-" + (letter.x - 130) + "px";
        type.width = letter.width;
        type.height = letter.height;
        type.style.width = "auto";
        type.style.imageRendering = "-moz-crisp-edges";
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
        console.log("done");
        this.dLetters = [];
        await doc.upImage();
        this.word.wordTop = 0;
        this.word.wordBot = 0;
        return true;
    } else {
        //console.log("another");
        await util.wait(timings.letter);
        return doc.drawLetters();
    }
};
Doc.prototype.loadPage = function () {
    //ugh this is a mess, need to separate out:
    //if first load update url with paramters

    if (!this.url.searchParams.get("document")) {
        this.url.searchParams.set('document', this.title);
    }
    if (!this.url.searchParams.get("page")) {
        this.url.searchParams.set('page', this.currentPage);
    }

    console.log(this.url);
    history.pushState({}, this.title, this.url.search);
    var page;
    var pageDiv = document.createElement("div");

    var urlPage = this.url.searchParams.get("page") || 0;
    console.log(urlPage);

    if (!img.src) {
        console.log("no image, starting out, page", urlPage);
        this.currentPage = parseInt(urlPage, 10);
        page = this.pages[urlPage];
        console.log(page);
    } else if (this.currentPage >= this.pages.length - 1) {
        console.log("starting over, end of document reached");
        window.location.href = this.url.origin + this.url.pathname + "?document=new";

    } else if (this.url.searchParams.get("page") < this.pages.length) {
        console.log("page exists within range, url already set");
        this.currentPage = parseInt(this.url.searchParams.get("page"), 10);
        page = this.pages[this.currentPage];

        console.log(this.currentPage);
        /* this doesn't work, update history. 
        this.url.searchParams.delete('page');
        this.url.searchParams.append('page', this.currentPage);
        */
    } else {
        console.log(this.currentPage);
        this.currentPage = parseInt(this.currentPage + 1, 10);

        // update history
        console.log(this.url.href);
        console.log(this.currentPage);
        console.log("iterating page, now " + this.currentPage);
        page = this.pages[this.currentPage];
        var pageDivs = document.querySelectorAll(".page");
        for (var i = 0; i < pageDivs.length; i++) {
            if (i < this.currentPage - 1) {
                pageDivs[i].style.display = "none";
            }
        }
        words.scrollTop = words.scrollHeight;
    }
    if (this.metadata) {
        document.querySelector("#pages").textContent = "Page: " + (this.currentPage) + " / " + (parseInt(this.metadata.PageCount, 10) - 1);
    }
    console.log(this.currentPage);
    pageDiv.classList.add("page");
    pageDiv.id = "page" + this.currentPage;
    words.appendChild(pageDiv);
    img.src = '';
    img.src = page;
    console.log("loaded " + this.pages[this.currentPage]);
};
Doc.prototype.getLines = function () {

    //get line data from OCRAD
    console.log("running ocr");
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

var compare = async function (word, dict) {
    return new Promise(function (resolve) {

        wWorker.postMessage({
            word: word,
            dict: dict
        });
        wWorker.onmessage = function (result) {
            resolve(result.data);
        }
    });
};
