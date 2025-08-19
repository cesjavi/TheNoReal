'use client';

import { useEffect, useState } from 'react';

export interface StorySettingsConfig {
  tono: string;
  ritmo: number;
  voz: string;
  publico: string;
  ambientacion: string;
  creatividad: number;
  coherencia: number;
}

interface StorySettingsProps {
  open: boolean;
  config: StorySettingsConfig;
  onSave: (cfg: StorySettingsConfig) => void;
  onCancel: () => void;
}

export default function StorySettings({ open, config, onSave, onCancel }: StorySettingsProps) {
  const [form, setForm] = useState<StorySettingsConfig>(config);

  useEffect(() => {
    setForm(config);
  }, [config]);

  const handleChange = (key: keyof StorySettingsConfig, value: string | number) => {
    setForm((prev) => ({ ...prev, [key]: value }));
  };

  const handleSave = () => {
    const { ritmo, creatividad, coherencia } = form;
    const nums = { ritmo, creatividad, coherencia };
    for (const [k, v] of Object.entries(nums)) {
      if (typeof v !== 'number' || v < 0.1 || v > 1.0) {
        return;
      }
    }
    onSave(form);
  };

  return (
    <div
      data-testid="drawer-configuracion"
      className={`fixed inset-y-0 right-0 w-80 max-w-full bg-background shadow-lg transform transition-transform duration-300 overflow-y-auto ${open ? 'translate-x-0' : 'translate-x-full'}`}
    >
      <div className="p-4 flex flex-col h-full">
        <h2 className="text-lg font-semibold mb-4">Estilos (literarios)</h2>
        <div className="flex flex-col gap-2">
          <label className="flex flex-col gap-1">
            <span>Tono</span>
            <input
              type="text"
              value={form.tono}
              onChange={(e) => handleChange('tono', e.target.value)}
              className="p-2 border border-black/30 rounded-lg"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Ritmo</span>
            <input
              type="number"
              min={0.1}
              max={1}
              step={0.1}
              value={form.ritmo}
              onChange={(e) => handleChange('ritmo', parseFloat(e.target.value))}
              className="p-2 border border-black/30 rounded-lg"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Voz</span>
            <input
              type="text"
              value={form.voz}
              onChange={(e) => handleChange('voz', e.target.value)}
              className="p-2 border border-black/30 rounded-lg"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Público</span>
            <input
              type="text"
              value={form.publico}
              onChange={(e) => handleChange('publico', e.target.value)}
              className="p-2 border border-black/30 rounded-lg"
            />
          </label>
          <label className="flex flex-col gap-1">
            <span>Ambientación</span>
            <input
              type="text"
              value={form.ambientacion}
              onChange={(e) => handleChange('ambientacion', e.target.value)}
              className="p-2 border border-black/30 rounded-lg"
            />
          </label>
        </div>
        <h2 className="text-lg font-semibold mt-6 mb-4">Ajustes extra</h2>
        <div className="flex flex-col gap-4">
          <label className="flex flex-col">
            <span>Creatividad: {form.creatividad.toFixed(1)}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={form.creatividad}
              onChange={(e) => handleChange('creatividad', parseFloat(e.target.value))}
            />
          </label>
          <label className="flex flex-col">
            <span>Coherencia: {form.coherencia.toFixed(1)}</span>
            <input
              type="range"
              min={0.1}
              max={1}
              step={0.1}
              value={form.coherencia}
              onChange={(e) => handleChange('coherencia', parseFloat(e.target.value))}
            />
          </label>
        </div>
        <div className="mt-auto flex justify-end gap-2 pt-4">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 rounded-lg border border-black/30 hover:border-black/60"
          >
            Cancelar
          </button>
          <button
            type="button"
            data-testid="save-configuracion"
            onClick={handleSave}
            className="px-4 py-2 rounded-lg bg-accent text-black hover:bg-accent-dark transition-colors"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

