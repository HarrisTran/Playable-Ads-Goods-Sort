"use strict";


Object.defineProperty(exports, "__esModule", { value: !0 });
var e = require("./3x-2c4c983c.js");
require("electron"),
  require("child_process"),
  require("os"),
  require("fs"),
  require("path"),
  require("./playbuild-core.js"),
  require("util"),
  require("stream"),
  require("http"),
  require("https"),
  require("url"),
  require("assert"),
  require("zlib"),
  require("events"),
  (exports.onAfterBuild = function (r, i) {
    console.log(r), e.initBuildFinishedEvent(r);
  }),
  (exports.onBeforeBuild = async function (r) {
    const googleUrl = await Editor.Profile.getConfig("playbuild", "urlGoogle");
    const appleUrl = await Editor.Profile.getConfig("playbuild", "urlApple");
    
    if (!googleUrl && !appleUrl) {
      console.error('URLs are not set in the PlayBuild dashboard.');
     
  }
  else if (!googleUrl ) {
    console.error('Google Play URL are not set in the PlayBuild dashboard.');
    
  }
  else if (!appleUrl ) {
    console.error('AppStore URL are not set in the PlayBuild dashboard.');
    
  }
  // const buildDirectory = options.dest;
  const projectPath = Editor.Project.path;
  console.log(`${projectPath}/assets`);
  //const assetsDirectory = path.join(projectPath, 'assets');
  injectUrlsIntoGame(`${projectPath}/assets`, googleUrl, appleUrl);
    // console.log(options), e.initBuildStartEvent();
  });


  function injectUrlsIntoGame(directory, googleUrl, appleUrl) {

   const fs = require("fs");
   const path = require("path");
    fs.readdirSync(directory).forEach(file => {
        const filePath = path.join(directory, file);

        if (fs.statSync(filePath).isDirectory()) {
          // Recursively search in directories
          injectUrlsIntoGame(filePath, googleUrl, appleUrl);
        } else if (filePath.endsWith('.js') || filePath.endsWith('.ts')) {
          // Read the file content
          let fileContent = fs.readFileSync(filePath, 'utf8');
     // Check if the URLs have already been injected and replace them
     const appleUrlRegex = /let appleUrl = "([^"]*)";/;
     const googleUrlRegex = /let GoogleUrl = "([^"]*)";/;

     if (appleUrlRegex.test(fileContent) && googleUrlRegex.test(fileContent)) {
       // Replace the existing injected values
      
       fileContent = fileContent.replace(appleUrlRegex, `let appleUrl = "${appleUrl}";`)
                                .replace(googleUrlRegex, `let GoogleUrl = "${googleUrl}";`);
     } else {

       // Inject the URL assignments into the original variable declarations
       fileContent = fileContent.replace('let appleUrl;', `let appleUrl = "${appleUrl}";`)
                                .replace('let GoogleUrl;', `let GoogleUrl = "${googleUrl}";`);
     }
    
          // Write the updated content back to the file
          fs.writeFileSync(filePath, fileContent, 'utf8');
          console.log(`Injected URLs into: ${filePath}`);
            }
        
      
    });
}
