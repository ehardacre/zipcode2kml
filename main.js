// Modules to control application life and create native browser window
const {app, BrowserWindow} = require('electron')
const path = require('path')
const fs = require('fs')
const fse = require('fs-extra')
const {ipcMain, dialog} = require('electron')
const readline = require('readline');


function createWindow () {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 600,
    height: 450,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: true
    }
  })

  // and load the index.html of the app.
  mainWindow.loadFile('index.html')

  // Open the DevTools.
  //mainWindow.webContents.openDevTools()

}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on('ready', createWindow)

// Quit when all windows are closed.
app.on('window-all-closed', function () {
  // On macOS it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== 'darwin') app.quit()
})

app.on('activate', function () {
  // On macOS it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (BrowserWindow.getAllWindows().length === 0) createWindow()
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

ipcMain.on('open-file-dialog', (event) => {
  event.sender.send('clear-exception');
  var files = dialog.showOpenDialogSync({
    properties: ['openFile', 'openDirectory','multiSelections']
  });
  if (!files) return;
  unlinkOutput();
  const isMulti = files.length > 1
  if(isMulti){
    if (!checkFileTypes(files)){
      event.sender.send('exception',"Please select .csv file(s) or a directory containing .csv files.");
      return;
    }
    handleMulti(files);
  }else{
    file = files[0];
    //event.sender.send('selected-directory',file);
    //console.log(file);
    const isDir = fs.lstatSync(file).isDirectory();
    if(isDir){ //is directory
      fs.readdir(testFolder, (err, files) => {
        if (!checkFileTypes(files)){
          event.sender.send('exception',"Please select .csv file(s) or a directory containing .csv files.");
          return;
        }
         handleMulti(files);
      });
    }else{ //is single file
      if (!checkFileTypes(files)){
        event.sender.send('exception',"Please select .csv file(s) or a directory containing .csv files.");
        return;
      }
      handleSingle(files[0]);
    }


  }
  event.sender.send('output-ready');
})

ipcMain.on('open-output-dialog', (event) => {
  let options = {properties:["openDirectory"]};
  var outputDirList = dialog.showOpenDialogSync(options);
  if (!outputDirList) return;
  var outputDir = outputDirList[0];
  var dir = path.join(__dirname,"output");
  var out = fse.mkdirpSync(path.join(outputDir,"zip2KML_output"))
  fse.copySync(dir, out);
})

function handleMulti(files){
  for(file in files){
    handleSingle(file);
  }
}

function handleSingle(file){
  var data = fs.readFileSync(file);
  var jsonData = csvJSON(data.toString());
  filename = path.basename(file);
  filename = filename.split(".")[0]
  console.log(filename);
  zipcodes = []
  for(obj in jsonData){
    var object = jsonData[obj]["zip"]
    if (isNormalInteger(object) && object.length == 5) {
      zipcodes.push(jsonData[obj]["zip"]);
    }
  }

  setUpFile(zipcodes)

}

function setUpFile(zipcodes){
  console.log(zipcodes);
  var outputPathBase = path.normalize(`output/${filename}.kml`);
  writeKMLHeader(outputPathBase);
  for(zip in zipcodes){
    zip2KML(zipcodes[zip],outputPathBase);
  }
  writeKMLFooter(outputPathBase);
}

function unlinkOutput(){
  const directory = path.join(__dirname, 'output');
  var files = fs.readdirSync(directory);
  for (const file of files) {
    console.log(file)
    fs.unlink(path.join(directory, file), err => {
      if (err) throw err;
    });
  }
}

function writeKMLHeader(outputPathBase){
  var inPathBase = path.normalize('kml_parts/header.kml');
  var kmlbase = fs.readFileSync(path.join(__dirname, inPathBase));
  fs.appendFileSync(path.join(__dirname,outputPathBase),kmlbase);
}

function writeKMLFooter(outputPathBase){
  var inPathBase = path.normalize('kml_parts/footer.kml');
  var kmlbase = fs.readFileSync(path.join(__dirname, inPathBase));
  fs.appendFileSync(path.join(__dirname,outputPathBase),kmlbase);
}

function zip2KML(zip,outputPathBase){
  try{
    //var kmlbase = fs.readFileSync(path.join(__dirname, `all-zips/zip${zip}.kml`))
    placemarkOpen = false;
    trashOpen = false;
    try{
      readPathBase = path.normalize(`all-zips/zip${zip}.kml`);
    }catch(err){
      console.log(err);
      return;
    }

    var out = fs.openSync(path.join(__dirname,outputPathBase),"a");
    var lines = fs.readFileSync(path.join(__dirname,readPathBase), 'utf-8')
    .split('\n')
    .filter(Boolean);

    for(l in lines){
      var line = lines[l];
      outStr = line;
      if(line.includes("<Placemark")){
        placemarkOpen = true;
        outStr = "<Placemark>\n<styleUrl>#KMLStyler</styleUrl>\n";
      }
      if(line.includes("</Placemark")){
        placemarkOpen = false;
        fs.append
        fs.writeSync(out,line);
        fs.writeSync(out,"\n");
      }
      if(placemarkOpen){
        if(line.includes("<description>")){
          trashOpen = true;
        }
        if(line.includes("</ExtendedData>")){
          trashOpen = false;
          continue;
        }
        if(line.includes("<name>")){
          outStr = `<name>${zip}</name>\n`;
        }
        if(!trashOpen){
          fs.writeSync(out,outStr)
          fs.writeSync(out,"\n");
        }
      }
    }
    fs.closeSync(out);

  }catch(error){
    console.log(error);
  }
}

function isNormalInteger(str) {
    var n = Math.floor(Number(str));
    return n !== Infinity && String(n) === str && n >= 0;
}

function csvJSON(csv){
  var lines=csv.split("\n");
  var result = [];
  var headers=lines[0].split(",");
  for(var i=1;i<lines.length;i++){
	  var obj = {};
	  var currentline=lines[i].split(",");
	  for(var j=0;j<headers.length;j++){
		  obj[headers[j]] = currentline[j];
	  }
	  result.push(obj);
  }
  return result; //JavaScript object
  //return JSON.stringify(result); //JSON
}


function checkFileTypes(files){
  for(f in files) {
    file = files[f];
    ext = path.extname(file);
    if(ext != '.csv'){
      return false;
    }
  }
  return true;
}
