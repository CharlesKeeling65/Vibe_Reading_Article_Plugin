import { ColumnOptions, DialogHelper } from "zotero-plugin-toolkit";
import { config } from "../package.json";
import hooks from "./hooks";
import { createZToolkit } from "./utils/ztoolkit";

// Addon 是插件运行时的根对象：集中保存状态、生命周期钩子和后续可扩展 API。
class Addon {
  public data: {
    alive: boolean;
    config: typeof config;
    // Env type, see build.js
    env: "development" | "production";
    initialized?: boolean;
    ztoolkit: ZToolkit;
    locale?: {
      current: any;
    };
    prefs?: {
      window: Window;
      columns: Array<ColumnOptions>;
      rows: Array<{ [dataKey: string]: string }>;
    };
    dialog?: DialogHelper;
  };
  // Lifecycle hooks
  public hooks: typeof hooks;
  // APIs
  public api: object;

  constructor() {
    this.data = {
      // alive 用来防止异步回调在插件卸载后继续执行。
      alive: true,
      config,
      env: __env__,
      initialized: false,
      // ztoolkit 是对 Zotero 常见 UI / 工具 API 的二次封装。
      ztoolkit: createZToolkit(),
    };
    this.hooks = hooks;
    // api 预留给业务功能导出，模板默认不放具体实现。
    this.api = {};
  }
}

export default Addon;
