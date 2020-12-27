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
        PlacesUIUtils.placesContextShowing = function patchPlacesContextShowing(event) {
            const ret = placesContextShowing.call(this, event);
            if (!ret) {
                return ret;
            }
            const node = document.popupNode;
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
                        "oncommand": 'PlacesUIUtils.addBookmarkToHere(document.popupNode)'
                    });
                    bookmarkContextMenu.insertBefore(newBookmarkHere,
                            queryChildren(bookmarkContextMenu, 'placesContext_new:separator'));
                }
                newBookmarkHere.hidden = false;
            } else if (newBookmarkHere) {
                newBookmarkHere.hidden = true;
            }
            return ret;
        };
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

})();
