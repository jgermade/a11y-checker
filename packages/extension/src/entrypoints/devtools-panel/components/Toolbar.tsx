import { ENGINES, ENGINE_IDS } from '../../../lib/engines.js';
import { REPORT_FORMATS, type ReportFormat } from '../../../lib/export.js';
import {
  GROUP_BY_OPTIONS,
  WCAG_LEVEL_OPTIONS,
  WCAG_VERSION_OPTIONS,
  type GroupBy,
  type Settings,
} from '../../../lib/settings.js';

interface ToolbarProps {
  settings: Settings;
  onSettingsChange: (settings: Settings) => void;
  running: boolean;
  onRun: () => void;
  canExport: boolean;
  onExport: (format: ReportFormat) => void;
}

const valueOf = (event: Event) => (event.currentTarget as HTMLSelectElement).value;
const checkedOf = (event: Event) => (event.currentTarget as HTMLInputElement).checked;

export function Toolbar(props: ToolbarProps) {
  const { settings, onSettingsChange } = props;
  const set = (patch: Partial<Settings>) => {
    onSettingsChange({ ...settings, ...patch });
  };

  return (
    <div class="toolbar">
      <button type="button" class="primary" onClick={props.onRun} disabled={props.running}>
        {props.running ? 'Checking…' : 'Check page'}
      </button>

      <fieldset>
        <legend>Target</legend>
        <label>
          WCAG
          <select
            value={settings.wcagVersion}
            onChange={(e) => {
              set({ wcagVersion: valueOf(e) as Settings['wcagVersion'] });
            }}
          >
            {WCAG_VERSION_OPTIONS.map((v) => (
              <option key={v} value={v}>
                {v}
              </option>
            ))}
          </select>
        </label>
        <label>
          Level
          <select
            value={settings.wcagLevel}
            onChange={(e) => {
              set({ wcagLevel: valueOf(e) as Settings['wcagLevel'] });
            }}
          >
            {WCAG_LEVEL_OPTIONS.map((l) => (
              <option key={l} value={l}>
                {l}
              </option>
            ))}
          </select>
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.bestPractices}
            onChange={(e) => {
              set({ bestPractices: checkedOf(e) });
            }}
          />
          Best practices
        </label>
        <label>
          <input
            type="checkbox"
            checked={settings.showIncomplete}
            onChange={(e) => {
              set({ showIncomplete: checkedOf(e) });
            }}
          />
          Needs review
        </label>
      </fieldset>

      <fieldset>
        <legend>Engines</legend>
        {ENGINES.map(({ id, label }) => {
          const enabled = settings.engines.includes(id);
          return (
            <label key={id}>
              <input
                type="checkbox"
                checked={enabled}
                // At least one engine must stay enabled.
                disabled={enabled && settings.engines.length === 1}
                onChange={(e) => {
                  const on = checkedOf(e);
                  set({
                    engines: ENGINE_IDS.filter((other) =>
                      other === id ? on : settings.engines.includes(other),
                    ),
                  });
                }}
              />
              {label}
            </label>
          );
        })}
      </fieldset>

      <label>
        Group by
        <select
          value={settings.groupBy}
          onChange={(e) => {
            set({ groupBy: valueOf(e) as GroupBy });
          }}
        >
          {GROUP_BY_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </select>
      </label>

      <div role="group" aria-labelledby="export-label" class="export">
        <span id="export-label">Export</span>
        {REPORT_FORMATS.map(({ format, label }) => (
          <button
            key={format}
            type="button"
            disabled={!props.canExport}
            onClick={() => {
              props.onExport(format);
            }}
          >
            {label}
          </button>
        ))}
      </div>
    </div>
  );
}
