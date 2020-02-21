// This file is required by the index.html file and will
// be executed in the renderer process for that window.
// No Node.js APIs are available in this process because
// `nodeIntegration` is turned off. Use `preload.js` to
// selectively enable features needed in the rendering
// process.

const {ipcRenderer} = require('electron')

const selectDirBtn = document.getElementById('select-directory')
const selectOutBtn = document.getElementById('select-output')
var outputReady = false;

selectDirBtn.addEventListener('click', (event) => {
  try{
    ipcRenderer.send('open-file-dialog')
  }catch(error){
    console.log(error);
  }
})

selectOutBtn.addEventListener('click', (event) => {
  if (outputReady){
    try{
      ipcRenderer.send('open-output-dialog')
    }catch(error){
      console.log(error);
    }
  }
})

ipcRenderer.on('output-ready',(event) => {
  outputReady = true;
  selectOutBtn.classList.remove("empty");
})

ipcRenderer.on('selected-directory', (event, path) => {
  document.getElementById('selected-file').innerHTML = `You selected: ${path}`
})

ipcRenderer.on('exception', (event, err) => {
  document.getElementById('error-message').innerHTML = err
})

ipcRenderer.on('clear-exception', (event) => {
  document.getElementById('error-message').innerHTML = ""
})
