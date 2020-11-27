// ==UserScript==
// @name                 Mousegestures.uc.js
// @namespace            Mousegestures@gmail.com
// @description          自定义鼠标手势
// @author               紫云飞&黒仪大螃蟹
// @homepageURL          http://www.cnblogs.com/ziyunfei/archive/2011/12/15/2289504.html
// @include              chrome://browser/content/browser.xhtml
// @include              chrome://browser/content/browser.xul
// @version              2020-11-27
// @charset              UTF-8
// ==/UserScript==
(() => {
    'use strict';
    /// region utils
    function weakAssign(target, source) {
        if (!source) return target;
        if (!target) return source;
        for (const key in source) {
            if (source.hasOwnProperty(key) && !(key in target)) {
                target[key] = source[key];
            }
        }
    }

    function log(...args) {
        if (typeof console !== "undefined" && console.log) {
            console.log(...args);
        }
    }
    /// endregion utils

    /// region renderer

    /**
     * 创建箭头路径
     * @return {Path2D}
     */
    function createPathOfArrow() {
        const path = new Path2D();
        path.lineTo(89, 534);
        path.bezierCurveTo(70, 515, 70, 485, 89, 466);
        path.lineTo(478, 78);
        path.bezierCurveTo(496, 59, 527, 59, 545, 78);
        path.lineTo(934, 466);
        path.bezierCurveTo(953, 485, 953, 515, 934, 534);
        path.lineTo(890, 578);
        path.bezierCurveTo(871, 597, 840, 597, 821, 578);
        path.lineTo(592, 337);
        path.lineTo(592, 912);
        path.bezierCurveTo(592, 938, 570, 960, 544, 960);
        path.lineTo(480, 960);
        path.bezierCurveTo(453, 960, 432, 938, 432, 912);
        path.lineTo(432, 337);
        path.lineTo(202, 578);
        path.bezierCurveTo(183, 597, 152, 598, 133, 579);
        return path;
    }

    /**
     * 变换箭头路径
     * @param {Path2D} path 箭头路径
     * @param {number} size 目标大小
     * @param {string} rotate 方向
     * @return {Path2D}
     */
    function transformPathOfArrow(path, size, rotate) {
        const domMatrix = new DOMMatrix();
        switch (rotate) {
            case 'D':
                // in degrees
                domMatrix.translateSelf(size, size);
                domMatrix.rotateSelf(180);
                break;
            case 'R':
                domMatrix.translateSelf(size, 0);
                domMatrix.rotateSelf(90);
                break;
            case 'L':
                domMatrix.translateSelf(0, size);
                domMatrix.rotateSelf(-90);
                break;
            case 'U':
            default:
                break;
        }
        domMatrix.scaleSelf(size / 1024, size / 1024);
        let path2D = new Path2D();
        path2D.addPath(path, domMatrix);
        return path2D;
    }

    /**
     * 默认渲染器配置
     */
    const defaultMouseGestureRendererConfig = {
        // 鼠标手势颜色
        gestureColor: '#0065ff',
        // 鼠标手势线宽
        gestureLineWidth: 4,
        // 鼠标手势盒子颜色
        gestureBoxColor: 'rgba(0, 0, 0, 0.8)',
        // 鼠标手势文本颜色
        gestureTextColor: '#ffffff',
        // 箭头
        // 箭头路径基准大小为 1024x1024，箭头应居中
        pathOfArrow: createPathOfArrow()
    };

    /**
     * 默认渲染器
     */
    class MouseGestureRenderer {
        // Public class fields, starting with firefox 69
        static STATUS_IDLE = 0;
        static STATUS_ACTIVE = 1;

        /// region status
        /**
         * 状态
         * @type {number}
         */
        status = MouseGestureRenderer.STATUS_IDLE;

        /**
         * 绘制的鼠标手势中各条线的坐标
         * @type {Path2D | null}
         */
        mouseMovePath = null;

        /**
         * 绘制鼠标手势的canvas的容器
         * @type {Element | null}
         */
        containerElement = null;
        /**
         * 绘制鼠标手势的canvas的 CanvasRenderingContext2D
         * @type {CanvasRenderingContext2D | null}
         */
        renderingContext = null;
        /**
         * 当前鼠标手势编码
         * @type {string}
         */
        directionChain = '';
        /**
         * 当前鼠标手势名称
         * @type {string | void}
         */
        gestureName = '';

        /**
         * 一个 long 整数，请求 ID ，是回调列表中唯一的标识。
         * 是个非零值，没别的意义。你可以传这个值给 window.cancelAnimationFrame() 以取消回调函数。
         * @type {number}
         */
        animationFrameHandle = 0;

        /// endregion status
        constructor(config) {
            config = weakAssign(config, defaultMouseGestureRendererConfig);
            /**
             * 鼠标手势颜色
             * @type {string}
             */
            this.gestureColor = config.gestureColor;
            /**
             * 鼠标手势线宽
             * @type {number}
             */
            this.gestureLineWidth = config.gestureLineWidth;
            /**
             * 鼠标手势盒子颜色
             * @type {string}
             */
            this.gestureBoxColor = config.gestureBoxColor;
            /**
             * 鼠标手势文本颜色
             * @type {string}
             */
            this.gestureTextColor = config.gestureTextColor;
            /**
             * 箭头
             * @type {Path2D}
             */
            this.pathOfArrow = config.pathOfArrow;

            this.animationFrameCallback = () => {
                try {
                    this.internalRenderGesture();
                } catch (e) {
                    log('animationFrameCallback', e);
                } finally {
                    // reset animationFrameHandle since it is called
                    this.animationFrameHandle = 0;
                }
            };
        }

        /// region active

        /**
         * Create css text for {@link containerElement}
         * @param {number} clientHeight
         * @return {string} css text
         */
        containerElementCssText(clientHeight) {
            return `
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
z-index: 2147483647 !important;`.trim();
        }

        createCanvas() {
            this.containerElement = document.createXULElement('hbox');
            const canvas = document.createElementNS(
                    'http://www.w3.org/1999/xhtml', 'canvas');
            let {clientHeight, clientWidth} = gBrowser.selectedBrowser;
            // high dpi scale support
            let devicePixelRatio = window.devicePixelRatio || 1;
            if (devicePixelRatio !== 1) {
                canvas.width = clientWidth * devicePixelRatio;
                canvas.height = clientHeight * devicePixelRatio;
                // transform displays better on firefox
                canvas.style.transform = 'scale(' + (1 / devicePixelRatio) + ')';
                canvas.style.transformOrigin = '0 0';
            } else {
                canvas.width = clientWidth;
                canvas.height = clientHeight;
            }
            this.renderingContext = canvas.getContext('2d');
            this.containerElement.style.cssText =
                    this.containerElementCssText(clientHeight);
            this.containerElement.appendChild(canvas);
            gBrowser.selectedBrowser.parentNode.insertBefore(
                    this.containerElement, gBrowser.selectedBrowser.nextSibling);

        }

        /**
         * @param {number?} x initial x
         * @param {number?} y initial y
         */
        createPath2D(x, y) {
            this.mouseMovePath = new Path2D();
            if (x && y) {
                // high dpi scale support
                let devicePixelRatio = window.devicePixelRatio || 1;
                this.mouseMovePath.moveTo(
                        // make it faster by discarding non-integer part
                        (x * devicePixelRatio) | 0,
                        (y * devicePixelRatio) | 0
                );
            }
        }

        /**
         * Setup dom or xul elements for rendering
         * @param {number?} x initial x
         * @param {number?} y initial y
         */
        active(x, y) {
            if (this.isActive()) {
                this.dispose();
            }
            this.status = MouseGestureRenderer.STATUS_ACTIVE;
            this.createCanvas();
            this.createPath2D(x, y);
        }

        /**
         * True if this is active
         * @return {boolean}
         */
        isActive() {
            return this.status === MouseGestureRenderer.STATUS_ACTIVE;
        }

        /// endregion active

        /// region render
        renderGesturePath() {
            const ctx = this.renderingContext;
            const path = this.mouseMovePath;
            ctx.strokeStyle = this.gestureColor;
            ctx.lineJoin = 'bevel';
            ctx.lineCap = 'butt';
            ctx.lineWidth = this.gestureLineWidth;
            if (path instanceof Path2D) {
                ctx.stroke(path);
            } else if (Array.isArray(path)) {
                // should never enter this branch
                // kept for historical reason
                ctx.beginPath();
                ctx.moveTo(path[0], path[1]);
                for (let i = 2, l = path.length; i < l;) {
                    ctx.lineTo(path[i++], path[i++]);
                }
                // ctx.closePath();
                ctx.stroke();
            }
        }

        internalRenderGesture() {
            /**
             * @type CanvasRenderingContext2D
             */
            let ctx;
            if (!(ctx = this.renderingContext)) {
                return;
            }
            let {mouseMovePath} = this;
            if (!mouseMovePath) {
                return;
            }
            const {width, height} = ctx.canvas;
            ctx.clearRect(0, 0, width, height);
            this.renderGesturePath();
            const {directionChain, gestureName: name} = this;
            // 如果没有手势（一般是鼠标首次移动），不渲染盒子
            if (!directionChain) {
                return;
            }

            let boxW = width >> 3,
                    boxH = Math.max(48, height >> 3),
                    midW = (width >> 1),
                    boxX = midW - (boxW >> 1),
                    boxY = (height >> 1) - (boxH >> 1),
                    textH = boxH >> 2,
                    lineH = textH + (textH >> 1),
                    textY = boxY;
            let text = [
                // directionChain,
                name || ('未知手势: ' + directionChain)
            ];
            ctx.font = textH + 'px sans-serif';
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
            ctx.fillStyle = this.gestureBoxColor;
            ctx.fillRect(Math.max(boxX, 0), boxY, Math.min(boxW, width), boxH);
            ctx.fillStyle = this.gestureTextColor;
            textY += (textH >> 1);
            const arrowPathCache = {};
            for (let i = 0, l = directionChain.length,
                         x = midW - (arrowW >> 1), d; i < l; i++) {
                // only draw visible arrows
                if (x + arrowH >= 0 && x <= width) {
                    d = directionChain[i];
                    if (!arrowPathCache[d]) {
                        arrowPathCache[d] = transformPathOfArrow(this.pathOfArrow, arrowH, d);
                    }
                    ctx.translate(x, textY);
                    ctx.fill(arrowPathCache[d]);
                    // reset current transformation matrix to the identity matrix
                    ctx.setTransform(1, 0, 0, 1, 0, 0);
                }
                x += arrowH;
            }
            textY += (textH << 1) + (textH >> 1) + (textH >> 2);
            for (let i = 0, l = text.length, t, w; i < l; i++) {
                t = text[i];
                w = textWidthArray[i];
                ctx.fillText(t, w, textY);
                textY += lineH;
            }

        }

        /**
         * @param {number} x
         * @param {number} y
         * @param {string} directionChain
         * @param {string?} gestureName
         */
        render(x, y, directionChain, gestureName) {
            if (!this.isActive()) {
                this.active(x, y);
            }
            // high dpi scale support
            let devicePixelRatio = window.devicePixelRatio || 1;
            // maybe we can optimize the line by reducing points
            this.mouseMovePath.lineTo(
                    // make it faster by discarding non-integer part
                    (x * devicePixelRatio) | 0,
                    (y * devicePixelRatio) | 0
            );
            this.directionChain = directionChain;
            this.gestureName = gestureName;
            // requestAnimationFrame only if last AnimationFrame finished
            if (!this.animationFrameHandle) {
                // arrow func, no bind needed
                this.animationFrameHandle =
                        requestAnimationFrame(this.animationFrameCallback);
            }
        }

        /// endregion render

        dispose() {
            this.status = MouseGestureRenderer.STATUS_IDLE;
            if (this.containerElement) {
                this.containerElement.parentNode.removeChild(this.containerElement);
                this.containerElement = null;
            }
            this.renderingContext = null;
            this.mouseMovePath = null;
        }
    }

    /// endregion renderer

    /// region direction handler
    const defaultMouseGestureHandlerConfig = {
        /**
         * 鼠标移动阈值
         * @type {number}
         */
        mouseMoveThreshold: 9,
        /**
         * 阈值计算方式
         * hypot: 平方和的平方根 Math.hypot(dx, dy) > {@link mouseMoveThreshold}
         * linear: dx > {@link mouseMoveThreshold} && dy > {@link mouseMoveThreshold}
         * @type {string}
         */
        thresholdMethod: 'hypot',
        /**
         * 是否要求鼠标手势必须有两个连续的动作
         * https://github.com/marklieberman/foxygestures/blob/
         * 844d6a581068d09004eb12f10156c3865908eb33/src/common/GestureDetector.js#L32
         * @type {boolean}
         */
        twoConsecutiveMoves: true
    };

    /**
     * 处理鼠标手势方向
     */
    class MouseGestureDirectionHandler {
        constructor(config) {
            config = weakAssign(config, defaultMouseGestureHandlerConfig);
            /**
             * 鼠标移动阈值
             * @type {number}
             */
            this.mouseMoveThreshold = config.mouseMoveThreshold;
            /**
             * 阈值计算方式
             * @type {string}
             */
            this.thresholdMethod = config.thresholdMethod;
            /**
             * 是否要求鼠标手势必须有两个连续的动作
             * @type {boolean}
             */
            this.twoConsecutiveMoves = config.twoConsecutiveMoves;
            /**
             * 上次实际的鼠标手势方向
             * @see twoConsecutiveMoves
             * @type {string}
             */
            this.lastDirection = '';
            /**
             * 上次返回的鼠标手势方向
             * @type {string}
             */
            this.lastValidDirection = '';
        }

        /**
         * 检测鼠标手势方向
         * @param {number} dx x方向移动距离
         * @param {number} dy y方向移动距离
         * @return {string} 方向
         */
        detectDirection(dx, dy) {
            let move;
            if (dx > 0) {
                if (dy > 0) {
                    move = (dy > dx) ? 'D' : 'R';
                } else {
                    move = (-dy > dx) ? 'U' : 'R';
                }
            } else {
                if (dy > 0) {
                    move = (dy > -dx) ? 'D' : 'L';
                } else {
                    move = (-dy > -dx) ? 'U' : 'L';
                }
            }

            return move;
        }

        /**
         * 检测阈值要求
         * @param {number} dx x方向移动距离
         * @param {number} dy y方向移动距离
         * @return {boolean}
         */
        checkThreshold(dx, dy) {
            let {mouseMoveThreshold} = this;
            let devicePixelRatio = window.devicePixelRatio || 1;
            if (devicePixelRatio !== 1) {
                mouseMoveThreshold /= devicePixelRatio;
            }
            if (this.thresholdMethod === 'hypot') {
                return Math.hypot(dx, dy) > mouseMoveThreshold;
            }
            return dx > mouseMoveThreshold && dy > mouseMoveThreshold;
        }

        /**
         * 处理鼠标手势方向
         * @param {number} dx x方向移动距离
         * @param {number} dy y方向移动距离
         * @return {string|boolean} 鼠标手势方向, false 为不满足阈值要求
         */
        handleMove(dx, dy) {
            if (!this.checkThreshold(dx, dy)) {
                return false;
            }
            let direction = this.detectDirection(dx, dy);
            if (direction === this.lastValidDirection) {
                return '';
            }
            if (this.twoConsecutiveMoves) {
                let isTwoConsecutiveMoves = direction !== this.lastDirection;
                this.lastDirection = direction;
                if (isTwoConsecutiveMoves) {
                    return '';
                }
            }
            this.lastValidDirection = direction;
            return direction;
        }

        /**
         * 处理鼠标滚轮手势方向
         * @see WheelEvent
         * @param {number} deltaX 横向滚动量
         * @param {number} deltaY 纵向滚动量
         * @param {number} deltaZ z轴方向上的滚动量
         * @return {string | void} 鼠标手势方向
         */
        handleWheel(deltaX, deltaY, deltaZ) {
            let direction;
            if (deltaY) {
                // 纵向滚动
                direction = (deltaY > 0 ? '+' : '-');
            } else if (deltaX) {
                // 横向滚动
                direction = (deltaX > 0 ? 'R' : 'L');
            } else if (deltaZ) {
                // 滚轮的z轴方向上的滚动
                direction = (deltaZ > 0 ? 'U' : 'D');
            }
            return direction;
        }

        /**
         * 清理
         */
        clear() {
            this.lastDirection = '';
            this.lastValidDirection = '';
        }
    }
    /// endregion direction handler

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
                log('恢复关闭的标签', ex);
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

        // 滚动到左边的标签页
        static scrollLeftTab() {
            if (!('__scrollTabPos' in MouseGestureCommand)) {
                MouseGestureCommand.__scrollTabPos = 0;
            }
            MouseGestureCommand.__scrollTabPos -= 1;
            setTimeout(() => {
                if (!MouseGestureCommand.__scrollTabPos) return;
                gBrowser.tabContainer.advanceSelectedTab(
                        MouseGestureCommand.__scrollTabPos, true);
                MouseGestureCommand.__scrollTabPos = 0;
            }, 5);
        }

        // 滚动到右边的标签页
        static scrollRightTab() {
            if (!('__scrollTabPos' in MouseGestureCommand)) {
                MouseGestureCommand.__scrollTabPos = 0;
            }
            MouseGestureCommand.__scrollTabPos += 1;
            setTimeout(() => {
                if (!MouseGestureCommand.__scrollTabPos) return;
                gBrowser.tabContainer.advanceSelectedTab(
                        MouseGestureCommand.__scrollTabPos, true);
                MouseGestureCommand.__scrollTabPos = 0;
            }, 5);
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
                var funcActiveWindow;
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
                        funcSetWindowPos = lib.declare("SetWindowPos", ctypes.winapi_abi,
                                ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t,
                                ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t);
                    } catch (ex) {
                        // noinspection JSDeprecatedSymbols
                        funcSetWindowPos = lib.declare("SetWindowPos", ctypes.stdcall_abi,
                                ctypes.bool, ctypes.int32_t, ctypes.int32_t, ctypes.int32_t,
                                ctypes.int32_t, ctypes.int32_t, ctypes.int32_t, ctypes.uint32_t);
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
                log('MouseGestureCommand::TabStickOnTop', ex);
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

        'W+': {name: '激活右边的标签页', cmd: MouseGestureCommand.scrollRightTab},
        'W-': {name: '激活左边的标签页', cmd: MouseGestureCommand.scrollLeftTab},
        'WR': {name: '激活右边的标签页', cmd: MouseGestureCommand.scrollRightTab},
        'WL': {name: '激活左边的标签页', cmd: MouseGestureCommand.scrollLeftTab},
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
                'wheel',
                'keydown'
            ];
            // 鼠标手势列表
            this.gestures = gestures;
            this.setGestures(gestures);
            /**
             * 鼠标手势渲染器
             */
            this.renderer = new MouseGestureRenderer();
            /**
             * 处理鼠标手势方向
             */
            this.directionHandler = new MouseGestureDirectionHandler();
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
            // 鼠标在浏览器其他位置松开
            window.addEventListener('mouseup', this, {
                capture: true,
                passive: true
            });
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
            window.removeEventListener('mouseup', this, true);
            window.removeEventListener('blur', this);
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
                    log(this.directionChain, this.gestures[this.directionChain], e);
                }
                if (!Reflect.deleteProperty(gBrowser, '__mozIsInGesture')) {
                    Reflect.set(gBrowser, '__mozIsInGesture', 0);
                }
            }
            this.renderer.dispose();
            this.directionHandler.clear();
            this.directionChain = '';
            this.lastX = 0;
            this.lastY = 0;
            setTimeout(() => StatusPanel._label = '', 2000);
            this.hideFireContext = true;
        }


        /// region event handlers

        mousedown(event) {
            if (event.button === 2) {
                this.isMouseDownR = true;
                this.hideFireContext = false;
                let {screenX: x, screenY: y} = event;
                const {screenX, screenY} = gBrowser.selectedBrowser;
                x -= screenX;
                y -= screenY;
                [this.lastX, this.lastY, this.directionChain] = [x, y, ''];
            }
            if (event.button === 0) {
                this.endGesture();
            }
        }

        mousemove(event) {
            if (!this.isMouseDownR) {
                return;
            }
            let {screenX: x, screenY: y} = event;
            const {screenX, screenY} = gBrowser.selectedBrowser;
            x -= screenX;
            y -= screenY;
            let [dx, dy] = [x - this.lastX, y - this.lastY];
            let direction = this.directionHandler.handleMove(dx, dy);
            if (direction === false) return;
            if (!this.renderer.isActive()) {
                this.renderer.active(this.lastX, this.lastY);
            }
            this.lastX = x;
            this.lastY = y;
            let g;
            if (direction) {
                this.directionChain += direction;
                g = this.gestures[this.directionChain];
                StatusPanel._label = g ?
                        '手势: ' + this.directionChain + ' ' + g.name :
                        '未知手势: ' + this.directionChain;
            } else {
                g = this.gestures[this.directionChain];
            }
            this.renderer.render(x, y, this.directionChain, g && g.name);
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
            let direction = this.directionHandler.handleWheel(
                    event.deltaX, event.deltaY, event.deltaZ);
            if (!direction) {
                this.endGesture();
                return;
            }
            this.directionChain = 'W' + direction;
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

    let ucMouseGestures = new UcMouseGesture();
    ucMouseGestures.bindEvent();
})();
