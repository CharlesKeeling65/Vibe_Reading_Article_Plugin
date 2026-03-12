import { BasicTool } from "zotero-plugin-toolkit";
import { config } from "../package.json";
import Addon from "./addon";

const basicTool = new BasicTool();

// 入口文件只负责两件事：创建全局单例插件实例，以及把常用对象挂到沙箱全局。
// @ts-expect-error - Plugin instance is not typed
if (!basicTool.getGlobal("Zotero")[config.addonInstance]) {
  _globalThis.addon = new Addon();
  // ztoolkit 通过 getter 暴露，确保每次访问的都是当前窗口上下文对应的实例。
  defineGlobal("ztoolkit", () => {
    return _globalThis.addon.data.ztoolkit;
  });
  // @ts-expect-error - Plugin instance is not typed
  Zotero[config.addonInstance] = addon;
}

function defineGlobal(name: Parameters<BasicTool["getGlobal"]>[0]): void;
function defineGlobal(name: string, getter: () => any): void;
function defineGlobal(name: string, getter?: () => any) {
  // 统一定义全局只读属性，避免业务代码直接操作底层全局对象。
  Object.defineProperty(_globalThis, name, {
    get() {
      return getter ? getter() : basicTool.getGlobal(name);
    },
  });
}
