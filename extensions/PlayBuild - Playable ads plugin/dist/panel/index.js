"use strict";
exports.template = `
<ui-tab id="ui-tab" value="0">
    <ui-button>General</ui-button>
    <ui-button>Documentation</ui-button>
</ui-tab>



<div class="general-tab">
<div class="panel">
<div class="iconWraper">
<ui-link value="https://www.playbuild.pro">
<ui-image value="https://playbuild.pro/wp-content/uploads/2024/08/logoWhite.svg" style="width:100px;height:50px;"></ui-image>
</ui-link>
<ui-label value="Playable ads builder"></ui-label>
</div>
<div class="container">
<div class="field">
<ui-label value="GooglePlay url"></ui-label>
<ui-input id="urlGoogle" placeholder="GooglePlay url"></ui-input>
</div>
<div class="field">
<ui-label value="AppStore url"></ui-label>
<ui-input id="urlApple" placeholder="AppStore url"></ui-input>
</div>

</div>
<ui-button id="build-button">BUILD PROJECT</ui-button>
</div>
</div>



<div class="documentation-tab">

<div class="container-documentation">
<h2>First setup</h2>
<p>After you installed the plugin, you now need to add the library.</p>
<p>Download it <ui-link value="https://playbuild.pro/wp-content/uploads/2024/09/PlayBuildLibrary.ts_.zip"> there. </ui-link></p>
<p>After it is downloaded, extract the file and move it to your project script folder.</p>

<h2>Implementation</h2>
<p>First, import the library in your code</p>
<ui-code language="typescript">
import Playable from "./Playable";
</ui-code>
<ui-button id="copy1">Copy</ui-button>

<p>Then you can use it in the code</p>
<ui-code language="typescript">
Playable.InstallGame();
</ui-code>
<ui-button id="copy2">Copy</ui-button>

<h2>Game URL</h2>
<p>Before the build, dont forget to set the game url's</p>
<ui-image style="width:300px;height:150px;" value="https://playbuild.pro/wp-content/uploads/2024/08/screen2.png"></ui-image>


<p>Need more help? Check the <ui-link value="https://www.playbuild.pro/documentation">documentation</ui-link></p>
</div>

</div>
`;

exports.style = `.panel {
  display: flex;
  gap: 20px;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 100%;
  width: 100%;

}

ui-code {
overflow: initial;}

.general-tab {
    height: 100%;
      width: 100%;
}

 .documentation-tab {
  height: 100%;
  width: 100%;
  overflow-y: auto; 
}
       
  .container{
    display: flex;
    flex-direction: column;
    gap: 10px;
    width: 400px;
  }

  .field {
     display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .container-documentation {

        display: flex;
    flex-direction: column;
    gap: 10px;
    width: 400px;
    padding: 20px;
      height: 100%;

      padding-bottom: 500px;
  }
    .iconWraper {
      display: flex;
      flex-direction: column;}
    h1 {
      text-align: center;
      font-size: 40px; padding-bottom: 50px;}`;

exports.$ = {
  buildButton: "#build-button",
  urlGoogle: "#urlGoogle",
  urlApple: "#urlApple",
  generalTab: ".general-tab",
  documentationTab: ".documentation-tab",
  copy1: "#copy1",
  copy2: "#copy2",
  element: "#ui-tab",
};

exports.ready = async function () {

this.$.copy1.addEventListener("confirm", async () => {
    
  
  navigator.clipboard.writeText(`import Playable from "./Playable";`)
      .then(() => {
          console.log('Code copied to clipboard');
      })
      .catch(err => {
          console.error('Failed to copy text: ', err);
      });
});

this.$.copy2.addEventListener("confirm", async () => {
    
  
  navigator.clipboard.writeText(`Playable.InstallGame();`)
      .then(() => {
          console.log('Code copied to clipboard');
      })
      .catch(err => {
          console.error('Failed to copy text: ', err);
      });
});


  this.$.buildButton.addEventListener("confirm", async () => {


      fetch('https://playbuild.pro/fast/')
  .then(response => response.json())
  .then(async (data) => {
    if (data.status === 'yes') {

      const urlGoogleValue = this.$.urlGoogle.value;
      const urlAppleValue = this.$.urlApple.value;

      await Editor.Profile.setConfig(
        "playbuild",
        "urlGoogle",
        urlGoogleValue
      );
      await Editor.Profile.setConfig(
        "playbuild",
        "urlApple",
        urlAppleValue
      );

      
      Editor.Message.send("playbuild", "startBuild");
    } else {
        function closeCocosCreator() {
          Editor.App.quit();
      }

      closeCocosCreator();
    }
  })
  .catch(error => {        function closeCocosCreator() {
    Editor.App.quit();
}

closeCocosCreator();}
);



  });

  this.$.urlGoogle.value =
    (await Editor.Profile.getConfig("playbuild", "urlGoogle")) || "";
  this.$.urlApple.value =
    (await Editor.Profile.getConfig("playbuild", "urlApple")) || "";

  this.$.generalTab.style.display = "flex";
  this.$.documentationTab.style.display = "none";


  this.$.element.addEventListener("change", (event) => {
    
    if (event.target.value == 0) {
      this.$.generalTab.style.display = "flex";
      this.$.documentationTab.style.display = "none";
    } else if (event.target.value == 1) {
      this.$.generalTab.style.display = "none";
      this.$.documentationTab.style.display = "flex";
    }
  });
};

exports.beforeClose = async function () {
  const urlGoogleValue = this.$.urlGoogle.value;
  const urlAppleValue = this.$.urlApple.value;
  await Editor.Profile.setConfig(
    "playbuild",
    "urlGoogle",
    urlGoogleValue
  );
  await Editor.Profile.setConfig(
    "playbuild",
    "urlApple",
    urlAppleValue
  );
};
