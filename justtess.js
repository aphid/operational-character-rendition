
Word.prototype.draw = async function () {
    //by this time linediv should be at the appropriate height and left indentation

    //console.log("DRAWING WORD", this.text)
    var wd = this;
    wd.span.style.display = "none";
    if (this.is_serif) {
        wd.span.style.fontFamily = "serif";
    } else if (this.is_monospace) {
        wd.span.style.fontFamily = "monospace";
    } else {
        wd.span.style.fontFamily = "monospace";
    }

    if (this.is_bold) {
        wd.span.style.fontWeight = "bold";
    }
    if (this.is_italic) {
        wd.span.style.fontStyle = "italic"
    }
    if (this.is_underlined) {
        wd.span.style.fontStyle = "italic"
    }

    if (this.is_smallcaps) {
        wd.span.style.fontVariant = "smallcaps";
    }
    let pct = parseFloat(full.offsetHeight / img.height).toFixed(2);

    this.ppos = {};
    this.ppos.x = (parseInt(this.bbox.x0) * pct);
    this.ppos.y = parseInt(this.bbox.y0 * pct);
    this.ppos.w = parseInt(this.bbox.x1 - this.bbox.x0) * pct;
    this.ppos.h = parseInt(this.bbox.y1 - this.bbox.y0) * pct;



    if (statement.lastWord && statement.lastWord.lineTop == this.lineTop) {
        //console.log("------------")
        //console.log(this.ppos);
        //console.log(statement.lastWord.ppos);

        let lastEdge = statement.lastWord.span.getBoundingClientRect().right - words.getBoundingClientRect().left;

        let widdiff = Math.abs(this.ppos.x - lastEdge);
        //let lastEdge = statement.lastWord.ppos.x + statement.lastWord.ppos.w;
        //let widdiff = Math.abs(this.ppos.x - lastEdge);
        console.log("(((((((((((((", widdiff)
        let gap = (wd.font_size / 6);
        let newVal = lastEdge + gap;
        if (gap < 8) {
            gap = 8;
        }

        //alert(widdiff + " " + gap)
        if (widdiff < gap) {
            //console.log(lastEdge)
            console.log("too close", widdiff, gap);

            console.log(newVal);
            this.ppos.x = newVal;
        } else if (widdiff > gap && widdiff < gap * 10) {

            console.log("too far", widdiff, gap);
            this.ppos.x = newVal;


        }
        let newDiff = wd.ppos.x - lastEdge;
        if (newDiff < gap) {
            this.ppos.x = lastEdge + gap;
        }
        console.log(lastEdge, statement.lastWord.span.textContent, this.ppos.x, this.span.textContent, newDiff);

        wd.parent.style.marginLeft = (wd.ppos.x - lastEdge) + "px";

    } else {
        wd.parent.style.left = 0;
    }

    //wd.parent.style.top = wd.ppos.y + "px";
    wd.parent.style.width = "auto";
    wd.parent.style.height = wd.ppos.h + "px";
    wd.parent.style.position = "relative";
    //fitty(wd.span, { multiLine: false, maxSize: 60 }).fit() ;
    var delay = timings.word;
    //console.log("Drawing!" + this.text);
    busy = true;

    //read.style.fontSize = "13vh";
    var fsize;
    var wordw = wd.bbox.x1 - wd.bbox.x0;
    var wordh = wd.bbox.y1 - wd.bbox.y0;
    type.width = wordw || 1;
    type.height = wordh || 1;
    //console.log(wordw, wordh);
    typeCtx.clearRect(0, 0, type.width, type.height);
    txt.textContent = "";
    read.textContent = "";
    var readMsg = "";
    var wlist = [];
    /*
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
        */
    readMsg = wd.text;
    var src = getSource(wd.type);
    //read.style.color = src.color;
    //datadistance.textContent = "Levenshtein distance: 0";
    //datasource.textContent = "Match: " + src.type;

    //console.log(type.width, type.height, word.pos.x);
    type.style.width = "50%";
    type.style.maxHeight = "25vh";
    typeCtx.drawImage(img, wd.bbox.x0, wd.bbox.y0, type.width, type.height, 0, 0, type.width, type.height);
    read.textContent = readMsg;

    //console.log("starting cycle", wd.text);
    await wd.setUpCycle();
    //console.log("ending cycle", wd.text);
    //await (util.wait(delay))
    wd.span.style.display = "inline-block";
    let h = (wd.bbox.y1 - wd.bbox.y0) * pct;
    let fs = parseInt(wd.lineDiv.style.fontSize.replace("px", "")) || 0;

    if (h > fs && h < 120) {
        console.log("changing font size")
        wd.lineDiv.style.fontSize = h + "px";
    }
    //fitty(wd.span, { maxHeight: wd.ppos.h });


    /*
    if (wd.lineDiv.offsetHeight > wd.lineDiv.dataset.highest) {
        wd.lineDiv.dataset.highest = wd.lineDiv.offsetHeight;
        wd.lineDiv.style.minHeight = wd.lineDiv.offsetHeight + "px";
    } */
    await util.wait(delay);
    if (statement.pause == true) {
        await util.wait(500000);
    }
    console.log("returning draw");
};

Doc.prototype.process = async function () {
    var doc = this;
    const {
        TesseractWorker
    } = Tesseract;
    var OEM = Tesseract.OEM;
    console.log("reading page");
    const worker = new TesseractWorker({
        //init_oem: OEM.TESSERACT_ONLY,
        workerPath: "lib/tesseract/worker.min.js",
        langPath: 'lib/tesseract/lang-data',
        corePath: 'lib/tesseract/tesseract-core.wasm.js'
    });

    worker
        .recognize(img, "eng", {
            /*
            tessedit_enable_doc_dict: 0,
            load_system_dawg: 0,
            load_freq_dawg: 0,
            load_punc_dawg: 0
            */
        })

        .progress(async (progress) => {

            const p = (progress.progress * 100).toFixed(2);
            //reveal based on %?
            /* prog.style.width = p + "%";
            prog.textContent = progress.status;
            */
            if (progress.status == "recognizing text") {
                full.style.clipPath = "inset(0 0 " + (100 - p) + "%)";
            }
        })
        .then(async (result) => {
            document.querySelector("#meta").style.transition = "4s linear opacity";
            document.querySelector("#meta").style.opacity = 0.2;
            await util.wait(7000);
            full.style.transition = "clip-path 0s";

            console.log(result.words.length);
            doc.rawLines = result.lines;
            await doc.processWords();
        }).finally(async function () {
            console.log("oof");

            await doc.upImage();
	    await util.wait(5000);
            await doc.upWords();
	    await util.wait(5000);	
            await util.wait(timings.docFinished);
            full.style.transition = "none";

            full.style.clipPath = "inset(0 0 100 %)";

            document.querySelector("#page" + doc.currentPage).style.borderBottom = "1px solid #333";
            doc.currentPage++;

            typeCtx.clearRect(0, 0, type.width, type.height);
            doc.init();

        });


};

Doc.prototype.addWord = async function (word) {

    console.log("&&&&&&&&&&&&&&&& adding word " + word.text);
    var doc = this;
    if (!word || word.fail) {
        //console.log("%%%%%%%%%%%% no word");
        console.log(word);
        return false;
    }

    // console.log(word.lineNum);
    word.pageDiv = document.querySelector("#page" + doc.currentPage);
    //sees if we need a newline
    if (!document.querySelector("#line" + doc.currentPage + "_" + word.lineNum)) {
        word.lineDiv = document.createElement("div");
        word.lineDiv.id = "line" + doc.currentPage + "_" + word.lineNum;
        word.lineDiv.classList.add("line");
        let ml = ((word.leftpct * 100 - 5) || 1);
        if (ml < 5) {
            ml = 5;
        }
        word.lineDiv.style.marginLeft = ml + "%";
        //word.lineDiv.style.marginTop = word.lineTop + "px";
        word.pageDiv.appendChild(word.lineDiv);


        // wd.calculatePcts();
        let pct = parseFloat(full.offsetHeight / img.height).toFixed(2);

        //word.lineDiv.fontSize;
        let prevLT;
        if (word.prevLine) {
            console.log(word.prevLine);
            prevLT = word.prevLine.bbox.y1 * pct;
            //+ prevLT.clientHeight;
        } else {
            prevLT = 0;
        }
        //console.log(word.bbox.y0 * pct, word.lineTop, prevLT)
        let lineDif = parseInt((word.bbox.y0 * pct) - prevLT);

        //alert(lineDif);
        console.log("moving 907");
        /* FIX THIS */
        word.lineDiv.style.marginTop = lineDif + "px";

    } else {
        word.lineDiv = document.querySelector("#line" + doc.currentPage + "_" + word.lineNum);
    }
    word.rawResults = [];

    var parent = document.createElement("div");

    parent.style.display = "inline-block";
    var ssize;
    ssize = word.lineHeight * .7;
    if (ssize > 50) {
        ssize = 50;
    }
    if (ssize < 25) {
        ssize = 25;
    }

    //span.style.fontSize = ssize + "px";
    let scaleSize = word.font_size * (full.offsetWidth / img.width);
    scaleSize = parseFloat(Math.floor(scaleSize));

    scaleSize = scaleSize + "px";
    console.log(scaleSize);
    //parent.style.fontSize = scaleSize;
    //console.log(span.style.fontSize);
    //i forget this use case
    if (word.text !== "? ") {
        //doc.words.push(word);
    }
    //parent.style.border = "1px solid orange";
    word.parent = parent;
    let span = document.createElement("span");
    word.span = word.parent.appendChild(span);
    word.span.display = "none";
    word.span.textContent = word.text + " ";
    //adds space



    word.lineDiv.appendChild(word.parent);
    word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
    //scrolls into view
    words.scrollTop = words.scrollHeight;
    var comp;
    //word.clean = word.text.replace(/[^a-zA-Z0-9]+/g, "");
    word.clean = word.text;
    //console.time(word.clean);
    comp = await compare(word.clean, "raw");
    //console.timeEnd(word.clean);
    if (comp) {
        //one result
        if (comp.low === 0 || comp.words.length === 1) {
            word.span.textContent = comp.words[0].word + " ";
        } else {
            word.span.textContent = comp.words[0].word + " ";
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
        word.span.classList.add("iffy");
    }
    comp = await compare(word.clean, "susp");
    if (comp) {
        word.span.classList.add("suspect");
        if (comp.low === 0) {
            word.span.textContent = comp.words[0].word + " ";
        } else {
            word.span.textContent = comp.words[0].word + " ";
            if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
                word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
                word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
            }
            //span.textContent = span.textContent + JSON.stringify(comp);
        }
        word.suspResults = comp.words;
    } else {
        //console.log("no results in susp for ", word.text);
        //word.compFailed = true;
        //span.classList.add("iffy");
    }

    await word.pots();
    //console.log("&&&&&& ending word", word.text);

    doc.lastWord = word;

};

Doc.prototype.processWords = async function () {
    console.log("got " + this.rawLines.length + " lines, processing");
    let pct = parseFloat(full.offsetWidth / img.width).toFixed(2);


    let lineTop = this.rawLines[0].bbox.y0 * pct;
    let thisPage = document.querySelector("#page" + this.currentPage);
    let offset = (lineTop * (full.offsetHeight / img.height) + "px");
    console.log(thisPage, offset, lineTop);
    thisPage.style.paddingTop = offset;

    for (let l = 0; l < this.rawLines.length; l++) {
        //console.log("reading line", l)
        let line = this.rawLines[l];


        for (let w = 0; w < line.words.length; w++) {
            let word = line.words[w];
            word.line = l;
            if (l > 0) {
                word.prevLine = this.rawLines[l - 1];
            }
            word.lineNum = l;
            word.lineTop = line.bbox.y0 / img.height;

            word.leftpct = line.bbox.x0 / img.width;
            if (w == line.words.length - 1) {
                //probably nothing
            }
            this.words.push(new Word(word))
        }
    }
    console.log("words have been set up");
    console.log(this.words.length);

    for (let w = 0; w < this.words.length; w++) {
        let word = this.words[w];
        console.log("WORD #", w);
        typeCtx.clearRect(0, 0, type.width, type.height);
        read.textContent = "";
        await word.showLetters(this);
        if (word.lineNum > this.currentLine) {
            this.currentLine++;
            //alert(this.currentLine);
        }
    }

};
