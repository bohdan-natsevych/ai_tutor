'use client';

import { useEffect, useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import { useSettingsStore } from '@/stores/settingsStore';
import { useTranslation } from '@/lib/i18n/useTranslation';

interface ModelInfo {
  id: string;
  name: string;
  description: string;
  contextWindow?: number;
}

interface ProviderInfo {
  id: string;
  name: string;
  type: string;
  contextMode: string;
  description: string;
}

export function AIProviderSelector() {
  const { ai, setAISettings } = useSettingsStore();
  const { t } = useTranslation();

  // Dynamically fetched providers and models
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [models, setModels] = useState<ModelInfo[]>([]);
  const [textModels, setTextModels] = useState<ModelInfo[]>([]);
  const [loadingProviders, setLoadingProviders] = useState(true);
  const [loadingModels, setLoadingModels] = useState(false);
  const [loadingTextModels, setLoadingTextModels] = useState(false);
  const [modelsError, setModelsError] = useState<string | null>(null);
  const [textModelsError, setTextModelsError] = useState<string | null>(null);

  // Fetch available providers on mount
  useEffect(() => {
    setLoadingProviders(true);
    fetch('/api/providers')
      .then(res => res.json())
      .then(data => {
        setProviders(data.providers || []);
      })
      .catch(err => {
        console.error('[AIProviderSelector] Failed to fetch providers:', err);
        setProviders([]);
      })
      .finally(() => setLoadingProviders(false));
  }, []);

  // Fetch audio models when provider changes
  useEffect(() => {
    setLoadingModels(true);
    setModelsError(null);

    fetch('/api/models')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setModelsError(data.error);
          setModels([]);
        } else {
          setModels(data.models || []);
        }
      })
      .catch(err => {
        console.error('[AIProviderSelector] Failed to fetch models:', err);
        setModelsError('Failed to fetch models');
        setModels([]);
      })
      .finally(() => setLoadingModels(false));
  }, [ai.provider]);

  // Fetch text models when provider changes
  useEffect(() => {
    setLoadingTextModels(true);
    setTextModelsError(null);

    fetch('/api/models?type=text')
      .then(res => res.json())
      .then(data => {
        if (data.error) {
          setTextModelsError(data.error);
          setTextModels([]);
        } else {
          setTextModels(data.models || []);
        }
      })
      .catch(err => {
        console.error('[AIProviderSelector] Failed to fetch text models:', err);
        setTextModelsError('Failed to fetch models');
        setTextModels([]);
      })
      .finally(() => setLoadingTextModels(false));
  }, [ai.provider]);

  const currentProvider = providers.find(p => p.id === ai.provider);

  return (
    <Card>
      <CardHeader>
        <CardTitle>{t('settings.ai.title')}</CardTitle>
        <CardDescription>
          {t('settings.ai.description')}
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {/* AI Provider */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.ai.provider')}</label>
          {loadingProviders ? (
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">{t('settings.ai.loadingProviders')}</span>
            </div>
          ) : (
            <Select
              value={ai.provider}
              onValueChange={(value) => {
                setAISettings({ provider: value });
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.ai.selectProvider')} />
              </SelectTrigger>
              <SelectContent>
                {providers.map((provider) => (
                  <SelectItem key={provider.id} value={provider.id}>
                    <div className="flex items-center gap-2">
                      <span>{provider.name}</span>
                      <Badge variant="outline" className="text-xs">
                        {provider.type}
                      </Badge>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {currentProvider && (
            <p className="text-xs text-muted-foreground">
              {currentProvider.description}
            </p>
          )}
        </div>

        {/* Audio Model selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.ai.audioModel')}</label>
          <p className="text-xs text-muted-foreground">
            {t('settings.ai.audioModelDesc')}
          </p>
          {loadingModels ? (
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">{t('settings.ai.loadingModels')}</span>
            </div>
          ) : modelsError ? (
            <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10">
              <p className="text-sm text-destructive">{modelsError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.ai.checkApiKey')}
              </p>
            </div>
          ) : models.length > 0 ? (
            <Select
              value={ai.model}
              onValueChange={(value) => setAISettings({ model: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.ai.selectModel')} />
              </SelectTrigger>
              <SelectContent>
                {models.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">{t('settings.ai.noModels')}</span>
            </div>
          )}
        </div>

        {/* Text Model selection */}
        <div className="space-y-2">
          <label className="text-sm font-medium">{t('settings.ai.textModel')}</label>
          <p className="text-xs text-muted-foreground">
            {t('settings.ai.textModelDesc')}
          </p>
          {loadingTextModels ? (
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">{t('settings.ai.loadingModels')}</span>
            </div>
          ) : textModelsError ? (
            <div className="p-3 border border-destructive/50 rounded-md bg-destructive/10">
              <p className="text-sm text-destructive">{textModelsError}</p>
              <p className="text-xs text-muted-foreground mt-1">
                {t('settings.ai.checkApiKey')}
              </p>
            </div>
          ) : textModels.length > 0 ? (
            <Select
              value={ai.textModel}
              onValueChange={(value) => setAISettings({ textModel: value })}
            >
              <SelectTrigger>
                <SelectValue placeholder={t('settings.ai.selectTextModel')} />
              </SelectTrigger>
              <SelectContent>
                {textModels.map((model) => (
                  <SelectItem key={model.id} value={model.id}>
                    <div className="flex flex-col">
                      <span>{model.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {model.description}
                      </span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          ) : (
            <div className="h-10 flex items-center px-3 border rounded-md bg-muted">
              <span className="text-sm text-muted-foreground">{t('settings.ai.noModels')}</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
