var container, full, fullCtx, line, lineCtx, img, words, wat, type, typeCtx;
var begin, end, linetrack, lines = [],
  text = [],
  txt,
  ls = [],
  read,
  lstemp = [],
  busy = false,
  count = 0;
var suspect, dict;
var statement;
var interval = 103;
var stahp = false;
var block = ['-', '.', '`', '--', '='];

var word = function (options) {
  var wd = this;
  if (!options.text || (block.indexOf(options.text.trim()) !== -1)) {
    options.text = "?"
    options.fail = true;
  }
  if (options.text.trim().length === 0) {
    options.text = "?"
    options.fail = true;
  }
  console.log("word #" + statement.words.length + ": " + options.text);
  for (var opt in options) {
    this[opt] = options[opt];
  }
  this.potentials = [];
  this.potpos = 0;
  return wd;


}

word.prototype.draw = function () {
  var word = this;

  if (busy) {
    window.setTimeout(function () {
      word.draw();
    }, 50);
  } else {
    console.log("Drawing!" + this.text);
    busy = true;
    if (word.endpos) {
      read.style.fontSize = "15vh";

      var delay = 1250;
      var wordw = word.endpos.x - word.pos.x;
      var wordh = word.endpos.y - word.pos.y;
      type.width = wordw || 1;
      type.height = wordh || 1;
      console.log(wordw, wordh);
      typeCtx.clearRect(0, 0, type.width, type.height);
      var post = "";
      txt.textContent = "";
      read.textContent = "";
      var readMsg = "";
      if (word.potentials.length > 1) {
        for (var i = 0; i < word.potentials.length; i++) {
          if (i !== word.potentials.length - 1) {
            post = "//";
            read.style.fontSize = "8vh";
            long = 5000;
          }
          read.classList.add('word');

          readMsg = readMsg + word.potentials[i].word + post;
        }
      } else {
        readMsg = word.text;
      }
      console.log(type.width, type.height, word.pos.x);

      typeCtx.drawImage(img, word.pos.x, word.pos.y, type.width, type.height, 0, 0, type.width, type.height);
      read.textContent = readMsg;
    }
    window.setTimeout(function () {
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
    for (var res of this.suspResults) {
      this.potentials.push({
        "word": res.word,
        "distance": res.distance,
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
  this.potpos++;
  if (this.potpos >= this.potentials.length) {
    this.potpos = 0;
  }
  var thispot = this.potentials[this.potpos];

  span.textContent = thispot.word + " ";
  if (thispot.type === "suspicious") {
    span.style.color = "red";
  } else {
    span.style.color = "white";
  }

  window.setTimeout(function () {
    wd.flip();
  }, 300 / thispot.distance + 100)

};

document.addEventListener("DOMContentLoaded", function (event) {
  console.log("setting up");

  //set up all the things.  fold thes into the object at some point
  container = document.querySelector('#container');
  full = document.querySelector('#full');
  fullCtx = full.getContext('2d');
  line = document.querySelector('#line');
  lineCtx = line.getContext('2d');
  img = document.querySelector('img');
  words = document.querySelector('#words');
  var imgData;
  wat = document.querySelector('#wat');
  txt = document.querySelector('#text');
  read = document.querySelector('#read');

  type = document.querySelector("#type");
  typeCtx = type.getContext("2d");


  Promise.all([get('dict.json'), get('suspect.json')]).then(function (values) {
    rawdict = JSON.parse(values[0]);
    suspectdict = JSON.parse(values[1]);
    document.querySelector('#waiting').textContent = "";

    /*statement = new Doc({
  pages: ['questionnaire00.jpg', 'questionnaire01.jpg', 'questionnaire02.jpg', 'questionnaire03.jpg', 'page0.jpg', 'page1.jpg', 'page2.jpg'],
    title: 'Buckley Statement',
    hearingId: 'asdf'
});*/
    statement = new Doc({
      pages: ['texts/090521_litt-0.jpg', 'texts/090521_litt-1.jpg', 'texts/090521_litt-2.jpg'],
      title: 'Litt statement'
    });



  });


});
//doc constructinator
var Doc = function (options) {

  this.pages = options.pages;
  this.hearingId = options.hearingId;
  this.title = options.title;
  this.currentPage = 0;

  this.init();
  this.newline;
};





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

}

Doc.prototype.processLines = function () {
  var doc = this;
  console.log("got " + this.lines.length + " lines, processing")
  for (var i = 0; i < this.lines.length; i++) {
    var line = this.lines[i];

    fullCtx.fillStyle = "rgb(0,0,0)";
    //console.dir(line);
    var lineHeight = line.height;
    for (var j = 0; j < line.letters.length; j++) {
      var letter = line.letters[j];
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
    //console.dir(word);
    var span = document.createElement('span');
    word.span = span;
    span.style.fontSize = word.lineHeight * .6 + "px";
    if (word.text !== "? ") {
      this.words.push(word);
    }
    span.textContent = word.text + " "
    words.appendChild(span);

    if (word.lineEnd) {
      span.previousSibling.insertAdjacentHTML('beforeend', "<br/><br/>");
    }

    words.scrollTop = words.scrollHeight;

    if (word.text.length > 2) {

      var comp = compare(word.text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, ""), rawdict);
      if (comp) {
        if (comp.low === 0 || comp.words.length === 1) {
          span.textContent = comp.words[0].word + " ";
        } else {
          span.textContent = comp.words[0].word + " ";

          //span.textContent = span.textContent + JSON.stringify(comp);
        }
        word.rawResults = comp.words;

      } else {
        word.compFailed = true;
        span.classList.add('iffy');
      }
    }


    if (word.text.length > 2) {

      word.draw();
      var comp = compare(word.text.toLowerCase().replace(/[^a-zA-Z0-9]+/g, ""), suspectdict);
      if (comp) {
        span.classList.add('suspect');
        if (comp.low === 0) {
          span.textContent = comp.words[0].word + " ";
        } else {
          span.textContent = comp.words[0].word + " ";

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

  var doc = this;
  if (stahp) {
    return false;
  }
  if (busy) {
    console.log("busy");
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
    var pct = (letter.y / img.height) - .2;
    if (pct < 0) {
      pct = 0;
    }
    full.style.top = "-" + (full.clientHeight * pct) +
      "px";

    if (letter.matches.length) {
      for (var match of letter.matches) {

        matches = matches + match.letter;
        //console.log(matches);
      }
      if (letter.wordEnd || matches.indexOf(' ') !== -1 || matches.indexOf(',') !== -1) {
        letter.wordEnd = true;

        if (letter.wordEnd) {
          console.log("wordend, matches: " + matches);
          this.word.text = "" + this.word.text + letter.matches[0].letter;
        }
        if (letter.lineEnd) {
          this.word.lineEnd = true;
        }

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


        if (this.word.text == "" || this.word.text == "-") {
          this.word = {
            text: ''
          };
        } else if (this.word.text.includes('--')) {
          var idx = this.word.text.indexOf('--');
          var altWord = JSON.parse(JSON.stringify(this.word));
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
          var altWord = JSON.parse(JSON.stringify(this.word));
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
      var pct = (letter.y / img.height) - .2;
      full.style.top = "-" + (full.clientHeight * pct) +
        "px";
      //full.style.top = "-" + (letter.y - 430) + "px";

      //full.style.left = "-" + (letter.x - 130) + "px";
      type.width = letter.width;
      type.height = letter.height;
      typeCtx.clearRect(0, 0, type.width, type.height);

      typeCtx.drawImage(img, letter.x, letter.y, letter.width, letter.height, 0, 0, type.width, type.height);
      txt.textContent = matches;
    } else {
      txt.textContent = "???";
    }

  }

  if (this.dLetters.length === this.letters.length) {
    console.log('done');
    this.dLetters = [];
    return true;
  } else {
    window.setTimeout(function () {
      doc.drawLetters();
    }, interval);




  };
};


Doc.prototype.loadPage = function () {
  var page;
  words.appendChild(document.createElement('hr'));
  if (this.currentPage >= this.pages.length) {
    return false;
  }

  if (!img.src) {
    console.log("no image, starting out, page 0");
    page = this.pages[0];

  } else if (this.currentPage >= this.pages.length - 1) {
    return false;
  } else {
    console.log(this.currentPage);
    this.currentPage = this.currentPage + 1;
    console.log(this.currentPage);
    console.log("iterating page, now " + this.currentPage);
    page = this.pages[this.currentPage];
  }
  img.src = page;
  console.log("loaded " + this.pages[this.currentPage]);
};


Doc.prototype.getLines = function () {

  //get line data from OCRAD
  var lines = OCRAD(img, {
    verbose: true
  }).lines;

  //filter out small lines and lines with no characters
  for (var line of lines) {
    if (line.height > 8 && line.letters.length) {
      this.lines.push(line);
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