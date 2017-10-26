/*
physics.js by Aaron Becker
A complete ASCII physics engine written in JavaScript
*/

var Physics = {
    element: null,
    defaultSpaceChar: " ",
    defaultShapeChar: "*",
    defaultNewlineChar: "<br>",
    startString: "PHYV3:<br><br>",
    gravitationalConstant: 0.2,
    frictionConstant: 0.7,
    terminalVelocity: 7,
    //weightPerCharacter: 0.1,
    debugMode: false,
    allGravity: false,
    width: window.innerWidth,
    height: window.innerHeight,
    lineHeight: 0.65,
    initialLineHeight: 0.83,
    collisionAccuracy: 0.5,
    bodyFontSize: 16,
    renderBuffer: [],
    renderString: [],
    charsPerFrame: 0,
    shape: function(type, options) {
        if (type === undefined || options === undefined) {
            throw new Error("Type or options incomplete");
            return new Error("");
        } else {
            this.x = options.x || 0;
            this.y = options.y || 0;
            this.mesh = [];
            this.UUID = generateUUID();
            this.gravity = options.gravity || false;
            if (typeof this.gravity === "undefined") {
                this.gravity = false;
            }
            this.momentumX = 0;
            this.momentumY = -1;
            this.collide = options.collide;
            if (typeof this.collide === "undefined") {
                this.collide = true;
            }

            this.pointTable = [];
            this.updPointTable = [];
            this.collisionBottom = false;
            this.collisionTop = false;
            this.collisionRight = false;
            this.collisionLeft = false;

            this.character = options.character || Physics.defaultShapeChar;
            if (this.character.length > 1) {
                this.character = this.character.substring(0,1);
            }

            this.type = type;
            if (type == "box") {
                this.height = options.height || 10;
                this.width = options.width || 10;
                this.filled = options.filled;
                if (typeof this.filled === "undefined") {
                    this.filled = true;
                }
                if (this.filled) {
                    for (var i=0; i<this.height; i++) {
                        this.mesh[i] = "";
                        for (var j=0; j<this.width; j++) {
                            this.mesh[i]+=this.character;
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                } else {
                    for (var i=0; i<this.height; i++) {
                        this.mesh[i] = "";
                        for (var j=0; j<this.width; j++) {
                            if ((i == 0 || i == (this.height-1)) || (j == 0 || j == (this.width-1))) {
                                this.mesh[i]+=this.character;
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                            }
                        }
                    }
                }
            } else if (type == "line") {
                this.length = options.length || 10;
                this.mesh[0] = "";
                for (var i=0; i<this.length; i++) {
                    this.mesh[0]+=this.character;
                    this.pointTable[this.pointTable.length] = [i,0];
                }
            } else if (type == "triangle") {
                this.height = options.height || options.width/2;
                this.width = options.width || options.height*2;

                for (var i=0; i<this.height; i++) { //generate blank mask as a square
                    this.mesh[i] = "";
                    for (var j=0; j<this.width; j++) {
                        this.mesh[i]+=Physics.defaultSpaceChar;
                    }
                }
                var start = this.width/2;
                var amount = 1;
                for (var i=0; i<this.height; i++) {
                    for (var j=0; j<amount; j++) {
                        this.mesh[i] = this.mesh[i].replaceAt((start+j),this.character);
                        this.pointTable[this.pointTable.length] = [i,j];
                    }
                    start-=1;
                    amount+=2;
                }
            } else if (type == "custom") {
                if (typeof options.mesh === "undefined" || typeof options.mesh !== "object") {
                    console.error("Mesh for custom object is undefined");
                } else {
                    this.width = 0;
                    this.height = options.mesh.length;
                    for (var i=0; i<options.mesh.length; i++) {
                        this.mesh[i] = [];
                        if (options.mesh[i].length > this.width) {
                            this.width = options.mesh[i].length;
                        }
                        for (var j=0; j<options.mesh[i].length; j++) {
                            this.mesh[i][j] = options.mesh[i][j];
                            this.pointTable[this.pointTable.length] = [i,j];
                        }
                    }
                }
            } else if (type == "circle") {
                this.radius = options.radius || 10;
                this.filled = options.filled || false;

                if (this.filled == true) {
                    var centerx = this.radius;
                    var centery = this.radius;

                    for (var i=0; i<=2*this.radius; i++) { //draw unfilled circle
                        this.mesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {

                            var offsetx = j;
                            var offsety = i;

                            var dx=centerx-offsetx;
                            var dy=centery-offsety;
                            if ((dx*dx + dy*dy) <= (this.radius*this.radius)) {
                                this.mesh[i]+=this.character;
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                            }
                        }
                    }
                } else if (this.filled == "cool") {
                    for (var i=0; i<=2*this.radius; i++) { //draw unfilled circle
                        this.mesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.pointTable[this.pointTable.length] = [i,j];
                                this.mesh[i]+=this.character;
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                            }
                        }
                    }

                    var xoff = 0;
                    var yoff = 0;

                    var range = this.radius*Math.sin(45);
                    for (var i=xoff-range+1; i<xoff+range; i++) {
                        for (var j=yoff-range+1; j<yoff+range; j++) {
                            var roux = Math.round(i)+this.radius;
                            var rouy = Math.round(j)+this.radius;
                            //console.log("x: "+roux+", y: "+rouy)
                            this.pointTable[this.pointTable.length] = [i,j];
                            this.mesh[rouy] = this.mesh[rouy].replaceAt(roux,this.character);
                        }
                    }
                } else {
                    for (var i=0; i<=2*this.radius; i++) {
                        this.mesh[i] = "";
                        for (var j=0; j<=2*this.radius; j++) {
                            var distance = Math.sqrt((i-this.radius)*(i-this.radius) + (j-this.radius)*(j-this.radius));
                            if (distance>this.radius-0.5 && distance<this.radius+0.5) {
                                this.mesh[i]+=this.character;
                                this.pointTable[this.pointTable.length] = [i,j];
                            } else {
                                this.mesh[i]+=Physics.defaultSpaceChar;
                            }
                        }
                    }
                }
            } else {
                console.error("Shape not found. There may be errors rendering.")
            }
            this.pointTable.uniqueify(); //remove calls for multiple points
            this.update(); //update to start gravity and set updated point table
        }
    },
    render: function(clearScreen) {
        clearScreen = clearScreen || false;

        Physics.charsPerFrame = 0;

        if (clearScreen) {
            Physics.renderBuffer = [];
            for (var j=0; j<Physics.height; j++) { //generate blank screen
                Physics.renderBuffer[j] = "";
                for (var i=0; i<Physics.width; i++) {
                    Physics.renderBuffer[j] += Physics.defaultSpaceChar;
                }
            }
        }
        //console.info(JSON.stringify(Physics.renderBuffer))
        for (var i=0; i<arguments.length; i++) { //add meshes to screen
            if (arguments[i] != true && arguments[i] != false && typeof arguments[i] !== "undefined") {
                //alert(JSON.stringify(arguments[i]))
                try {
                    if (arguments[i].gravity == true || Physics.allGravity) { //calculate gravity
                        if (Physics.debugMode) {console.log("Updating velocity for shape: "+arguments[i].type+", UUID: "+arguments[i].UUID+" (velX: "+arguments[i].momentumX+", velY: "+arguments[i].momentumY+")")}
                            arguments[i].update(false);
                    }
                } catch(e) {
                    console.error("Error updating gravity for shape. Shape: "+arguments[i]+", e: "+e);
                    //console.log(JSON.stringify(arguments))
                }
                if (arguments[i].UUID === undefined) { //sanity check!!
                    if (!(i == 0 && (arguments[i] == true || arguments[i] == false))) {
                        console.error("Error drawing: argument "+i+" does not exist or doesn't have a UUID");
                    }
                } else {
                    var bad = false;
                    try {
                        arguments[i].width = arguments[i].mesh[0].length;
                        arguments[i].height = arguments[i].mesh.length;
                    } catch(e) {
                        bad = true;
                        console.error("Error rendering: argument "+i+" doesn't have a width or height property")
                    }
                    if (arguments[i].width > Physics.width || arguments[i].height > Physics.height) {
                        bad = true;
                        console.error("Error rendering: argument "+i+"'s mesh is too large to fit on screen");
                    }
                    if (bad == false) {
                        var x = constrain(arguments[i].x,0,(Physics.width-arguments[i].width)); //constrain x
                        var y = constrain(arguments[i].y,0,(Physics.height-arguments[i].height)); //constrain y
                        arguments[i].x = x; //fix bug where y position keeps changing
                        arguments[i].y = y;
                        x = Math.round(x);
                        y = Math.round(y);
                        //console.info("x: "+arguments[i].x+", y: "+arguments[i].y+", CONSTx: "+x+", CONSTy: "+y)
                        if (Physics.debugMode){console.info("Shape to be placed at x: "+x+", y: "+y);}
                        if (arguments[i].mesh.length == 0) {
                            console.error("Error rendering: shape has no mesh to render!");
                        } else {
                            for (var j=0; j<arguments[i].mesh.length; j++) { //for every line of mesh
                                for (var b=0; b<arguments[i].mesh[j].length; b++) { //for every character in mesh
                                    try {
                                        Physics.renderBuffer[j+y] = Physics.renderBuffer[j+y].replaceAt(b+x,arguments[i].mesh[j][b]);
                                        Physics.charsPerFrame++;
                                    } catch(e) {
                                        console.error("Error while rendering physics buffer for shape "+arguments[i].type+", UUID "+arguments[i].UUID+", x: "+(b+x)+", y: "+(j+y)+", error: "+e);
                                    }
                                    if (Physics.debugMode){console.log("Adding to buffer at x: "+(b+x)+", y: "+(j+y)+", char: "+arguments[i].mesh[j][b])}
                                }
                            }
                        }
                    }
                }
            }
        }

        var temp = Physics.startString;
        for (var i=0; i<Physics.renderBuffer.length; i++) {
            temp+=Physics.renderBuffer[i]+Physics.defaultNewlineChar;
        }
        if (Physics.element.innerHTML != temp) { //only draw if different optimization
            Physics.renderString = Physics.startString;
            for (var i=0; i<Physics.renderBuffer.length; i++) { //write it to string to optimize writing calls
                Physics.renderString+=Physics.renderBuffer[i]+Physics.defaultNewlineChar;
            }
            Physics.element.innerHTML = Physics.renderString; //draw it!
        }
    },
    /*
    Ideas for making collision more efficient:
        -SPRITE XY TABLES WITH POINTS, ADD X AND Y TO POINTS AND SEE IF THEY INTERSECT done
        -broad phase/narrow phase collision detection to save computing power
    */
    calculate_collisions: function() {
        if (arguments.length < 2) {
            console.error("Error while calculating collisions: there is only one (or none) shape passed into function.");
        } else {

            for (var i=0; i<arguments.length; i++) {
                arguments[i].collisionBottom = false;
                arguments[i].collisionTop = false;
                arguments[i].collisionRight = false;
                arguments[i].collisionLeft = false;
            }
            for (var i=0; i<arguments.length; i++) {
                /*if (arguments[i].updPointTable === undefined || arguments[i].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                    arguments[i].update(); //calculate gravity and updPointTable, as well as center point
                }*/
                arguments[i].calculate();
                for (var j=1; j<arguments.length-1; j++) {
                    /*if (arguments[i].updPointTable === undefined || arguments[j].centerPoint === undefined || (typeof arguments[i].centerPoint[0] == "number" && isNaN(arguments[i].centerPoint[0]))) {
                        arguments[j].update(); //calculate gravity and updPointTable
                    }*/
                    arguments[j].calculate();
                    for (var b=0; b<arguments[i].updPointTable.length; b++) {
                        for (var z=0; z<arguments[j].updPointTable.length; z++) {
                            //console.log(typeof (arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]))
                            if (((arguments[i].updPointTable[b][0]-arguments[j].updPointTable[z][0]).between(-Physics.collisionAccuracy,Physics.collisionAccuracy) && (arguments[i].updPointTable[b][1]-arguments[j].updPointTable[z][1]).between(-Physics.collisionAccuracy,Physics.collisionAccuracy)) && arguments[i].UUID != arguments[j].UUID) { //make sure uuids are different so that shapes can't collide with themselves
                                if (Physics.debugMode) {
                                    console.log("Collision detected between "+arguments[i].type+" (UUID: "+arguments[i].UUID+") and "+arguments[j].type+" (UUID: "+arguments[j].UUID+"), X1: "+arguments[i].updPointTable[b][0]+", Y1: "+arguments[i].updPointTable[b][1]+", X2: "+arguments[j].updPointTable[z][0]+", Y2: "+arguments[j].updPointTable[z][0]);
                                }

                                //calc collision side for first shape
                                if (arguments[i].collide) {
                                    if (arguments[i].collisionRight == false && arguments[i].collisionLeft == false) {
                                        if (arguments[i].updPointTable[b][0] <= arguments[i].centerPoint[0]) { //if x pos collision of first shape is less than center (left collision)
                                            arguments[i].collisionRight = false;
                                            arguments[i].collisionLeft = true;
                                        } else if (arguments[i].updPointTable[b][0] > arguments[i].centerPoint[0]) { //collision right
                                            arguments[i].collisionRight = true;
                                            arguments[i].collisionLeft = false;
                                        } else {
                                            console.error("Error calculating collision side from collision (x axis), try running update on shape "+arguments[i].type+", UUID "+arguments[i].UUID);
                                            arguments[i].calculate();
                                        }
                                    }

                                    if (arguments[i].collisionTop == false && arguments[i].collisionBottom == false) {
                                        if (arguments[i].updPointTable[b][1] <= arguments[i].centerPoint[1] || arguments[i].y+arguments[i].height == Physics.height) { //if y pos collision of first shape is less than center (bottom collision) or __exact center__!
                                            arguments[i].collisionBottom = true;
                                            arguments[i].collisionTop = false;
                                        } else if (arguments[i].updPointTable[b][1] > arguments[i].centerPoint[1]) { //collision top
                                            arguments[i].collisionBottom = false;
                                            arguments[i].collisionTop = true;
                                        } else {
                                            console.error("Error calculating collision side from collision (y axis), try running update on shape "+arguments[i].type+", UUID "+arguments[i].UUID);
                                            arguments[i].calculate();
                                        }
                                    }
                                }

                                //calc collision side for second shape
                                if (arguments[j].collide) {
                                    if (arguments[j].collisionRight == false && arguments[j].collisionLeft == false) {
                                        if (arguments[j].updPointTable[z][0] <= arguments[j].centerPoint[0]) { //if x pos collision of first shape is less than center (left collision)
                                            arguments[j].collisionRight = false;
                                            arguments[j].collisionLeft = true;
                                        } else if (arguments[j].updPointTable[z][0] > arguments[j].centerPoint[0]) { //collision right
                                            arguments[j].collisionRight = true;
                                            arguments[j].collisionLeft = false;
                                        } else {
                                            console.error("Error calculating collision side from collision (x axis), try running update on shape "+arguments[j].type+", UUID "+arguments[j].UUID+"Point X: "+arguments[j].updPointTable[b][0]+", center X: "+arguments[j].centerPoint[0]);
                                            arguments[j].calculate();
                                        }
                                    }

                                    if (arguments[j].collisionTop == false && arguments[j].collisionBottom == false) {
                                        if (arguments[j].updPointTable[z][1] <= arguments[j].centerPoint[1] || arguments[j].y+arguments[j].height == Physics.height) { //if y pos collision of first shape is less than center (bottom collision) or __exact center__!
                                            arguments[j].collisionBottom = true;
                                            arguments[j].collisionTop = false;
                                        } else if (arguments[j].updPointTable[z][1] > arguments[j].centerPoint[1]) { //collision top
                                            arguments[j].collisionBottom = false;
                                            arguments[j].collisionTop = true;
                                        } else {
                                            console.error("Error calculating collision side from collision (y axis), try running update on shape "+arguments[j].type+", UUID "+arguments[j].UUID);
                                            arguments[j].calculate();
                                        }
                                    }
                                }

                                if (Physics.debugMode) {
                                    console.log("Shape 1 updPointTable "+JSON.stringify(arguments[i].updPointTable[b])+", Shape 2 updPointTable "+JSON.stringify(arguments[j].updPointTable[z])+", Shape 1 centerPoint "+JSON.stringify(arguments[i].centerPoint)+", Shape 2 centerPoint "+JSON.stringify(arguments[j].centerPoint)+", Shape 1 collide "+arguments[i].collide+", Shape 2 collide "+arguments[j].collide)
                                }
                            }
                        }
                    }
                }
            }
        }

        //memory of which blocks are different from part of rendering
    },
    init: function() {
        setTimeout(function(){
            //console.clear();
            console.log("   ▄███████▄  ▄█          ▄████████     ███        ▄████████  ▄██████▄     ▄████████   ▄▄▄▄███▄▄▄▄      ▄████████ ████████▄  \n  ███    ███ ███         ███    ███ ▀█████████▄   ███    ███ ███    ███   ███    ███ ▄██▀▀▀███▀▀▀██▄   ███    ███ ███   ▀███ \n  ███    ███ ███         ███    ███    ▀███▀▀██   ███    █▀  ███    ███   ███    ███ ███   ███   ███   ███    █▀  ███    ███ \n  ███    ███ ███         ███    ███     ███   ▀  ▄███▄▄▄     ███    ███  ▄███▄▄▄▄██▀ ███   ███   ███  ▄███▄▄▄     ███    ███ \n▀█████████▀  ███       ▀███████████     ███     ▀▀███▀▀▀     ███    ███ ▀▀███▀▀▀▀▀   ███   ███   ███ ▀▀███▀▀▀     ███    ███ \n  ███        ███         ███    ███     ███       ███        ███    ███ ▀███████████ ███   ███   ███   ███    █▄  ███    ███ \n  ███        ███▌    ▄   ███    ███     ███       ███        ███    ███   ███    ███ ███   ███   ███   ███    ███ ███   ▄███ \n ▄████▀      █████▄▄██   ███    █▀     ▄████▀     ███         ▀██████▀    ███    ███  ▀█   ███   █▀    ██████████ ████████▀  \n             ▀                                                            ███    ███                                         ");
            //console.log("                         ___                                                                        \n_-_ _,,                 -   -_,                               _-_ _,,              ,,               \n   -/  )               (  ~/||    _                              -/  )             ||               \n  ~||_<   '\\\\/\\\\       (  / ||   < \\, ,._-_  /'\\\\ \\\\/\\\\         ~||_<    _-_   _-_ ||/\\  _-_  ,._-_ \n   || \\\\   || ;'        \\/==||   /-||  ||   || || || ||          || \\\\  || \\\\ ||   ||_< || \\\\  ||   \n   ,/--||  ||/          /_ _||  (( ||  ||   || || || ||          ,/--|| ||/   ||   || | ||/    ||   \n  _--_-'   |/          (  - \\\\,  \\/\\\\  \\\\,  \\\\,/  \\\\ \\\\         _--_-'  \\\\,/  \\\\,/ \\\\,\\ \\\\,/   \\\\,  \n (        (                                                    (                                    \n           -_-                                                                                      ");
            gameAudio.fade("in",3000, "");
            gameAudio.play();
            console.log("[AUDIOMANAGER] Audio initialized");
            console.log("PHYSICS INITIALIZED");
            console.typeable("debugon","console.log(\"Type debugon into the console to enable debug mode. (Warning: there is about 1000 debug messages outputted per second)\");","console.log(\"Debug mode active.\"); Physics.debugMode = true;");
            console.typeable("debugoff","console.log(\"Type debugoff into the console to disable debug mode.\");","console.log(\"Debug mode disabled.\"); Physics.debugMode = false;");
            console.typeable("collisioncheck","console.log(\"Type collisioncheck into the console to test collisions. (mostly for me) Note that the object being tested must be named \'player\'.\");","console.log(\"Testing collisions...\"); player.y = 1000; player.x = -1000; Physics.render(platform,platform2,platform3,player,tri); Physics.calculate_collisions(platform,platform2,platform3,player,tri); console.log(\"Player colliding: bottom: \"+player.collisionBottom+\", top: \"+player.collisionTop+\", right: \"+player.collisionRight+\", left: \"+player.collisionLeft); setTimeout(function(){player.y = 10; player.x = 10; Physics.render(platform,platform2,platform3,player,tri); Physics.calculate_collisions(platform,platform2,platform3,player,tri); console.log(\"Player still colliding: bottom: \"+player.collisionBottom+\", top: \"+player.collisionTop+\", right: \"+player.collisionRight+\", left: \"+player.collisionLeft);},100);");
            beginGame(50); //start game at 30fps
            console.log("%cWelcome to Platformed, a 2d platformer game by Aaron Becker. I hope you enjoy it! Also, if you see this, you're awesome :)","color: #f49b42")
        },500);

        //Physics.element.style.lineHeight = String(Physics.lineHeight);
        Physics.element.style.lineHeight = String(Physics.initialLineHeight);
        Physics.height = Math.round(window.innerHeight*(Physics.lineHeight-0.53));
        Physics.width = Math.round(window.innerWidth*(Physics.lineHeight-0.523));
        Physics.bodyFontSize = parseFloat(window.getComputedStyle(document.body, null).getPropertyValue('font-size'));
    },
    clear: function() {
        Physics.renderBuffer = [];
        Physics.collisionBuffers = [];
        Physics.element.innerHTML = "";
    }
}

Physics.shape.prototype.update = function(render) {
    this.calculate();
    render = render || false;
    if (this.gravity === undefined || this.momentumX === undefined || this.momentumY === undefined) {
            console.error("Object passed in to update function has no gravity constants");
    } else {
        if (this.gravity || Physics.allGravity) {
            this.momentumX = constrain(this.momentumX,-Physics.terminalVelocity,Physics.terminalVelocity);
            this.momentumY = constrain(this.momentumY,-Physics.terminalVelocity,Physics.terminalVelocity);
            if (this.y+this.height == Physics.height) {
                this.momentumY = 0;
            }
            if (this.x+this.width == Physics.width) {
                this.momentumX = 0;
            }
            this.y += this.momentumY; //no collision increment velocity
            this.x += this.momentumX;

            if (this.collisionBottom || this.collisionTop) {
                /*if (this.momentumY > 0) { //old system
                    this.momentumY = -Physics.gravitationalConstant;
                } else {
                    this.momentumY -= 0.5;
                }*/
                this.momentumY = -0.25; //new system
            } else {
                if (this.momentumY != Physics.terminalVelocity || this.momentumY != -Physics.terminalVelocity) {
                    this.momentumY = this.momentumY+Physics.gravitationalConstant;
                }

                /*if (this.collisionRight) { //only do x check if y is stable to prevent drifting
                    this.momentumX = Physics.frictionConstant;
                } else if (this.collisionLeft) {
                    this.momentumX = -Physics.frictionConstant;
                }*/
                if (this.collisionRight || this.collisionLeft) {
                    this.momentumX = 0;
                }
            }
            if (this.momentumX < Physics.frictionConstant && this.momentumX > -Physics.frictionConstant) { //fix for glitch where momentum will be less than constant and oscillation occurs
                this.momentumX = 0;
            }
            if (this.momentumY < Physics.gravitationalConstant && this.momentumY > Physics.gravitationalConstant) {
                this.momentumY = 0;
            }
            if (this.collisionRight == false || this.collisionLeft == false) {
                if (this.momentumX != Physics.terminalVelocity && this.momentumX != -Physics.terminalVelocity) {
                    if (this.momentumX > 0) {
                        this.momentumX = this.momentumX-Physics.frictionConstant;
                    } else if (this.momentumX < 0) {
                        this.momentumX = this.momentumX+Physics.frictionConstant;
                    }
                }
            }
        }
        if (this.height+this.y == Physics.height) {
            this.momentumY = -2;
        }
    }

    if (render) {
        Physics.render(false,this);
    }
}

Physics.shape.prototype.calculate = function() {
    if (this.pointTable === undefined || this.updPointTable === undefined) {
        console.error("No point table or updatePointTable object found")
    } else {
        this.updPointTable = [];
        for (var i=0; i<this.pointTable.length; i++) {
            this.updPointTable[i] = [];
            if (this.pointTable[i].length == 2) {
                this.updPointTable[i][0] = this.pointTable[i][0]+this.x;
                this.updPointTable[i][1] = this.pointTable[i][1]+this.y;
            } else {
                console.error("Point table i:"+i+" has an invalid point length, not 2");
            }
        }
    }
    this.centerPoint = [(this.updPointTable[0][0]+(0.5*(this.width || this.radius || this.height || 0))),(this.updPointTable[0][1]+(0.5*(this.height || this.radius || this.width || 0)))];
}

var play = [];
var timeSinceUpKey;
var timeBetweenJumps = 1000;
var lastKeyPress = Date.now();
Physics.shape.prototype.control = function() {
    play = this;
    window.onkeydown = function(e) {
        var e = window.event ? window.event : e;
        if (e.keyCode == 38) { //up
            timeSinceUpKey = Date.now()-lastKeyPress;
            if (play.momentumY < Physics.gravitationalConstant && timeSinceUpKey > timeBetweenJumps) {
                lastKeyPress = Date.now();
                play.y-=2;
                setTimeout(function(){
                    play.momentumY = -3;
                },50);
            } else if (lvlnum == 0 || lvlnum == "title") {
                play.momentumY = -2.5;
            }
        } else if (e.keyCode == 40) { //down
            if (play.y+play.height == Physics.height || play.momentumY < Physics.gravitationalConstant) {
                play.momentumY = 3;
            } else if (lvlnum == 0 || lvlnum == "title") {
                play.momentumY = 3;
            }
        } else if (e.keyCode == 37) { //left
            if (play.momentumX < Physics.terminalVelocity && play.momentumX > -Physics.terminalVelocity) {
                play.momentumX = -3;
            }
        } else if (e.keyCode == 39) { //right
            if (play.momentumX < Physics.terminalVelocity && play.momentumX > -Physics.terminalVelocity) {
                play.momentumX = 3;
            }
        }
    }
}

