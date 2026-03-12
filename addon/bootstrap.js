/**
 * Most of this code is from Zotero team's official Make It Red example[1]
 * or the Zotero 7 documentation[2].
 * [1] https://github.com/zotero/make-it-red
 * [2] https://www.zotero.org/support/dev/zotero_7_for_developers
 *
 * 这个文件是 Zotero 插件真正的启动入口：Zotero 先调用 bootstrap 生命周期，
 * 再由这里把编译后的 TypeScript 脚本载入到沙箱，并转发到 src/hooks.ts。
 */

var chromeHandle;

function install(data, reason) { }

async function startup({ id, version, resourceURI, rootURI }, reason) {
  // 注册 chrome 资源后，addon/content 下的样式、图标、XHTML 才能被 Zotero 正常访问。
  var aomStartup = Components.classes[
    "@mozilla.org/addons/addon-manager-startup;1"
  ].getService(Components.interfaces.amIAddonManagerStartup);
  var manifestURI = Services.io.newURI(rootURI + "manifest.json");
  chromeHandle = aomStartup.registerChrome(manifestURI, [
    ["content", "__addonRef__", rootURI + "content/"],
  ]);

  /**
   * Global variables for plugin code.
   * The `_globalThis` is the global root variable of the plugin sandbox environment
   * and all child variables assigned to it is globally accessible.
   * See `src/index.ts` for details.
   */
  const ctx = { rootURI };
  ctx._globalThis = ctx;

  // 这里加载的是构建产物，而不是 src 下的 TypeScript 源码。
  Services.scriptloader.loadSubScript(
    `${rootURI}/content/scripts/__addonRef__.js`,
    ctx,
  );
  await Zotero.__addonInstance__.hooks.onStartup();
}

async function onMainWindowLoad({ window }, reason) {
  // 每打开一个 Zotero 主窗口，都会触发一次窗口级初始化。
  await Zotero.__addonInstance__?.hooks.onMainWindowLoad(window);
}

async function onMainWindowUnload({ window }, reason) {
  // 窗口关闭时通知脚本释放和该窗口绑定的资源。
  await Zotero.__addonInstance__?.hooks.onMainWindowUnload(window);
}

async function shutdown({ id, version, resourceURI, rootURI }, reason) {
  if (reason === APP_SHUTDOWN) {
    return;
  }

  // Zotero 关闭整个应用时不必额外清理；插件禁用/重载时则需要主动析构资源。
  await Zotero.__addonInstance__?.hooks.onShutdown();

  if (chromeHandle) {
    chromeHandle.destruct();
    chromeHandle = null;
  }
}

async function uninstall(data, reason) { }
