//  Timeline.js v0.1 / 2011-05-01
//  A compact JavaScript animation library with a GUI timeline for fast editing.
//  by Marcin Ignac (http://marcinignac.com)
//
// THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
// IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
// FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
// AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
// LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING
// FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS
// IN THE SOFTWARE.

Timeline.prototype.initGUI = function () {
  var self = this;

  this.trackLabelWidth = 152;
  this.trackLabelHeight = 28;
  this.tracksScrollWidth = 16;
  this.tracksScrollHeight = 0;
  this.tracksScrollThumbPos = 0;
  this.tracksScrollThumbHeight = 0;
  this.tracksScrollY = 0;
  this.timeScrollWidth = 0;
  this.timeScrollHeight = 16;
  this.timeScrollThumbPos = 0;
  this.timeScrollThumbWidth = 0;
  this.timeScrollX = 0;
  this.headerHeight = 40;
  this.canvasHeight = 200;
  this.draggingTime = false;
  this.draggingTracksScrollThumb = false;
  this.draggingTimeScrollThumb = false;
  this.draggingKeys = false;
  this.draggingTimeScale = false;
  this.selectedKeys = [];
  this.timeScale = 1;
  this.trackNameCounter = 0;
  this.timelineEndKey = null; //used to dynamically extend timeline
  this.displayableTracks = [];
  this.timelineTracksColorPalette = [];
  this.keyframeSpanPattern = null;
  this.tracksThemeColor = "#EEEEEE"
  //this.tracksThemeColor = "#DDDDDD"


  this.prepareFonts();
  this.loadCssStyleSheet("https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.4.2/css/all.min.css") //fontawesome.
  this.prepareTimelineTracksColorPallete();
  this.loadKeyframeSpanPattern("/src/stripe-pattern.jpg");
  this.initTracks();
  this.load();

  this.container = document.createElement("div");
  this.container.style.width = "100%";
  this.container.style.height = this.canvasHeight + "px";
  this.container.style.background = "#EEEEEE";
  this.container.style.position = "fixed";
  this.container.style.left = "0px";
  this.container.style.bottom = "0px";
  document.body.appendChild(this.container);

  this.splitter = document.createElement("div");
  this.splitter.style.width = "100%";
  this.splitter.style.height = "4px";
  this.splitter.style.cursor = "ns-resize";
  this.splitter.style.position = "fixed";
  this.splitter.style.left = "0px";
  this.splitter.style.bottom = (this.canvasHeight - 2) + "px";
  this.splitter.addEventListener("mousedown", function () {
    function mouseMove(e) {
      var h = (window.innerHeight - e.clientY);
      self.splitter.style.bottom = (h - 2) + "px";
      self.container.style.height = h + "px";
      self.canvasHeight = h;
      self.tracksScrollY = 0;
      self.tracksScrollThumbPos = 0;
      self.save();
    }
    function mouseUp(e) {
      document.body.removeEventListener("mousemove", mouseMove, false);
      document.body.removeEventListener("mouseup", mouseUp, false);
    }
    document.body.addEventListener("mousemove", mouseMove, false);
    document.body.addEventListener("mouseup", mouseUp, false);
  }, false);
  document.body.appendChild(this.splitter);

  this.canvas = document.createElement("canvas");
  this.c = this.canvas.getContext("2d");
  this.c.font = '14px Ariel';
  this.canvas.width = 0;
  this.container.appendChild(this.canvas);


  this.buildInputDialog();

  this.canvas.addEventListener('click', function (event) {
    self.onMouseClick(event);
  }, false);
  this.canvas.addEventListener('mousedown', function (event) {
    self.onMouseDown(event);
  }, false);
  document.body.addEventListener('mousemove', function (event) {
    self.onDocumentMouseMove(event);
  }, false);
  this.canvas.addEventListener('mousemove', function (event) {
    self.onCanvasMouseMove(event);
  }, false);
  document.body.addEventListener('mouseup', function (event) {
    self.onMouseUp(event);
  }, false);
  this.canvas.addEventListener('dblclick', function (event) {
    self.onMouseDoubleClick(event);
  }, false);
};

Timeline.prototype.onMouseDown = function (event) {
  this.selectedKeys = [];

  var x = event.layerX;
  var y = event.layerY;

  if (x > this.trackLabelWidth && y < this.headerHeight) {
    //timeline
    this.draggingTime = true;
    this.onCanvasMouseMove(event);
  }
  else if (x > this.canvas.width - this.tracksScrollWidth && y > this.headerHeight) {
    //tracks scroll
    if (y >= this.headerHeight + this.tracksScrollThumbPos && y <= this.headerHeight + this.tracksScrollThumbPos + this.tracksScrollThumbHeight) {
      this.tracksScrollThumbDragOffset = y - this.headerHeight - this.tracksScrollThumbPos;
      this.draggingTracksScrollThumb = true;
    }
  }
  else if (x > this.trackLabelWidth && y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) {
    //keys
    this.selectKeys(event.layerX, event.layerY);
    if (this.selectedKeys.length > 0) {
      this.draggingKeys = true;
    }
    this.cancelKeyClick = false;
  }
  else if (x < this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    //time scale
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
    this.draggingTimeScale = true;
    this.save();
  }
  else if (x > this.trackLabelWidth && y > this.canvasHeight - this.timeScrollHeight) {
    //time scroll
    if (x >= this.trackLabelWidth + this.timeScrollThumbPos && x <= this.trackLabelWidth + this.timeScrollThumbPos + this.timeScrollThumbWidth) {
      this.timeScrollThumbDragOffset = x - this.trackLabelWidth - this.timeScrollThumbPos ;
      this.draggingTimeScrollThumb = true;
    }
  }
};

Timeline.prototype.onDocumentMouseMove = function (event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.draggingTime) {
    this.time = this.xToTime(x);
    var animationEnd = this.findAnimationEnd();
    if (this.time < 0) this.time = 0;
    if (this.time > animationEnd) this.time = animationEnd;
  }
  if (this.draggingKeys) {
    for (var i = 0; i < this.selectedKeys.length; i++) {
      var draggedKey = this.selectedKeys[i];
      draggedKey.time = Math.max(0, this.xToTime(x));
      this.sortTrackKeys(draggedKey.track);
      this.rebuildSelectedTracks();
    }
    this.cancelKeyClick = true;
    this.timeScrollThumbPos = this.timeScrollX * (this.timeScrollWidth - this.timeScrollThumbWidth);
  }
  if (this.draggingTimeScale) {
    this.timeScale = Math.max(0.01, Math.min((this.trackLabelWidth - x) / this.trackLabelWidth, 1));
    this.save();
  }
};

Timeline.prototype.onCanvasMouseMove = function (event) {
  var x = event.layerX;
  var y = event.layerY;

  if (this.draggingTracksScrollThumb) {
    this.tracksScrollThumbPos = y - this.headerHeight - this.tracksScrollThumbDragOffset;
    if (this.tracksScrollThumbPos < 0) {
      this.tracksScrollThumbPos = 0;
    }
    if (this.tracksScrollThumbPos + this.tracksScrollThumbHeight > this.tracksScrollHeight) {
      this.tracksScrollThumbPos = Math.max(0, this.tracksScrollHeight - this.tracksScrollThumbHeight);
    }
    if (this.tracksScrollHeight - this.tracksScrollThumbHeight > 0) {
      //this.tracksScrollY = this.tracksScrollThumbPos/(this.tracksScrollHeight - this.tracksScrollThumbHeight);
      this.tracksScrollY = this.tracksScrollThumbPos / (this.tracksScrollHeight - this.tracksScrollThumbHeight - 11.5); //to account for taller tracks.
    }
    else {
      this.tracksScrollY = 0;
    }
  }
  if (this.draggingTimeScrollThumb) {
    this.timeScrollThumbPos = x - this.trackLabelWidth - this.timeScrollThumbDragOffset;
    if (this.timeScrollThumbPos < 0) {
      this.timeScrollThumbPos = 0;
    }
    if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
      this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    if (this.timeScrollWidth - this.timeScrollThumbWidth > 0) {
      this.timeScrollX = this.timeScrollThumbPos / (this.timeScrollWidth - this.timeScrollThumbWidth);
    }
    else {
      this.timeScrollX = 0;
    }
  }
};

Timeline.prototype.onMouseUp = function (event) {
  if (this.draggingTime) {
    this.draggingTime = false;
  }
  if (this.draggingKeys) {
    this.draggingKeys = false;
  }
  if (this.draggingTracksScrollThumb) {
    this.draggingTracksScrollThumb = false;
  }
  if (this.draggingTimeScale) {
    this.draggingTimeScale = false;
  }
  if (this.draggingTimeScrollThumb) {
    this.draggingTimeScrollThumb = false;
  }
};

Timeline.prototype.onMouseClick = function (event) {
  if (event.layerX < 1 * this.headerHeight - 4 * 0 && event.layerY < this.headerHeight) {
    this.play();
  }
  if (event.layerX > 1 * this.headerHeight - 4 * 0 && event.layerX < 2 * this.headerHeight - 4 * 1 && event.layerY < this.headerHeight) {
    this.pause();
  }

  if (event.layerX > 2 * this.headerHeight - 4 * 1 && event.layerX < 3 * this.headerHeight - 4 * 2 && event.layerY < this.headerHeight) {
    this.stop();
  }

  if (event.layerX > 3 * this.headerHeight - 4 * 2 && event.layerX < 4 * this.headerHeight - 4 * 3 && event.layerY < this.headerHeight) {
    this.exportCode();
  }

  if (this.selectedKeys.length > 0 && !this.cancelKeyClick) {
    this.showKeyEditDialog(event.pageX, event.pageY);
  }

  //track expansion and retraction
  if (event.layerX < this.trackLabelWidth && event.layerY > this.headerHeight) {
     const clickedTrack = this.getAnyTrackAt(event.layerX,event.layerY)
     this.toggleTrackPropertiesExpansion(clickedTrack)
     
  }
};

Timeline.prototype.onMouseDoubleClick = function (event) {
  var x = event.layerX;
  var y = event.layerY;

  if (x > this.trackLabelWidth && y < this.headerHeight) {
    //timeline
    var timeStr = prompt("Enter time") || "0:0:0";
    var timeArr = timeStr.split(":");
    var seconds = 0;
    var minutes = 0;
    var hours = 0;
    if (timeArr.length > 0) seconds = parseInt(timeArr[timeArr.length - 1], 10);
    if (timeArr.length > 1) minutes = parseInt(timeArr[timeArr.length - 2], 10);
    if (timeArr.length > 2) hours = parseInt(timeArr[timeArr.length - 3], 10);
    this.time = this.totalTime = hours * 60 * 60 + minutes * 60 + seconds;
  }
  else if (x > this.trackLabelWidth && this.selectedKeys.length === 0 && y > this.headerHeight && y < this.canvasHeight - this.timeScrollHeight) {
    this.addKeyAt(x, y);
  }
};

Timeline.prototype.addTimelineEndKey = function (aTimeInSeconds) {
  var xAtTime = this.timeToX(aTimeInSeconds)
  //note no Y value is required, as the end key will ALWAYS be added to 
  //the last track.
  this.addKeyAt(xAtTime, 0, true)
};


Timeline.prototype.addKeyAt = function (mouseX, mouseY, ...isEndKey) {

  //if we are being called in respect of adding an "time end key" then
  //we always append the key to the LAST track, otherwise we append the
  //key to the track at the specified mouse co-ordinates.
  var selectedTrack = null;
  if (isEndKey[0] == true) {
    selectedTrack = this.tracks[this.tracks.length - 1]
  } else {
    selectedTrack = this.getTrackAt(mouseX, mouseY);
  }

  console.log(selectedTrack);
  console.log(isEndKey)



  //console.log(selectedTrack)
  if (!selectedTrack) {
    return;
  }

  var newKey = {
    time: this.xToTime(mouseX),
    value: selectedTrack.target[selectedTrack.propertyName],
    easing: Timeline.Easing.Linear.EaseNone,
    track: selectedTrack
  };
  if (selectedTrack.keys.length === 0) {
    selectedTrack.keys.push(newKey);
  }
  else if (newKey.time < selectedTrack.keys[0].time) {
    newKey.value = selectedTrack.keys[0].value;
    selectedTrack.keys.unshift(newKey);
  }
  else if (newKey.time > selectedTrack.keys[selectedTrack.keys.length - 1].time) {
    newKey.value = selectedTrack.keys[selectedTrack.keys.length - 1].value;
    selectedTrack.keys.push(newKey);
  }
  else for (var i = 1; i < selectedTrack.keys.length; i++) {
    if (selectedTrack.keys[i].time > newKey.time) {
      var k = (selectedTrack.keys[i].time - newKey.time) / (selectedTrack.keys[i].time - selectedTrack.keys[i - 1].time);
      var delta = selectedTrack.keys[i].value - selectedTrack.keys[i - 1].value;
      newKey.easing = selectedTrack.keys[i - 1].easing;
      newKey.value = selectedTrack.keys[i - 1].value + delta * newKey.easing(k);
      selectedTrack.keys.splice(i, 0, newKey);
      break;
    }
  }
  this.selectedKeys = [newKey];
  this.rebuildSelectedTracks();

  if (isEndKey) {
    this.timelineEndKey = newKey;
  }
};

Timeline.prototype.getTrackAt = function (mouseX, mouseY) {
 // var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var scrollY = this.tracksScrollY * (this.displayableTracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
  var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY) / this.trackLabelHeight);

  if (clickedTrackNumber >= 0 && clickedTrackNumber >= this.displayableTracks.length || this.tracks[clickedTrackNumber].type == "object") {
    return null;
  }

  return this.displayableTracks[clickedTrackNumber];
};


//this variant also return reference to "object" tracks, as necessary
Timeline.prototype.getAnyTrackAt = function (mouseX, mouseY) {
  // var scrollY = this.tracksScrollY * (this.tracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
   var scrollY = this.tracksScrollY * (this.displayableTracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
   var clickedTrackNumber = Math.floor((mouseY - this.headerHeight + scrollY) / this.trackLabelHeight);
 
   if (clickedTrackNumber >= 0 && clickedTrackNumber >= this.displayableTracks.length) {
     return null;
   }
 
   return this.displayableTracks[clickedTrackNumber];
 };

Timeline.prototype.selectKeys = function (mouseX, mouseY) {
  this.selectedKeys = [];

  var selectedTrack = this.getTrackAt(mouseX, mouseY);

  if (!selectedTrack) {
    return;
  }

  for (var i = 0; i < selectedTrack.keys.length; i++) {
    var key = selectedTrack.keys[i];
    var x = this.timeToX(key.time);

    if (x >= mouseX - this.trackLabelHeight * 0.3 && x <= mouseX + this.trackLabelHeight * 0.3) {
      this.selectedKeys.push(key);
      break;
    }
  }
};

Timeline.prototype.preUpdate = function () {
  this.updateGUI();
};

Timeline.prototype.updateGUI = function () {
  if (!this.canvas) {
    this.initGUI();
  }

  this.canvas.width = window.innerWidth;
  this.canvas.height = this.canvasHeight;
  var w = this.canvas.width;
  var h = this.canvas.height;

  this.tracksScrollHeight = this.canvas.height - this.headerHeight - this.timeScrollHeight;
  var totalTracksHeight = this.displayableTracks.length * this.trackLabelHeight;
  var tracksScrollRatio = this.tracksScrollHeight / totalTracksHeight;
  this.tracksScrollThumbHeight = Math.min(Math.max(20, this.tracksScrollHeight * tracksScrollRatio), this.tracksScrollHeight);

  this.timeScrollWidth = this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth;
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(0); //100 to get some space after lask key
  var timeScrollRatio = Math.max(0, Math.min(visibleTime / animationEnd, 1));
  this.timeScrollThumbWidth = timeScrollRatio * this.timeScrollWidth;
  if (this.timeScrollThumbPos + this.timeScrollThumbWidth > this.timeScrollWidth) {
    this.timeScrollThumbPos = Math.max(0, this.timeScrollWidth - this.timeScrollThumbWidth);
  }

  this.c.clearRect(0, 0, w, h);

  /** 
  //buttons
  this.drawRect(0 * this.headerHeight - 4 * -1, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");
  this.drawRect(1 * this.headerHeight - 4 * 0, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");
  this.drawRect(2 * this.headerHeight - 4 * 1, 5, this.headerHeight - 8, this.headerHeight - 8, "AAAAAA");
  this.drawRect(3*this.headerHeight - 4 *  2, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");

  //play
  this.c.strokeStyle = "#777777";
  this.c.beginPath();
  this.c.moveTo(4 + 6.5, 5 + 5);
  this.c.lineTo(this.headerHeight - 8, this.headerHeight / 2 + 1.5);
  this.c.lineTo(4 + 6.5, this.headerHeight - 8);
  this.c.lineTo(4 + 6.5, 5 + 5);
  this.c.stroke();
  this.c.closePath();
  //this.c.fillStyle = "#333333";
  this.c.fillStyle = "#FFFFFF";
  this.c.fill();
 
  

  //pause
  
  this.c.strokeRect(this.headerHeight + 8.5, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11,);
  this.c.fillRect(this.headerHeight + 8.5, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11,);
  
  this.c.strokeRect(this.headerHeight + 8.5 + this.headerHeight / 6 + 2, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);
  this.c.fillRect(this.headerHeight + 8.5 + this.headerHeight / 6 + 2, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);

  //stop
  this.c.strokeRect(2 * this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);
  this.c.fillRect(2 * this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);

  //export
  //this.c.beginPath();
  //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 9.5);
  //this.c.lineTo(3*this.headerHeight - 4 *  2 + 11.5, this.headerHeight - 9.5);
  //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 13.5);
  //this.c.lineTo(3*this.headerHeight - 4 *  2 + 13.5, this.headerHeight - 13.5);
  //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 17.5);
  //this.c.lineTo(3*this.headerHeight - 4 *  2 + 15.5, this.headerHeight - 17.5);
  //this.c.stroke();

  //more info button
  this.c.font = '24.35px FontAwesome';
  this.c.fillText('\uf05a',3*this.headerHeight - 5 *  2 + 5.5, this.headerHeight - 9.5);

  //tracks area clipping path
  this.c.save();
  this.c.beginPath();
  this.c.moveTo(0, this.headerHeight + 1);
  this.c.lineTo(this.canvas.width, this.headerHeight + 1);
  this.c.lineTo(this.canvas.width, this.canvas.height - this.timeScrollHeight);
  this.c.lineTo(0, this.canvas.height - this.timeScrollHeight);
  this.c.clip();

  */
  
  this.displayableTracks = this.computeDisplayableTracks(this.tracks)
  for (var i = 0; i < this.displayableTracks.length; i++) {
    var yshift = this.headerHeight + this.trackLabelHeight * (i + 1);
    var scrollY = this.tracksScrollY * (this.displayableTracks.length * this.trackLabelHeight - this.canvas.height + this.headerHeight);
    yshift -= scrollY;
    if (yshift < this.headerHeight) continue;
    let curTrack = this.displayableTracks[i];
    if (curTrack.type == "object") {
      this.drawTrack(curTrack, yshift);
    }else{
      this.drawTrack(curTrack, yshift,-1);
    }

  }

  this.c.restore();

  //end of label panel
  this.c.lineWidth = 1;
  this.drawLine(this.trackLabelWidth, 0, this.trackLabelWidth, h, "#000000");

  //timeline

  var timelineStart = 0;
  var timelineEnd = 10;
  var lastTimeLabelX = 0;

  this.c.fillStyle = "#666666";
  var x = this.timeToX(0);
  //for(var sec=timelineStart; sec<timelineEnd; sec++) {
  var sec = timelineStart;
  while (x < this.canvas.width) {
   // x = this.timeToX(sec) + 20;
    x = this.timeToX(sec);
    this.drawLine(x, 0, x, this.headerHeight * 0.3, "#999999");

    var minutes = Math.floor(sec / 60);
    var seconds = sec % 60;
    var time = minutes + ":" + ((seconds < 10) ? "0" : "") + seconds;

    if (x - lastTimeLabelX > 30) {
      this.c.font = '12px KanitLight300';
      this.c.fillText(time, x - 10, this.headerHeight * 0.7);
      lastTimeLabelX = x;
    }
    sec += 1;
  }



  //time ticker
  //this.drawLine(this.timeToX(this.time) + 20, 0, this.timeToX(this.time) + 20, h, "#FF0000");
  //this.drawTimelineTicker(this.timeToX(this.time) + 20, 0, this.timeToX(this.time) + 20, h, "#FF0000", 40, 12, "#FF0000")
 // this.drawTimelineTicker(this.timeToX(this.time), 0, this.timeToX(this.time), h, "#AAAAAA", 48, 14, "#AAAAAA")
 this.drawTimelineTicker(this.timeToX(this.time), 0, this.timeToX(this.time), h, "#FF0000", 48, 14, "#FF0000")


  //function(x1, y1, x2, y2, color, triangleWidth, triangleHeight, triangleColor) 

  //time scale
  for (var j = 2; j < 20; j++) {
    var f = 1.0 - (j * j) / 361;
    this.drawLine(7 + f * (this.trackLabelWidth - 10), h - this.timeScrollHeight + 4, 7 + f * (this.trackLabelWidth - 10), h - 3, "#999999");
  }

  this.c.fillStyle = "#666666";
  this.c.beginPath();
  this.c.moveTo(7 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 7);
  this.c.lineTo(11 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 1);
  this.c.lineTo(3 + (1.0 - this.timeScale) * (this.trackLabelWidth - 10), h - 1);
  this.c.fill();

  //tracks scrollbar
  this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1, this.tracksScrollWidth, this.tracksScrollHeight, "#DDDDDD");
  if (this.tracksScrollThumbHeight < this.tracksScrollHeight) {
    this.drawRect(this.canvas.width - this.tracksScrollWidth, this.headerHeight + 1 + this.tracksScrollThumbPos, this.tracksScrollWidth, this.tracksScrollThumbHeight, "#999999");
  }

  //time scrollbar
  this.drawRect(this.trackLabelWidth, h - this.timeScrollHeight, w - this.trackLabelWidth - this.tracksScrollWidth, this.timeScrollHeight, "#DDDDDD");
  if (this.timeScrollThumbWidth < this.timeScrollWidth) {
    this.drawRect(this.trackLabelWidth + 1 + this.timeScrollThumbPos, h - this.timeScrollHeight, this.timeScrollThumbWidth, this.timeScrollHeight, "#999999");
  }

  //header borders
  this.drawLine(0, 0, w, 0, "#000000");
  this.drawLine(0, this.headerHeight, w, this.headerHeight, "#000000");
  this.drawLine(0, h - this.timeScrollHeight, this.trackLabelWidth, h - this.timeScrollHeight, "#000000");
  this.drawLine(this.trackLabelWidth, h - this.timeScrollHeight - 1, this.trackLabelWidth, h, "#000000");

  this.drawControlButttons();
};


Timeline.prototype.drawControlButttons = function () {

    //draw control buttons background.
    this.drawRect(0 * this.headerHeight * -1, 1, this.trackLabelWidth, this.headerHeight - 1, "#EEEEEE");


    //buttons
    this.drawRect(0 * this.headerHeight - 4 * -1, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");
    this.drawRect(1 * this.headerHeight - 4 * 0, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");
    this.drawRect(2 * this.headerHeight - 4 * 1, 5, this.headerHeight - 8, this.headerHeight - 8, "AAAAAA");
    this.drawRect(3 * this.headerHeight - 4 *  2, 5, this.headerHeight - 8, this.headerHeight - 8, "#AAAAAA");
  
    //play
    this.c.strokeStyle = "#777777";
    this.c.beginPath();
    this.c.moveTo(4 + 6.5, 5 + 5);
    this.c.lineTo(this.headerHeight - 8, this.headerHeight / 2 + 1.5);
    this.c.lineTo(4 + 6.5, this.headerHeight - 8);
    this.c.lineTo(4 + 6.5, 5 + 5);
    this.c.stroke();
    this.c.closePath();
    //this.c.fillStyle = "#333333";
    this.c.fillStyle = "#FFFFFF";
    this.c.fill();
   
    
  
    //pause
    
    this.c.strokeRect(this.headerHeight + 8.5, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11,);
    this.c.fillRect(this.headerHeight + 8.5, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11,);
    
    this.c.strokeRect(this.headerHeight + 8.5 + this.headerHeight / 6 + 2, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);
    this.c.fillRect(this.headerHeight + 8.5 + this.headerHeight / 6 + 2, 5 + 5.5, this.headerHeight / 6, this.headerHeight - 8 - 11);
  
    //stop
    this.c.strokeRect(2 * this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);
    this.c.fillRect(2 * this.headerHeight - 4 + 5.5, 5 + 5.5, this.headerHeight - 8 - 11, this.headerHeight - 8 - 11);
  
    //export
    //this.c.beginPath();
    //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 9.5);
    //this.c.lineTo(3*this.headerHeight - 4 *  2 + 11.5, this.headerHeight - 9.5);
    //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 13.5);
    //this.c.lineTo(3*this.headerHeight - 4 *  2 + 13.5, this.headerHeight - 13.5);
    //this.c.moveTo(3*this.headerHeight - 4 *  2 + 5.5, this.headerHeight - 17.5);
    //this.c.lineTo(3*this.headerHeight - 4 *  2 + 15.5, this.headerHeight - 17.5);
    //this.c.stroke();
  
    //more info button
    this.c.font = '24.35px FontAwesome';
    this.c.fillText('\uf05a',3*this.headerHeight - 5 *  2 + 5.5, this.headerHeight - 9.5);
  
    //tracks area clipping path
    this.c.save();
    this.c.beginPath();
    this.c.moveTo(0, this.headerHeight + 1);
    this.c.lineTo(this.canvas.width, this.headerHeight + 1);
    this.c.lineTo(this.canvas.width, this.canvas.height - this.timeScrollHeight);
    this.c.lineTo(0, this.canvas.height - this.timeScrollHeight);
    this.c.clip();
  

}


Timeline.prototype.computeDisplayableTracks = function (allTracksArr) {
  displayableTracksArr = [];
  allTracksArr.forEach((track) => {
    //we always display object tracks
    if (track.type == "object") {
      displayableTracksArr.push(track)
    } else {
      //we only display property tracks where there display
      //has been enabled for the parent (object) track
      if (track.parent.showPropertyTracks) {
        displayableTracksArr.push(track)
      }
    }
  });
  return displayableTracksArr;
}

Timeline.prototype.prepareTimelineTracksColorPallete = function () {
  this.timelineTracksColorPalette.push("#ffadad");
  this.timelineTracksColorPalette.push("#ffd6a5");
  //this.timelineTracksColorPalette.push("#fdffb6");
  this.timelineTracksColorPalette.push("#caffbf");
  this.timelineTracksColorPalette.push("#96e8ff");
  this.timelineTracksColorPalette.push("#a0c4ff");
  this.timelineTracksColorPalette.push("#bdb2ff");
  this.timelineTracksColorPalette.push("#debcff");
  this.timelineTracksColorPalette.push("#ffc6ff");
  this.timelineTracksColorPalette.push("#ffa7dc");
};


Timeline.prototype.getTimelineTrackColor = function (trackIndex) {

  //we modulus the provided track index against the count of 
  //the colors pallete array to ensure we never exceed the number of colors in the pallete
  const effectiveIndex = trackIndex % this.timelineTracksColorPalette.length;
  //return the color at the effective index
  return this.timelineTracksColorPalette[effectiveIndex];
  //return this.dimHexColor(this.timelineTracksColorPalette[effectiveIndex],8);

}



Timeline.prototype.prepareFonts = function () {

  //Kanit
  let kanit = new FontFace(
    "Kanit",
    "url(https://fonts.gstatic.com/s/kanit/v15/nKKZ-Go6G5tXcraVGwCKd6xB.woff2)"
  );

  kanit.load().then((font) => {
    document.fonts.add(font);
    console.log(font.family + " loaded");
  }).catch((error) => {
    console.error("Font loading error:", error);
  });

  //Kanit Light 300
  let kanitLight300 = new FontFace(
    "KanitLight300",
    "url(https://fonts.gstatic.com/s/kanit/v15/nKKU-Go6G5tXcr4-ORWnVaFrNlJz.woff2)"
  );

  kanitLight300.load().then((font) => {
    document.fonts.add(font);
    console.log(font.family + " loaded");
  }).catch((error) => {
    console.error("Font loading error:", error);
  });


};


Timeline.prototype.loadKeyframeSpanPattern = function (patternImagePath) {

  loadImage(patternImagePath).then((img) => {

    // Create a pattern with the loaded image
    this.keyframeSpanPattern = this.c.createPattern(img, "repeat");

    console.log("Keyframe span pattern was successfully loaded.")

  }).catch((error) => {

    console.log("An error occurred whilst attempting to load keyframe span pattern: "+error)

  });

     
};





Timeline.prototype.drawImage = function(src, x, y, width, height) {
  var img = new Image();
  img.src = src;

  img.onload = function () {
    ctx.drawImage(img, x, y, width, height);
  };

  return img;
};



function loadImage(imagePath) {
  return new Promise(function (resolve, reject) {
    var img = new Image();
    img.onload = function () {
      resolve(img);
    };
    img.onerror = function () {
      reject(new Error("Failed to load image."));
    };
    img.src = imagePath;
  });
}




Timeline.prototype.timeToX = function (time) {
  var animationEnd = this.findAnimationEnd();
  var visibleTime = this.xToTime(this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth) - this.xToTime(20); //50 to get some additional space
  if (visibleTime < animationEnd) {
    time -= (animationEnd - visibleTime) * this.timeScrollX;
  }

  //return this.trackLabelWidth + time * (this.timeScale * 200) + 10;
  return this.trackLabelWidth + time * (this.timeScale * 200) + 30;
};

Timeline.prototype.xToTime = function (x) {
  var animationEnd = this.findAnimationEnd();
  var visibleTime = (this.canvas.width - this.trackLabelWidth - this.tracksScrollWidth - 20) / (this.timeScale * 200);
  var timeShift = Math.max(0, (animationEnd - visibleTime) * this.timeScrollX);
  return (x - this.trackLabelWidth - 30) / (this.timeScale * 200) + timeShift;
};

Timeline.prototype.drawTrack = function (track, y) {
  var xshift = 5;
  if (track.type == "object") {
    //object track header background
    const trackColor = this.getTimelineTrackColor(track.colorPalleteIndex);
    //this.drawRect(0, y - this.trackLabelHeight + 1, this.trackLabelWidth, this.trackLabelHeight - 1, "#DFFFFF");
    this.drawRect(0, y - this.trackLabelHeight + 1, this.canvas.width, this.trackLabelHeight - 1,trackColor);
    //label color
    this.c.fillStyle = "#FFFFFF";

    //draw object track expansion/retraction widgets depending on the tracks showPropertyTracks state.
    if (track.showPropertyTracks) {
      this.drawTrackRetractionLine(140, y - 13.4, 10, 10, "#FFFFFF")
    } else {
      this.drawTrackExpansionCross(140, y - 13.4, 10, 10, "#FFFFFF");
    }
  }
  else {
    xshift += 10;
    //label color
    this.c.fillStyle = "#555555";
    this.drawRect(0, y - this.trackLabelHeight + 1, this.canvas.width, this.trackLabelHeight - 1,this.tracksThemeColor);
   
  }

  //bottom track line
  this.c.lineWidth = 2;
  this.drawLine(0, y, this.canvas.width, y, "#FFFFFF");

  //draw (object) track icon
  if (track.type == "object") {

    if (track.name.toLowerCase() == "camera") {
      this.c.font = '15px FontAwesome';
      this.c.fillText('\uf03d', xshift, y - this.trackLabelHeight * 1.2 / 4);
    }else if (track.name.toLowerCase() == "plane"){
      this.c.font = '15px FontAwesome';
      this.c.fillText('\uf0c8', xshift, y - this.trackLabelHeight * 1.2 / 4);
    } else if (track.isTextTrack){
      this.c.font = '15px FontAwesome';
      this.c.fillText('\uf891', xshift, y - this.trackLabelHeight * 1.2 / 4);
    }else{
      this.c.font = '15px FontAwesome';
      this.c.fillText('\uf1b2', xshift, y - this.trackLabelHeight * 1.2 / 4);
    }

  } else {
    //this.c.font = '13px FontAwesome';
    //this.c.fillText('\uf2f2', xshift, y - this.trackLabelHeight * 1.2 / 4);
  }



 ////draw track label
 //this.c.font = (track.type == "object") ? '15px  Kanit' : '14.5px KanitLight300'
 //this.c.fillText(track.name, xshift+25, y - this.trackLabelHeight *1.3 / 4);
 //this.c.fillStyle = "#FFFFFF"

 

  //if it's property track then draw anims
  if (track.type == "property") {

     //draw property track keyframe spans. we draw the spans first to 
     //ensure keyframes are drawn OVER them.
     this.drawPropertyTrackKeyFrameSpans(track,y);

    for (var i = 0; i < track.keys.length; i++) {
      var key = track.keys[i];
      var selected = false;
      if (this.selectedKeys.indexOf(key) > -1) {
        selected = true;
      }
      var first = (i === 0);
      var last = (i == track.keys.length - 1);
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight * 0.5, this.trackLabelHeight * 0.5, this.trackLabelHeight * 0.5, "#999999", true, true, selected ? "#FF0000" : "#666666");
      this.drawRombus(this.timeToX(key.time), y - this.trackLabelHeight * 0.5, this.trackLabelHeight * 0.5, this.trackLabelHeight * 0.5, "#DDDDDD", !first, !last);
    }


    //draw property track timer icon.
    //this.drawRect(0, y - this.trackLabelHeight + 1, this.trackLabelWidth, this.trackLabelHeight - 1,"#EEEEEE");
    this.drawRect(0, y - this.trackLabelHeight + 1, this.trackLabelWidth, this.trackLabelHeight - 1,this.tracksThemeColor);
    this.c.font = '13px FontAwesome';
    this.c.fillStyle = "#555555";
    this.c.fillText('\uf2f2', xshift, y - this.trackLabelHeight * 1.2 / 4);
  }

  //draw track label
  this.c.font = (track.type == "object") ? '15px  Kanit' : '14.5px KanitLight300'
  this.c.fillStyle = (track.type == "object") ? "#FFFFFF" : "#555555"
  this.c.fillText(track.name, xshift + 25, y - this.trackLabelHeight * 1.3 / 4);


};


Timeline.prototype.drawPropertyTrackKeyFrameSpans = function (track,y){

  for (var i = 0; i < track.keys.length; i++) {

    //providing this is not the last key...
    if(i < track.keys.length - 1){
   
        //...draw span from current key frame to the next.
        const currentKeyX = this.timeToX(track.keys[i].time)
        const nextKeyX = this.timeToX(track.keys[i+1].time)
        const spanWidth = nextKeyX - currentKeyX;
        var spanColor = this.getTimelineTrackColor(track.parent.colorPalleteIndex);
        this.drawPatternedRect(currentKeyX,y - this.trackLabelHeight * 0.8,spanWidth, this.trackLabelHeight * 0.6,spanColor,this.keyframeSpanPattern);
    }

  }

};


Timeline.prototype.drawLine = function (x1, y1, x2, y2, color) {
  this.c.strokeStyle = color;
  this.c.beginPath();
  this.c.moveTo(x1 + 0.5, y1 + 0.5);
  this.c.lineTo(x2 + 0.5, y2 + 0.5);
  this.c.stroke();
};

Timeline.prototype.drawTimelineTicker = function (x1, y1, x2, y2, color, triangleWidth, triangleHeight, triangleColor) {

  //we don't draw the ticker where it's likely to be occluded by the track panel.
  if(x1 < this.trackLabelWidth){
    return;
  }

  this.c.strokeStyle = color;
  this.c.lineWidth = 2;
  this.c.beginPath();
  this.c.moveTo(x1 + 0.5, y1 + 0.5);
  this.c.lineTo(x2 + 0.5, y2 + 0.5);
  this.c.stroke();
  this.c.lineWidth = 1;

  // Calculate the midpoint of the line
  const midX = (x1 + x2) / 2 + 0.5;
  //const yPos = (y1 + y2) / 2 - 94;

  //draw rect
  this.drawRect((midX- triangleWidth / 8),y1,triangleWidth/4, triangleHeight/1.8,triangleColor)

  // Draw the inverted triangle at the midpoint
  this.c.beginPath();
  this.c.moveTo(midX - triangleWidth / 8 *1.04 , y1 + 7 );
  this.c.lineTo(midX + triangleWidth / 8 * 1.04 ,y1 + 7 );
  this.c.lineTo(midX, y1 +18);
  this.c.closePath();
  this.c.fillStyle = triangleColor;
  this.c.fill();
};

Timeline.prototype.drawRect = function (x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x, y, w, h);
};

Timeline.prototype.drawPatternedRect = function (x, y, w, h, color,pattern) {
  this.c.fillStyle = color;
  this.c.fillRect(x, y, w, h);
  this.c.fillStyle = pattern;
  this.c.globalAlpha = 0.5;
  this.c.fillRect(x, y, w, h);
  this.c.globalAlpha = 1.0;

};

Timeline.prototype.drawCenteredRect = function (x, y, w, h, color) {
  this.c.fillStyle = color;
  this.c.fillRect(x - w / 2, y - h / 2, w, h);
};

Timeline.prototype.drawRombus = function (x, y, w, h, color, drawLeft, drawRight, strokeColor) {
  this.c.fillStyle = color;
  if (strokeColor) {
    this.c.lineWidth = 2;
    this.c.strokeStyle = strokeColor;
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x + w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.lineTo(x - w / 2, y);
    this.c.lineTo(x, y - h / 2);
    this.c.stroke();
    this.c.lineWidth = 1;
  }

  if (drawLeft) {
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x - w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.fill();
  }

  if (drawRight) {
    this.c.beginPath();
    this.c.moveTo(x, y - h / 2);
    this.c.lineTo(x + w / 2, y);
    this.c.lineTo(x, y + h / 2);
    this.c.fill();
  }
};

Timeline.prototype.drawTrackExpansionCross = function(x, y,width, height,color) {
  // Set the line color
  this.c.strokeStyle = color

  this.c.lineWidth = 4; // Adjust this value as this.c
  //the horizontal line
  this.c.beginPath();
  this.c.moveTo(x - width / 2, y);
  this.c.lineTo(x + width / 2, y);
  this.c.stroke();

  //the vertical line
  this.c.beginPath();
  this.c.moveTo(x, y - height / 2);
  this.c.lineTo(x, y + height / 2);
  this.c.stroke();
}

Timeline.prototype.drawTrackRetractionLine = function(x, y,width, height,color) {
  // Set the line color
  this.c.strokeStyle = color

  this.c.lineWidth = 4; // Adjust this value as this.c
  //the horizontal line
  this.c.beginPath();
  this.c.moveTo(x - width / 2, y);
  this.c.lineTo(x + width / 2, y);
  this.c.stroke();
}

Timeline.prototype.initTracks = function () {
  this.tracks = [];
  var i, j;
  var anim;
  for (i = 0; i < this.anims.length; i++) {
    anim = this.anims[i];
    var objectTrack = null;
    var propertyTrack = null;
    for (j = 0; j < this.tracks.length; j++) {
      if (this.tracks[j].type == "object" && this.tracks[j].target == anim.target) {
        objectTrack = this.tracks[j];
       
       
      }
      if (this.tracks[j].type == "property" && this.tracks[j].target == anim.target && this.tracks[j].propertyName == anim.propertyName) {
        propertyTrack = this.tracks[j];
      }
    }
  
    if (!objectTrack) {
      objectTrack = {
        type: "object",
        id: anim.targetName,
        name: anim.targetName,
        target: anim.target,
        propertyTracks: [],
        showPropertyTracks: false,
        colorPalleteIndex: 0,
        isTextTrack: false,
      };
      if (!objectTrack.name) {
        objectTrack.name = "Object" + this.trackNameCounter++;
      }
      this.tracks.push(objectTrack);
    }

    

    if (!propertyTrack) {
      propertyTrack = {
        type: "property",
        id: objectTrack.name + "." + anim.propertyName,
        name: anim.propertyName,
        propertyName: anim.propertyName,
        target: anim.target,
        parent: objectTrack,
        anims: []
      };

      //find place to insert
      var parentObjectTrack = null;
      var nextObjectTrack = null;
      for (var k = 0; k < this.tracks.length; k++) {
        if (this.tracks[k].type == "object") {
          if (parentObjectTrack && !nextObjectTrack) {
            nextObjectTrack = this.tracks[k];
          }
          if (this.tracks[k].target == propertyTrack.target) {
            parentObjectTrack = this.tracks[k];
          }
        }
      }

      if (nextObjectTrack) {
        //add ad the end of this object property tracks, just before next one
        var nextTrackIndex = this.tracks.indexOf(nextObjectTrack);
        this.tracks.splice(nextTrackIndex, 0, propertyTrack);
      }
      else {
        //add to end of all track
        this.tracks.push(propertyTrack);
      }

      parentObjectTrack.propertyTracks.push(propertyTrack);

    }

    propertyTrack.anims.push(anim);
  }

  //convert anims to keys and assign color index to object tracks.
  var curColorPalleteIndex = 0;
  for (i = 0; i < this.tracks.length; i++) {
    var track = this.tracks[i];
    track.keys = [];
    if (track.type == "object"){ 
      track.colorPalleteIndex = curColorPalleteIndex;
      curColorPalleteIndex++;
      continue;
    }
    for (j = 0; j < track.anims.length; j++) {
      anim = track.anims[j];
      if (anim.delay > 0) {
        var startValue = 0;
        var easing = anim.easing;
        if (j === 0) {
          startValue = track.target[track.propertyName];
        }
        else {
          startValue = track.anims[j - 1].endValue;
        }
        track.keys.push({
          time: anim.startTime,
          value: startValue,
          easing: easing,
          track: track
        });
      }
      var easingFunc = Timeline.Easing.Linear.EaseNone;
      if (j < track.anims.length - 1) {
        if (track.anims[j + 1].delay === 0) {
          easingFunc = track.anims[j + 1].easing;
        }
      }
      track.keys.push({
        time: anim.endTime,
        value: anim.endValue,
        easing: easingFunc,
        track: track
      });
    }
  }

  //console.log(this.tracks)
};

Timeline.prototype.buildInputDialog = function () {
  this.keyEditDialog = document.createElement("div");
  this.keyEditDialog.id = "keyEditDialog";
  this.keyEditDialog.style.cssText = "position:absolute; padding:5px; background: #DDDDDD; font-family:arial; font-size:11px; left: 100px; top:100px; border: 1px solid #AAAAAA; border-radius: 5px;";

  var easingOptions = "";

  for (var easingFunctionFamilyName in Timeline.Easing) {
    var easingFunctionFamily = Timeline.Easing[easingFunctionFamilyName];
    for (var easingFunctionName in easingFunctionFamily) {
      easingOptions += "<option>" + easingFunctionFamilyName + "." + easingFunctionName + "</option>";
    }
  }

  var controls = "";
  controls += '<label style="margin-right:10px">Value<input type="text" id="keyEditDialogValue"/></label>';
  controls += '<label style="margin-right:10px">Easing<select id="keyEditDialogEasing">' + easingOptions + '</label>';
  controls += '<input id="keyEditDialogOK" style="margin-left: 10px; margin-right:10px" type="button" value="OK"/>';
  controls += '<input id="keyEditDialogCancel" style="margin-right:10px" type="button" value="Cancel"/>';
  controls += '<a id="keyEditDialogDelete" style="margin-right:5px" href="#">[x]</a>';
  this.keyEditDialog.innerHTML = controls;
  document.body.appendChild(this.keyEditDialog);

  this.keyEditDialogValue = document.getElementById("keyEditDialogValue");
  this.keyEditDialogEasing = document.getElementById("keyEditDialogEasing");
  this.keyEditDialogOK = document.getElementById("keyEditDialogOK");
  this.keyEditDialogCancel = document.getElementById("keyEditDialogCancel");
  this.keyEditDialogDelete = document.getElementById("keyEditDialogDelete");

  var self = this;

  this.keyEditDialogOK.addEventListener('click', function () {
    self.applyKeyEditDialog();
    self.hideKeyEditDialog();
  }, false);

  this.keyEditDialogCancel.addEventListener('click', function () {
    self.hideKeyEditDialog();
  }, false);

  this.keyEditDialogDelete.addEventListener('click', function () {
    self.deleteSelectedKeys();
    self.rebuildSelectedTracks();
    self.hideKeyEditDialog();
  }, false);

  this.hideKeyEditDialog();
};

Timeline.prototype.applyKeyEditDialog = function () {
  var value = Number(this.keyEditDialogValue.value);
  if (isNaN(value)) {
    return;
  }
  var selectedOption = this.keyEditDialogEasing.options[this.keyEditDialogEasing.selectedIndex];
  var easing = Timeline.easingMap[selectedOption.value];
  for (var i = 0; i < this.selectedKeys.length; i++) {
    this.selectedKeys[i].easing = easing;
    this.selectedKeys[i].value = value;
  }
  this.rebuildSelectedTracks();
};

Timeline.prototype.showKeyEditDialog = function (mouseX, mouseY) {
  this.keyEditDialogValue.value = this.selectedKeys[0].value;
  for (var i = 0; i < this.keyEditDialogEasing.options.length; i++) {
    var option = this.keyEditDialogEasing.options[i];
    var easingFunction = Timeline.easingMap[option.value];
    if (easingFunction == this.selectedKeys[0].easing) {
      this.keyEditDialogEasing.selectedIndex = i;
      break;
    }
  }
  this.keyEditDialog.style.left = Math.max(50, mouseX - 200) + "px";
  this.keyEditDialog.style.top = (mouseY - 50) + "px";
  this.keyEditDialog.style.display = "block";

  this.keyEditDialogValue.focus();
};

Timeline.prototype.deleteSelectedKeys = function () {
  for (var i = 0; i < this.selectedKeys.length; i++) {
    var selectedKey = this.selectedKeys[i];
    var keyIndex = selectedKey.track.keys.indexOf(selectedKey);
    selectedKey.track.keys.splice(keyIndex, 1);
  }
  this.rebuildSelectedTracks();
};

Timeline.prototype.deleteKey = function (aKeyToDelete) {

  var keyIndex = aKeyToDelete.track.keys.indexOf(aKeyToDelete);
  console.log(keyIndex)
  aKeyToDelete.track.keys.splice(keyIndex, 1);
  this.rebuildTrackAnimsFromKeys(aKeyToDelete.track)
  this.save();
}

Timeline.prototype.deleteTimelineEndKey = function () {

  if (this.timelineEndKey != null) {
    this.deleteKey(this.timelineEndKey);
    this.timelineEndKey = null;
  }
};



Timeline.prototype.hideKeyEditDialog = function () {
  this.keyEditDialog.style.display = "none";
};

Timeline.prototype.sortTrackKeys = function (track) {
  track.keys.sort(function (a, b) { return a.time - b.time; });

  var result = "";
  for (var i = 0; i < track.keys.length; i++) {
    result += track.keys[i].time + " ";
  }
};

Timeline.prototype.rebuildSelectedTracks = function () {
  for (var i = 0; i < this.selectedKeys.length; i++) {
    this.rebuildTrackAnimsFromKeys(this.selectedKeys[i].track);
  }
  this.save();
};

Timeline.prototype.rebuildTrackAnimsFromKeys = function (track) {
  var deletedAnims = [];
  var j;

  //remove all track's anims from the timeline
  for (j = 0; j < track.anims.length; j++) {
    var index = this.anims.indexOf(track.anims[j]);
    deletedAnims.push(track.anims[j]);
    this.anims.splice(index, 1);
  }

  //remove all anims from the track
  track.anims.splice(0, track.anims.length);

  if (track.keys.length === 0) {
    return;
  }

  var delay = track.keys[0].time;
  var prevKeyTime = track.keys[0].time;
  var prevKeyValue = track.keys[0].value;
  var prevKeyEasing = Timeline.Easing.Linear.EaseNone;
  //create new anims based on keys
  for (j = 0; j < track.keys.length; j++) {
    var key = track.keys[j];
    var anim = {
      timeline: this,
      target: track.target,
      propertyName: track.propertyName,
      startValue: prevKeyValue,
      endValue: key.value,
      delay: delay,
      startTime: prevKeyTime,
      endTime: key.time,
      easing: prevKeyEasing
    };
    track.anims.push(anim);
    this.anims.push(anim);
    delay = 0;
    prevKeyTime = key.time;
    prevKeyValue = key.value;
    prevKeyEasing = key.easing;
  }
};

Timeline.prototype.exportCode = function () {
  var code = "";

  for (var i = 0; i < this.tracks.length; i++) {
    var track = this.tracks[i];
    if (track.type == "object") continue;
    if (track.anims.length === 0) continue;
    code += 'anim("' + track.parent.name + '",' + track.parent.name + ')';
    for (var j = 0; j < track.anims.length; j++) {
      var anim = track.anims[j];
      code += '.to(';
      if (anim.delay)
        code += anim.delay + ',';
      code += '{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '}';
      code += ',' + (anim.endTime - anim.startTime);
      if (anim.easing != Timeline.Easing.Linear.EaseNone)
        code += ', Timeline.Easing.' + Timeline.easingFunctionToString(anim.easing);
      code += ')';
      //code += '.to(' + anim.delay + ',{' + '"' + anim.propertyName + '"' + ':' + anim.endValue + '} ')';
    }
    code += ';\n';
  }

  prompt("Copy this:", code);
};



Timeline.prototype.save = function () {
  var data = {};

  for (var i = 0; i < this.tracks.length; i++) {
    var track = this.tracks[i];
    //console.log("track name: "+track.name)
    var keysData = [];
    for (var j = 0; j < track.keys.length; j++) {
      keysData.push({
        time: track.keys[j].time,
        value: track.keys[j].value,
        easing: Timeline.easingFunctionToString(track.keys[j].easing)
      });
    }
    data[track.id] = keysData;
  }

  localStorage["timeline.js.settings.canvasHeight"] = this.canvasHeight;
  localStorage["timeline.js.settings.timeScale"] = this.timeScale;
  localStorage["timeline.js.data." + this.name] = JSON.stringify(data);
  console.log(data)
};

Timeline.prototype.load = function () {
  if (localStorage["timeline.js.settings.canvasHeight"]) {
    this.canvasHeight = localStorage["timeline.js.settings.canvasHeight"];
  }
  if (localStorage["timeline.js.settings.timeScale"]) {
    this.timeScale = localStorage["timeline.js.settings.timeScale"];
  }

  var dataString = localStorage["timeline.js.data." + this.name];
  if (!dataString) return;
  var data = JSON.parse(dataString);
  for (var i = 0; i < this.tracks.length; i++) {
    var track = this.tracks[i];
    if (!data[track.id]) {
      continue;
    }
    if (track.type == "property") {
      var keysData = data[track.id];
      track.keys = [];
      for (var j = 0; j < keysData.length; j++) {
        track.keys.push({
          time: keysData[j].time,
          value: keysData[j].value,
          easing: Timeline.stringToEasingFunction(keysData[j].easing),
          track: track
        });
      }
      this.rebuildTrackAnimsFromKeys(track);
    }
  }
};


Timeline.prototype.dimHexColor = function(hexColor, dimPercentage) {
  // Ensure the dimPercentage is between 0 and 100.
  dimPercentage = Math.min(100, Math.max(0, dimPercentage));

  // Convert the hex color to RGB values.
  const red = parseInt(hexColor.slice(1, 3), 16);
  const green = parseInt(hexColor.slice(3, 5), 16);
  const blue = parseInt(hexColor.slice(5, 7), 16);

  // Dim each RGB component based on the dimPercentage.
  const dimmedRed = Math.round(red * (1 - dimPercentage / 100));
  const dimmedGreen = Math.round(green * (1 - dimPercentage / 100));
  const dimmedBlue = Math.round(blue * (1 - dimPercentage / 100));

  // Ensure the RGB components are within the valid range (0-255).
  const finalRed = Math.min(255, Math.max(0, dimmedRed));
  const finalGreen = Math.min(255, Math.max(0, dimmedGreen));
  const finalBlue = Math.min(255, Math.max(0, dimmedBlue));

  // Convert the modified RGB components back to a hex color value.
  const dimmedColor = `#${finalRed.toString(16).padStart(2, '0')}${finalGreen.toString(16).padStart(2, '0')}${finalBlue.toString(16).padStart(2, '0')}`;

  return dimmedColor;
};


Timeline.prototype.toggleTrackPropertiesExpansion = function(aTrack) {
    if(aTrack.showPropertyTracks){
      aTrack.showPropertyTracks = false;
    }else{
      aTrack.showPropertyTracks = true;
    }
}



Timeline.prototype.loadCssStyleSheet = function(aUrl) {
  let head = document.getElementsByTagName('HEAD')[0];
  let link = document.createElement('link');
  link.rel = 'stylesheet';
  link.type = 'text/css';
  link.href = aUrl;
  head.appendChild(link);
};

Timeline.prototype.addNewTrack = function(trackName) {

  
  const aNewAnimTarget = {
    position: 150,
    scale: 50,
    rotation: 40,
    opacity:1
  };
 
  const aNewAnim = anim(trackName,aNewAnimTarget).setIsText(false).to({"position":40},0).to({"position":40},0.34).to({"position":300},1.2);
  
  const trackColorPalleteIdx = this.tracks.lengh -1
  console.log(this.tracks.lengh)
  
  var objectTrack = {
    type: "object",
    id: aNewAnim.name,
    name: aNewAnim.name,
    target: aNewAnim.target,
    propertyTracks: [],
    showPropertyTracks: false,
    colorPalleteIndex: 0,
    isTextTrack: anim.isText,
  };

  objectTrack.keys = [];

  var propertyTrack = {
    type: "property",
    id: objectTrack.name + "." + aNewAnimTarget.position,
    name: aNewAnimTarget.position,
    propertyName: aNewAnimTarget.position,
    target: aNewAnimTarget,
    parent: objectTrack,
    anims: []
  };

  //add sudo animation keys to property track
  propertyTrack.keys = [];



  //animation start key
  const easingFunc = Timeline.Easing.Linear.EaseNone;
  propertyTrack.keys.push({
    time: 0,
    value: 40,
    easing: easingFunc,
    track: propertyTrack
  });

  //animation end key
  propertyTrack.keys.push({
    time: 1,
    value: 80,
    easing: easingFunc,
    track: propertyTrack
  });



  objectTrack.propertyTracks.push(propertyTrack);



  console.log(objectTrack)

  this.tracks.push(objectTrack);
  this.tracks.push(propertyTrack);

  this.save()
  

  //console.log(this.anims.length)
  //anim(trackName,aNewAnimTarget,Timeline.getGlobalInstance()).setIsText(false).to({"width":40},0).to({"width":40},0.34).to({"width":300},1.2);
  //console.log(this.anims.length)


};