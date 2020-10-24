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
    if (contentAreaContextMenu && blockContextMenu.length) {
        contentAreaContextMenu.addEventListener("popupshowing", function () {
            if (window.gContextMenu) {
                blockContextMenu.forEach(id => gContextMenu.showItem(id, false));
            }
        }, {
            passive: true,
            capture: false
        });
    }
    // endregion 禁用的页面右键菜单条目

    // region 工具栏增加附加组件选项菜单
    const toolbarContextMenu = document.getElementById('toolbar-context-menu');
    if (toolbarContextMenu && window.ToolbarContextMenu) {
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
    if (bookmarkContextMenu && window.PlacesUIUtils && window.PlacesUtils) {
        const getViewForNode = PlacesUIUtils.getViewForNode;
        // 书签栏右键菜单使用的 ID 不能通过常规的 querySelector 方式获取
        const queryChildren = (node, id) => {
            let c = node.children;
            for (let i = 0; i < c.length; i++) {
                if (c[i].id === id) {
                    return c[i];
                }
            }
        };
        PlacesUIUtils.getViewForNode = function patchGetViewForNode(node) {
            const view = getViewForNode.call(this, node);
            const isDir = view && node && node._placesNode &&
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
            return view;
        };
        PlacesUIUtils.addBookmarkToHere = async function addBookmarkToHere(popupNode) {
            if (!popupNode ||
                    !popupNode._placesNode ||
                    !popupNode._placesNode.bookmarkGuid ||
                    !popupNode.getAttribute('container')) {
                return;
            }

            let browser = gBrowser.selectedBrowser;
            if (browser.documentURI) {
                let isErrorPage = /^about:(neterror|certerror|blocked)/.test(
                        browser.documentURI.spec
                );
                if (isErrorPage) {
                    return;
                }
            }
            let url = new URL(browser.currentURI.spec);

            let info = {
                url,
                parentGuid: popupNode._placesNode.bookmarkGuid,
                title: browser.contentTitle
            };
            let charset = browser.characterSet;
            info.title = info.title || url.href;

            info.guid = await PlacesTransactions.NewBookmark(info).transact();

            if (charset) {
                PlacesUIUtils.setCharsetForPage(url, charset, window).catch(
                        Cu.reportError
                );
            }

            StarUI.showConfirmation();
        };

    }
    // endregion 书签栏增加添加书签到此处

})();
