export const lightColors = {
  background: '#FFFFFF', textPrimary: '#10151c', textSecondary: '#888888',
  textHint: '#10151c', iconTint: '#000000', iconTintSecondary: '#888888',
  divider: '#E5E5EA', drawerBackground: '#FFFFFF', drawerText: '#10151c',
  bottomBarSolid: '#FFFFFF', dialogBackground: '#F2F2F7',
  sendBtnColor: '#2F7BF6', sendIconColor: '#FFFFFF', addCircleBg: '#E8E8E8',
  tabPreviewPillBg: '#E0EBFE', extrasCardActive: '#EEF2FF',
  extrasCardActiveText: '#2F7BF6', settings_section_label: '#888888',
  userBubbleBg: '#E0EBFE', assistantBubbleBg: '#F2F2F7',
  authBtnBg: '#2F7BF6', authBtnText: '#FFFFFF', authInputFill: '#F2F2F7',
  appbarBtnBg: '#E8E8E8', primary: '#2F7BF6',
};

export const darkColors = {
  background: '#121212', textPrimary: '#F2F2F2', textSecondary: '#939393',
  textHint: '#6E6E6E', iconTint: '#F2F2F2', iconTintSecondary: '#939393',
  divider: '#2A2A2A', drawerBackground: '#1F1F1F', drawerText: '#F2F2F2',
  bottomBarSolid: '#1F1F1F', dialogBackground: '#1F1F1F',
  sendBtnColor: '#2F7BF6', sendIconColor: '#FFFFFF', addCircleBg: '#2C2C2E',
  tabPreviewPillBg: '#1F2D4A', extrasCardActive: '#1E2D4F',
  extrasCardActiveText: '#A8C8FA', settings_section_label: '#939393',
  userBubbleBg: '#1F2D4A', assistantBubbleBg: '#1F1F1F',
  authBtnBg: '#2F7BF6', authBtnText: '#FFFFFF', authInputFill: '#2C2C2E',
  appbarBtnBg: '#2C2C2E', primary: '#2F7BF6',
};

export function getThemeColors(isDark) {
  return isDark ? darkColors : lightColors;
}