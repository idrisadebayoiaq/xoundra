import { Platform } from 'react-native';
import * as Network from 'expo-network';

export function decideDownload(wifiOnly, state, webType) {
  if (!state?.isConnected) return 'offline';
  if (!wifiOnly) return 'ok';
  const type = state.type;
  if (type === Network.NetworkStateType.WIFI || webType === 'wifi' || webType === 'ethernet') return 'ok';
  if (type === Network.NetworkStateType.CELLULAR || webType === 'cellular') return 'wifi';
  if (Platform.OS === 'web' && !webType) return 'ok';
  return 'wifi';
}

function webType() {
  const connection = globalThis.navigator?.connection;
  const type = connection?.type;
  return typeof type === 'string' ? type : '';
}

export async function downloadGate(wifiOnly) {
  const state = await Network.getNetworkStateAsync().catch(() => ({ isConnected: true, type: Network.NetworkStateType.UNKNOWN }));
  return decideDownload(wifiOnly, state, webType());
}

export function connectionOnline(state) {
  if (!state) return true;
  if (state.isConnected === false) return false;
  if (state.type === Network.NetworkStateType.NONE) return false;
  return true;
}

export async function readOnline() {
  const state = await Network.getNetworkStateAsync().catch(() => ({ isConnected: true }));
  return connectionOnline(state);
}

export function watchNetwork(onChange) {
  const subscription = Network.addNetworkStateListener((state) => {
    onChange(state);
  });
  return () => subscription.remove();
}
