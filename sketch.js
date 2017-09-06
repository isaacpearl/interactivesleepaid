'use strict';
/* 
GLOBAL VARIABLES 
*/

//display parameters
var canvas; //reference to canvas object in DOM
var w, h; //width and height
var landscape; //boolean used for aspect ratio
var buttonSize; //display size for buttons
var onColor; //color for active buttons
var offColor = 100; //color for inactive buttons
var stepColor = 150; //color for inactive buttons in the current step

//sequencer parameters
var sequencer;
var waveForm = 'sine';
var scaleFreqs = [1108.74, 987.76, 830.6, 739.98, 659.26, 554.36, 415.3, 370, 329.62, 293.66, 246.94, 220];
var notes = {};
var thisStep = -1;
var sequenceLength = scaleFreqs.length;
var bpm = 50;


/*
   ___ _                    
  / __| |__ _ ______ ___ ___
 | (__| / _` (_-<_-</ -_|_-<
  \___|_\__,_/__/__/\___/__/

*/

/*
MetroNote is a workaround for a bug in the p5.Part.onCall() method;
here we call step() at every step of the loop, not just the first iteration through
*/
class MetroNote {
  constructor() {
    this.pattern = Array(sequenceLength);
    //initialize pattern array with 1s
    for (var i = 0; i < this.pattern.length; i++) {
      this.pattern[i] = 1;
    }
    this.phrase = new p5.Phrase("metro", this.step, this.pattern);
  }

  step() {
    thisStep++;
    if (thisStep >= sequenceLength) {
      thisStep = 0;
    }
  }
}

class Note {
  constructor(freq) {
    //instance variables
    //set oscillator parameters
    this.osc = new p5.Oscillator();
    this.osc.setType(waveForm);
    this.osc.freq(freq);
    this.osc.amp(0);
    this.osc.start();

    //set envelope parameters
    this.attackTime = 0.01;
    this.decayTime = 0.5;
    this.susPercent = 0.2;
    this.releaseTime = 0.5;
    this.env = new p5.Env();
    this.env.setADSR(this.attackTime, this.decayTime, this.susPercent, this.releaseTime);
    this.env.setRange(1, 0);

    //set phrase parameters
    this.id = freq.toString();
    this.pattern = Array(sequenceLength);
    //initialize pattern array with 0s
    for (var i = 0; i < this.pattern.length; i++) {
      this.pattern[i] = 0;
    }
    this.phrase = new p5.Phrase(this.id, this.play, this.pattern);
  }

  //play this note
  play(sequence) {
    notes[this.name].playNote();
  }

  //helper function for play()
  playNote() {
    this.env.play(this.osc);
  }
}

class Button {
  constructor(noteValue) {
    //instance variables
    this.active = false;
    this.clicked = false;
    this.stepping = false;
    this.currentColor = offColor;
    this.noteValue = noteValue;
  }

  //activate the button in the editor
  activate() {
    this.active = true;
  }

  //deactivate the button in the editor
  deactivate() {
    this.active = false;
  }

  //get note value
  getNoteValue() {
    return this.noteValue;
  }

  //set color
  setColor(newColor) {
    this.currentColor = newColor;
  }

  //return current color
  getColor() {
    if (this.active) {
      this.currentColor = onColor;
      return (onColor);
    } else if (!this.active && !this.stepping) {
      this.currentColor = offColor;
      return (offColor);
    } else if (!this.active && this.stepping) {
      this.currentColor = stepColor;
      return (stepColor);
    } else return this.currentColor;
  }
}

class Sequencer {
  constructor(notes) {
    //instance variables
    //grid settings
    this.grid = [] //two dimensional array of button objects

    //instantiate sequence elements
    this.sequence = new p5.Part();
    masterVolume(0.3);
    this.isPlaying = true;

    //add note patterns to sequence and process notes with default parameters (for now)
    for (var key in notes) {
      this.sequence.addPhrase(notes[key].phrase);
    }
    var metro = new MetroNote();
    this.sequence.addPhrase(metro.phrase);
    this.sequence.setBPM(bpm);
    this.sequence.loop();

    //fill grid array with Button objects
    for (var i = 0; i < sequenceLength; i++) {
      var column = [] //create this column of buttons
      for (var j = 0; j < sequenceLength; j++) { //fill this column with buttons
        var toAdd = new Button(scaleFreqs[j].toString());
        column[j] = toAdd;
      }
      this.grid[i] = column; //add this column array to the grid array
    }

  }

  //play the sequence
  play() {
    this.sequence.loop();
    this.isPlaying = true;
  }

  //pause the sequence
  pause() {
    this.sequence.pause();
    this.isPlaying = false;
  }

  //reset the sequence
  reset() {
    for (var note in notes) {
      this.resetNote(note);
    }
    for (var i = 0; i < this.grid.length; i++) {
      for (var j = 0; j < this.grid[i].length; j++) {
        this.grid[i][j].deactivate();
      }
    }
  }

  //edit a step in the sequence 
  editNote(note, step, value) {
    var newPattern = notes[note].pattern;
    newPattern[step] = value;
    this.sequence.replaceSequence(note.id, newPattern);
    return newPattern;
  }

  //quickly reset a note's sequence to empty
  resetNote(note) {
    for (var i = 0; i < sequenceLength; i++) {
      this.editNote(note, i, 0);
    }
  }


  //get current partstep
  getStep() {
    return this.sequence.partStep;
  }

  //return button object
  getButton(x, y) {
    return this.grid[x][y];
  }
}

/*
  __  __     _   _            _    
 |  \/  |___| |_| |_  ___  __| |___
 | |\/| / -_)  _| ' \/ _ \/ _` (_-<
 |_|  |_\___|\__|_||_\___/\__,_/__/

*/

//start, stop, and/or reset the sequence
function keyPressed() { //convert to switch statement
  if (keyCode === 32) { //start or stop
    if (sequencer.isPlaying) {
      sequencer.pause();
    } else {
      sequencer.play();
    }
  } else if (keyCode === ESCAPE) { //reset
    sequencer.reset();
  }
}

//check if finger/cursor is over a given button
function overButton(x, y, rectWidth, rectHeight) {
  if (touches.length > 0) {
    for (var i = 0; i < touches.length; i++) {
      var touch = touches[i];
      if (touch.x >= x && touch.x <= x + rectWidth &&
        touch.y >= y && touch.y <= y + rectHeight) {
        return true;
      } else {
        return false;
      }
    }
  }

  if (pmouseX >= x && pmouseX <= x + rectWidth &&
    pmouseY >= y && pmouseY <= y + rectHeight) {
    return true;
  } else {
    return false;
  }
}

//guarentee only 1 registered click at a time per button
function mouseReleased() {
  for (var i = 0; i < sequenceLength; i++) {
    for (var j = 0; j < sequenceLength; j++) {
      sequencer.grid[i][j].clicked = false;
    }
  }
}

//to prevent false touch registers
function touchStarted() {
  return false;
}

//reactive GUI
function windowResized() {
  resizeCanvas(windowWidth, windowHeight);
  checkOrientation()
}

/*
  __  __      _      
 |  \/  |__ _(_)_ _  
 | |\/| / _` | | ' \ 
 |_|  |_\__,_|_|_||_|
 
*/

function setup() {
  onColor = color(253, 209, 50);
  //set up display size and canvas DOM element
  checkOrientation()
  var canvas = createCanvas(w, h);
  canvas.parent("seq-holder");

  //set up sketch display parameters
  background(0);
  strokeWeight(.3);
  rectMode(CORNER);

  //instantiate notes hashmap
  for (var i = 0; i < scaleFreqs.length; i++) {
    var toAdd = new Note(scaleFreqs[i]);
    notes[toAdd.id] = toAdd;
  }

  //instantiate sequencer
  sequencer = new Sequencer(notes);

  //draw grid
  drawGrid();
}

function draw() {
  background(0);
  drawGrid();
}

function drawGrid() {
  if (landscape) {
    var x = ((w / 2) - buttonSize * 6);
  } else {
    var x = 0;
  }
  for (var i = 0; i < sequenceLength; i++) {
    if (landscape) {
      var y = 1;
    } else {
      var y = ((h / 2) - buttonSize * 6);
    }
    for (var j = 0; j < sequenceLength; j++) {
      var thisButton = sequencer.grid[i][j];
      if (thisStep == i) {
        thisButton.stepping = true;
      } else {
        thisButton.stepping = false;
      }
      if (overButton(x, y, buttonSize, buttonSize)) {
        if (thisButton.active && (mouseIsPressed || touches.length > 0) && !thisButton.clicked) {
          thisButton.clicked = true;
          thisButton.deactivate();
          sequencer.editNote(thisButton.noteValue, i, 0)
        } else if (!thisButton.active && (mouseIsPressed || touches.length > 0) && !thisButton.clicked) {
          thisButton.clicked = true;
          thisButton.activate();
          sequencer.editNote(thisButton.noteValue, i, 1)
        }
      }
      fill(thisButton.getColor());
      rect(x, y, buttonSize, buttonSize);
      y += buttonSize + .25;
    }
    x += buttonSize + .25;
  }
}

function checkOrientation() {
  w = windowWidth;
  h = windowHeight;
  if (w > h) {
    landscape = true;
    buttonSize = (h / sequenceLength) - (1 / sequenceLength);
  } else {
    landscape = false;
    buttonSize = (w / sequenceLength) - (1 / sequenceLength);
  }
}