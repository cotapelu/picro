/** @jsxImportSource react */
import { useState, useCallback } from 'react';
import type { AgentSessionRuntimeInterface } from '../../runtime.js';

interface UseResourceInfoReturn {
  resourceCounts: { extensions: number; skills: number; prompts: number; themes: number };
  showLoadedResources: (opts?: { force?: boolean; showDiagnosticsWhenQuiet?: boolean }) => void;
}

export function useResourceInfo(runtime: AgentSessionRuntimeInterface, addToast: (message: string, type?: 'info' | 'success' | 'error') => void): UseResourceInfoReturn {
  const [resourceCounts, setResourceCounts] = useState<{ extensions: number; skills: number; prompts: number; themes: number }>({
    extensions: 0,
    skills: 0,
    prompts: 0,
    themes: 0,
  });

  const showLoadedResources = useCallback((opts?: { force?: boolean; showDiagnosticsWhenQuiet?: boolean }) => {
    try {
      const ses = runtime.session as any;
      const loader = ses._resourceLoader;
      let ext = 0, skill = 0, prompt = 0, theme = 0;
      if (loader) {
        try {
          const extRes = loader.getExtensions?.();
          if (extRes?.extensions?.length) ext = extRes.extensions.length;
          const skillsRes = loader.getSkills?.();
          if (skillsRes?.skills?.length) skill = skillsRes.skills.length;
          const promptsRes = loader.getPromptTemplates?.();
          if (promptsRes?.length) prompt = promptsRes.length;
          const themesRes = loader.getThemes?.();
          if (themesRes?.themes?.length) theme = themesRes.themes.length;
        } catch {}
      }
      setResourceCounts({ extensions: ext, skills: skill, prompts: prompt, themes: theme });

      const settings = runtime.settings as any;
      const quiet = settings?.get?.('quietStartup') ?? false;
      if (opts?.force || !quiet) {
        addToast(`Loaded: ${ext} extensions, ${skill} skills, ${prompt} prompts, ${theme} themes`, 'info');
      }
    } catch (err) {
      console.error('Error loading resources:', err);
    }
  }, [runtime, addToast]);

  return {
    resourceCounts,
    showLoadedResources,
  };
}
