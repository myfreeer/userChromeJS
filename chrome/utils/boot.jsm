let EXPORTED_SYMBOLS = [];

let {
  classes: Cc,
  interfaces: Ci,
  manager: Cm,
  utils: Cu
} = Components;
Cu.import('resource://gre/modules/osfile.jsm');
var FileUtils = Cu.import("resource://gre/modules/FileUtils.jsm").FileUtils

var cmanifest = new FileUtils.File( OS.Constants.Path.libDir );
cmanifest.append('chrome');
cmanifest.append('utils');
cmanifest.append('chrome.manifest');
Cm.QueryInterface(Ci.nsIComponentRegistrar).autoRegister(cmanifest);

const {AddonManager} = ChromeUtils.import('resource://gre/modules/AddonManager.jsm');
if (AddonManager.addExternalExtensionLoader) {
  const {BootstrapLoader} = ChromeUtils.import('chrome://userchromejs/content/BootstrapLoader.jsm');
  AddonManager.addExternalExtensionLoader(BootstrapLoader);
}

// console.log(AddonManager);
ChromeUtils.import('chrome://userchromejs/content/userPrefs.jsm');
ChromeUtils.import('chrome://userchromejs/content/userChrome.jsm');
