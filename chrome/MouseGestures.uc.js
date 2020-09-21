// ==UserScript==
// @name                 Mousegestures.uc.js
// @namespace            Mousegestures@gmail.com
// @description          自定义鼠标手势
// @author               紫云飞&黒仪大螃蟹
// @homepageURL          http://www.cnblogs.com/ziyunfei/archive/2011/12/15/2289504.html
// @include              chrome://browser/content/browser.xhtml
// @include              chrome://browser/content/browser.xul
// @version              v2019-09-09 fix 70+
// @charset              UTF-8
// ==/UserScript==
(() => {
    'use strict';


//加入命令
//将当前窗口置顶
    let onTop;

    function TabStickOnTop() {
        try {
            let mainWindow = document.getElementById('main-window');
            onTop = !mainWindow.hasAttribute('ontop');
            Components.utils.import("resource://gre/modules/ctypes.jsm");
            var lib = ctypes.open("user32.dll");
            var funcActiveWindow = 0;
            try {
                funcActiveWindow = lib.declare("GetActiveWindow", ctypes.winapi_abi, ctypes.int32_t)
            } catch (ex) {
                funcActiveWindow = lib.declare("GetActiveWindow", ctypes.stdcall_abi, ctypes.int32_t)
            }
            if (funcActiveWindow != 0) {
                var activeWindow = funcActiveWindow();
                var funcSetWindowPos = 0;
                try {
                    funcSetWindowPos = lib.declare("SetWindowPos", ctypes.winapi_abi, ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t)
                } catch (ex) {
                    funcSetWindowPos = lib.declare("SetWindowPos", ctypes.stdcall_abi, ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t)
                }
                var hwndAfter = -2;
                if (onTop) {
                    hwndAfter = -1;
                    mainWindow.setAttribute('ontop', 'true')
                } else mainWindow.removeAttribute('ontop');
                funcSetWindowPos(activeWindow, hwndAfter, 0, 0, 0, 0, 19)
            }
            lib.close()
        } catch (ex) {
            if (typeof console !== "undefined" && console.log) {
                console.log('Mousegestures::TabStickOnTop', ex);
            }
        }
    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {string} rotate
     */
    function drawArrow(ctx, x, y, size, rotate = 'R') {
        if (rotate) {
            ctx.rotate(rotate);
        }
        let w = size, h = w;
        ctx.translate(x, y);
        switch (rotate) {
            case 'D':
                ctx.rotate(Math.PI / 2);
                ctx.translate(-w >> 3, -h);
                break;
            case 'U':
                ctx.rotate(-Math.PI / 2);
                ctx.translate(-w, 0);
                break;
            case 'L':
                ctx.rotate(Math.PI);
                ctx.translate(-w, -h);
                break;
            case 'R':
            default:
                ctx.translate(-w >> 3, 0);
                break;
        }
        ctx.scale(w / 1024, h / 1024);
        ctx.beginPath();
        ctx.moveTo(1013, 480);
        ctx.lineTo(678, 145);
        ctx.bezierCurveTo(664, 131, 640, 131, 626, 145);
        ctx.lineTo(609, 162);
        ctx.bezierCurveTo(594, 177, 594, 200, 609, 215);
        ctx.lineTo(848, 454);
        ctx.lineTo(255, 454);
        ctx.bezierCurveTo(226, 454, 203, 478, 203, 506);
        ctx.bezierCurveTo(203, 535, 226, 559, 255, 559);
        ctx.lineTo(848, 559);
        ctx.lineTo(608, 798);
        ctx.bezierCurveTo(594, 813, 594, 836, 608, 850);
        ctx.lineTo(625, 867);
        ctx.bezierCurveTo(640, 882, 663, 882, 677, 867);
        ctx.lineTo(1012, 532);
        ctx.bezierCurveTo(1027, 518, 1027, 495, 1013, 480);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();

        // reset current transformation matrix to the identity matrix
        ctx.setTransform(1, 0, 0, 1, 0, 0);

    }

    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {number[]} savedPath
     * @param {string} directionChain
     * @param {string} name
     */
    function drawGesture(ctx, savedPath, directionChain, name) {
        const {width, height} = ctx.canvas;
        ctx.clearRect(0, 0, width, height);
        ctx.strokeStyle = '#0065FF';
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(savedPath[0], savedPath[1]);
        for (let i = 2, l = savedPath.length; i < l;) {
            ctx.lineTo(savedPath[i++], savedPath[i++]);
        }
        // ctx.closePath();
        ctx.stroke();
        let boxW = width >> 3, boxH = height >> 3,
                midW = (width >> 1),
                boxX = midW - (boxW >> 1),
                boxY = (height >> 1) - (boxH >> 1),
                textH = Math.max(6, boxH >> 2),
                lineH = textH + (textH >> 1),
                textY = boxY;
        let text = [
            // this.directionChain,
            name || '未知手势'
        ];
        ctx.font = 'bold ' + textH + 'px sans-serif';
		let textWidthArray = [];
        for (let i = 0, l = text.length, t, w; i < l; i++) {
            t = text[i];
            w = ctx.measureText(t);
            if (w.width > boxW) {
                boxW = (w.width | 0) + 2;
                boxX = midW - (boxW >> 1);
            }
            textWidthArray[i] = midW - (w.width >> 1);
        }
        let arrowH = textH + (textH >> 1), arrowW = arrowH * directionChain.length;
        if (arrowW > boxW) {
            boxW = (arrowW | 0) + 2;
            boxX = midW - (boxW >> 1);
        }
        ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = '#FFFFFF';
        textY += (textH >> 1);
        ctx.lineWidth = 50;
        ctx.strokeStyle = '#FFFFFF';
        for (let i = 0, l = directionChain.length, x = midW - (arrowW >> 1); i < l; i++) {
            drawArrow(ctx, x, textY, arrowH, directionChain[i]);
            x += arrowH;
        }
        textY += (textH << 1) + (textH >> 1);
        for (let i = 0, l = text.length, t, w; i < l; i++) {
            t = text[i];
            w = textWidthArray[i];
            ctx.fillText(t, w, textY);
            textY += lineH;
        }
    }

    let ucjsMouseGestures = {
        lastX: 0,
        lastY: 0,
        directionChain: '',
        isMouseDownL: false,
        isMouseDownR: false,
        hideFireContext: false,
        shouldFireContext: false,
        GESTURES: {
            'L': {
                name: '后退', cmd: () => {
                    var nav = gBrowser.webNavigation;
                    if (nav.canGoBack) {
                        nav.goBack();
                    }
                }
            },
            'R': {
                name: '前进', cmd: () => {
                    var nav = gBrowser.webNavigation;
                    if (nav.canGoForward) {
                        nav.goForward();
                    }
                }
            },


            'U': {name: '向上滚动', cmd: () => goDoCommand('cmd_scrollPageUp')},
            'D': {name: '向下滚动', cmd: () => goDoCommand('cmd_scrollPageDown')},

            'DU': {name: '转到页首', cmd: () => goDoCommand('cmd_scrollTop')},
            'UD': {name: '转到页尾', cmd: () => goDoCommand('cmd_scrollBottom')},


            'LR': {
                name: '刷新当前页面', cmd: function () {
                    document.getElementById("Browser:Reload").doCommand();
                }
            },
            //'DU': {name: '网址根目录', cmd:  function() { gBrowser.loadURI("javascript:document.location.href=window.location.origin?window.location.origin+'/':window.location.protocol+'/'+window.location.host+'/'", { triggeringPrincipal: Services.scriptSecurityManager.getSystemPrincipal(), });},},
            'LRL': {
                name: '跳过缓存刷新当前页面', cmd: function () {
                    document.getElementById("Browser:ReloadSkipCache").doCommand();
                }
            },


            'RU': {
                name: '打开新标签', cmd: function () {
                    BrowserOpenTab();
                }
            },
            'RL': {
                name: '恢复关闭的标签', cmd: function () {
                    try {
                        document.getElementById('History:UndoCloseTab').doCommand();
                    } catch (ex) {
                        if (typeof console !== "undefined" && console.log) {
                            console.log('恢复关闭的标签', ex);
                        }
                        if ('undoRemoveTab' in gBrowser) gBrowser.undoRemoveTab(); else throw "Session Restore feature is disabled."
                    }
                }
            },

            'UL': {
                name: '激活左边的标签页', cmd: function (event) {
                    gBrowser.tabContainer.advanceSelectedTab(-1, true);
                }
            },
            'UR': {
                name: '激活右边的标签页', cmd: function (event) {
                    gBrowser.tabContainer.advanceSelectedTab(1, true);
                }
            },

            'ULU': {
                name: '激活第一个标签页', cmd: function (event) {
                    gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[0];
                }
            },
            'URU': {
                name: '激活最后一个标签页', cmd: function (event) {
                    gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[(gBrowser.visibleTabs || gBrowser.mTabs).length - 1];
                }
            },
            'DL': {
                name: '关闭当前标签并激活左侧标签', cmd: function (event) {
                    let t = gBrowser.selectedTab;
                    // 如果是最左侧标签页则关闭当前标签并激活最左侧标签
                    if (!t._tPos) { // t._tPos === 0
                        gBrowser.removeTab(t);
                        gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[0];
                        return;
                    }
                    gBrowser.tabContainer.advanceSelectedTab(-1, true);
                    var n = gBrowser.selectedTab;
                    gBrowser.removeTab(t);
                    gBrowser.selectedTab = n;
                }
            },
            'DR': {
                name: '关闭当前标签并激活右侧标签', cmd: function (event) {
                    let t = gBrowser.selectedTab;
                    let lastTab = (gBrowser.visibleTabs || gBrowser.mTabs)[(gBrowser.visibleTabs || gBrowser.mTabs).length - 1];
                    // 如果是最右侧标签页则关闭当前标签并激活最右侧标签
                    if (t === lastTab) {
                        gBrowser.removeTab(t);
                        gBrowser.selectedTab = (gBrowser.visibleTabs || gBrowser.mTabs)[(gBrowser.visibleTabs || gBrowser.mTabs).length - 1];
                        return;
                    }
                    gBrowser.tabContainer.advanceSelectedTab(1, true);
                    let n = gBrowser.selectedTab;
                    gBrowser.removeTab(t);
                    gBrowser.selectedTab = n;

                }
            },

            'W+': {name: '激活右边的标签页', cmd: function(event) { gBrowser.tabContainer.advanceSelectedTab(+1, true); }},
            'W-': {name: '激活左边的标签页', cmd: function(event) { gBrowser.tabContainer.advanceSelectedTab(-1, true); }},
            //'DL': {name: '添加/移除书签', cmd:  function() {document.getElementById("Browser:AddBookmarkAs").doCommand();	} },
            //'DR': {name: '关闭当前标签', cmd: function(event) {if (gBrowser.selectedTab.getAttribute("pinned") !== "true") { gBrowser.removeCurrentTab();}}},


            //'URD': {name: '打开附加组件',  cmd: function(event) {	BrowserOpenAddonsMgr();	}},
            //'DRU': {name: '打开选项',  cmd: function(event) {		openPreferences(); }},


            //		'LU': {name: '查看页面信息', cmd: function(event) {	BrowserPageInfo(); }},
            //	'LD': {name: '侧边栏打开当前页', cmd: function(event) { window.document.getElementById("pageActionButton").click(); window.setTimeout(function() {window.document.getElementById("pageAction-panel-side-view_mozilla_org").click();}, 0);}},


            //	'LDR': {name: '打开历史窗口(侧边栏)',  cmd: function(event) {SidebarUI.toggle("viewHistorySidebar");	}},
            //	'RDL': {name: '打开书签工具栏',  cmd: function(event) {	var bar = document.getElementById("PersonalToolbar"); setToolbarVisibility(bar, bar.collapsed);	}},


            //	'RLRL': {name: '重启浏览器', cmd: function(event) {		Services.startup.quit(Services.startup.eRestart | Services.startup.eAttemptQuit); 	}},
            //	'LRLR': {name: '重启浏览器', cmd: function(event) {		Services.startup.quit(Services.startup.eRestart | Services.startup.eAttemptQuit);   }},
            //	'URDLU': {name: '关闭浏览器',  cmd: function(event) {		goQuitApplication();		}},


            //	'RULD': {name: '添加到稍后阅读',  cmd: function(event) {document.getElementById("pageAction-urlbar-_cd7e22de-2e34-40f0-aeff-cec824cbccac_").click();}},
            //	'RULDR': {name: '添加到稍后阅读',  cmd: function(event) {document.getElementById("pageAction-urlbar-_cd7e22de-2e34-40f0-aeff-cec824cbccac_").click();}},


            // 'LDL': {name: '关闭左侧标签页', cmd: function(event) {	for (let i = gBrowser.selectedTab._tPos - 1; i >= 0; i--) if (!gBrowser.tabs[i].pinned){ gBrowser.removeTab(gBrowser.tabs[i], {animate: true});}}},
            // 'RDR': {name: '关闭右侧标签页', cmd: function(event) {gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);	gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);}},
            // 'RDLRDL': {name: '关闭其他标签页', cmd: function(event) {gBrowser.removeAllTabsBut(gBrowser.selectedTab);}},

            //'LDRUL': {name: '打开鼠标手势设置文件',  cmd: function(event) {FileUtils.getFile('UChrm',['SubScript', 'MouseGestures.uc.js']).launch();}},
            //'RLD': {name: '将当前窗口置顶',  cmd: function(event) {TabStickOnTop();}},

        },


        init: function () {
            let self = this;
            ['mousedown', 'mousemove', 'mouseup', 'contextmenu', 'DOMMouseScroll'].forEach(type => {
                gBrowser.tabpanels.addEventListener(type, self, true);
            });
            gBrowser.tabpanels.addEventListener('unload', () => {
                ['mousedown', 'mousemove', 'mouseup', 'contextmenu', 'DOMMouseScroll'].forEach(type => {
                    gBrowser.tabpanels.removeEventListener(type, self, true);
                });
            }, false);
        },
        draw() {
            /**
             * @type CanvasRenderingContext2D
             */
            let ctx;
            if (!(ctx = this.xdTrailAreaContext)) {
                return;
            }
            let {savedPath} = this;
            this.hideFireContext = true;
            if (!savedPath || !savedPath.length || (savedPath.length & 1)) {
                return;
            }
            drawGesture(ctx, savedPath, this.directionChain, this.GESTURES[this.directionChain]?.name);
        },
        handleEvent: function (event) {
            switch (event.type) {
                case 'mousedown':
                    if (event.button == 2) {
                        (gBrowser.mPanelContainer || gBrowser.tabpanels).addEventListener("mousemove", this, false);
                        this.isMouseDownR = true;
                        this.hideFireContext = false;
                        [this.lastX, this.lastY, this.directionChain] = [event.screenX, event.screenY, ''];
                    }
                    if (event.button == 0) {
                        this.isMouseDownR = false;
                        this.stopGesture();
                    }
                    break;
                case 'mousemove':
                    if (this.isMouseDownR) {
                        let [subX, subY] = [event.screenX - this.lastX, event.screenY - this.lastY];
                        let [distX, distY] = [(subX > 0 ? subX : (-subX)), (subY > 0 ? subY : (-subY))];
                        let direction;
                        if (distX < 10 && distY < 10) return;
                        if (distX > distY) direction = subX < 0 ? 'L' : 'R';
                        else direction = subY < 0 ? 'U' : 'D';
                        if (!this.xdTrailArea) {
                            this.xdTrailArea = document.createXULElement('hbox');
                            let canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
                            let {clientHeight, clientWidth} = gBrowser.selectedBrowser;
                            canvas.setAttribute('width', clientWidth);
                            canvas.setAttribute('height', clientHeight);
                            //console.log(canvas)
                            //console.log(gBrowser.selectedBrowser)
                            this.xdTrailAreaContext = canvas.getContext('2d');
                            this.savedPath = [
                                this.lastX - gBrowser.selectedBrowser.screenX,
                                this.lastY - gBrowser.selectedBrowser.screenY
                            ];
                            this.xdTrailArea.style.cssText = '-moz-user-focus: none !important;-moz-user-select: none !important;display: -moz-box !important;box-sizing: border-box !important;pointer-events: none !important;margin: 0 !important;padding: 0 !important;width: 100% !important;height: ' + clientHeight + 'px !important;border: none !important;box-shadow: none !important;overflow: hidden !important;background: none !important;opacity: 0.9 !important;position: fixed !important;z-index: 2147483647 !important;';
                            this.xdTrailArea.appendChild(canvas);
                            gBrowser.selectedBrowser.parentNode.insertBefore(this.xdTrailArea, gBrowser.selectedBrowser.nextSibling);
                        }
                        if (this.xdTrailAreaContext) {
                            this.savedPath.push(
                                    event.screenX - gBrowser.selectedBrowser.screenX,
                                    event.screenY - gBrowser.selectedBrowser.screenY);
                            requestAnimationFrame(() => {
                                try {
                                    this.draw();
                                } catch (e) {
                                    console.log(e)
                                }
                            });
                            this.lastX = event.screenX;
                            this.lastY = event.screenY;
                        }
                        if (direction != this.directionChain.charAt(this.directionChain.length - 1)) {
                            this.directionChain += direction;
                            StatusPanel._label = this.GESTURES[this.directionChain] ? '手势: ' + this.directionChain + ' ' + this.GESTURES[this.directionChain].name : '未知手势:' + this.directionChain;
                        }
                    }
                    break;
                case 'mouseup':
                    if (this.isMouseDownR && event.button == 2) {
                        if (this.directionChain) this.shouldFireContext = false;
                        this.isMouseDownR = false;
                        this.directionChain && this.stopGesture();
                    }
                    break;
                case 'contextmenu':
                    if (this.isMouseDownR || this.hideFireContext) {
                        this.shouldFireContext = true;
                        this.hideFireContext = false;
                        event.preventDefault();
                        event.stopPropagation();
                    }
                    break;
                case 'DOMMouseScroll':
                    if (this.isMouseDownR) {
                        this.shouldFireContext = false;
                        this.hideFireContext = true;
                        this.directionChain = 'W' + (event.detail > 0 ? '+' : '-');
                        this.stopGesture();
                    }
                    break;
            }
        },
        stopGesture: function () {
            if (this.GESTURES[this.directionChain]) {
                try {
                	gBrowser.__mozIsInGesture = 1;
                    this.GESTURES[this.directionChain].cmd();
                } catch (e) {
                    if (typeof console !== 'undefined' && console.log) {
                        console.log(this.directionChain, this.GESTURES[this.directionChain], e);
                    }
                }
                gBrowser.__mozIsInGesture = 0;
            }
            if (this.xdTrailArea) {
                this.xdTrailArea.parentNode.removeChild(this.xdTrailArea);
                this.xdTrailArea = null;
                this.xdTrailAreaContext = null;
                this.savedPath = null;
            }
            this.directionChain = '';
            setTimeout(() => StatusPanel._label = '', 2000);
            this.hideFireContext = true;
        }
    };
    ucjsMouseGestures.init();
})
();



