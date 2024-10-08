var container, full, fullCtx, img, words, type, typeCtx, rawdict, suspectdict, otop, json, txt, read;

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

util.paused = false;

util.pause = function () {
    util.pause = !util.pause;
};

for (let t in timings) {
    //timings[t] = timings[t] * 0.6;
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
    this.widest = 0;
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

//differences between ocrad and tess emerge here





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
//differences end here?
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
    if (util.paused) {
        await util.wait(500000);
    }
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
        //this.lineDiv.style.minHeight = this.lineDiv.offsetHeight + "px";
    }
    words.scrollTop = words.scrollHeight;
    this.potpos++;
    if (this.potpos >= this.potentials.length) {
        this.potpos = 0;
    }

    //if (themode === "tesseract") {
        if (wd.span.offsetWidth > wd.widest) {
            wd.widest = wd.span.offsetWidth;

            wd.parent.style.width = wd.widest + "px";
            if (themode === "ocrad"){
                wd.parent.style.width = wd.widest + 10 + "px";

            }
        }
    //}

    var wTime = (300 / (thispot.distance || 1)) + 250 + (Math.random() * 100);
    await util.wait(wTime);
    /*if (thispot.type === "suspicious") {
      console.log("flipping from " + thispot.distance + " " + thispot.type + " " + thispot.word + " in " + (300 / thispot.distance + 250));
      console.table(wd.potentials);
    }*/
    wd.flip();
};
console.log(document.readyState);
if (document.readyState == "complete" || document.readyState == "interactive") {
    wWorker = new Worker('dist.js');
    wWorker.onmessage = function (result) {
        if (result.data === "ready") {
            begin();
        } else {
            return Promise.resolve(result.data);
        }
    };
} else {
    document.addEventListener("DOMContentLoaded", async function () {
        console.log("DOM loaded");
        wWorker = new Worker('dist.js');
        wWorker.onmessage = function (result) {
            if (result.data === "ready") {
                begin();
            } else {
                return Promise.resolve(result.data);
            }
        };
    });

}
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

var begin = async function () {

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
    datadistance = document.querySelector("#distance");
    json = document.querySelector("#json");
    type = document.querySelector("#type");
    typeCtx = type.getContext("2d");
    let dicts;
    if (!rawdict && !suspectdict) {
        dicts = await Promise.all([get("dict.json"), get("suspect.json")]);
    }
    url = new URL(window.location.href);


    //console.dir(dicts);
    rawdict = JSON.parse(dicts[0]);
    suspectdict = JSON.parse(dicts[1]);
    let pick = await getDoc();
    let mode;
    if (!pick.completedModes.includes("tesseract_2.1.1")){
        mode = "tesseract_2.1.1";
    }
    else {
        for (let m of pick.modes){  
            if (!pick.completedModes.includes(m)){
                mode = m;
            }
        }
    }
    thedoc = buildPages(pick);
    console.log(mode, thedoc.lastPage);

    console.log(thedoc);
    let mod = await pickMode(mode);
    console.log(mod);
    statement = new Doc({
        pages: thedoc.pages,
        title: thedoc.title,
        root: thedoc.root,
        meta: thedoc.meta,
        mode: mode,
        lastPage: thedoc.lastPage[mode],
    });


};

//doc constructinator
var Doc = function (options) {
    console.log(options);
    var doc = this;
    this.mode = options.mode;
    this.pages = options.pages;
    this.hearingId = options.hearingId;
    this.root = options.root;
    this.title = options.title;


    if (options.lastPage){
       this.currentPage = options.lastPage + 1;
    }
    console.log(this);
    this.exhibition = url.searchParams.get("exhibition");
    if (!this.exhibition){
       this.exhibition = url.searchParams.get("exh");
    }
    this.meta = options.meta;
    document.title = "operational character rendition: " + this.title;
   console.log("hello");
    console.log(options.root);
    let troot = options.root.substring(0, options.root.length - 1);
    let jsonURL = `${troot}.pdf.json`;

    aFetch(jsonURL).then(async (result) => {
        let cons = document.querySelector("#console");
        let meta = document.querySelector("#meta");
        
        if (!result) {
            meta.style.display = "none";
            return false;
        }
        console.log("OOOO", jsonURL);
        meta.textContent = "";
        meta.style.display = "block";

        this.metadata = result;
        this.dataIndex = 0;
        this.txmetadata = JSON.stringify(result);
        meta.style.opacity = 0;
        meta.style.display = block;

        meta.style.transition = "0.25s linear opacity";
        document.querySelector("#meta").textContent = this.txmetadata;
        meta.style.fontSize = (parseFloat(window.getComputedStyle(cons).fontSize) * (cons.offsetHeight / meta.offsetHeight)) + 0.1 + "pt";
	console.log(meta.style.fontSize);


	//if (this.exhibition === "slash"){
	   console.log("SMALLER");
	   meta.style.fontSize = parseFloat(meta.style.fontSize) * 0.4 + "pt";
	//}
        console.log("size", meta.style.fontSize);
        meta.style.opacity = 100;
	util.resize();
        await util.wait(5000);
        //doc.cycleData();
    }).catch((e) => {
        console.log(e);
        document.querySelector('#meta').style.display = "none";
    });



    window.setTimeout(function () {
        json.style.display = "none";
        otop.style.display = "block";
        container.style.display = "block";
        doc.init();
    }, timings.start);
    //this.newline;
};


aFetch = async function (url) {
    try {
        let result = await fetch(url);
        result = await result.json();
        if (result) {
            return result;
        } else {
            return false;
        }
    } catch (e) {
        return false;

    }
};

//wtf does this do
Doc.prototype.cycleData = async function () {

    if (this.dataIndex < (Object.keys(this.metadata).length - 1)) {
        this.dataIndex++;
    } else {
        this.dataIndex = 0;
    }

    document.querySelector("#data").textContent = Object.keys(this.metadata)[this.dataIndex] + ": " + Object.values(this.metadata)[this.dataIndex];
    //await util.wait(8000);

    this.cycleData();

};

const getCircularReplacer = () => {
    const seen = new WeakSet();
    return (key, value) => {
        if (typeof value === "object" && value !== null) {
            if (seen.has(value)) {
                return;
            }
            seen.add(value);
        }
        return value;
    };
};


Doc.prototype.upWords = async function () {
    let doc = this;
    let url = this.url.searchParams.get("event");
    let text = "";
    if (!this.mode.includes("_")){
        this.mode = this.mode + "_" + this.version;
    }
    for (let w of this.words) {
        text = text + w.text + " ";
    }
    form = {
        "page": this.currentPage,
        "text": text,
        "words": this.words,
        "root": this.root,
        "title": this.title,
        "mode": this.mode,
        "exh": this.exhibition
    };

    let sData = JSON.stringify(form, getCircularReplacer());
    console.log(sData);
    console.log("sending json");
    try {
        let resp = await fetch(doc.dataUrl, {
            method: "post",
            body: sData
        });
        let data = await resp.json();
        console.log("Request succeeded with JSON response", data);

        return Promise.resolve();


    } catch (e) {
        //todo add to visible console
        console.log("request failed");
        return Promise.resolve();
    }

};

Doc.prototype.upError = async function (page) {
    let doc = this;
    let url = this.url.searchParams.get("event");
    if (!this.mode.includes("_")){
        this.mode = this.mode + "_" + this.version;
    }
    form = {
        "error": "bad image: " + page,
        "page": this.currentPage,
        "root": this.root,
        "title": this.title,
        "mode": this.mode,
        "exh": this.url.searchParams.get("exhibition")

    };

    var sData = JSON.stringify(form, getCircularReplacer());
    console.log("sending image");
    try {
        let resp = await fetch(doc.dataUrl, {
            method: "post",
            body: sData
        });
        let data = await resp.json();
        console.log("Request succeeded with JSON response", data);

        return Promise.resolve();


    } catch (e) {
        //todo add to visible console
        console.log("request failed");
        return Promise.resolve();
    }
};


Doc.prototype.upImage = async function () {
    let doc = this;
    let url = this.url.searchParams.get("event");
    if (!this.mode.includes("_")){
        this.mode = this.mode + "_" + this.version;
    }
    form = {
        "page": this.currentPage,
        "pageImg": full.toDataURL(),
        "words": this.words,
        "root": this.root,
        "title": this.title,
        "mode": this.mode,
        "exh": this.exhibition
    };


    var sData = JSON.stringify(form, getCircularReplacer());
    console.log("sending image");
    try {
        let resp = await fetch(doc.dataUrl, {
            method: "post",
            body: sData
        });
        let data = await resp.json();
        console.log("Request succeeded with JSON response", data);

        return Promise.resolve();


    } catch (e) {
        //todo add to visible console
        console.log("request failed");
        return Promise.resolve();
    }
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

//TODO MAKE CHANGES HERE
Doc.prototype.init = function () {

    if (window.location.href.includes("localhost")) {
        this.dataUrl = "http://localhost:3000";
    } else {
        this.dataUrl = "https://oversightmachin.es:3000/";
    }
    this.version = theversion;

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
    this.url.searchParams.set("mode", this.mode);
    var pageparam = parseInt(this.url.searchParams.get('page'), 10);
    console.log("comparing ", pageparam, " from url ", this.currentPage, " currentPage");
    
    if (typeof pageparam !== "undefined" && pageparam < this.pages.length && !isNaN(pageparam)) {
        if (this.currentPage > pageparam) {
            this.url.searchParams.set('page', this.currentPage);
        } else {
            this.currentPage = pageparam;
        }
    } else if (this.currentPage >= this.pages.length) {
                let targurl = `${this.url.origin}${this.url.pathname}?document=new`;
        if (this.exhibition) {
            targurl = targurl + "&exhibition=" + this.exhibition;
        }
        window.location.href = targurl;
    } else {
	if (!this.currentPage){
            this.currentPage = 0;
	}
        this.url.searchParams.set('page', this.currentPage);

    }

    history.pushState({}, (this.title + "_" + this.currentPage), this.url.search);
    var doc = this;
    console.log("init");
    full.style.transition = "clip-path 1s";
    full.style.clipPath = "inset(0 0 100%)";
    let img = document.querySelector("img");
    img.addEventListener("load", async function () {

        typeCtx.clearRect(0, 0, type.width, type.height);
        read.textContent = "";
        console.log("copying img");
        full.style.top = "0";
        //await util.copyImage(this);
        console.log("image loaded");
        full.width = img.width;
        full.height = img.height;
        fullCtx.drawImage(img, 0, 0);
        doc.process();
    }, {
        once: true
    });

    this.loadPage();
};

util.delay = 750;
util.throttled = false;
util.calls = 0;

window.addEventListener('resize', function() {
	// only run if we're not throttled
  if (!util.throttled) {
    // actual callback action
    util.resize();
    // we're throttled!
    throttled = true;
    // set a timeout to un-throttle
    setTimeout(function() {
      throttled = false;
    }, util.delay);
  }  
});


util.resize = async function(){
	let meta = document.querySelector("#meta");
	let cons = document.querySelector("#console");
	/*let mult = cons.offsetHeight / meta.offsetHeight;
	let mult = meta.offsetHeight / window.innerHeight;
	let size = parseFloat(window.getComputedStyle(meta).getPropertyValue("font-size")) / mult;
	meta.style.fontSize = size + "px";
	return size;*/
        let steps = 0;
        let buffer = [];
	let ssz = [];
	while (Math.abs(window.innerHeight - meta.offsetHeight) > 25 && steps < 40){
               let x = window.innerHeight - meta.offsetHeight;
	       let xx = Math.abs(x);
	       let unit;
	       if (xx > 500) {
		  unit = 4;
	       } else if (xx > 200 && xx <= 500) {
                  unit = 2;
	       } else if (xx > 100 && xx <= 200) {
                  unit = 1;
	       } else {
                  unit = 0.5
	       }
               console.log("did", x, Math.abs(x));
	       let sz;
               if (x > 0){
                 sz = parseFloat(meta.style.fontSize) + unit;
               } else {
                 sz = parseFloat(meta.style.fontSize) - unit;
               }
		 meta.style.fontSize = sz + "px";
	         steps++;
	         buffer.push(x);
		 ssz.push(sz);
	       if (buffer.length > 15 && buffer.includes(x)){
                 steps = 40000;

	       }

	}
        /*
        let asdf = window.setInterval(() => {

	   if (Math.abs(window.innerHeight - meta.offsetHeight) > 20){
	       let x = window.innerHeight - meta.offsetHeight;
	       console.log("did", x);
               if (x > 0){
                   meta.style.fontSize = parseFloat(meta.style.fontSize) + 2 + "px";
               } else {
                   meta.style.fontSize = parseFloat(meta.style.fontSize) - 2 + "px";
               }
           }
	}, 20);*/
}

util.copyImage = async function (img) {
    console.log("loading image");
    full.width = img.width;
    full.height = img.height;
    //fullCtx.clearRect(0, 0, full.width, full.height);
    var line = 0;
    while (line < img.height) {
        //fullCtx.drawImage(this, 0, 0);
        fullCtx.drawImage(img, 0, line, img.width, 1, 0, line, full.width, 1);
        line++;
        if (line % 3 === 0) {
            console.log("waitin");
            await util.wait(timings.imgDelay);
        }
    }
    fullCtx.drawImage(img, 0, 0, img.width, img.height);
    console.log("done copying");
    return Promise.resolve();
};


Word.prototype.showLetters = async function (doc) {
    for (let chr of this.symbols) {
        chr.height = chr.bbox.y1 - chr.bbox.y0;
        chr.width = chr.bbox.x1 - chr.bbox.x0;
        fullCtx.clearRect(chr.bbox.x0, chr.bbox.y0, chr.width, chr.height);
        pct = (chr.bbox.y0 / img.height) - 0.02;
        full.style.top = "-" + (full.offsetHeight * pct) + "px";
        //full.style.top = "-" + (letter.y - 430) + "px";
        //full.style.left = "-" + (letter.x - 130) + "px";
        type.width = chr.width;
        type.height = chr.height;
        type.style.width = "auto";
        type.style.imageRendering = "-moz-crisp-edges";
        type.style.height = "100%";
        type.style.maxHeight = "25vh";
        typeCtx.clearRect(0, 0, type.width, type.height);
        //copy letter image
        try {
            typeCtx.drawImage(img, chr.bbox.x0, chr.bbox.y0, chr.width || 1, chr.height || 1, 0, 0, type.width || 1, type.height || 1);
        } catch (e) {
            console.log(e, img, chr.bbox.x0, chr.bbox.y0, chr.width, chr.height, 0, 0, type.width, type.height);
            throw (e);
        }
        //read.style.fontSize = "15vh";
        read.style.color = "white";
        //blank letter
        read.textContent = "";
        read.textContent = chr.text;
        await util.wait(timings.letter);
    }
    await doc.addWord(this);
    await util.wait(1000);

};



Doc.prototype.loadPage = async function () {
    //ugh this is a mess, need to separate out:
    //if first load update url with paramters

    if (!this.url.searchParams.get("document")) {
        this.url.searchParams.set('document', this.title);
    }
    if (!this.url.searchParams.get("page")) {
        this.url.searchParams.set('page', this.currentPage);
    }
    let doc = this;
    console.log(this.url);
    history.pushState({}, this.title, this.url.search);
    var page;
    var pageDiv = document.createElement("div");

    var urlPage = this.url.searchParams.get("page") || 0;
    console.log(urlPage);
    console.log(this);
    if (!img.src) {
        console.log("no image, starting out, page", urlPage);
        this.currentPage = parseInt(urlPage, 10);
        page = this.pages[urlPage];
        console.log(page);
    } else if (this.currentPage > this.pages.length - 1) {
        console.log("starting over, end of document reached");
        let targurl = `${this.url.origin}${this.url.pathname}?document=new`;
        if (this.exhibition) {
            targurl = targurl + "&exhibition=" + this.exhibition;
        }
        window.location.href = targurl;

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
            if (i < this.currentPage - 5) {
                pageDivs[i].style.display = "none";
            }
        }
        words.scrollTop = words.scrollHeight;
    }
    if (this.metadata && document.querySelector("#pages")) {
        //document.querySelector("#pages").textContent = "Page: " + (this.currentPage) + " / " + (parseInt(this.metadata.PageCount, 10) - 1);
    }
    console.log(this.currentPage);
    pageDiv.classList.add("page");
    pageDiv.id = "page" + this.currentPage;
    words.appendChild(pageDiv);
    img.src = '';
    await util.wait(3000);
    try {
        util.testImage(page);       
    } catch(e) {
        doc.upError(page);
        return doc.init();
    }
    img.src = page;
    console.log("loaded " + this.pages[this.currentPage]);



};


util.testImage = async function (url) {

    const myRequest = new Request("url");
    let resp = await fetch(url);
    console.log(resp.status);
    if (resp.status === 200){
        return Promise.resolve();
    } else {
        return Promise.reject(resp.status);
    }

};

function get(url) {
    // Return a new promise.
    return new Promise(function (resolve, reject) {
        // Do the usual XHR stuff
        var req = new XMLHttpRequest();
        req.open("GET", url);
        req.setRequestHeader("Cache-Control", "no-cache, no-store, max-age=0");
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
        };
    });
};

let getDoc = async function(){
    await util.wait(5000);
    var targetDoc = url.searchParams.get("document") || false;
    var exh = url.searchParams.get("exhibition") || url.searchParams.get("exh") || 0;
    let docs;
    if (exh === "slash"){
        docs = await get("slashdata.json");
    } else {
        docs = await get("ocrdata.json");
    }
    console.log(targetDoc);


    
    docs = JSON.parse(docs);

    if (targetDoc && targetDoc !== "new"){
        for (let d of docs){
	    console.log(d);
            d.root = d.localPath.replace("/mnt/oversee/", "https://oversightmachin.es/").replace(".pdf", "").replace(".PDF", "").replace(".txt", "/").replace("html", "").replace("illegible.us", "oversightmachin.es") + "/";
            d.title = d.localName.replace(".pdf", "").replace(".PDF", "");
            let pc = d.metadata.pageCount || d.metadata.PageCount;
            d.last = pc - 1;
            console.log(d.title);
            console.log(targetDoc);
            if (d.title === targetDoc){
                console.log("FOUND IT");
              
                console.log(d);
                return d;
            }
        }
    }
    let modes = docs[0].modes;
    for (let m of modes){
        for (let d of docs){
        console.log(d);

            if (!d.completedModes.includes(m)){
                console.log(d);
                d.root = d.localPath.replace("/mnt/oversee/", "https://oversightmachin.es/").replace(".pdf", "").replace(".PDF", "").replace(".txt", "/").replace("html", "").replace("illegible.us", "oversightmachin.es") + "/";
                d.title = d.localName.replace(".pdf", "").replace(".PDF", "");
                let pc = d.metadata.pageCount || d.metadata.PageCount;
                d.last = pc - 1;
		console.log("returning!", d);
                return d;
            }
        }
    }
};


let pickDoc = async function(){

    docs = [];
    var targetDoc = url.searchParams.get("document") || false;
    var targetPage = url.searchParams.get("page") || 0;
    var hearings = await get("data.json");
    hearings = JSON.parse(hearings);
    var candidates = [];
    var pick;
    for (var h of hearings.hearings) {
        for (var w of h.witnesses) {
            for (var p of w.pdfs) {
                if (!p.hasText || p.needsScan) {
                    let cand = {};
                    //console.log(p);
                    cand.meta = JSON.stringify(h);
                    let pc = p.metadata.pageCount || p.metadata.PageCount;
                    cand.last = pc - 1;
                    //FIX THIS IN SCRAPER JEEZ
                    console.log(p.localPath);
                    cand.root = p.localPath.replace("/mnt/oversee/", "https://oversightmachin.es/").replace(".pdf", "").replace(".PDF", "").replace(".txt", "/").replace("html", "").replace("illegible.us", "oversightmachin.es") + "/";
                    cand.title = p.localName.replace(".pdf", "").replace(".PDF", "");
                    candidates.push(cand);
                }
            }
        }
    }
    if (targetDoc && targetDoc !== "new") {
        console.log("searching for", targetDoc);
        for (var c of candidates) {
            //console.log(c.title);
            if (targetDoc === c.title) {
                console.log("MATCHED PICK");
                pick = c;
            }
        }
        console.log("**********************", pick);
        if (!pick) {
            console.log("document not found");
            console.log(hearings);
            await util.wait(5000);
            pick = candidates[Math.floor(Math.random() * candidates.length)];
        }
    } else {
        console.log(candidates);
        pick = candidates[Math.floor(Math.random() * candidates.length)];
    }

    console.log(typeof pick.meta);
    if (typeof pick.meta == "string") {
        pick.meta = JSON.parse(pick.meta);
        console.log(pick.meta);

    }
    return pick;
};
