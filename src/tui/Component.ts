// Component - Base class for all TUI components

export abstract class Component {
  /**
   * Render component to string
   */
  abstract render(): string;

  /**
   * Called when component is added to a screen
   */
  onMount?(screen: any): void;

  /**
   * Called when component is removed from screen
   */
  onUnmount?(): void;

  /**
   * Handle input event
   */
  onInput?(key: string): boolean; // return true if consumed

  /**
   * Called on terminal resize
   */
  onResize?(): void;

  /**
   * Update component state (for reactive updates)
   */
  update?(props: Partial<any>): void;
}

/**
 * Create a simple stateless component from render function
 */
export function createComponent(renderFn: () => string): Component {
  return {
    render: renderFn,
  };
}

/**
 * Composite component that contains children
 */
export abstract class ContainerComponent extends Component {
  protected children: Component[] = [];

  add(child: Component): void {
    this.children.push(child);
    child.onMount?.(null);
  }

  remove(child: Component): boolean {
    const idx = this.children.indexOf(child);
    if (idx !== -1) {
      this.children.splice(idx, 1);
      child.onUnmount?.();
      return true;
    }
    return false;
  }

  clear(): void {
    for (const child of this.children) {
      child.onUnmount?.();
    }
    this.children = [];
  }

  /**
   * Render all children
   */
  protected renderChildren(): string {
    return this.children.map(c => c.render()).join('\n');
  }

  /**
   * Propagate input to children
   */
  onInput?(key: string): boolean {
    for (const child of this.children) {
      if (child.onInput?.(key)) {
        return true;
      }
    }
    return false;
  }

  onResize?(): void {
    for (const child of this.children) {
      child.onResize?.();
    }
  }
}
