// skip 1st line
try {

  const cmanifest = Components.classes["@mozilla.org/file/local;1"]
    .createInstance(Components.interfaces.nsIFile);
  Components.utils.import('resource://gre/modules/osfile.jsm');
  cmanifest.initWithPath(OS.Constants.Path.libDir);
  cmanifest.append('chrome');
  cmanifest.append('utils');
  cmanifest.append('chrome.manifest');
  Components.manager.QueryInterface(Components.interfaces.nsIComponentRegistrar).autoRegister(cmanifest);

  Components.utils.import('chrome://userchromejs/content/userChrome.jsm');
} catch (ex) {
  // no console.log at this moment
  Components.utils.reportError(ex);
}
