var container, full, fullCtx, line, lineCtx, img, words, wat, type, typeCtx;
var begin, end, linetrack, lines = [],
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
var letterInterval = 100;
//var interval = 50;
var stahp = false;
var block = ['-', '.', '`', '--', '='];

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

word.prototype.draw = function () {
  var word = this;
  var delay = 1250;
  if (busy) {
    window.setTimeout(function () {
      word.draw();
    }, 50);
  } else {
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
        read.style.fontSize = fsize + "vh";
        readMsg = JSON.stringify(wlist);
      } else {
        readMsg = word.text;
      }
      //console.log(type.width, type.height, word.pos.x);

      typeCtx.drawImage(img, word.pos.x, word.pos.y, type.width, type.height, 0, 0, type.width, type.height);
      read.textContent = readMsg;
    }
    window.setTimeout(function () {
      word.span.style.display = "inline";

      if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
        word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
        word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
      }
      busy = false;
    }, delay);
  }
};

word.prototype.pots = function () {
  this.draw();

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
    susps = this.suspResults;
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
};

word.prototype.flip = function () {
  var wd = this;
  var span = this.span;
  var thispot = this.potentials[this.potpos];

  span.textContent = thispot.word + " ";
  if (thispot.type === "suspicious") {
    span.style.color = "red";
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
  var imgData;
  otop = document.querySelector('#top');
  txt = document.querySelector('#text');
  read = document.querySelector('#read');
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

  }, 10000);
  //this.newline;
};


function buildPages(doc) {
  doc.pages = [];
  console.log(doc);
  for (i = 0; i < doc.last + 1; i++) {
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



Doc.prototype.addWord = function (word) {
  if (!word || word.fail) {
    return false;
  } else {
    console.log(word.lineNum);
    word.pageDiv = document.querySelector("#page" + this.currentPage);
    if (!document.querySelector("#line" + this.currentPage + "_" + word.lineNum)) {
      word.lineDiv = document.createElement('div');
      word.lineDiv.id = "line" + this.currentPage + "_" + word.lineNum;
      word.lineDiv.classList.add('line');
      word.pageDiv.appendChild(word.lineDiv);

    } else {
      word.lineDiv = document.querySelector("#line" + this.currentPage + "_" + word.lineNum);
    }
    //console.dir(word);
    var span = document.createElement('span');
    var ssize;
    ssize = word.lineHeight * 0.55;
    if (ssize > 40) {
      ssize = 40;
    }
    if (ssize < 20) {
      ssize = 20;
    }
    span.style.fontSize = ssize + "px";
    console.log(span.style.fontSize);
    if (word.text !== "? ") {
      this.words.push(word);
    }
    span.textContent = word.text + " ";
    span.style.display = "none";
    word.span = span;

    word.lineDiv.appendChild(span);
    word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;

    words.scrollTop = words.scrollHeight;
    var comp;
    if (word.text.length > 2) {

      comp = compare(word.text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, ""), rawdict);
      if (comp) {
        if (comp.low === 0 || comp.words.length === 1) {
          span.textContent = comp.words[0].word + " ";
        } else {
          span.textContent = comp.words[0].word + " ";
          if (word.lineDiv.offsetHeight > word.lineDiv.dataset.highest) {
            word.lineDiv.dataset.highest = word.lineDiv.offsetHeight;
            word.lineDiv.style.minHeight = word.lineDiv.offsetHeight + "px";
          }
        }
        word.rawResults = comp.words;

      } else {
        word.compFailed = true;
        span.classList.add('iffy');
      }
    }


    if (word.text.length > 2) {

      word.draw();
      comp = compare(word.text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, ""), suspectdict);
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
        //word.compFailed = true;
        //span.classList.add('iffy');
      }

      word.pots();
    }
  }
};



Doc.prototype.drawLetters = function () {

  var doc = this,
    pct;
  if (stahp) {
    window.setTimeout(doc.drawLetters, 1000);
  }
  if (busy) {
    //console.log("busy");
  } else {
    var startWord,
      matches = "";
    this.dLetters.push(this.letters[this.currentChr]);

    this.currentChr++;
    if (this.currentChr >= this.letters.length) {
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
        var altword;

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
          this.addWord(new word(this.word));
          this.addWord(new word(altWord));
        } else if (this.word.text.includes(':')) {
          altWord = JSON.parse(JSON.stringify(this.word));
          altWord.text = this.word.text.split(':')[1];
          this.word.text = this.word.text.split(':')[0];
          this.addWord(new word(this.word));
          //ugh need to figure out positioning
          this.addWord(new word(altWord));
        } else {
          this.addWord(new word(this.word));
        }

        this.word = {
          text: ''
        };

      } else {
        this.word.text = "" + this.word.text + letter.matches[0].letter;
      }
      fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
      fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
      pct = (letter.y / img.height) - .02;
      full.style.top = "-" + (full.offsetHeight * pct) +
        "px";
      //full.style.top = "-" + (letter.y - 430) + "px";

      //full.style.left = "-" + (letter.x - 130) + "px";
      type.width = letter.width;
      type.height = letter.height;
      typeCtx.clearRect(0, 0, type.width, type.height);

      typeCtx.drawImage(img, letter.x, letter.y, letter.width, letter.height, 0, 0, type.width, type.height);
      read.style.fontSize = "15vh";
      read.textContent = "";
      read.textContent = matches;
    } else {
      read.style.fontSize = "15vh";

      read.textContent = "???";
    }

  }

  if (this.dLetters.length === this.letters.length) {
    console.log('done');
    this.dLetters = [];
    return true;
  } else {
    window.setTimeout(function () {
      doc.drawLetters();
    }, letterInterval);




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