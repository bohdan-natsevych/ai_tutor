'use client';

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Switch } from '@/components/ui/switch';
import { Separator } from '@/components/ui/separator';
import { useSettingsStore } from '@/stores/settingsStore';

// CURSOR: Context Settings Component
// Configures conversation context management and summarization behavior

export function ContextSettings() {
  const { context, setContextSettings } = useSettingsStore();

  return (
    <Card>
      <CardHeader>
        <CardTitle>Context & Summarization</CardTitle>
        <CardDescription>
          Control how conversation history is managed for AI context
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        {/* Disable summarization toggle */}
        <div className="flex items-center justify-between">
          <div className="space-y-0.5">
            <label className="text-sm font-medium">Disable Summarization</label>
            <p className="text-xs text-muted-foreground">
              Always send full conversation history (uses more tokens)
            </p>
          </div>
          <Switch
            checked={context.disableSummarization}
            onCheckedChange={(checked) => setContextSettings({ disableSummarization: checked })}
          />
        </div>

        {/* Settings only shown when summarization is enabled */}
        {!context.disableSummarization && (
          <>
            <Separator />

            {/* Recent window size */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Recent Messages Window</label>
                <span className="text-sm text-muted-foreground">{context.recentWindowSize} messages</span>
              </div>
              <Slider
                value={[context.recentWindowSize]}
                min={5}
                max={50}
                step={5}
                onValueChange={([value]) => setContextSettings({ recentWindowSize: value })}
              />
              <p className="text-xs text-muted-foreground">
                Number of recent messages kept in full detail (not summarized)
              </p>
            </div>

            <Separator />

            {/* Summarize after N messages */}
            <div className="space-y-3">
              <div className="flex justify-between">
                <label className="text-sm font-medium">Summarize Every</label>
                <span className="text-sm text-muted-foreground">{context.summarizeAfterMessages} messages</span>
              </div>
              <Slider
                value={[context.summarizeAfterMessages]}
                min={5}
                max={30}
                step={5}
                onValueChange={([value]) => setContextSettings({ summarizeAfterMessages: value })}
              />
              <p className="text-xs text-muted-foreground">
                Trigger summarization when this many messages fall outside the recent window
              </p>
            </div>

            <Separator />

            {/* Summarization provider */}
            <div className="space-y-2">
              <label className="text-sm font-medium">Summarization Provider</label>
              <Select
                value={context.summarizationProvider}
                onValueChange={(value: 'same' | 'local') => setContextSettings({ summarizationProvider: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="same">
                    <div className="flex flex-col">
                      <span>Same as Chat</span>
                      <span className="text-xs text-muted-foreground">Use your chat AI provider</span>
                    </div>
                  </SelectItem>
                  <SelectItem value="local">
                    <div className="flex flex-col">
                      <span>Local (WebLLM/Ollama)</span>
                      <span className="text-xs text-muted-foreground">Free, uses local processing</span>
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">
                {context.summarizationProvider === 'local' 
                  ? 'Summaries will be generated locally for free (requires WebLLM or Ollama)'
                  : 'Summaries will use your selected chat AI provider (may incur costs)'}
              </p>
            </div>
          </>
        )}

        {/* Token savings estimate */}
        <div className="p-3 bg-muted rounded-lg">
          <h4 className="text-sm font-medium mb-1">Estimated Token Savings</h4>
          <p className="text-xs text-muted-foreground">
            {context.disableSummarization 
              ? 'No savings - full history sent each time'
              : `With window size ${context.recentWindowSize}: ~50-70% token reduction for long conversations`}
          </p>
        </div>
      </CardContent>
    </Card>
  );
}
