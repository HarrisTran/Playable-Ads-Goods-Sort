const fs = require("fs");
const path = require("path");
 // Import the hooks

// Path to the game script where InstallGame is implemented

exports.load = function () {
  console.log(`Plugin is loaded`);

  // Replace InstallGame method during the build

};


exports.unload = function () {
  console.log(`Plugin is unloaded`);
};

("use strict");
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
  require("events");
const r = { builder3x: e.builder3x,

  startBuild: async function () {
    const hooks = require("./hooks.js");
    
    try {
      const buildOptions = { dest: path.join(__dirname, "build") }; // Modify as needed
      await hooks.onBeforeBuild(buildOptions);
      e.builder3x(); // Trigger the build process

      // Trigger onAfterBuild hook after the build is completed
      hooks.onAfterBuild({}, {});
     
    } catch (error) {
      console.error("Error during build process:", error);
    }
  },
  openPanel: function() {
   
    
    Editor.Panel.open('playbuild.default');
  } };
(exports.configs = { "*": { hooks: "./hooks" } }),
  (exports.load = function () {
    console.log(`${e.BUILDER_NAME} is loaded`);
  }),
  (exports.methods = r),
  (exports.unload = function () {
    console.log(`${e.BUILDER_NAME} is unloaded`);
  });
