export { isWindowAlive };

/**
 * 用于判断窗口引用是否仍然有效，常见于避免重复打开对话框或访问已销毁窗口。
 * Check if the window is alive.
 * Useful to prevent opening duplicate windows.
 * @param win
 */
function isWindowAlive(win?: Window) {
  return win && !Components.utils.isDeadWrapper(win) && !win.closed;
}
