// ==UserScript==
// @name           Tabplus.uc.js
// @description    设置标签的打开方式
// @update         2020-09-21
// @update         2019-09-23
// @update         2019-09-14
// @update         2018-04-20
// @license        MIT License
// @compatibility  Firefox 70+
// @charset        UTF-8
// @include        chrome://browser/content/browser.xhtml
// @include        chrome://browser/content/browser.xul
// ==/UserScript==

// 01. 自动切换到鼠标移动到的标签页
/*((g, w) => {
  class TabPlus {
    constructor() {
      this.SelectedTabOnMouseover();
    }
    SelectedTabOnMouseover(timeout) {
      g.tabContainer.addEventListener('mouseover', e => {
        const tab = e.target.closest('.tabbrowser-tab');
        if (!tab) return;
        timeout = setTimeout(() => g.selectedTab = tab, 150);
      }, false);
      g.tabContainer.addEventListener('mouseout', () => clearTimeout(timeout), false);
    }
  }
  new TabPlus();
})(gBrowser, window);
*/


// 02. 右键关闭标签页
/*
gBrowser.tabContainer.addEventListener("click",
function(event) {
    if (event.button == 2 && !event.ctrlKey) {
        const tab = event.target.closest('.tabbrowser-tab');
        if(!tab) return;
        gBrowser.removeTab(tab);
        gBrowser.removeTab(tab, {animate: false});
        event.stopPropagation();
        event.preventDefault();
    }
},
false);
*/


// 03. 双击标签页关闭标签页
if (!Services.prefs.getBoolPref('browser.tabs.closeTabByDblclick')) {
    gBrowser.tabContainer.addEventListener("dblclick", function (event) {
        if (event.button == 0 && !event.ctrlKey) {
            const tab = event.target.closest('.tabbrowser-tab');
            if (!tab) return;
            // gBrowser.removeTab(tab);
            gBrowser.removeTab(tab, {animate: true});
        }
    }, false);
}


// 04. 标签栏鼠标滚轮切换标签页
(function () {
    if (!location.href.startsWith('chrome://browser/content/browser.x'))
        return;
    const scrollRight = true;
    const wrap = true;
    let totalDir = 0;
    gBrowser.tabContainer.addEventListener("wheel",function (event) {
        event.stopImmediatePropagation();
        event.preventDefault();
        let dir = (scrollRight ? 1 : -1) * Math.sign(event.deltaY);
        totalDir += dir;
        setTimeout(function () {
            if (totalDir === 0) return;
            gBrowser.tabContainer.advanceSelectedTab(totalDir, wrap);
            totalDir = 0;
        }, 5);
    }, true);

})();


// 05. 在新标签页查看图片
location.href.startsWith('chrome://browser/content/browser.x') && (function () {
    document.querySelector("#context-viewimage").setAttribute("oncommand", 'openTrustedLinkIn(gContextMenu.imageURL,"tab")');
})();


// 06. 鼠标移动到地址栏和搜索栏时自动全选里面的文字
/* {if (location == "chrome://browser/content/browser.xul") {
// 地址栏
var autselectpulbar = document.getElementById("urlbar-container");
autselectpulbar.addEventListener("mouseover", function(event){
            if(event.target.compareDocumentPosition(document.activeElement)!= 20)
                   event.target.select();
    }, false);

// 搜索栏
var autselectpsearchbar = document.getElementById("searchbar");
 autselectpsearchbar.addEventListener("mouseover", function(event){
           if(event.target.compareDocumentPosition(document.activeElement)!= 20)
                   event.target.select();
}, false);
}
};
*/

/*
//07.  关闭标签页后选择左侧标签
(function () {
    gBrowser.tabContainer.addEventListener("TabClose", tabCloseHandler, false);

    function tabCloseHandler(event) {
        if (gBrowser.__mozIsInGesture) return;
        var tab = event.target;
        gBrowser.selectedTab = tab;
        if (gBrowser.selectedTab._tPos != 0) {
            gBrowser.tabContainer.advanceSelectedTab(-1, true);
        }
    }
})();

*/

//08.  新标签打开侧边栏历史页面
/*
(function() {
    if (!location.href.startsWith('chrome://browser/content/browser.x'))
    return;

  eval('PlacesUIUtils.openNodeWithEvent = '  + PlacesUIUtils.openNodeWithEvent.toString()
    .replace(' && PlacesUtils.nodeIsBookmark(aNode)', '')
    .replace('getBrowserWindow(window)',
      '(window && window.document.documentElement.getAttribute("windowtype") == "navigator:browser") ? window : BrowserWindowTracker.getTopWindow()')
  );

  let onPopupshowing = function() {
    let historyMenu = document.getElementById('history-menu');
    if (!historyMenu._placesView) {
      new HistoryMenu(event);
      historyMenu._placesView._onCommand = function HM__onCommand(aEvent) {
        let placesNode = aEvent.target._placesNode;
        if (placesNode) {
          PlacesUIUtils.openNodeWithEvent(placesNode, aEvent);
        };
      };
    };
  };

  let historyPopup = document.getElementById('goPopup');
  historyPopup.setAttribute('onpopupshowing', '(' + onPopupshowing.toString() + ')()');

})();
*/


// 09. 按住右键鼠标滚轮切换标签页
/*
(function() {
  if (!location.href.startsWith('chrome://browser/content/browser.x'))
    return;
  const scrollRight = true;
  const wrap = true;
  gBrowser.addEventListener("wheel", function(event) {
    // 2  : 鼠标右键
	if (!(event.buttons & 0x2)) return;
    let dir = (scrollRight ? 1 : -1) * Math.sign(event.deltaY);
    setTimeout(function() {
      gBrowser.tabContainer.advanceSelectedTab(dir, wrap);
    }, 0);
  }, true);
})();

*/

// 10. 在当前标签页右侧打开新标签页
(function () {
    if (!location.href.startsWith('chrome://browser/content/browser.x'))
        return;
    // monkey-patch for more information
    const {_insertTabAtIndex: superInsertTabAtIndex} = gBrowser;
    gBrowser._insertTabAtIndex = monkeyPatchInsertTabAtIndexByTabPlus;

    // https://github.com/mozilla/gecko-dev/blob/969fc7fa6c3c7fc489f53b7b7f8c902028b5169f/browser/base/content/tabbrowser.js
    function monkeyPatchInsertTabAtIndexByTabPlus(tab, params = {}) {
        // console.log(tab, params);
        let {
            bulkOrderedOpen,
            index,
            openerTab,
            ownerTab,
            pinned,
        } = params;
        let {selectedTab} = gBrowser;
        // 在当前标签页打开标签
        if (!bulkOrderedOpen &&
                ownerTab === selectedTab &&
                ownerTab === openerTab &&
                typeof index === 'number') {
            // 在当前标签页右侧打开新标签页
            params.index = selectedTab._tPos + 1;
            // 鼠标中键打开
        } else if (index === undefined &&
                openerTab === selectedTab &&
                !bulkOrderedOpen && !pinned) {
            // 在当前标签页右侧打开新标签页
            params.index = selectedTab._tPos + 1;
        }
        /*
        恢复关闭的标签页：
        bulkOrderedOpen: undefined
        index: number
        openerTab: false
        ownerTab: undefined
        pinned: undefined
         */
        return superInsertTabAtIndex.call(this, tab, params);
    }

    monkeyPatchInsertTabAtIndexByTabPlus._superFunction = superInsertTabAtIndex;

})();

// 11. 关闭当前标签页后选择左侧标签
(function () {
    if (!location.href.startsWith('chrome://browser/content/browser.x'))
        return;
    // monkey-patch for more information
    const {removeTab: superRemoveTab} = gBrowser;
    gBrowser.removeTab = removeTabAndAdvanceLeftTab;

    // https://github.com/mozilla/gecko-dev/blob/969fc7fa6c3c7fc489f53b7b7f8c902028b5169f/browser/base/content/tabbrowser.js
    function removeTabAndAdvanceLeftTab(tab, params = {}) {
        // console.log(tab, params);
        let {selectedTab} = gBrowser;
        // see MouseGestures.uc.js
        if (!gBrowser.__mozIsInGesture &&
                // 关闭当前标签页
                tab === selectedTab &&
                selectedTab._tPos !== 0 &&
                !(tab.closing || this._windowIsClosing)) {
            // 在当前标签页右侧打开新标签页
            gBrowser.tabContainer.advanceSelectedTab(-1, true);
        }
        return superRemoveTab.call(this, tab, params);
    }

    removeTabAndAdvanceLeftTab._superFunction = superRemoveTab;
})();

// 12. 关闭最后一个标签页时，如果最后一个标签页是新标签页，关闭窗口
(function () {
    if (!location.href.startsWith('chrome://browser/content/browser.x'))
        return;
    const PERF_CLOSE_WINDOW_WITH_LAST_TAB = 'browser.tabs.closeWindowWithLastTab';
    const BROWSER_NEW_TAB_URL = new Set(['about:newtab', 'about:privatebrowsing']);

    // monkey-patch for more information
    const {removeTab: superRemoveTab} = gBrowser;
    gBrowser.removeTab = removeTabAndCloseWindowIfLastTabIsNewTab;

    function removeTabAndCloseWindowIfLastTabIsNewTab(tab, params = {}) {
        // 关闭最后一个标签页时
        if (gBrowser.tabs.length === 1 && gBrowser.tabs[0] === tab && tab.linkedBrowser &&
                // 如果最后一个标签页是新标签页
                BROWSER_NEW_TAB_URL.has(tab.linkedBrowser.documentURI.spec) &&
                BROWSER_NEW_TAB_URL.has(tab.linkedBrowser.currentURI.spec) &&
                // 并且配置了关闭最后一个标签页时不关闭窗口
                !Services.prefs.getBoolPref(PERF_CLOSE_WINDOW_WITH_LAST_TAB)) {
            // 关闭窗口
            params.closeWindowWithLastTab = true;
        }
        return superRemoveTab.call(this, tab, params);
    }

    removeTabAndCloseWindowIfLastTabIsNewTab._superFunction = superRemoveTab;
})();
