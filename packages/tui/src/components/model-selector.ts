import { SelectList, type SelectItem } from './select-list.js';

/**
 * Model information
 */
export interface ModelInfo {
  id: string;
  name: string;
  provider: string;
  contextWindow: number;
  costPer1kInput?: number;
  costPer1kOutput?: number;
}

/**
 * ModelSelector - list of LLM models with search/filter
 * Extends SelectList for convenience.
 */
export class ModelSelector extends SelectList {
  private allModels: ModelInfo[];

  constructor(
    models: ModelInfo[],
    visibleRows: number,
    onSelect?: (model: ModelInfo) => void
  ) {
    const items = ModelSelector.formatModels(models);
    super(items, visibleRows, {}, (value) => {
      const model = models.find(m => m.id === value);
      if (model) onSelect?.(model);
    });
    this.allModels = models;
  }

  /**
   * Filter models by query (name or provider)
   */
  setFilter(query: string): void {
    const q = query.toLowerCase();
    const filtered = this.allModels.filter(m => 
      m.name.toLowerCase().includes(q) || 
      m.provider.toLowerCase().includes(q) ||
      m.id.toLowerCase().includes(q)
    );
    const items = ModelSelector.formatModels(filtered);
    this.setItems(items);
  }

  /**
   * Replace the model list
   */
  setModels(models: ModelInfo[]): void {
    this.allModels = models;
    this.setItems(ModelSelector.formatModels(models));
    // Reset selection to first item safely (selectedIndex is private in SelectList)
    // Let SelectList handle bounds in setItems (selectedIndex stays within range)
  }

  private static formatModels(models: ModelInfo[]): SelectItem[] {
    return models.map(m => {
      const label = `${m.provider}/${m.name}`;
      const detail = ` (${m.contextWindow}ctx`;
      if (m.costPer1kInput !== undefined && m.costPer1kOutput !== undefined) {
        // Append cost
        return {
          value: m.id,
          label: `${label}${detail} $${m.costPer1kInput}/${m.costPer1kOutput}/1k)`.replace(/\s+/g, ' '),
        };
      }
      return {
        value: m.id,
        label: `${label}${detail})`.replace(/\s+/g, ' '),
      };
    });
  }
}
