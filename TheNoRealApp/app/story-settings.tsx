import React from 'react';
import { useRoute } from '@react-navigation/native';

import StorySettings from './StorySettings';

export default function StorySettingsScreen() {
  const route = useRoute<any>();
  const { config, setConfig } = route.params || {};

  return <StorySettings config={config} onSave={setConfig} />;
}
