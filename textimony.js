var container, full, fullCtx, line, lineCtx, img, words, wat, type, typeCtx;
var begin, end, linetrack, lines = [],
  text = [],
  ls = [],
  lstemp = [],
  pause, count = 0;
var suspect, dict;
var statement;

document.addEventListener("DOMContentLoaded", function (event) {


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
  type = document.querySelector("#type");
  typeCtx = type.getContext("2d");


  Promise.all([get('dict.json'), get('suspect.json')]).then(function (values) {
    dict = FuzzySet(JSON.parse(values[0]));
    suspect = FuzzySet(JSON.parse(values[1]));
    statement = new Doc({
      pages: ['page0.jpg', 'page1.jpg', 'page2.jpg'],
      title: 'Buckley Statement',
      hearingId: 'asdf'
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
  this.word = "";
  this.dLetters = [];
  this.currentLine = 0;
  this.currentChr = 0;


  var doc = this;
  console.log("init");
  document.querySelector('img').onload = function () {
    full.width = this.width;
    full.height = this.height;
    this.style.display = "none";
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
      }
      if (letter.height > 60 || letter.width > 60) {
        console.log(letter);
      } else {
        this.letters.push(letter);
      }
    }
  }
  doc.drawLetters();


};

Doc.prototype.addWord = function (word) {
  this.words.push(word);
  var span = document.createElement('span');
  span.textContent = word + " ";
  words.appendChild(span);
  window.setTimeout(function () {
    console.log("trying " + word);
    var fuzzy = dict.get(word);
    fuzzy = fuzzy[0];
    if (fuzzy[0] > 0.65) {
      span.textContent = fuzzy[1] + " ";
    }

  }, 1000);
  window.setTimeout(function () {
    console.log("trying " + word);
    var fuzzy = suspect.get(word);
    fuzzy = fuzzy[0];
    if (fuzzy[0] > 0.7) {
      span.textContent = "*" + fuzzy[1] + "* ";
    }

  }, 1000);
};


Doc.prototype.drawLetters = function () {
  var doc = this;
  var startWord,
    matches = "";
  this.dLetters.push(this.letters[this.currentChr]);

  this.currentChr++;
  if (this.currentChr >= this.letters.length) {
    this.dLetters = [];
    this.init();
  }

  var letter = this.letters[this.currentChr];
  if (letter.matches.length) {
    for (var match of letter.matches) {

      matches = matches + match.letter;
    }
    if (letter.wordEnd || matches.indexOf(' ') !== -1 || matches.indexOf(',') !== -1) {

      if (letter.wordEnd) {
        console.log("wordend, matches: " + matches);
        this.word = "" + this.word + letter.matches[0].letter;
      }
      this.addWord(this.word);
      this.word = "";

    } else {
      this.word = "" + this.word + letter.matches[0].letter;
    }
    fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
    fullCtx.fillRect(letter.x, letter.y, letter.width, letter.height);
    full.style.top = "-" + (letter.y - 5) + "px";
    full.style.left = "-" + letter.x + "px";
    type.width = letter.width;
    type.height = letter.height;
    typeCtx.clearRect(0, 0, type.width, type.height);

    typeCtx.drawImage(img, letter.x, letter.y, letter.width, letter.height, 0, 0, type.width, type.height);
    document.querySelector('#text').textContent = matches;
  } else {
    document.querySelector('#text').textContent = "???";
  }



  if (this.dLetters.length === this.letters.length) {
    console.log('done');
    this.dLetters = [];
    return true;
  } else {
    window.setTimeout(function () {
      doc.drawLetters();
    }, 5);




  };
};


Doc.prototype.loadPage = function () {
  var page;

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