// ==UserScript==
// @name           customContextMenu.uc.js
// @description    定制右键菜单
// @author         myfreeer
// @include        chrome://browser/content/browser.xhtml
// @version        0.1.0
// ==/UserScript==

(function () {
    /// region 工具
    /**
     * 创建 XUL 元素
     * @param {string} tagName
     * @param {object?} attr attribute {[key: string]: value}
     */
    const createXulElement = (tagName, attr) => {
        const element = document.createXULElement(tagName);
        if (attr) {
            for (const k of Object.keys(attr)) {
                element.setAttribute(k, attr[k]);
            }
        }
        return element;
    };
    /// endregion 工具

    // region 禁用的页面右键菜单条目
    const blockContextMenu = [
        // 为此链接添加书签
        'context-bookmarklink',
        // 使用Upcheck下载此链接
        'context-downloadlink',
        // 用邮件发送图片…
        'context-sendimage',
        // 设为桌面背景…
        'context-setDesktopBackground',
        // 用邮件发送视频…
        'context-sendvideo',
        // 用邮件发送音频…
        'context-sendaudio',
    ];
    const contentAreaContextMenu = document.getElementById("contentAreaContextMenu");
    if (contentAreaContextMenu && blockContextMenu.length &&
            !contentAreaContextMenu.___blockContextMenu) {
        contentAreaContextMenu.addEventListener("popupshowing", function () {
            if (window.gContextMenu) {
                blockContextMenu.forEach(id => gContextMenu.showItem(id, false));
            }
        }, {
            passive: true,
            capture: false
        });
        contentAreaContextMenu.___blockContextMenu = true;
    }
    // endregion 禁用的页面右键菜单条目

    // region 工具栏增加附加组件选项菜单
    const toolbarContextMenu = document.getElementById('toolbar-context-menu');
    if (toolbarContextMenu && window.ToolbarContextMenu &&
            // already patched??
            !ToolbarContextMenu.openExtensionOption) {
        const {updateExtension} = ToolbarContextMenu;
        ToolbarContextMenu.updateExtension = async function patchUpdateExtension(popup) {
            const returnValue = await updateExtension.call(this, popup);
            const id = this._getExtensionId(popup);
            const addon = id && (await AddonManager.getAddonByID(id));
            const optionsURL = addon && addon.optionsURL;
            let openExtensionOption = popup.querySelector(
                    ".customize-context-openExtensionOption"
            );
            if (optionsURL) {
                if (!openExtensionOption) {
                    openExtensionOption = createXulElement("menuitem", {
                        "contexttype": "toolbaritem",
                        "class": "customize-context-openExtensionOption",
                        "label": '选项',
                        "oncommand":
                                'ToolbarContextMenu.openExtensionOption(this.parentElement)'
                    });
                    popup.insertBefore(openExtensionOption,
                            popup.querySelector(
                                    '.customize-context-reportExtension'));
                }
                openExtensionOption.hidden = false;
            } else if (openExtensionOption) {
                openExtensionOption.hidden = true;
                openExtensionOption.oncommand = null;
            }
            return returnValue;
        };
        ToolbarContextMenu.updateExtension._superFunction = updateExtension;
        ToolbarContextMenu.openExtensionOption = async function openExtensionOption(popup) {
            const id = this._getExtensionId(popup);
            const addon = id && (await AddonManager.getAddonByID(id));
            const optionsURL = addon && addon.optionsURL;
            if (!optionsURL) {
                return;
            }
            gBrowser.selectedTab = gBrowser.addTrustedTab(optionsURL);
        };
    }
    // endregion 工具栏增加附加组件选项菜单

    // TODO: 替换书签为当前标签页
    // region 书签栏增加添加书签到此处
    const bookmarkContextMenu = document.getElementById('placesContext');
    if (bookmarkContextMenu && window.PlacesUIUtils &&
            window.PlacesUtils &&
            // already patched??
            !PlacesUIUtils.addBookmarkToHere) {
        const placesContextShowing = PlacesUIUtils.placesContextShowing;
        // 书签栏右键菜单使用的 ID 不能通过常规的 querySelector 方式获取
        const queryChildren = (node, id) => {
            let c = node.children;
            for (let i = 0; i < c.length; i++) {
                if (c[i].id === id) {
                    return c[i];
                }
            }
        };
        PlacesUIUtils.placesContextShowing = function placesContextShowingAddHere(event) {
            const ret = placesContextShowing.call(this, event);
            if (!ret) {
                return ret;
            }
            // firefox 91?
            const node = document.popupNode || event?.target?.triggerNode;
            // TODO: 书签工具栏
            const isDir = node && node._placesNode &&
                    node._placesNode.bookmarkGuid &&
                    node.getAttribute('container');
            let newBookmarkHere =
                    queryChildren(bookmarkContextMenu, 'placesContext_new:bookmark_here');
            if (isDir) {
                if (!newBookmarkHere) {
                    newBookmarkHere = createXulElement("menuitem", {
                        "selectiontype": "any",
                        "hideifnoinsertionpoint": "true",
                        "id": "placesContext_new:bookmark_here",
                        "label": '添加书签到此处',
                        "oncommand": 'PlacesUIUtils.addBookmarkToHere(' +
                                'document.popupNode || placesContext.triggerNode)'
                    });
                    // maybe prepend here
                    bookmarkContextMenu.insertBefore(newBookmarkHere,
                            bookmarkContextMenu.firstElementChild);
                }
                newBookmarkHere.hidden = false;
            } else if (newBookmarkHere) {
                newBookmarkHere.hidden = true;
            }
            return ret;
        };
        PlacesUIUtils.placesContextShowing._superFunction = placesContextShowing;
        PlacesUIUtils.addBookmarkToHere = async function addBookmarkToHere(popupNode) {
            if (!popupNode ||
                    !popupNode._placesNode ||
                    !popupNode._placesNode.bookmarkGuid ||
                    !popupNode.getAttribute('container')) {
                return;
            }
            // fix multiple window
            const globalThat = popupNode.ownerGlobal || window;
            let browser = globalThat.gBrowser?.selectedBrowser;
            if (!browser) return;
            if (browser.documentURI) {
                let isErrorPage = /^about:(neterror|certerror|blocked)/.test(
                        browser.documentURI.spec
                );
                if (isErrorPage) {
                    return;
                }
            }
            let url = new globalThat.URL(browser.currentURI.spec);

            let info = {
                url,
                parentGuid: popupNode._placesNode.bookmarkGuid,
                title: browser.contentTitle
            };
            let charset = browser.characterSet;
            info.title = info.title || url.href;

            info.guid = await globalThat.PlacesTransactions.NewBookmark(info).transact();

            if (charset) {
                globalThat.PlacesUIUtils.setCharsetForPage(url, charset, window).catch(
                        Cu.reportError
                );
            }

            globalThat.StarUI.showConfirmation();
        };

    }
    // endregion 书签栏增加添加书签到此处

    // region 书签栏增加复制名称
    if (bookmarkContextMenu && window.PlacesUIUtils &&
            window.PlacesUtils &&
            // already patched??
            !PlacesUIUtils.copyBookmarkName) {
        const placesContextShowing = PlacesUIUtils.placesContextShowing;
        PlacesUIUtils.placesContextShowing = function placesContextShowingCopyText(event) {
            const ret = placesContextShowing.call(this, event);
            if (!ret) {
                return ret;
            }
            let bookmarkCopyText =
                    bookmarkContextMenu.querySelector('#placesContext_copyText');
            if (!bookmarkCopyText) {
                bookmarkCopyText = createXulElement("menuitem", {
                    "selectiontype": "any",
                    "hideifnoinsertionpoint": "true",
                    "id": "placesContext_copyText",
                    "label": '复制名称',
                    "oncommand": 'PlacesUIUtils.copyBookmarkName(' +
                            'document.popupNode || placesContext.triggerNode)'
                });
                // maybe prepend here
                let pasteMenu = bookmarkContextMenu.querySelector(
                        parseInt(Services?.appinfo?.version, 10) >= 91 ?
                                '#placesContext_paste_group' : '#placesContext_paste');
                bookmarkContextMenu.insertBefore(bookmarkCopyText, pasteMenu);
            }
            bookmarkCopyText.hidden = false;
            return ret;
        };
        PlacesUIUtils.placesContextShowing._superFunction = placesContextShowing;
        PlacesUIUtils.copyBookmarkName = async function addBookmarkToHere(popupNode) {
            popupNode = popupNode || document.popupNode;
            if (!popupNode || !popupNode.label) return;
            let clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
                    Ci.nsIClipboardHelper
            );
            clipboard.copyString(popupNode.label);
        };

    }
    // endregion 书签栏增加复制名称

    // region 页面右键菜单用其他搜索引擎搜索
    if (contentAreaContextMenu && !contentAreaContextMenu.___searchWithOtherSearchEngines) {
        const searchWithOther = function searchWithOther(index) {
            if (!this) return false;
            const {engines, principal, searchTerms, usePrivate, csp} = this;
            if (!engines || !engines[index]) return false;
            BrowserSearch._loadSearch(
                    searchTerms,
                    usePrivate && !PrivateBrowsingUtils.isWindowPrivate(window)
                            ? "window"
                            : "tab",
                    usePrivate,
                    "contextmenu",
                    Services.scriptSecurityManager.createNullPrincipal(
                            principal.originAttributes
                    ),
                    csp,
                    engines[index]
            );
        };
        // not making it too long
        // noinspection UnnecessaryLocalVariableJS
        const initSearch = async function showAndFormatOtherSearchContextItem() {
            let menu = document.getElementById(
                    "context-searchselect-other-parent");
            let popup = document.getElementById("context-searchselect-other");
            if (!menu) {
                menu = createXulElement("menu", {
                    "id": "context-searchselect-other-parent",
                    "class": "customize-context-searchselect-other",
                    "label": '用其他搜索引擎搜索'
                });
                let menuItem = document.getElementById('context-searchselect');
                if (!menuItem || !menuItem.parentElement) {
                    return false;
                }
                menuItem.parentElement.insertBefore(menu, menuItem.nextElementSibling);
                popup = createXulElement('menupopup', {
                    'id': "context-searchselect-other"
                });
                menu.appendChild(popup);
            }
            if (!Services.search.isInitialized) {
                menu.hidden = true;
                return;
            }
            const showSearchSelect =
                    !this.inAboutDevtoolsToolbox &&
                    (this.isTextSelected || this.onLink) &&
                    !this.onImage;
            if (!showSearchSelect) {
                menu.hidden = true;
                return;
            }
            menu.hidden = false;
            popup.searchTerms = this.isTextSelected
                    ? this.textSelected
                    : this.linkTextStr;
            popup.principal = this.principal;
            popup.engines = await Services.search.getVisibleEngines();
            if (!popup.engines.length) {
                menu.hidden = true;
                return;
            }
            popup.usePrivate = PrivateBrowsingUtils.isBrowserPrivate(this.browser);
            popup.csp = this.csp;
            for (let i = 0; i < popup.engines.length; i++) {
                let menuItem = popup.children[i];
                if (!menuItem) {
                    menuItem = createXulElement("menuitem", {
                        "contexttype": "toolbaritem",
                        "class": "customize-context-openExtensionOption",
                        "label": popup.engines[i].name,
                        "oncommand": 'this.parentElement._searchWithOther(' + i + ')'
                    });
                    popup.appendChild(menuItem);
                } else {
                    menuItem.label = popup.engines[i].name;
                }
            }
            popup._searchWithOther = searchWithOther;
        };

        contentAreaContextMenu.addEventListener("popupshowing", function () {
            if (window.gContextMenu) {
                initSearch.call(gContextMenu);
            }
        }, {
            passive: true,
            capture: false
        });

        contentAreaContextMenu.___searchWithOtherSearchEngines = true;
    }
    // endregion 页面右键菜单用其他搜索引擎搜索

    /// region 标签栏右键关闭左侧标签页
    const closeTabOptions = document.getElementById('closeTabOptions');
    if (closeTabOptions && window.TabContextMenu && TabContextMenu.updateContextMenu &&
            !TabContextMenu.__closeLeftTabs &&
            !document.getElementById('context_closeTabsToTheStart')) {
        const superUpdateContextMenu = TabContextMenu.updateContextMenu;

        function overrideUpdateContextMenuAddCloseTabsFromLeft(aPopupMenu) {
            superUpdateContextMenu.call(this, aPopupMenu);
            let menuItem = document.getElementById('context_closeTabsFromLeft');
            if (!menuItem) {
                menuItem = createXulElement("menuitem", {
                    "contexttype": "toolbaritem",
                    "id": 'context_closeTabsFromLeft',
                    "class": "customize-context-closeTabsFromLeft",
                    // "accesskey": "l",
                    "label": '关闭左侧标签页',
                    "oncommand": 'TabContextMenu.__closeTabsFromLeft(' +
                            'TabContextMenu.contextTab, {animate: true});'
                });
                closeTabOptions.prepend(menuItem);
            }
            menuItem.disabled = this.contextTab._tPos === 0;
        }

        TabContextMenu.updateContextMenu = overrideUpdateContextMenuAddCloseTabsFromLeft;
        TabContextMenu.updateContextMenu._superFunction = superUpdateContextMenu;
        TabContextMenu.__closeTabsFromLeft = function closeTabsFromLeft(aTab, opt) {
            for (let i = aTab._tPos - 1; i >= 0; i--) {
                if (!gBrowser.tabs[i].pinned) {
                    gBrowser.removeTab(gBrowser.tabs[i], opt);
                }
            }
        };
    }

    /// endregion 标签栏右键关闭左侧标签页

    /// region 修复新建标签页加载失败没有内容也不能刷新
    if (!window.BrowserReloadWithFlags || !BrowserReloadWithFlags.__reloadEmptyFail) {
        window.BrowserReloadWithFlags = function BrowserReloadWithFlags(reloadFlags) {
            let unchangedRemoteness = [];

            for (let tab of gBrowser.selectedTabs) {
                let browser = tab.linkedBrowser;
                let url = browser.currentURI.spec;

                /// region hack
                if (url === 'about:blank') {
                    let doc = tab.ownerDocument;
                    let input = doc.getElementById('urlbar-input');
                    if (input && input.value) {
                        let {value} = input;
                        let {label} = tab;
                        let p = ['http', 'https', 'ftp', 'file', 'about', 'chrome'];
                        for (let i = 0; i < p.length; i++) {
                            if (value.startsWith(p[i] + '://') &&
                                    value.slice(p.length + 2) === label) {
                                url = value;
                                break;
                            }
                        }
                    }

                }
                /// endregion hack

                // We need to cache the content principal here because the browser will be
                // reconstructed when the remoteness changes and the content prinicpal will
                // be cleared after reconstruction.
                let principal = tab.linkedBrowser.contentPrincipal;
                if (gBrowser.updateBrowserRemotenessByURL(browser, url) || url !== browser.currentURI.spec) {
                    // If the remoteness has changed, the new browser doesn't have any
                    // information of what was loaded before, so we need to load the previous
                    // URL again.
                    if (tab.linkedPanel) {
                        loadBrowserURI(browser, url, principal);
                    } else {
                        // Shift to fully loaded browser and make
                        // sure load handler is instantiated.
                        tab.addEventListener(
                                "SSTabRestoring",
                                () => loadBrowserURI(browser, url, principal),
                                {once: true}
                        );
                        gBrowser._insertBrowser(tab);
                    }
                } else {
                    unchangedRemoteness.push(tab);
                }
            }

            if (!unchangedRemoteness.length) {
                return;
            }

            // Reset temporary permissions on the remaining tabs to reload.
            // This is done here because we only want to reset
            // permissions on user reload.
            for (let tab of unchangedRemoteness) {
                if (SitePermissions.clearTemporaryBlockPermissions) {
                    // firefox 88
                    SitePermissions.clearTemporaryBlockPermissions(tab.linkedBrowser);
                } else {
                    SitePermissions.clearTemporaryPermissions(tab.linkedBrowser);
                }
                // Also reset DOS mitigations for the basic auth prompt on reload.
                delete tab.linkedBrowser.authPromptAbuseCounter;
            }
            gIdentityHandler.hidePopup();
            if (typeof gPermissionPanel !== "undefined" && gPermissionPanel.hidePopup) {
                // firefox 88
                gPermissionPanel.hidePopup();
            }

            let handlingUserInput = window.windowUtils.isHandlingUserInput;

            for (let tab of unchangedRemoteness) {
                if (tab.linkedPanel) {
                    sendReloadMessage(tab);
                } else {
                    // Shift to fully loaded browser and make
                    // sure load handler is instantiated.
                    tab.addEventListener("SSTabRestoring", () => sendReloadMessage(tab), {
                        once: true,
                    });
                    gBrowser._insertBrowser(tab);
                }
            }

            function loadBrowserURI(browser, url, principal) {
                browser.loadURI(url, {
                    flags: reloadFlags,
                    triggeringPrincipal: principal,
                });
            }

            function sendReloadMessage(tab) {
                tab.linkedBrowser.sendMessageToActor(
                        "Browser:Reload",
                        {flags: reloadFlags, handlingUserInput},
                        "BrowserTab"
                );
            }
        };
        window.BrowserReloadWithFlags.__reloadEmptyFail = true;
    }
    /// endregion 修复新建标签页加载失败没有内容也不能刷新

    // TODO: 作为纯文本粘贴 setTimeout(() => docShell.doCommand('cmd_pasteNoFormatting'), 2000)
    // region 页面右键菜单复制链接文字
    if (contentAreaContextMenu && !contentAreaContextMenu.___copyLinkText) {
        const copyLinkText = function copyLinkText() {
            if (!this || !this._linkTextStr) return false;
            let clipboard = Cc["@mozilla.org/widget/clipboardhelper;1"].getService(
                    Ci.nsIClipboardHelper
            );
            clipboard.copyString(this._linkTextStr);
        };
        // not making it too long
        // noinspection UnnecessaryLocalVariableJS
        // context-copylink
        const initCopyLinkText = async function initCopyLinkText() {
            let menu = document.getElementById(
                    "context-copylink-text");
            if (!menu) {
                menu = createXulElement("menuitem", {
                    "contexttype": "toolbaritem",
                    "id": "context-copylink-text",
                    "class": "customize-context-copylink-text",
                    "label": '复制链接文字',
                    "oncommand": 'this._copyLinkText()'
                });
                let menuItem = document.getElementById('context-copylink');
                if (!menuItem || !menuItem.parentElement) {
                    return false;
                }
                menuItem.parentElement.insertBefore(menu, menuItem.nextElementSibling);
            }
            if (!this.onLink || !this.linkTextStr) {
                menu.hidden = true;
                return;
            }
            menu.hidden = false;
            menu._copyLinkText = copyLinkText;
            menu._linkTextStr = this.linkTextStr;
        };

        contentAreaContextMenu.addEventListener("popupshowing", function () {
            if (window.gContextMenu) {
                initCopyLinkText.call(gContextMenu);
            }
        }, {
            passive: true,
            capture: false
        });

        contentAreaContextMenu.___copyLinkText = true;
    }
    // endregion 页面右键菜单复制链接文字
})();
