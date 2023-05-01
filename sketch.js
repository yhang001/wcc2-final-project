/*Inspired by slit-scan photography, Slicer is an interactive artwork explores 
how embodied phyiscal movement alters spatio-temporal correlations in the moving images.
There are three experimental modes for viewers to play with.

Auther: Yifan Hang

Interaction Way: Use the body movement to change the slices 
                 Press key "1" "2" "3" to play with different modes by using your body
                 Press key "f" to show in full screen; "c" to clear the canvas; "s" to save the image
                 Click the button to show and hide the video and graphics hints
                 Press key "h" to hide all the GUI elements, for shown in exhibitions
        
Reference:  Code example from week9: https://kylemcdonald.github.io/cv-examples/
            Daniel Shiffman: https://www.youtube.com/watch?v=YqVbuMPIRwY
                             https://www.youtube.com/watch?v=oLiaUEKsRws&t=1011s
            Vamoss: https://openprocessing.org/sketch/1103031
            https://p5js.org/reference/#/p5.Vector/heading
            https://www.w3schools.com/jsref/met_document_getelementbyid.asp
            chatGPT

*/

let capture;
let previousPixels;
let flow;
let step = 8;
let slider; //test for the value

//variable for mode1
let c;
let x1; //the starting place of the copy image
let alpha;

//variable for mode2
let snapshots = []; //save all the frames
let counter = 0; 
let vel = 1; //moving speed
let a = 0;  //moving position added to slice
let num = 4; //the number of segments

//variable for mode3
let posIn, posOut = 0; //position for the slices getting from video to canvas
let rectX = 5;
let rectY = 100;
let i = 0;

//three modes
let mode1 = false; 
let mode2 = false;
let mode3 = false;
let pgMode = true;
let buttonMode = false;

//GUI
let pg;
let button;

////////////////////////////////////////////////////////
function setup() {
    c = createCanvas(windowWidth, windowHeight);
    c.parent("sketch-container"); //move the canvas inside this HTML element

    background(255);

    //slider to change the threshold for testing
    slider = createSlider(0,15,12);
    slider.position(10,10);
    slider.style('width', '80px');
    slider.hide();

    //create the button & instructions on pg
    addGUI();

    //create the video
    capture = createCapture(VIDEO);
    capture.size(160, 160); 
    capture.hide();
    pixelDensity(10);

    flow = new FlowCalculator(step);  

    x1 = width/2; //starting position for mode1 in the middle of the canvas

    refresh(); //refresh the mode3
}

////////////////////////////////////////////////////////
function same(a1, a2, stride, n) {
    for (let i = 0; i < n; i += stride) {
        if (a1[i] != a2[i]) {
            return false;
        }
    }
    return true;
}

////////////////////////////////////////////////////////
function refresh(){
    //position from video as input to canvas as output
    posIn = {x: random(capture.width),y: random(capture.height)};
    posOut = {x: 0, y: 0};
}

////////////////////////////////////////////////////////
function draw() {
    capture.loadPixels();

    let val = slider.value();

    //draw the information text on pg
    InformationText();

    // get the movement for the frame
    if (capture.pixels.length > 0) {
        if (previousPixels) {
            previousPixels.loadPixels();
            
            // cheap way to ign2ore duplicate frames
            if (same(previousPixels.pixels, capture.pixels, 4, width)) {
                return;
            }
            // calculate optical flow
            flow.calculate(previousPixels.pixels, capture.pixels, capture.width, capture.height);
        }else {
            previousPixels = createImage(capture.width, capture.height);
        }

        previousPixels.copy(capture, 0, 0, capture.width, capture.height, 0, 0, capture.width, capture.height);
        
        //draw frames of video to pg; translate the video to avoid mirroring confusion 
        pg.push();
        pg.translate(capture.width,0);
        pg.scale(-1,1);
        pg.image(capture,0,0,capture.width,capture.width);
        pg.pop();

        // code to visualise optical flow grid
        if (flow.flow && flow.flow.u != 0 && flow.flow.v != 0) {

            //Reference: https://p5js.org/reference/#/p5.Vector/heading
            //determine the direction of the vector and use it to change the position of the slited image
            let flowww = createVector(flow.flow.u,flow.flow.v);
            let myHeading = flowww.heading();
            let dir =  degrees(myHeading).toFixed(2);
            let vec2 = flowww.normalize();

            //adjust this number to make it more or less sensitive to movement: bigger, less sensitive
            let gridThreshold = val;

            //draw different model
            for (let i=0; i<flow.flow.zones.length; i++){
                zone = flow.flow.zones[i];

                //1.choose the model     2.only if movement is significant, do something
                if(mode1){
                    if (abs(zone.u)>gridThreshold || abs(zone.v)>gridThreshold){
                        genScanLine(dir,vec2);
                    }
                }

                if(mode2){
                    if (abs(zone.u)>gridThreshold || abs(zone.v)>gridThreshold){
                           genScanSquare();
                    }
                }

                if(mode3){
                    if (abs(zone.u)>gridThreshold || abs(zone.v)>gridThreshold){
                        genScanStream(flowww);
                    }
                }
            }  
        }
    }
}

////////////////////////////////////////////////////////
function InformationText(){
    //draw the information for audience to use
    let textX = 4;
    let textY = 170;
    let textLineHeight = 20;
    let textLines = ["Press the key '1' '2' or '3' on the", "keyboard to play with different", "modes."];
    
    pg.textSize(11);

    //show in three lines
    for (let i = 0; i < textLines.length; i++) {
      pg.text(textLines[i], textX, textY + (i * (textLineHeight - 6)));
    }
}

////////////////////////////////////////////////////////
/* MODE1: Use body as a pen or eraser to change the moving direction of slited image */
function genScanLine(dir,vec2){

    //Reference: https://www.youtube.com/watch?v=YqVbuMPIRwY
    //Slit-scan video: restart if it is out of canvas
    if((x1 < 0) || (x1 > width)) x=0;

    //if the movement in all is right, the slice moves to right; else to left
    if((dir >= -90) && (dir <= 90)){
        x1 += 1;
    }else{
        x1 -= 1;
    }

    //draw the image slice
    push();
    translate(width,0);
    scale(-1,1);
    copy(capture, capture.width/2 ,0, 1, capture.height, x1, 0, 1, height);
    pop();

    //show our average direction and the circle
    pg.push();
    pg.strokeWeight(0.5);
    pg.translate(capture.width/2, capture.height/2);
    pg.scale(-1,1)
    pg.stroke(0);
    let dir2 = vec2.heading();
    pg.line(0, 0, capture.height/2*cos(dir2), capture.height/2*sin(dir2)); 
    pg.noFill();   
    pg.circle(0,0,capture.height-1);
    pg.pop();

}

////////////////////////////////////////////////////////
/* MODE2: As long as there are some changes shown in the frame by the body,each square will start the
slit-scanning process front and back */
function genScanSquare(){
    let segW = width / 4 ;
    let segH = height / 4;
    let posX = 0; //starting point for each segment
    let posY = 0;

    //calculate the size for scaling on X and Y
    let scaleAmountX = width / capture.width;
    let scaleAmountY = height / capture.height; 

    //total numbers of the segments
    let total = (width/segW) * (height/segH);
    
    //Reference: https://www.youtube.com/watch?v=oLiaUEKsRws&t=1011s
    //save each frame of the video to an array 
    //keeps track of the number of frames so each segment is different and sequent
    snapshots[counter] = capture.get();
    counter++;

    //refresh the frame  to show in each segment
    if(counter == total+ 30){ //add number to avoid delay of the camera 
        counter = 0;
    }

    //show the video instead of each frame in each segment
    for(let i = 0; i<snapshots.length; i++){
        let index = (i + frameCount) % snapshots.length;

        push();
        translate(width,0)
        scale(-1,1);
        scale(scaleAmountX, scaleAmountY);
        copy(snapshots[index],posX/scaleAmountX, posY/scaleAmountY, 5,segH,(posX+a)/scaleAmountX, posY/scaleAmountY,5,segH);
        pop();

        //update the position of each segment
        posX = posX + segW;
        if(posX > width){
            posX = 0;
            posY = posY + segH;
        }
    }
        
    //update the position of each slice and move backword
    if(a>segW || a<0){
        vel = -vel;
    }
    a += vel;  
    
    //draw small rectangles to show the movement on pg
    pg.push();
    pg.translate(capture.width,0);
    pg.scale(-1,1);
    pg.strokeWeight(map(zone.u, -step, +step, 0, 1));
    pg.noFill();
    pg.rect(zone.x, zone.y-5, 5,5);
    pg.rect(zone.x + zone.u, zone.y + zone.v-5,5,5);
    pg.pop();
}

////////////////////////////////////////////////////////
/* MODE3: Use the average direction changes caused by body movement to decide which slice to show in sequence*/
function genScanStream(flowww){

    //Reference: https://openprocessing.org/sketch/1103031
    //position to decide where to get the slice from the video
    let x3, y3;

    let moveX = flowww.x*50;
    let moveY = flowww.y*50;

    //constrain the postion of square(the slice) inside of the video
    x3 = constrain(moveX, rectX/2 - capture.width/2, capture.width/2 - rectX/2);
    y3 = constrain(moveY, rectY/2 - capture.height/2, capture.height/2 - rectY/2);

    //draw the average line and the square to show the direction and place
    pg.push();
    pg.translate(capture.width/2,capture.height/2);
    pg.scale(-1,1);
    pg.stroke(1);
    pg.line(0,0,x3-1,y3-1);
    pg.noFill();
    pg.rect(x3-1,y3-1,rectX,rectY);
    pg.pop();

    //because of the mirroring, the copying place is changed accordingly
    copy(capture, x3+capture.width/2-rectX/2, y3+capture.height/2-rectY/2, rectX, rectY, posOut.x, posOut.y, rectX, rectY);

    //update the position
    posOut.x += rectX;

    if(posOut.x > width){
        posOut.x = 0;
        posOut.y += rectY;
        
        //restart from the beginning
        if(posOut.y >= height){
          refresh();
        }
    }
}

////////////////////////////////////////////////////////
/*all the key function to change the mode*/
function keyPressed(){
    if(key == 's'){
        saveCanvas(c, 'myCanvas', 'jpg');
    }

    //mode1
    if(key == '1'){
        clear();
        mode1 = true;
        mode2 = false;
        mode3 = false;
    }
    //mode2
    if(key == '2'){
        clear();
        mode1 = false;
        mode2 = true;
        mode3 = false;
    }
    //mode3
    if(key == '3'){
        clear();
        refresh();
        mode1 = false;
        mode2 = false;
        mode3 = true;
    }
    //clear the canvas
    if(key == 'c'){
        clear();
    }

    //shown in full-screen
    if (key == 'f') {
        fullscreen(true);
      }
      
      //hide all the GUI elements to get a clear canvas
      if (key == 'h') {
        buttonMode = !buttonMode;
        if(!buttonMode){
            document.getElementById('button-1').style.display = "none";
            document.getElementById('video-window').style.display = "none";
        }else{
            document.getElementById('button-1').style.display = "block";
            document.getElementById('video-window').style.display = "block";
        }
        }
      }

////////////////////////////////////////////////////////
//responsitive to window size and restart the mode
function windowResized() {
    resizeCanvas(windowWidth, windowHeight);
    button.position(width-100,0);
    x1 = width/2;
    refresh();
}

////////////////////////////////////////////////////////
function addGUI(){
    //add button and video window with information
    button = createButton("Hide Video");
    button.addClass("button");
    button.attribute('id','button-1');
    button.parent("gui-container");
    button.mousePressed(handleButtonPress); 
    button.position(width-100,0);

    pg = createGraphics(160,200); 
    pg.parent("sketch-container");
    pg.attribute('id','video-window');
    pg.rectMode(CENTER);
    pg.background(255);
    pg.position(0,0);
    //Reference:https://www.w3schools.com/jsref/met_document_getelementbyid.asp
    //show the element on html
    document.getElementById('video-window').style.display = "block";
}

////////////////////////////////////////////////////////
function handleButtonPress(){
    //change the mode of showing pg
   pgMode = !pgMode;
   if (pgMode) {
    button.html("Hide Video");
    document.getElementById('video-window').style.display = "block";
   } else {
    button.html("Show Video");
    document.getElementById('video-window').style.display = "none";
   }
}