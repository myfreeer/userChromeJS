// ==UserScript==
// @name                 Mousegestures.uc.js
// @namespace            Mousegestures@gmail.com
// @description          自定义鼠标手势
// @author               紫云飞&黒仪大螃蟹
// @homepageURL          http://www.cnblogs.com/ziyunfei/archive/2011/12/15/2289504.html
// @include              chrome://browser/content/browser.xhtml
// @include              chrome://browser/content/browser.xul
// @version              2020-09-30 refactor
// @charset              UTF-8
// ==/UserScript==
(() => {
    'use strict';
    const GESTURE_COLOR = '#0065FF';
    // 鼠标手势盒子颜色
    const GESTURE_LINE_WIDTH = 4;
    // 鼠标手势盒子颜色
    const GESTURE_BOX_COLOR = 'rgba(0, 0, 0, 0.8)';
    // 鼠标手势箭头线宽
    const GESTURE_ARROW_LINE_WIDTH = 50;
    const GESTURE_TEXT_COLOR = '#FFFFFF';

    /**
     * Draw an arrow to canvas
     * @param {CanvasRenderingContext2D} ctx
     * @param {number} x
     * @param {number} y
     * @param {number} size
     * @param {string} rotate
     */
    function drawArrow(ctx, x, y, size, rotate = 'R') {
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
        ctx.strokeStyle = GESTURE_COLOR;
        ctx.lineJoin = 'round';
        ctx.lineCap = 'round';
        ctx.lineWidth = GESTURE_LINE_WIDTH;
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
                boxW = (w.width | 0) + 8;
                boxX = midW - (boxW >> 1);
            }
            textWidthArray[i] = midW - (w.width >> 1);
        }
        let arrowH = textH + (textH >> 1), arrowW = arrowH * directionChain.length;
        if (arrowW > boxW) {
            boxW = (arrowW | 0) + 8;
            boxX = midW - (boxW >> 1);
        }
        ctx.fillStyle = GESTURE_BOX_COLOR;
        ctx.fillRect(boxX, boxY, boxW, boxH);
        ctx.fillStyle = GESTURE_TEXT_COLOR;
        textY += (textH >> 1);
        ctx.lineWidth = GESTURE_ARROW_LINE_WIDTH;
        ctx.strokeStyle = GESTURE_TEXT_COLOR;
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

    class MouseGestureCommand {
        // 后退
        static historyGoBack() {
            const nav = gBrowser.webNavigation;
            if (nav.canGoBack) {
                nav.goBack();
            }
        }

        // 前进
        static historyGoForward() {
            var nav = gBrowser.webNavigation;
            if (nav.canGoForward) {
                nav.goForward();
            }
        }

        // 向上滚动
        static scrollPageUp() {
            goDoCommand('cmd_scrollPageUp');
        }

        // 向下滚动
        static scrollPageDown() {
            goDoCommand('cmd_scrollPageDown');
        }

        // 转到页首
        static scrollTop() {
            goDoCommand('cmd_scrollTop');
        }

        // 转到页尾
        static scrollBottom() {
            goDoCommand('cmd_scrollBottom');
        }

        // 刷新当前页面
        static reloadCurrentPage() {
            document.getElementById("Browser:Reload").doCommand();
        }

        // 刷新当前页面
        static reloadCurrentPageSkipCache() {
            document.getElementById("Browser:ReloadSkipCache").doCommand();
        }

        // 打开新标签
        static openNewTab() {
            BrowserOpenTab();
        }

        // 恢复关闭的标签
        static restoreClosedTab() {
            try {
                document.getElementById('History:UndoCloseTab').doCommand();
            } catch (ex) {
                if (typeof console !== "undefined" && console.log) {
                    console.log('恢复关闭的标签', ex);
                }
                if ('undoRemoveTab' in gBrowser) {
                    gBrowser.undoRemoveTab();
                } else {
                    throw 'Session Restore feature is disabled.';
                }
            }
        }

        // 激活左边的标签页
        static advanceLeftTab() {
            gBrowser.tabContainer.advanceSelectedTab(-1, true);
        }

        // 激活右边的标签页
        static advanceRightTab() {
            gBrowser.tabContainer.advanceSelectedTab(1, true);
        }

        // 激活第一个标签页
        static advanceFirstTab() {
            const tabs = gBrowser.visibleTabs || gBrowser.mTabs;
            if (!tabs) {
                return;
            }
            gBrowser.selectedTab = tabs[0];
        }

        // 激活最后一个标签页
        static advanceLastTab() {
            const tabs = gBrowser.visibleTabs || gBrowser.mTabs;
            if (!tabs) {
                return;
            }
            gBrowser.selectedTab = tabs[tabs.length - 1];
        }

        // 关闭当前标签并激活左侧标签
        static closeCurrentTabAndGotoLeftTab() {
            const tabs = gBrowser.visibleTabs || gBrowser.mTabs;
            let t = gBrowser.selectedTab;
            // 如果是最左侧标签页则关闭当前标签并激活最左侧标签
            if (!t._tPos) { // t._tPos === 0
                gBrowser.removeTab(t);
                gBrowser.selectedTab = tabs[0];
                return;
            }
            gBrowser.tabContainer.advanceSelectedTab(-1, true);
            var n = gBrowser.selectedTab;
            gBrowser.removeTab(t);
            gBrowser.selectedTab = n;
        }

        // 关闭当前标签并激活右侧标签
        static closeCurrentTabAndGotoRightTab() {
            const tabs = gBrowser.visibleTabs || gBrowser.mTabs;
            let t = gBrowser.selectedTab;
            let lastTab = tabs[tabs.length - 1];
            // 如果是最右侧标签页则关闭当前标签并激活最右侧标签
            if (t === lastTab) {
                gBrowser.removeTab(t);
                // new last tab
                gBrowser.selectedTab = tabs[tabs.length - 1];
                return;
            }
            gBrowser.tabContainer.advanceSelectedTab(1, true);
            let n = gBrowser.selectedTab;
            gBrowser.removeTab(t);
            gBrowser.selectedTab = n;
        }

        // 将当前窗口置顶（未测试）(仅 windows)
        static tabStickOnTop() {
            try {
                let mainWindow = document.getElementById('main-window');
                MouseGestureCommand._onTop = !mainWindow.hasAttribute('ontop');
                if (typeof ctypes === "undefined") {
                    Components.utils.import("resource://gre/modules/ctypes.jsm");
                }
                var lib = ctypes.open("user32.dll");
                var funcActiveWindow = 0;
                // noinspection UnusedCatchParameterJS
                try {
                    // noinspection JSDeprecatedSymbols
                    funcActiveWindow = lib.declare("GetActiveWindow", ctypes.winapi_abi, ctypes.int32_t);
                } catch (ex) {
                    // noinspection JSDeprecatedSymbols
                    funcActiveWindow = lib.declare("GetActiveWindow", ctypes.stdcall_abi, ctypes.int32_t);
                }
                if (funcActiveWindow !== 0) {
                    var activeWindow = funcActiveWindow();
                    var funcSetWindowPos;
                    // noinspection UnusedCatchParameterJS
                    try {
                        // noinspection JSDeprecatedSymbols
                        funcSetWindowPos = lib.declare("SetWindowPos", ctypes.winapi_abi, ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t);
                    } catch (ex) {
                        // noinspection JSDeprecatedSymbols
                        funcSetWindowPos = lib.declare("SetWindowPos", ctypes.stdcall_abi, ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t);
                    }
                    var hwndAfter = -2;
                    if (MouseGestureCommand._onTop) {
                        hwndAfter = -1;
                        mainWindow.setAttribute('ontop', 'true');
                    } else mainWindow.removeAttribute('ontop');
                    funcSetWindowPos(activeWindow, hwndAfter, 0, 0, 0, 0, 19);
                }
                lib.close();
            } catch (ex) {
                if (typeof console !== "undefined" && console.log) {
                    console.log('MouseGestureCommand::TabStickOnTop', ex);
                }
            }
        }

        // 添加/移除书签（未测试）
        static toggleBookmark() {
            document.getElementById("Browser:AddBookmarkAs").doCommand();
        }

        // 关闭当前标签
        static closeCurrentTab() {
            if (gBrowser.selectedTab.getAttribute("pinned") !== "true") {
                gBrowser.removeCurrentTab();
            }
        }

        // 打开附加组件
        static openAddonManager() {
            BrowserOpenAddonsMgr();
        }

        // 打开选项
        static openPreferences() {
            openPreferences();
        }

        // 查看页面信息
        static showPageInfo() {
            BrowserPageInfo();
        }

        // 打开/关闭历史窗口(侧边栏)
        static toggleHistorySidebar() {
            SidebarUI.toggle("viewHistorySidebar");
        }

        static toggleBookmarkToolbar() {
            const bar = document.getElementById("PersonalToolbar");
            if (bar) {
                setToolbarVisibility(bar, bar.collapsed);
            }
        }

        // 重启浏览器
        static restartBrowser() {
            // BrowserUtils.restartApplication();
            Services.startup.quit(Services.startup.eRestart | Services.startup.eAttemptQuit);
        }

        // 重启浏览器
        static stopBrowser() {
            // Services.startup.quit(Services.startup.eAttemptQuit);
            goQuitApplication();
        }

        // 清除启动缓存并重启浏览器
        static invalidateCacheAndRestart() {
            Services.appinfo.invalidateCachesOnRestart();
            BrowserUtils.restartApplication();
        }

        // 关闭左侧标签页
        static closeAllLeftTabs() {
            for (let i = gBrowser.selectedTab._tPos - 1; i >= 0; i--) {
                if (!gBrowser.tabs[i].pinned) {
                    gBrowser.removeTab(gBrowser.tabs[i], {animate: true});
                }
            }
        }

        // 关闭右侧标签页
        static closeAllRightTabs() {
            // gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);
            // gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);
            gBrowser.removeTabsToTheEndFrom(gBrowser.selectedTab);
        }

        // 关闭其他标签页
        static closeAllOtherTabs() {
            gBrowser.removeAllTabsBut(gBrowser.selectedTab);
        }

    }

    const defaultGestures = {
        'L': {name: '后退', cmd: MouseGestureCommand.historyGoBack},
        'R': {name: '前进', cmd: MouseGestureCommand.historyGoForward},


        'U': {name: '向上滚动', cmd: MouseGestureCommand.scrollPageUp},
        'D': {name: '向下滚动', cmd: MouseGestureCommand.scrollPageDown},

        'DU': {name: '转到页首', cmd: MouseGestureCommand.scrollTop},
        'UD': {name: '转到页尾', cmd: MouseGestureCommand.scrollBottom},

        'LR': {name: '刷新当前页面', cmd: MouseGestureCommand.reloadCurrentPage},
        'LRL': {name: '跳过缓存刷新当前页面', cmd: MouseGestureCommand.reloadCurrentPageSkipCache},

        'RU': {name: '打开新标签', cmd: MouseGestureCommand.openNewTab},
        'RL': {name: '恢复关闭的标签', cmd: MouseGestureCommand.restoreClosedTab},

        'UL': {name: '激活左边的标签页', cmd: MouseGestureCommand.advanceLeftTab},
        'UR': {name: '激活右边的标签页', cmd: MouseGestureCommand.advanceRightTab},
        'ULU': {name: '激活第一个标签页', cmd: MouseGestureCommand.advanceFirstTab},
        'URU': {name: '激活最后一个标签页', cmd: MouseGestureCommand.advanceLastTab},

        'DL': {
            name: '关闭当前标签并激活左侧标签',
            cmd: MouseGestureCommand.closeCurrentTabAndGotoLeftTab
        },
        'DR': {
            name: '关闭当前标签并激活右侧标签',
            cmd: MouseGestureCommand.closeCurrentTabAndGotoRightTab
        },

        'W+': {name: '激活右边的标签页', cmd: MouseGestureCommand.advanceRightTab},
        'W-': {name: '激活左边的标签页', cmd: MouseGestureCommand.advanceLeftTab},
    };

    class UcMouseGesture {
        constructor(gestures = defaultGestures) {
            // 上一次事件时的screenX
            this.lastX = 0;
            // 上一次事件时的screenY
            this.lastY = 0;
            // 当前的鼠标手势
            this.directionChain = '';
            // 是否在绘制鼠标手势
            this.isMouseDownR = false;
            // 是否拦截右键菜单触发
            this.hideFireContext = false;
            // 鼠标手势事件
            this.events = [
                'mousedown',
                'mousemove',
                'mouseup',
                'wheel',
                'keydown'
            ];
            // 鼠标手势列表
            this.setGestures(gestures);
            // 绘制的鼠标手势中各条线的坐标
            this.savedPath = [];
            // 绘制鼠标手势的canvas的容器
            this.xdTrailArea = null;
            /**
             * 绘制鼠标手势的canvas的 CanvasRenderingContext2D
             * @type CanvasRenderingContext2D | null
             */
            this.xdTrailAreaContext = null;

        }

        setGestures(gestures) {
            this.gestures = gestures;
            // allow cmd of gestures to be string
            if (this.gestures !== defaultGestures) {
                for (let g of Object.values(this.gestures)) {
                    if (typeof g.cmd === "function") {
                        continue;
                    }
                    let c = MouseGestureCommand[g.cmd];
                    if (c) {
                        g.cmd = c;
                    } else {
                        Reflect.deleteProperty(g, 'cmd');
                    }
                }
            }
        }

        bindEvent() {
            for (let i = 0, a = this.events, l = a.length, type; i < l; i++) {
                type = a[i];
                gBrowser.tabpanels.addEventListener(type, this, {
                    capture: true,
                    passive: true
                });
            }
            // 需要拦截此事件，故不可为 passive
            gBrowser.tabpanels.addEventListener('contextmenu', this, true);
            const {mPanelContainer} = gBrowser;
            if (mPanelContainer) {
                mPanelContainer.addEventListener("mousemove", this, {
                    capture: false,
                    passive: true
                });
            }
            gBrowser.tabpanels.addEventListener('unload', () => this.onUnload(), false);
            window.addEventListener('blur', this);
        }

        onUnload() {
            this.unbindEvent();
        }

        unbindEvent() {
            for (let i = 0, a = this.events, l = a.length, type; i < l; i++) {
                type = a[i];
                gBrowser.tabpanels.removeEventListener(type, this, true);
            }
            gBrowser.tabpanels.removeEventListener('contextmenu', this, true);
            const {mPanelContainer} = gBrowser;
            if (mPanelContainer) {
                mPanelContainer.removeEventListener("mousemove", this, false);
            }
            window.removeEventListener('blur', this);
        }

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
            let g = this.gestures[this.directionChain];
            drawGesture(ctx, savedPath, this.directionChain, g && g.name);
        }

        endGesture() {
            this.isMouseDownR = false;
            // this.shouldFireContext = false;
            this.hideFireContext = true;
            this.directionChain = '';
            this.stopGesture();
        }

        stopGesture() {
            let g = this.gestures[this.directionChain];
            if (g && g.cmd) {
                try {
                    Reflect.set(gBrowser, '__mozIsInGesture', 1);
                    g.cmd();
                } catch (e) {
                    if (typeof console !== 'undefined' && console.log) {
                        console.log(this.directionChain, this.GESTURES[this.directionChain], e);
                    }
                }
                if (!Reflect.deleteProperty(gBrowser, '__mozIsInGesture')) {
                    Reflect.set(gBrowser, '__mozIsInGesture', 0);
                }
            }
            if (this.xdTrailArea) {
                this.xdTrailArea.parentNode.removeChild(this.xdTrailArea);
                this.xdTrailArea = null;
                this.xdTrailAreaContext = null;
                this.savedPath = [];
            }
            this.directionChain = '';
            setTimeout(() => StatusPanel._label = '', 2000);
            this.hideFireContext = true;
        }

        createCanvas() {
            this.xdTrailArea = document.createXULElement('hbox');
            let canvas = document.createElementNS('http://www.w3.org/1999/xhtml', 'canvas');
            let {clientHeight, clientWidth} = gBrowser.selectedBrowser;
            canvas.setAttribute('width', clientWidth);
            canvas.setAttribute('height', clientHeight);
            this.xdTrailAreaContext = canvas.getContext('2d');
            this.xdTrailArea.style.cssText = `
-moz-user-focus: none !important;
-moz-user-select: none !important;
display: -moz-box !important;
box-sizing: border-box !important;
pointer-events: none !important;
margin: 0 !important;
padding: 0 !important;
width: 100% !important;
height: ${clientHeight}px !important;
border: none !important;
box-shadow: none !important;
overflow: hidden !important;
background: none !important;
position: fixed !important;
z-index: 2147483647 !important;`;
            this.xdTrailArea.appendChild(canvas);
            gBrowser.selectedBrowser.parentNode.insertBefore(
                    this.xdTrailArea, gBrowser.selectedBrowser.nextSibling);

        }

        /// region event handlers

        mousedown(event) {
            if (event.button === 2) {
                this.isMouseDownR = true;
                this.hideFireContext = false;
                [this.lastX, this.lastY, this.directionChain] = [event.screenX, event.screenY, ''];
            }
            if (event.button === 0) {
                this.isMouseDownR = false;
                this.stopGesture();
            }
        }

        mousemove(event) {
            if (!this.isMouseDownR) {
                return;
            }
            let [subX, subY] = [event.screenX - this.lastX, event.screenY - this.lastY];
            let [distX, distY] = [(subX > 0 ? subX : (-subX)), (subY > 0 ? subY : (-subY))];
            let direction;
            if (distX < 10 && distY < 10) return;
            if (distX > distY) direction = subX < 0 ? 'L' : 'R';
            else direction = subY < 0 ? 'U' : 'D';
            if (!this.xdTrailArea) {
                this.createCanvas();
                this.savedPath = [
                    this.lastX - gBrowser.selectedBrowser.screenX,
                    this.lastY - gBrowser.selectedBrowser.screenY
                ];
            }
            if (this.xdTrailAreaContext) {
                this.savedPath.push(
                        event.screenX - gBrowser.selectedBrowser.screenX,
                        event.screenY - gBrowser.selectedBrowser.screenY);
                requestAnimationFrame(() => {
                    try {
                        this.draw();
                    } catch (e) {
                        console.log(e);
                    }
                });
                this.lastX = event.screenX;
                this.lastY = event.screenY;
            }
            if (direction !== this.directionChain.charAt(this.directionChain.length - 1)) {
                this.directionChain += direction;
                let g = this.gestures[this.directionChain];
                StatusPanel._label = g ?
                        '手势: ' + this.directionChain + ' ' + g.name :
                        '未知手势:' + this.directionChain;
            }
        }

        mouseup(event) {
            if (this.isMouseDownR && event.button === 2) {
                // if (this.directionChain) this.shouldFireContext = false;
                this.isMouseDownR = false;
                this.directionChain && this.stopGesture();
                // event.stopImmediatePropagation();
            }
        }

        contextmenu(event) {
            if (this.isMouseDownR || this.hideFireContext) {
                // this.shouldFireContext = true;
                this.hideFireContext = false;
                event.preventDefault();
                event.stopImmediatePropagation();
            }
        }

        wheel(event) {
            if (!this.isMouseDownR) {
                return;
            }
            // this.shouldFireContext = false;
            this.hideFireContext = true;
            this.directionChain = 'W' + (event.deltaY > 0 ? '+' : '-');
            this.stopGesture();
        }

        keydown(event) {
            if (this.isMouseDownR && event.key === 'Escape') {
                this.endGesture();
            }
        }

        blur() {
            if (this.isMouseDownR) {
                this.endGesture();
            }
        }

        /// endregion event handlers

        // noinspection JSUnusedGlobalSymbols
        handleEvent(event) {
            let fn = this[event.type];
            if (typeof fn === "function") {
                return fn.call(this, event);
            }
        }
    }

    let ucjsMouseGestures = new UcMouseGesture();
    ucjsMouseGestures.bindEvent();
})();
