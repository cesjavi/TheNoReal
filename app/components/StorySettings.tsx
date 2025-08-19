'use client';

import { useEffect, useState } from 'react';

export interface ConfigGeneracion {
  estilo: {
    tono?: string;
    voz?: string;
    epoca?: string;
  };
  ajustes: {
    longitud?: string;
  };

interface StorySettingsProps {
  open: boolean;
  config: ConfigGeneracion;
  onClose: () => void;
  onSave: (cfg: ConfigGeneracion) => void;
}

export default function StorySettings({ open, config, onClose, onSave }: StorySettingsProps) {
  const [local, setLocal] = useState<ConfigGeneracion>(config);

  useEffect(() => {
    if (open) setLocal(config);
  }, [open, config]);

  if (!open) return null;

  const handleChange = (
    section: 'estilo' | 'ajustes',
    key: string,
    value: string,
  ) => {
    setLocal((prev) => ({
      ...prev,
      [section]: {
        ...(prev[section] as Record<string, string | undefined>),
        [key]: value,
      },
    }));
  };

  const handleSave = () => {
    onSave(local);
  };

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center">
      <div className="bg-white p-4 rounded-lg space-y-2 w-full max-w-sm">
        <input
          type="text"
          placeholder="Tono"
          value={local.estilo.tono ?? ''}
          onChange={(e) => handleChange('estilo', 'tono', e.target.value)}
          className="w-full p-1 border border-black/30 rounded"
        />
        <input
          type="text"
          placeholder="Voz"
          value={local.estilo.voz ?? ''}
          onChange={(e) => handleChange('estilo', 'voz', e.target.value)}
          className="w-full p-1 border border-black/30 rounded"
        />
        <input
          type="text"
          placeholder="Época"
          value={local.estilo.epoca ?? ''}
          onChange={(e) => handleChange('estilo', 'epoca', e.target.value)}
          className="w-full p-1 border border-black/30 rounded"
        />
        <input
          type="text"
          placeholder="Longitud"
          value={local.ajustes.longitud ?? ''}
          onChange={(e) => handleChange('ajustes', 'longitud', e.target.value)}
          className="w-full p-1 border border-black/30 rounded"
        />
        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onClose}
            className="px-2 py-1 text-sm rounded-lg border border-black/30"
          >
            Cancelar
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="px-2 py-1 text-sm rounded-lg bg-accent text-black border border-black/30 hover:border-black/60 hover:bg-accent-dark"
          >
            Guardar
          </button>
        </div>
      </div>
    </div>
  );
}

