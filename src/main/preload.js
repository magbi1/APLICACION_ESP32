'use strict';
// Puente seguro entre la interfaz y el proceso principal.
const { contextBridge, ipcRenderer } = require('electron');

const invoke = async (channel, ...args) => {
  const r = await ipcRenderer.invoke(channel, ...args);
  if (!r.ok) throw new Error(r.error);
  return r.data;
};

const on = (channel) => (cb) => {
  const listener = (_e, payload) => cb(payload);
  ipcRenderer.on(channel, listener);
  return () => ipcRenderer.removeListener(channel, listener);
};

contextBridge.exposeInMainWorld('api', {
  platform: process.platform,
  invoke,
  onBuildLog: on('build:log'),
  onToolsLog: on('tools:log'),
  onSimLog: on('sim:log'),
  onSimExit: on('sim:exit'),
  onMonitorData: on('monitor:data'),
  onMonitorExit: on('monitor:exit')
});
