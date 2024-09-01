
Word.prototype.draw = async function() {
    var wd = this;
    return new Promise(async function(resolve) {
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


}

Doc.prototype.process = async function() {
    console.log("processing image");
    for (let prog = 0; prog < 100; prog++){
        full.style.clipPath = "inset(0 0 " + (100 - prog) + "%)";
        await util.wait(500);
    }
    document.querySelector("#console").style.opacity = 0.2;
    await util.wait(7000);

    this.getLines().processLines();
};
Doc.prototype.processLines = async function() {
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

Doc.prototype.drawLetters = async function() {
    if (util.paused) {
        await util.wait(3);
        return await this.drawLetters();
    }
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
        await util.wait(timings.docFinished);
        full.style.transition = "none";

        full.style.clipPath = "inset(0 0 100 %)";

        document.querySelector("#page" + doc.currentPage).style.borderBottom = "1px solid #333";
        doc.currentPage++;

        typeCtx.clearRect(0, 0, type.width, type.height);
          
        read.textContent = "";
        await this.upImage()
        await this.upWords();
        await util.wait(timings.docFinished);
        console.log(this.currentPage);
        this.currentPage++;
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
        fullCtx.clearRect(letter.x, letter.y, letter.width, letter.height);
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
        //await doc.upImage();
        this.word.wordTop = 0;
        this.word.wordBot = 0;
        return true;
    } else {
        //console.log("another");
        await util.wait(timings.letter);
        return doc.drawLetters();
    }
};

Doc.prototype.addWord = async function(word) {

    //console.log("&&&&&&&&&&&&&&&& adding word " + word.text);
    var doc = this;
    return new Promise(async function(resolve) {
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
