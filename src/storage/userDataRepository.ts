import AsyncStorage from '@react-native-async-storage/async-storage';
import { UserData, EMPTY_USER_DATA } from '../types/state';

export const USER_DATA_STORAGE_KEY = '@dailyhanzi/userdata';

export async function loadUserData(): Promise<UserData> {
  try {
    const raw = await AsyncStorage.getItem(USER_DATA_STORAGE_KEY);
    if (!raw) return { ...EMPTY_USER_DATA };
    const parsed = JSON.parse(raw);
    return { ...EMPTY_USER_DATA, ...parsed };
  } catch {
    return { ...EMPTY_USER_DATA };
  }
}

export async function saveUserData(data: UserData): Promise<void> {
  await AsyncStorage.setItem(USER_DATA_STORAGE_KEY, JSON.stringify(data));
}
